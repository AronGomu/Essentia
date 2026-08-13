# ADR 0041 — Docs navigation derives from the docs folder tree

- Date: 2026-08-13
- Status: Proposed
- Scope: `website/scripts/content/docs.mjs`, `website/scripts/content/reading-order.mjs`, `website/content/reading-order.json`, `website/src/lib/docs.ts`, `website/src/components/Navigation.svelte`, the `docs/` tree layout
- Review: `ai-artifacts/GRILL_2026_08_12_feedback_batch_3/round-1.html` Q8-Q9, `round-2.html` Q4-Q5, `round-3.html` Q4-Q5; supersedes the docs half of ADR 0026

## Context

ADR 0026 put doc grouping in `website/content/reading-order.json`: six named groups, each
listing its files by path, with `docs.mjs::groupFor` failing the build for any doc not
listed. Adding a doc means editing JSON; reordering means editing JSON; a doc filed in the
wrong group is invisible until someone reads the rail.

The rail also renders every group expanded as a flat `<p class="nav-label">` heading over a
`<ul>`. With one group per archetype — four today, more later — the rail is a wall.

## Decision

1. Grouping, labelling and ordering all derive from the `docs/` folder tree. The docs half of
   `reading-order.json` is deleted.
2. Group key = the first path segment under `docs/`. Root-level `.md` files are ungrouped and
   render first, alphabetically, under no heading.
3. Group label = the directory name with a leading `NN_` stripped, `_` and `-` replaced by
   spaces, Title Case. `01_general_rules` → `General Rules`; `02_burning_abyss` →
   `Burning Abyss`.
4. Ordering is the natural sort of raw filenames, so numeric prefixes are the ordering
   mechanism and the author controls order by naming alone.
5. Routes **keep** the numbers: `docs/01_general_rules/01_ZONES.md` →
   `/docs/01-general-rules/01-zones/`. The URL mirrors disk, so a page is trivially locatable
   from a link.
6. The alphabetically first root-level doc also serves the `/docs/` route, replacing the
   hardcoded `PRESENTATION.md` special case. `docs/PRESENTATION.md` is renamed
   `docs/00_PRESENTATION.md` so it keeps that position.
7. Groups render as `<details>` in the rail. The group containing the current page is open;
   others are closed; per-group state persists under `essentia.v1.docs-group.{key}`. A
   persisted state never overrides the active group.
8. No doc can fail the build for being unlisted. The remaining doc failures are a missing `#`
   first heading, an oversize file, a symlink, and a duplicate route.

## Consequences

- Adding a doc is `git add` and nothing else. Reordering is a rename.
- Renumbering changes URLs. Accepted: the site is not yet publicly announced, and the
  alternative — stripping numbers from routes — trades that one-time break for permanently
  ambiguous mapping between URL and file.
- Every existing docs URL gains numeric prefixes once, when the tree is migrated.
- `docs/ADR/**` and the per-keyword `docs/keywords/<slug>.md` ruling files stay excluded from
  discovery, exactly as before.
- The rail's Docs/Blog switch is removed at the same time; the header's utility nav is the
  only section switcher (see ADR 0027).
- Group labels come from a deterministic rule, so a folder named for a proper noun must be
  named the way it should read.
