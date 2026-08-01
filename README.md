# Care Circle — Notion provisioner

Provisions the **Care Circle** aging-parent care-coordination workspace in
Notion from a single build config (`care-circle.config.json`), using the
data-source API model (`Notion-Version` `2025-09-03` or later).

Nine linked databases (Contacts, Care Team, Conditions, Medications, Care Log,
Appointments, Coverage, Expenses, Documents) plus four content pages (Emergency
Sheet, Home dashboard, Setup Guide, Hard Conversations Prep).

## How it works

The script runs the **two passes** the config's build order requires, because a
relation can only be created once both data sources exist:

1. **Pass 1** — create every data source with its **non-relation** properties
   (title, text, select, number, date, checkbox, url, email, phone, files).
2. **Pass 2** — patch in the rest, in dependency order:
   - **relations** (point at the target data source),
   - **rollups** (travel through a relation — created here if the config only
     implies the reverse side, e.g. Care Team's `Expenses` rollup),
   - **status** (best-effort shell — see limitations),
   - **formulas** (may reference rollups; placeholder expressions are deferred).

Then it creates the content pages and writes `build-report.md`.

## Usage

```bash
npm install

# required: an internal integration token, shared with the parent page
export NOTION_TOKEN="secret_xxx"
# the page the whole workspace is created under
export NOTION_PARENT_PAGE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

npm run provision            # live
npm run dry-run              # plan only — calls nothing
node provision.js path/to/other.config.json
```

The integration must be shared with the parent page (Notion → page → `•••` →
**Connections** → add your integration) or every create call returns 404.

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `NOTION_TOKEN` | yes | Internal integration secret. |
| `NOTION_PARENT_PAGE_ID` | yes* | Parent page id. Overrides `meta.parent_page_id`. |
| `NOTION_VERSION` | no | Overrides the `Notion-Version` header. Defaults to `meta.notion_api_version` (`2026-04-01`), falling back to `2025-09-03`. |
| `DRY_RUN` | no | `1` to plan without calling the API. |

\* Required unless set via `meta.parent_page_id` in the config.

> **Note on `Notion-Version`.** The config declares `2026-04-01`. If your
> workspace hasn't been rolled that version yet, requests will 400 — set
> `NOTION_VERSION=2025-09-03` (the earliest version with the data-source model).

## What the API can't do — see `build-report.md`

The public API can't build a few things, so instead of silently dropping them
the script collects them into `build-report.md` for a quick manual finish:

- **Views.** The API can't create database views. Every view from the config is
  listed (type, grouping, sorts, filters) so you can recreate it fast; each
  database keeps its default table view.
- **Status options/groups.** The API can't define status option names or their
  To-do / In progress / Complete groups — the report lists the intended groups.
- **Linked-database blocks.** The dashboard/ER-sheet linked views are left as
  placeholder callouts and listed for manual replacement.
- **Placeholder formulas.** Care Team's `Fair Share` uses a `<TOTAL_EXPENSES>`
  placeholder that can't be auto-resolved; it's reported for manual completion.
- **Database templates & gallery/chart views** — noted from `build_notes`.

## Privacy

This provisions structure only — no personal data. As the config's build notes
stress: Notion is **not** HIPAA-covered storage and **not** a password manager.
Don't store SSNs, full account numbers, or credentials in it, and nothing here
is medical, legal, or tax advice.
