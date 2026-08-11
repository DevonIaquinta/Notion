import Link from "next/link";
import { Eyebrow } from "@/components/ui";

export default function CheckEmailPage() {
  return (
    <div className="mx-auto max-w-measure py-10">
      <Eyebrow>Check your inbox</Eyebrow>
      <h1 className="display mt-3 text-3xl">Your link is on the way</h1>
      <p className="mt-3 text-ink-muted">
        Open the email and click the sign-in link to enter the workbench. The link expires
        shortly.
      </p>
      <p className="mt-6 text-sm">
        <Link href="/sign-in" className="underline">
          Use a different email
        </Link>
      </p>
    </div>
  );
}
