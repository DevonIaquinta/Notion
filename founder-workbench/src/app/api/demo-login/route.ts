import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { demoLoginEnabled } from "@/lib/demo";

export const dynamic = "force-dynamic";

// One-click sign-in for a hosted demo, WITHOUT email. Disabled unless
// ALLOW_DEMO_LOGIN is set, because when it is on, anyone who can reach the URL
// can sign in as any address. Use it only for a private demo you don't share
// widely. It works by creating a real database session and setting the same
// cookie Auth.js reads — the exact mechanism the seed uses.
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  if (!demoLoginEnabled()) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const raw = req.nextUrl.searchParams.get("email") || "you@demo.local";
  const email = raw.toLowerCase().trim().slice(0, 200);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, emailVerified: new Date() },
  });

  const sessionToken = randomUUID();
  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires: new Date(Date.now() + THIRTY_DAYS) },
  });

  // Auth.js names the session cookie "__Secure-authjs.session-token" over
  // https and "authjs.session-token" over http; match it exactly.
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const secure = proto === "https";
  const cookieName = secure ? "__Secure-authjs.session-token" : "authjs.session-token";

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    expires: new Date(Date.now() + THIRTY_DAYS),
  });
  return res;
}
