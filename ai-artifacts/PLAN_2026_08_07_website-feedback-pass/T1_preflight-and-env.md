# T1: Preflight and asset gate

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** none
**Commit outcome:** `npm run preflight` inside `website/` reports, in one pass, whether the toolchain and the five source illustrations this plan consumes are present.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md` on the Astro site in `website/`. Home page, card page, archetype page, footer, hover preview, page transitions change; three new route trees (`/docs/`, `/blog/`, `/decks/`) get built.
- This slice: the first ticket. It frontloads every external prerequisite so no later ticket blocks on a missing dependency or a missing asset.
- Out of scope here: any page, style, or content change. Do not touch `src/`. No image is generated here — T11 does that.
- Assumptions in force: Playwright e2e cannot run on this host, so gates are Node/vitest/build-time only. No generative image service is used anywhere in this plan; hero art is derived from the committed original illustrations with `sharp`.

## Requirements

- New file `website/scripts/check-preflight.mjs` exporting a pure function, a source-path constant, and running as a CLI.
- New npm script `preflight` in `website/package.json`.
- Exit code 1 with an actionable message per missing prerequisite; exit 0 and one summary line when all pass.
- Checks: Node major version is 24; `website/node_modules/astro/package.json` exists; each of the five source illustrations listed in `HERO_SOURCES` exists at the repo root.

## Inputs

- `website/package.json` — `engines.node` is `>=24 <25`; append `preflight` to the scripts block after `format:check`.
- `website/scripts/check-budgets.mjs` — style reference for a gate script (top-level await, `process.stdout.write` on success, `throw new Error` on failure).
- Source illustrations, repo-root relative. All five exist today, each a 624×624 JPEG illustration crop with no card frame:
  | Section slug | Source |
  | --- | --- |
  | `non-archetype` | `original_images/Effect Monster/Ash Blossom & Joyous Spring.jpg` |
  | `burning-abyss` | `original_images/Xyz/Dante, Traveler of the Burning Abyss.jpg` |
  | `shaddoll` | `original_images/Fusion/El Shaddoll Construct.jpg` |
  | `nekroz` | `original_images/Ritual/Nekroz of Trishula.jpg` |
  | `spellbook` | `original_images/Effect Monster/High Priestess of Prophecy.jpg` |
- **From Depends:** none.

## TDD

1. **Red** — write `website/tests/unit/preflight.test.ts` first, importing `preflightIssues` and `HERO_SOURCES` from `../../scripts/check-preflight.mjs`. All five cases fail because the module does not exist.
2. **Green** — implement `check-preflight.mjs` with `HERO_SOURCES`, `preflightIssues`, plus the CLI tail.
3. **Refactor** — none expected. Keep the module under 60 lines.

Exact exports the test and the CLI both use:

```js
/** slug -> repo-root-relative path of the original illustration */
export const HERO_SOURCES = {
  'non-archetype': 'original_images/Effect Monster/Ash Blossom & Joyous Spring.jpg',
  'burning-abyss': 'original_images/Xyz/Dante, Traveler of the Burning Abyss.jpg',
  shaddoll: 'original_images/Fusion/El Shaddoll Construct.jpg',
  nekroz: 'original_images/Ritual/Nekroz of Trishula.jpg',
  spellbook: 'original_images/Effect Monster/High Priestess of Prophecy.jpg',
};

/**
 * @param {{ nodeVersion: string, hasAstro: boolean, missingSources: string[] }} env
 * @returns {string[]} one human-readable line per unmet prerequisite, empty when ready
 */
export function preflightIssues(env)
```

Exact messages (assert these strings verbatim):

- `Node 24 required, found <nodeVersion>` when `!/^v?24\./.test(env.nodeVersion)`
- `website/node_modules missing — run: cd website && npm install` when `!env.hasAstro`
- `source illustration missing: <path>` — one line per entry of `env.missingSources`, in the given order

Order of the returned array: node line first, node_modules line second, then the source lines.

CLI tail behaviour:

```js
const repoRoot = new URL('../../', import.meta.url);
const missingSources = Object.values(HERO_SOURCES).filter(
  (rel) => !existsSync(new URL(rel, repoRoot)),
);
const issues = preflightIssues({
  nodeVersion: process.version,
  hasAstro: existsSync(new URL('../node_modules/astro/package.json', import.meta.url)),
  missingSources,
});
if (issues.length) throw new Error(`preflight failed:\n${issues.join('\n')}`);
process.stdout.write('preflight: node 24, deps, 5 source illustrations ready\n');
```

`new URL(rel, repoRoot)` percent-encodes spaces and `&` correctly; do not string-concatenate the paths.

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `reports nothing when every prerequisite is met` | `{ nodeVersion: 'v24.4.0', hasAstro: true, missingSources: [] }` | `[]` |
| `flags a wrong node major` | same but `nodeVersion: 'v22.11.0'` | contains `Node 24 required, found v22.11.0` |
| `flags missing dependencies and missing art together` | `{ nodeVersion: 'v24.4.0', hasAstro: false, missingSources: ['original_images/Ritual/Nekroz of Trishula.jpg'] }` | length `2`; `[0]` is the node_modules message, `[1]` is `source illustration missing: original_images/Ritual/Nekroz of Trishula.jpg` |
| `lists one line per missing source` | `missingSources` with three paths | length `3`, every line starts `source illustration missing: ` |
| `HERO_SOURCES covers all five sections` | — | `Object.keys(HERO_SOURCES)` equals `['non-archetype','burning-abyss','shaddoll','nekroz','spellbook']` |

Run: `cd website && npx vitest run tests/unit/preflight.test.ts`

## Impl steps

- [x] 1. Create `website/tests/unit/preflight.test.ts` with the five cases above.
- [x] 2. Create `website/scripts/check-preflight.mjs` exporting `HERO_SOURCES` and `preflightIssues`, plus the CLI tail.
- [x] 3. Add `"preflight": "node scripts/check-preflight.mjs"` to `website/package.json` scripts.
- [x] 4. Run `cd website && npm run format` then `npm run lint`.
- [x] 5. Record the baseline: run `cd website && npm run ci` and note pass/fail in the commit body.

No human step. `npm install` already ran in `website/` on 2026-08-07 (`up to date, 469 packages`); Node is `v24.18.0`; all five source illustrations are committed.

## Outputs

- Files touched: `website/scripts/check-preflight.mjs` (new), `website/tests/unit/preflight.test.ts` (new), `website/package.json`.
- Public API: `preflightIssues(env)` and `HERO_SOURCES` exported from `website/scripts/check-preflight.mjs`. T11 imports `HERO_SOURCES`.
- No config or migration.

## Validation

- [x] `cd website && npx vitest run tests/unit/preflight.test.ts` — 5 passed
- [x] `cd website && npm run preflight` — exits 0 and prints `preflight: node 24, deps, 5 source illustrations ready`
- [x] `cd website && npm run lint && npm run format:check` — exit 0
- [x] `cd website && npm run ci` — exit 0
- [x] app functional — no page changed, site builds unchanged
- [x] commit msg draft: `chore(website): add a preflight gate for toolchain and source art`
