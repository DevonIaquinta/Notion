#!/usr/bin/env node
/**
 * Care Circle — Notion workspace provisioner
 * ------------------------------------------
 * Reads a build config (see care-circle.config.json) and provisions the
 * workspace against the Notion data-source API (2025-09-03 model, `dataSources`
 * namespace).
 *
 * Two passes, exactly as the config's build_order note asks:
 *   Pass 1  create every data source with its NON-relation properties only.
 *   Pass 2  patch relations, then rollups (which depend on relations), then
 *           status + formulas (which may depend on rollups).
 *
 * Anything the public API can't build today (view definitions, gallery/chart
 * views, linked-database blocks, DB templates, custom status groups) is not
 * silently dropped — it's collected into build-report.md so a human can finish
 * the last mile in the UI in a few minutes.
 *
 * Usage:
 *   NOTION_TOKEN=secret_xxx \
 *   NOTION_PARENT_PAGE_ID=xxxxxxxx \
 *   node provision.js [path/to/config.json]
 *
 * Env:
 *   NOTION_TOKEN           (required) internal integration secret
 *   NOTION_PARENT_PAGE_ID  parent page id; overrides meta.parent_page_id
 *   NOTION_VERSION         override the Notion-Version header (default: config
 *                          meta.notion_api_version, falling back to 2025-09-03)
 *   DRY_RUN=1              plan only — print what would be created, call nothing
 */

import { Client, APIErrorCode } from "@notionhq/client";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ── small utilities ────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rt = (content) => (content ? [{ type: "text", text: { content } }] : []);
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const THROTTLE_MS = 350; // Notion allows ~3 writes/sec; stay under it.

// Property types that reference other data sources or computed values, and so
// can only be added in pass 2 once every data source id is known.
const DEFERRED_TYPES = new Set(["relation", "rollup", "formula", "status"]);

// Notion number-format names that differ from the friendly config values.
const NUMBER_FORMAT = {
  dollar: "dollar",
  percent: "percent",
  number: "number",
};

function log(...args) {
  console.log(...args);
}
function warn(...args) {
  console.warn("  ⚠ ", ...args);
}

/** Retry transient Notion failures (rate limit / conflict / 5xx) with backoff. */
async function withRetry(fn, label, tries = 5) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.status;
      const retriable =
        status === 429 ||
        status === 409 ||
        status === 502 ||
        status === 503 ||
        err?.code === APIErrorCode.ConflictError ||
        err?.code === APIErrorCode.RateLimited;
      if (attempt >= tries - 1 || !retriable) throw err;
      const retryAfter = Number(err?.headers?.["retry-after"]);
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 2 ** attempt * 500;
      warn(`${label}: ${status || err?.code} — retrying in ${waitMs}ms`);
      await sleep(waitMs);
    }
  }
}

// ── config loading & validation ────────────────────────────────────────────

function loadConfig(path) {
  const raw = readFileSync(path, "utf8");
  const cfg = JSON.parse(raw);
  if (!Array.isArray(cfg.databases) || cfg.databases.length === 0) {
    throw new Error("config.databases is empty");
  }
  // Index databases by key and enforce the declared build order.
  cfg.byKey = Object.fromEntries(cfg.databases.map((d) => [d.key, d]));
  const order = cfg.meta?.build_order?.length
    ? cfg.meta.build_order
    : cfg.databases.map((d) => d.key);
  cfg.orderedKeys = order.filter((k) => cfg.byKey[k]);
  // Append any db not named in build_order so nothing is skipped.
  for (const d of cfg.databases) {
    if (!cfg.orderedKeys.includes(d.key)) cfg.orderedKeys.push(d.key);
  }
  return cfg;
}

// ── property schema builders ───────────────────────────────────────────────

function selectOptions(options = []) {
  return { options: options.map((name) => ({ name })) };
}

/**
 * Build the Notion schema for a NON-deferred property, or null if the property
 * is a relation/rollup/formula/status (handled in pass 2).
 */
function buildSimpleProperty(spec) {
  switch (spec.type) {
    case "title":
      return { title: {} };
    case "rich_text":
      return { rich_text: {} };
    case "number":
      return { number: { format: NUMBER_FORMAT[spec.format] ?? "number" } };
    case "select":
      return { select: selectOptions(spec.options) };
    case "multi_select":
      return { multi_select: selectOptions(spec.options) };
    case "date":
      return { date: {} };
    case "checkbox":
      return { checkbox: {} };
    case "url":
      return { url: {} };
    case "email":
      return { email: {} };
    case "phone_number":
      return { phone_number: {} };
    case "files":
      return { files: {} };
    default:
      return null; // deferred type
  }
}

