import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

const EMAIL_FROM = process.env.EMAIL_FROM ?? "Founder Workbench <no-reply@localhost>";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Required for self-hosting (non-Vercel): trust the deployment host. On
  // Vercel this is inferred; elsewhere set AUTH_TRUST_HOST or this flag.
  trustHost: true,
  // The email (magic-link) provider requires database sessions.
  session: { strategy: "database" },
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in/check-email",
  },
  providers: [
    Nodemailer({
      // `server` is unused when EMAIL_SERVER is absent because we override
      // sendVerificationRequest below to print the link in dev.
      server: process.env.EMAIL_SERVER ?? { host: "localhost", port: 587 },
      from: EMAIL_FROM,
      async sendVerificationRequest({ identifier, url, provider }) {
        if (!process.env.EMAIL_SERVER) {
          // Dev mode: no SMTP configured. Print the magic link so a developer
          // can sign in without any mail infrastructure.
          console.log(
            `\n✉  Magic sign-in link for ${identifier}:\n   ${url}\n`,
          );
          return;
        }
        const transport = nodemailer.createTransport(provider.server);
        const { host } = new URL(url);
        await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: `Sign in to Founder Workbench`,
          text: `Sign in to ${host}\n${url}\n\nThis link expires shortly. If you didn't request it, ignore this email.\n`,
          html: verificationEmailHtml({ url, host }),
        });
      },
    }),
  ],
});

function verificationEmailHtml({ url, host }: { url: string; host: string }) {
  return `
  <body style="background:#f7f5ef;margin:0;padding:40px 0;font-family:Georgia,'Times New Roman',serif;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fffdf8;border:1px solid #e4dfd2;">
        <tr><td style="padding:32px 36px;">
          <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8a8577;margin:0 0 20px;">Founder Workbench</p>
          <h1 style="font-size:22px;color:#1a1a1a;margin:0 0 16px;">Your sign-in link</h1>
          <p style="font-size:15px;color:#4a4638;line-height:1.5;margin:0 0 24px;">Open the workbench and pick up exactly where you left off.</p>
          <a href="${url}" style="display:inline-block;background:#1a1a1a;color:#f7f5ef;text-decoration:none;padding:12px 20px;font-family:Arial,sans-serif;font-size:14px;">Sign in to ${host}</a>
          <p style="font-size:12px;color:#8a8577;margin:28px 0 0;">If you didn't request this, ignore it.</p>
        </td></tr>
      </table>
    </td></tr></table>
  </body>`;
}
