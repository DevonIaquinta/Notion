import Link from "next/link";
import { currentUser } from "@/lib/session";
import { signOut } from "@/auth";

export async function Masthead() {
  const user = await currentUser();

  return (
    <header
      className="no-print sticky top-0 z-20"
      style={{ backgroundColor: "var(--paper)", borderBottom: "1px solid var(--rule)" }}
    >
      <div className="mx-auto flex max-w-case items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="display text-lg" style={{ letterSpacing: "-0.02em" }}>
            Founder Workbench
          </span>
          <span className="eyebrow hidden sm:inline">case file</span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="hover:underline">
              Workbench
            </Link>
            <Link href="/constraints" className="hover:underline">
              Constraints
            </Link>
            <Link href="/graveyard" className="hover:underline">
              Graveyard
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/sign-in" });
              }}
            >
              <button type="submit" className="text-ink-faint hover:text-ink hover:underline">
                Sign out
              </button>
            </form>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
