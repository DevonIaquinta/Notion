import { prisma } from "@/lib/prisma";

// Append-only decision log. Never updated or deleted — this record is what
// makes the workbench worth returning to.
export async function logDecision(input: {
  ventureId: string;
  stage: string;
  decision: string;
  reasoning: string;
}) {
  return prisma.decisionLogEntry.create({ data: input });
}