// ── block builders (for the content pages) ─────────────────────────────────

/**
 * Turn one config block into Notion block(s). linked_view blocks can't be
 * created via the API, so they render as a visible placeholder callout AND get
 * recorded for the manual report. Returns an array (columns expand to many).
 */
function buildBlocks(block, report) {
  switch (block.type) {
    case "callout":
      return [{
        object: "block",
        type: "callout",
        callout: { rich_text: rt(block.text), icon: { type: "emoji", emoji: "💡" } },
      }];
    case "heading_1":
    case "heading_2":
    case "heading_3":
      return [{
        object: "block",
        type: block.type,
        [block.type]: { rich_text: rt(block.text) },
      }];
    case "paragraph":
      return [{
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: rt(block.text) },
      }];
    case "to_do":
      return [{
        object: "block",
        type: "to_do",
        to_do: { rich_text: rt(block.text), checked: false },
      }];
    case "columns": {
      const columns = (block.children || []).map((col) => ({
        object: "block",
        type: "column",
        column: {
          children: (col.blocks || []).flatMap((b) => buildBlocks(b, report)),
        },
      }));
      // A column_list needs at least two populated columns; skip degenerate ones.
      if (columns.length < 2) {
        return (block.children || []).flatMap((col) =>
          (col.blocks || []).flatMap((b) => buildBlocks(b, report)),
        );
      }
      return [{ object: "block", type: "column_list", column_list: { children: columns } }];
    }
    case "linked_view": {
      report.linkedViews.push({ source: block.source, view: block.view });
      return [{
        object: "block",
        type: "callout",
        callout: {
          rich_text: rt(`🔗 Add a linked view here → "${block.source}" · view "${block.view}"`),
          icon: { type: "emoji", emoji: "🔗" },
          color: "gray_background",
        },
      }];
    }
    default:
      warn(`unknown block type "${block.type}" — skipped`);
      return [];
  }
}

// ── pass 1: create data sources with simple properties ─────────────────────

async function pass1CreateDatabases(notion, cfg, ctx) {
  log("\n▶ Pass 1 — creating data sources (non-relation properties)");
  for (const key of cfg.orderedKeys) {
    const db = cfg.byKey[key];
    const properties = {};
    for (const [propName, spec] of Object.entries(db.properties)) {
      const schema = buildSimpleProperty(spec);
      if (schema) properties[propName] = schema;
      else ctx.deferred.push({ key, propName, spec });
    }

    if (DRY_RUN) {
      log(`  · [dry-run] ${db.title} (${Object.keys(properties).length} props)`);
      ctx.db[key] = { database_id: `dryrun_db_${key}`, data_source_id: `dryrun_ds_${key}`, url: "" };
      continue;
    }

    const payload = {
      parent: { type: "page_id", page_id: cfg.parentPageId },
      title: rt(db.title),
      ...(db.icon ? { icon: { type: "emoji", emoji: db.icon } } : {}),
      ...(db.description ? { description: rt(db.description) } : {}),
      initial_data_source: { properties },
    };

    const created = await withRetry(
      () => notion.databases.create(payload),
      `create ${key}`,
    );
    const dataSourceId = created.data_sources?.[0]?.id;
    ctx.db[key] = {
      database_id: created.id,
      data_source_id: dataSourceId,
      url: created.url,
    };
    log(`  ✓ ${db.icon || ""} ${db.title}  ds=${dataSourceId}`);
    await sleep(THROTTLE_MS);
  }
}

// ── pass 2 helpers ─────────────────────────────────────────────────────────

/** Patch a single property onto a data source, isolating per-property errors. */
async function patchProperty(notion, dsId, propName, schema, label) {
  if (DRY_RUN) {
    log(`  · [dry-run] ${label}: ${propName}`);
    return true;
  }
  await withRetry(
    () => notion.dataSources.update({ data_source_id: dsId, properties: { [propName]: schema } }),
    label,
  );
  await sleep(THROTTLE_MS);
  return true;
}

/**
 * Add a relation property, using the 2025-09-03 data-source key. If the API
 * rejects `data_source_id` (older version header), fall back to `database_id`.
 */
