# Founder Workbench

A stateful, single-player **case-file workbench** that walks one person from
*"I want to start something"* to *"I have evidence someone will pay me"* through
a fixed, evidence-gated sequence of stages.

It is deliberately **not** a chat interface and **not** an idea generator. AI is
a component inside the structure, scoped to each stage and returning typed data
— never a chat bubble.

## Why it's shaped this way

The target user is a scanner: enthusiastic, prone to abandoning an idea at the
first friction and starting a fresh one. Every design decision raises the cost
of switching and lowers the cost of finishing:

- **State persists and is visible.** Coming back after weeks, you see exactly
  where you stopped and the single next action, stated as an imperative.
- **Abandonment is a logged event.** Killing an idea requires one written
  sentence, kept forever in the graveyard.
- **Stages gate on evidence, not clicks.** You cannot pass the evidence stage
  without 5 logged conversations with named people — enforced server-side.
- **One active venture at a time.** Others are parked; switching costs a reason.

## The stages

1. **Constraints** — user-level, once. Capital, time, runway, risk, and the two
   fields that make recommendations non-generic: access assets and tolerance.
2. **Idea intake** — bring one, or generate ≤5, each derived from your constraints.
3. **Kill criteria** — 3–5 falsifiable walk-away conditions, written *before* research.
4. **Assumption mapping** — decompose and rank by how fatal each is if false.
5. **Evidence** — the gate that matters. 5 named conversations + every FATAL
   assumption resolved.
6. **Offer** — who / problem / deliverable / price / guarantee, plus a price test.
7. **First dollar** — a minimal checklist to one real transaction.

At any point a venture can be **killed** (reason required) into the Graveyard,
which surfaces cross-venture patterns after three kills.

## Stack

- Next.js (App Router) · TypeScript · Tailwind
- Prisma — SQLite locally, Postgres (Neon) for deploy
- Server actions for mutations; server-side Anthropic API for AI (key never
  reaches the client)
- Auth.js email magic-link (no social login)

## Running locally

```bash
cp .env.example .env          # then edit values
npm install                   # runs prisma generate
npm run db:push               # create the SQLite schema
npm run dev                   # http://localhost:3000
```

**Auth in dev:** with no `EMAIL_SERVER` set, the magic-link URL is printed to
the server console — open it to sign in. No SMTP required.

**AI in dev:** set `ANTHROPIC_API_KEY` to enable the per-stage assists. Without
it, the app is fully usable; assist buttons report that AI isn't configured.

## Deploy to a live URL (Vercel + Postgres)

The repo is deploy-ready: `vercel-build` (see `package.json`) flips the Prisma
datasource to Postgres and runs `prisma db push` at build time, so the committed
schema stays SQLite for local dev and nothing else needs editing. `vercel.json`
wires this up.

**Steps (Vercel dashboard):**

1. **vercel.com → Add New → Project → Import** the `Notion` repo.
2. **Root Directory:** `founder-workbench`. **Production Branch:** the branch
   this app lives on (`claude/founder-workbench-spec-46qobp`) until it's merged
   to the repo default.
3. **Storage tab → Create → Postgres** (Vercel Postgres / Neon). This injects
   `DATABASE_URL` automatically.
4. **Environment variables:**
   - `AUTH_SECRET` — any random 32+ byte string (`openssl rand -base64 32`).
   - `ALLOW_DEMO_LOGIN` = `1` — shows a one-click "Enter the workbench" button so
     you can sign in without email. **Leave unset for a shareable/public URL** —
     when on, anyone with the link can sign in as anyone.
   - Optional: `ANTHROPIC_API_KEY` to enable the AI assists.
5. **Deploy.** If the first build fails because the database wasn't attached yet,
   click **Redeploy** once the Postgres store exists.

Then open the URL. With `ALLOW_DEMO_LOGIN=1`, one click on **Enter the workbench**
signs you in. For real sign-in, set `EMAIL_SERVER`/`EMAIL_FROM` (any SMTP or a
provider like Resend) and leave demo login off.

**Auth in dev:** with no `EMAIL_SERVER`, the magic-link URL prints to the server
console — open it to sign in. Or set `ALLOW_DEMO_LOGIN=1` in `.env` for the
one-click button locally too.

## Architecture notes

- **Gates live in `src/lib/stages.ts`** and are enforced in `src/server/*`
  actions — the UI can never skip a gate.
- **`EvidenceEntry` and `DecisionLogEntry` are append-only** by design: there
  are no edit/delete actions for them. The log is what makes the app worth
  returning to.
- **Each AI stage module** (`src/lib/ai/*`) forces a single tool call whose
  input schema *is* the stage's output contract, so responses are always typed.
- SQLite doesn't support Prisma enums or scalar arrays, so enums are validated
  `String`s (`src/lib/types.ts`) and array fields are JSON-encoded text
  (`asStringArray`/`encodeStringArray`). One schema, both engines.
