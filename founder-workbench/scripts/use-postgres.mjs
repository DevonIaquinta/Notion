// Deploy-only: flip the Prisma datasource from SQLite (local dev default) to
// Postgres for hosted builds (Vercel + Neon). Runs inside `vercel-build`, which
// executes on Vercel's ephemeral build machine — the committed schema stays
// SQLite so local `npm run dev` is untouched.
import { readFileSync, writeFileSync } from "node:fs";

const schemaPath = new URL("../prisma/schema.prisma", import.meta.url);
const original = readFileSync(schemaPath, "utf8");

if (original.includes('provider = "postgresql"')) {
  console.log("[use-postgres] provider already postgresql — nothing to do");
} else {
  const updated = original.replace('provider = "sqlite"', 'provider = "postgresql"');
  if (updated === original) {
    console.error("[use-postgres] could not find the sqlite provider line");
    process.exit(1);
  }
  writeFileSync(schemaPath, updated);
  console.log("[use-postgres] datasource provider set to postgresql for this build");
}