async function addRelation(notion, dsId, propName, targetIds, label) {
  const kind = { type: "single_property", single_property: {} };
  try {
    return await patchProperty(
      notion, dsId, propName,
      { relation: { data_source_id: targetIds.data_source_id, ...kind } },
      label,
    );
  } catch (err) {
    warn(`${label}: retrying relation with legacy database_id`);
    return await patchProperty(
      notion, dsId, propName,
      { relation: { database_id: targetIds.database_id, ...kind } },
      label,
    );
  }
}

// ── pass 2a: relations ─────────────────────────────────────────────────────

async function pass2Relations(notion, cfg, ctx) {
  log("\n▶ Pass 2a — patching relations");
  for (const key of cfg.orderedKeys) {
    const db = cfg.byKey[key];
    for (const [propName, spec] of Object.entries(db.properties)) {
      if (spec.type !== "relation") continue;
      const target = ctx.db[spec.target];
      if (!target) {
        warn(`${key}.${propName}: unknown relation target "${spec.target}" — skipped`);
        ctx.report.skipped.push(`${db.title} › ${propName}: relation target "${spec.target}" not found`);
        continue;
      }
      await addRelation(notion, ctx.db[key].data_source_id, propName, target, `${key}.${propName} → ${spec.target}`);
      ctx.relationsByKey[key].add(propName);
      log(`  ✓ ${db.title} › ${propName} → ${cfg.byKey[spec.target].title}`);
    }
  }
}

// ── pass 2b: rollups ───────────────────────────────────────────────────────

/**
 * A rollup rolls up a property THROUGH a relation that lives on the same data
 * source. The config names that relation (e.g. "Expenses") even when it isn't
 * declared as a forward relation — it's meant to be the reverse side. If the
 * named relation doesn't exist yet, create it here as a single-property
 * relation to the data source that owns the rollup's target property.
 */
function inferRollupTarget(cfg, targetProperty) {
  for (const db of cfg.databases) {
    if (Object.prototype.hasOwnProperty.call(db.properties, targetProperty)) {
      return db.key;
    }
  }
  return null;
}

async function pass2Rollups(notion, cfg, ctx) {
  log("\n▶ Pass 2b — patching rollups");
  for (const key of cfg.orderedKeys) {
    const db = cfg.byKey[key];
    for (const [propName, spec] of Object.entries(db.properties)) {
      if (spec.type !== "rollup") continue;

      // Ensure the relation the rollup travels through exists.
      if (!ctx.relationsByKey[key].has(spec.relation)) {
        const targetKey = inferRollupTarget(cfg, spec.target_property);
        if (!targetKey || !ctx.db[targetKey]) {
          warn(`${key}.${propName}: cannot locate relation "${spec.relation}" for rollup — skipped`);
          ctx.report.skipped.push(`${db.title} › ${propName}: rollup relation "${spec.relation}" could not be resolved`);
          continue;
        }
        await addRelation(
          notion,
          ctx.db[key].data_source_id,
          spec.relation,
          ctx.db[targetKey],
          `${key}.${spec.relation} (for rollup) → ${targetKey}`,
        );
        ctx.relationsByKey[key].add(spec.relation);
        log(`  ✓ ${db.title} › ${spec.relation} (relation created for rollup) → ${cfg.byKey[targetKey].title}`);
      }

      const schema = {
        rollup: {
          relation_property_name: spec.relation,
          rollup_property_name: spec.target_property,
          function: spec.function,
        },
      };
      try {
        await patchProperty(notion, ctx.db[key].data_source_id, propName, schema, `${key}.${propName} rollup`);
        log(`  ✓ ${db.title} › ${propName} = ${spec.function}(${spec.relation}.${spec.target_property})`);
      } catch (err) {
        warn(`${key}.${propName}: rollup failed — ${err.message}`);
        ctx.report.skipped.push(`${db.title} › ${propName}: rollup failed (${err.message})`);
      }
    }
  }
}

// ── pass 2c: status (best-effort) ──────────────────────────────────────────

async function pass2Status(notion, cfg, ctx) {
  log("\n▶ Pass 2c — status properties (best-effort)");
  for (const key of cfg.orderedKeys) {
    const db = cfg.byKey[key];
    for (const [propName, spec] of Object.entries(db.properties)) {
      if (spec.type !== "status") continue;
      // The API cannot define custom status options/groups; record them so they
      // can be set up in the UI regardless of whether the shell property lands.
      ctx.report.status.push({ db: db.title, prop: propName, groups: spec.groups || {} });
      try {
        await patchProperty(notion, ctx.db[key].data_source_id, propName, { status: {} }, `${key}.${propName} status`);
        ctx.statusCreated.add(`${key}.${propName}`);
        log(`  ✓ ${db.title} › ${propName} (status shell created — configure options in UI)`);
      } catch (err) {
        warn(`${key}.${propName}: status not creatable via API — configure in UI`);
      }
    }
  }
}

