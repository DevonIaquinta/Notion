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
      <div className="mx-auto flex max-w-case flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="display text-lg" style={{ letterSpacing: "-0.02em" }}>
            Founder Workbench
          </span>
          <span className="eyebrow">case file</span>
        </Link>

        {user ? (
          <nav className="-mx-1 flex items-center gap-x-4 gap-y-1 text-sm">
            <Link href="/" className="px-1 hover:underline">
              Workbench
            </Link>
            <Link href="/constraints" className="px-1 hover:underline">
              Constraints
            </Link>
            <Link href="/graveyard" className="px-1 hover:underline">
              Graveyard
            </Link>
            <form
              className="ml-auto sm:ml-0"
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/sign-in" });
              }}
            >
              <button type="submit" className="px-1 text-ink-faint hover:text-ink hover:underline">
                Sign out
              </button>
            </form>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
