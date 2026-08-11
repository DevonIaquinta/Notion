import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";
import { Eyebrow } from "@/components/ui";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="mx-auto max-w-measure py-10">
      <Eyebrow>Founder Workbench</Eyebrow>
      <h1 className="display mt-3 text-3xl">Sign in</h1>
      <p className="mt-3 text-ink-muted">
        Enter your email. We send a one-time link — no password. When you come back weeks
        later, you land exactly where you left off.
      </p>

      <form
        action={async (formData: FormData) => {
          "use server";
          const email = String(formData.get("email") ?? "").trim();
          if (!email) return;
          await signIn("nodemailer", { email, redirectTo: "/" });
        }}
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="field"
          aria-label="Email address"
        />
        <button type="submit" className="btn btn-primary whitespace-nowrap">
          Send link
        </button>
      </form>

      <p className="eyebrow mt-8">
        Dev note — with no SMTP configured, the sign-in link prints to the server console.
      </p>
    </div>
  );
}