// ── pass 2d: formulas ──────────────────────────────────────────────────────

const PLACEHOLDER = /<[^>]+>/; // e.g. <TOTAL_EXPENSES> — cannot be auto-resolved

async function pass2Formulas(notion, cfg, ctx) {
  log("\n▶ Pass 2d — formulas");
  for (const key of cfg.orderedKeys) {
    const db = cfg.byKey[key];
    for (const [propName, spec] of Object.entries(db.properties)) {
      if (spec.type !== "formula") continue;

      if (PLACEHOLDER.test(spec.expression)) {
        warn(`${key}.${propName}: expression has an unresolved placeholder — recorded for manual completion`);
        ctx.report.formulas.push({ db: db.title, prop: propName, expression: spec.expression });
        continue;
      }
      try {
        await patchProperty(notion, ctx.db[key].data_source_id, propName, { formula: { expression: spec.expression } }, `${key}.${propName} formula`);
        log(`  ✓ ${db.title} › ${propName}`);
      } catch (err) {
        warn(`${key}.${propName}: formula rejected — ${err.message}`);
        ctx.report.formulas.push({ db: db.title, prop: propName, expression: spec.expression, error: err.message });
      }
    }
  }
}

// ── content pages ──────────────────────────────────────────────────────────

async function createPages(notion, cfg, ctx) {
  log("\n▶ Creating content pages");
  for (const page of cfg.pages || []) {
    const children = (page.blocks || []).flatMap((b) => buildBlocks(b, ctx.report));

    // Pull a leading emoji out of the title to use as the page icon.
    const emojiMatch = page.title.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
    const icon = emojiMatch ? { type: "emoji", emoji: emojiMatch[0] } : undefined;

    if (DRY_RUN) {
      log(`  · [dry-run] page "${page.title}" (${children.length} blocks)`);
      continue;
    }

    const created = await withRetry(
      () => notion.pages.create({
        parent: { type: "page_id", page_id: cfg.parentPageId },
        ...(icon ? { icon } : {}),
        properties: { title: { title: rt(page.title) } },
        children,
      }),
      `page ${page.key}`,
    );
    ctx.pages.push({ key: page.key, title: page.title, url: created.url });
    log(`  ✓ ${page.title}`);
    await sleep(THROTTLE_MS);
  }
}

// ── build report ───────────────────────────────────────────────────────────

