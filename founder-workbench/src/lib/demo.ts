// One-click demo sign-in is gated on this flag. When on, anyone who can reach
// the URL can sign in as any address — intended only for a private hosted demo.
export function demoLoginEnabled(): boolean {
  const v = process.env.ALLOW_DEMO_LOGIN;
  return v === "1" || v === "true";
}
