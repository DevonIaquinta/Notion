import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// Seeds a realistic demo: one signed-in user with a full active case file plus
// a stocked graveyard, and prints a session cookie for previewing while signed
// in. Safe to re-run — it clears the demo user first.
const DEMO_EMAIL = "briannahowes75@gmail.com";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    await prisma.venture.deleteMany({ where: { userId: existing.id } });
    await prisma.constraintProfile.deleteMany({ where: { userId: existing.id } });
    await prisma.session.deleteMany({ where: { userId: existing.id } });
  }

  const user =
    existing ??
    (await prisma.user.create({
      data: { email: DEMO_EMAIL, emailVerified: new Date() },
    }));

  await prisma.constraintProfile.create({
    data: {
      userId: user.id,
      capitalAvailable: 8000,
      hoursPerWeek: 12,
      monthsUntilRevenueNeeded: 6,
      riskTolerance: "MEDIUM",
      accessAssets: JSON.stringify([
        "12 years managing commercial HVAC installs",
        "Sister runs a 4-location dental group",
        "On a first-name basis with 30+ facilities managers",
      ]),
      toleranceProfile: JSON.stringify([
        "Cold outreach doesn't rattle me",
        "Happy to read dense equipment manuals and code",
        "Fine with 5am job-site starts",
      ]),
      hardExclusions: JSON.stringify(["No holding inventory", "No W-2 employees in year one"]),
    },
  });

  // --- Active venture: mid-evidence, the centerpiece ------------------------
  const active = await prisma.venture.create({
    data: {
      userId: user.id,
      title: "Preventive HVAC checks for dental offices",
      oneLiner:
        "A subscription that keeps dental-office HVAC in spec so compressors don't fail mid-procedure.",
      fitReason:
        "Sits directly on his HVAC experience and his sister's dental network — not a generic idea.",
      status: "ACTIVE",
      currentStage: "EVIDENCE",
    },
  });

  await prisma.killCriterion.createMany({
    data: [
      {
        ventureId: active.id,
        statement:
          "If fewer than 4 of 10 practice managers I interview have had an HVAC issue disrupt a procedure in the last year, I stop.",
        isFalsifiable: true,
      },
      {
        ventureId: active.id,
        statement:
          "If none of the first 8 will name a dollar figure they'd pay monthly, I stop.",
        isFalsifiable: true,
      },
      {
        ventureId: active.id,
        statement:
          "If I can't service 6 offices in a 30-minute radius, the route math doesn't work and I stop.",
        isFalsifiable: true,
      },
    ],
  });

  const aWtp = await prisma.assumption.create({
    data: {
      ventureId: active.id,
      statement: "Practice managers will pay $200+/month to prevent HVAC-caused downtime.",
      riskLevel: "FATAL",
      status: "TESTING",
    },
  });
  const aPain = await prisma.assumption.create({
    data: {
      ventureId: active.id,
      statement: "HVAC failures actually disrupt dental procedures often enough to matter.",
      riskLevel: "FATAL",
      status: "SUPPORTED",
    },
  });
  await prisma.assumption.create({
    data: {
      ventureId: active.id,
      statement: "Offices will grant recurring after-hours access for servicing.",
      riskLevel: "SERIOUS",
      status: "UNTESTED",
    },
  });

  const ev = (
    daysAgo: number,
    type: string,
    source: string,
    claimTested: string,
    finding: string,
    verdict: string,
    assumptionId?: string,
  ) => ({
    ventureId: active.id,
    type,
    source,
    date: new Date(Date.now() - daysAgo * 86400000),
    claimTested,
    finding,
    verdict,
    assumptionId,
  });

  await prisma.evidenceEntry.create({
    data: ev(2, "CONVERSATION", "Maria Alvarez, office manager, Bright Smiles",
      "Whether HVAC downtime is a real, recent pain",
      "Lost a full afternoon in July when the AC died mid-crown; had to reschedule 6 patients and comp two.",
      "SUPPORTS", aPain.id),
  });
  await prisma.evidenceEntry.create({
    data: ev(4, "CONVERSATION", "Dr. Patel, owner, Riverside Dental",
      "Willingness to pay for prevention",
      "Said $150/mo felt fair for peace of mind but wanted a same-week response guarantee.",
      "INCONCLUSIVE", aWtp.id),
  });
  await prisma.evidenceEntry.create({
    data: ev(5, "CONVERSATION", "Tanya Brooks, manager, Summit Pediatric Dentistry",
      "Willingness to pay for prevention",
      "Already pays a handyman ad hoc; would switch to $200/mo if it included filter changes.",
      "SUPPORTS", aWtp.id),
  });
  await prisma.evidenceEntry.create({
    data: ev(6, "CONVERSATION", "Greg Nunez, facilities lead, 3-office group",
      "Whether decisions are centralized",
      "Buys facilities services for all three locations himself — one contract could cover multiple sites.",
      "SUPPORTS"),
  });
  await prisma.evidenceEntry.create({
    data: ev(9, "CONVERSATION", "Dr. Lin, owner, Lin Family Dental",
      "Willingness to pay for prevention",
      "Skeptical — hasn't had a failure, sees it as insurance he doesn't need. Wouldn't commit.",
      "CONTRADICTS", aWtp.id),
  });
  await prisma.evidenceEntry.create({
    data: ev(11, "COMPETITOR", "GenericFacilities Co. pricing page",
      "What incumbents charge",
      "Bundled facilities plans run $400+/mo but treat HVAC as one line item, not a specialty.",
      "SUPPORTS"),
  });

  await prisma.decisionLogEntry.createMany({
    data: [
      {
        ventureId: active.id,
        stage: "IDEA_INTAKE",
        decision: "Opened case: Preventive HVAC checks for dental offices",
        reasoning: "Leans on HVAC background and sister's dental network.",
      },
      {
        ventureId: active.id,
        stage: "KILL_CRITERIA",
        decision: "Advanced to assumption mapping",
        reasoning: "Gate clear — Write 3 kill criteria, each falsifiable.",
      },
      {
        ventureId: active.id,
        stage: "ASSUMPTION_MAPPING",
        decision: "Advanced to evidence",
        reasoning: "Gate clear — Mark at least one assumption fatal.",
      },
    ],
  });

  // --- Graveyard: three kills so pattern surfacing unlocks ------------------
  const kills = [
    {
      title: "AI meal-plan app for lifters",
      oneLiner: "Generates weekly bulking/cutting meal plans from your macros.",
      currentStage: "ASSUMPTION_MAPPING",
      killReason:
        "Everyone I talked to already uses a free spreadsheet or ChatGPT. No wedge, and it's on every generic ideas list — exactly what this tool warns against.",
    },
    {
      title: "Marketplace for used lab equipment",
      oneLiner: "eBay for decommissioned dental and medical gear.",
      currentStage: "EVIDENCE",
      killReason:
        "Requires holding or brokering inventory, which is a hard exclusion for me. Killed before sinking more time.",
    },
    {
      title: "Subscription box for HAM radio kits",
      oneLiner: "Monthly build-it-yourself electronics kits for radio hobbyists.",
      currentStage: "KILL_CRITERIA",
      killReason:
        "Fun, but it's a hobby not a business — nobody I asked would pay past the novelty of month one. Chasing enthusiasm again.",
    },
  ];
  for (const [i, k] of kills.entries()) {
    await prisma.venture.create({
      data: {
        userId: user.id,
        title: k.title,
        oneLiner: k.oneLiner,
        status: "KILLED",
        currentStage: k.currentStage,
        killReason: k.killReason,
        killedAt: new Date(Date.now() - (20 + i * 9) * 86400000),
        decisionLog: {
          create: {
            stage: k.currentStage,
            decision: "Killed case",
            reasoning: k.killReason,
          },
        },
      },
    });
  }

  // --- A live session so the preview is signed in ---------------------------
  const sessionToken = randomUUID();
  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires: new Date(Date.now() + 7 * 86400000),
    },
  });

  console.log("Seeded demo for", DEMO_EMAIL);
  console.log("ACTIVE_VENTURE_ID=" + active.id);
  console.log("SESSION_TOKEN=" + sessionToken);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