function writeReport(cfg, ctx, outPath) {
  const L = [];
  L.push(`# Care Circle — build report`);
  L.push(``);
  L.push(`Generated ${new Date().toISOString()}${DRY_RUN ? " (DRY RUN — nothing was created)" : ""}`);
  L.push(``);
  L.push(`## Data sources created`);
  L.push(``);
  L.push(`| Database | database_id | data_source_id | URL |`);
  L.push(`| --- | --- | --- | --- |`);
  for (const key of cfg.orderedKeys) {
    const d = ctx.db[key];
    L.push(`| ${cfg.byKey[key].title} | ${d?.database_id ?? "—"} | ${d?.data_source_id ?? "—"} | ${d?.url ?? ""} |`);
  }
  L.push(``);
  if (ctx.pages.length) {
    L.push(`## Pages created`);
    L.push(``);
    for (const p of ctx.pages) L.push(`- **${p.title}** — ${p.url}`);
    L.push(``);
  }

  // Views — not creatable via the public API today; list them for the UI.
  L.push(`## Views to build in the UI`);
  L.push(``);
  L.push(`The public API cannot yet create database views, so every view below`);
  L.push(`must be added by hand (each database already has its default table view).`);
  L.push(``);
  for (const key of cfg.orderedKeys) {
    const db = cfg.byKey[key];
    if (!db.views?.length) continue;
    L.push(`### ${db.title}`);
    for (const v of db.views) {
      const bits = [`**${v.name}** — \`${v.type}\``];
      if (v.group_by) bits.push(`group by _${v.group_by}_`);
      if (v.date_property) bits.push(`date _${v.date_property}_`);
      if (v.sorts) bits.push(`sort ${v.sorts.map((s) => `${s.property} ${s.direction}`).join(", ")}`);
      if (v.filter) bits.push(`filter \`${JSON.stringify(v.filter)}\``);
      if (v.aggregate) bits.push(`aggregate _${v.aggregate}_`);
      L.push(`- ${bits.join(" · ")}`);
    }
    L.push(``);
  }

  if (ctx.report.status.length) {
    L.push(`## Status properties — configure options/groups in the UI`);
    L.push(``);
    L.push(`The API can't define status option names or their To-do / In progress / Complete groups.`);
    L.push(``);
    for (const s of ctx.report.status) {
      const grp = Object.entries(s.groups).map(([g, opts]) => `${g}: ${opts.join(", ")}`).join("  |  ");
      L.push(`- **${s.db} › ${s.prop}** — ${grp || "(default groups)"}`);
    }
    L.push(``);
  }

  if (ctx.report.formulas.length) {
    L.push(`## Formulas needing manual attention`);
    L.push(``);
    for (const f of ctx.report.formulas) {
      L.push(`- **${f.db} › ${f.prop}**`);
      L.push(`  - \`${f.expression}\``);
      if (f.error) L.push(`  - error: ${f.error}`);
      else L.push(`  - contains a \`<placeholder>\` — replace it with a real value or property reference.`);
    }
    L.push(``);
  }

  if (ctx.report.linkedViews.length) {
    L.push(`## Linked views to insert on pages`);
    L.push(``);
    L.push(`Linked-database blocks can't be created via the API. Each was left as a`);
    L.push(`placeholder callout on its page — replace it with a linked view of:`);
    L.push(``);
    for (const lv of ctx.report.linkedViews) {
      L.push(`- source **${cfg.byKey[lv.source]?.title ?? lv.source}**, view **${lv.view}**`);
    }
    L.push(``);
  }

  if (ctx.report.skipped.length) {
    L.push(`## Skipped / needs review`);
    L.push(``);
    for (const s of ctx.report.skipped) L.push(`- ${s}`);
    L.push(``);
  }

  if (cfg.build_notes) {
    L.push(`## Build notes (from config)`);
    L.push(``);
    for (const [k, v] of Object.entries(cfg.build_notes)) L.push(`- **${k}**: ${v}`);
    L.push(``);
  }

  const out = L.join("\n");
  writeFileSync(outPath, out, "utf8");
  return out;
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const configPath = resolve(process.argv[2] || "care-circle.config.json");
  const cfg = loadConfig(configPath);

  cfg.parentPageId = process.env.NOTION_PARENT_PAGE_ID || cfg.meta?.parent_page_id;
  const notionVersion =
    process.env.NOTION_VERSION || cfg.meta?.notion_api_version || "2025-09-03";

  if (!DRY_RUN) {
    if (!process.env.NOTION_TOKEN) throw new Error("NOTION_TOKEN is not set");
    if (!cfg.parentPageId || cfg.parentPageId === "REPLACE_WITH_PAGE_ID") {
      throw new Error(
        "Parent page id is not set. Provide NOTION_PARENT_PAGE_ID or edit meta.parent_page_id in the config.",
      );
    }
  }

  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
    notionVersion,
  });

  log(`Care Circle provisioner`);
  log(`  config:        ${configPath}`);
  log(`  Notion-Version ${notionVersion}`);
  log(`  parent page:   ${cfg.parentPageId}`);
  log(`  mode:          ${DRY_RUN ? "DRY RUN" : "LIVE"}`);

  const ctx = {
    db: {}, // key -> { database_id, data_source_id, url }
    pages: [],
    deferred: [], // deferred property specs (informational)
    relationsByKey: Object.fromEntries(cfg.orderedKeys.map((k) => [k, new Set()])),
    statusCreated: new Set(),
    report: { status: [], formulas: [], linkedViews: [], skipped: [] },
  };

  await pass1CreateDatabases(notion, cfg, ctx);
  await pass2Relations(notion, cfg, ctx);
  await pass2Rollups(notion, cfg, ctx);
  await pass2Status(notion, cfg, ctx);
  await pass2Formulas(notion, cfg, ctx);
  await createPages(notion, cfg, ctx);

  const reportPath = resolve("build-report.md");
  writeReport(cfg, ctx, reportPath);

  log(`\n✅ Done.`);
  log(`   ${Object.keys(ctx.db).length} data sources, ${ctx.pages.length} pages.`);
  log(`   Manual follow-ups written to ${reportPath}`);
}

main().catch((err) => {
  console.error("\n✗ Provisioning failed:");
  console.error(err?.body ? JSON.stringify(err.body, null, 2) : err);
  process.exit(1);
});
