import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Resolve the signed-in user row, or redirect to sign-in. Use in every
// server component / action that touches user data.
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) redirect("/sign-in");
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) redirect("/sign-in");
  return user;
}

// Non-redirecting variant for layout-level checks.
export async function currentUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}
