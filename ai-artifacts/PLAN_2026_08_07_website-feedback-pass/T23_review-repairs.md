# T23: Review repairs

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T1-T22 (all landed)
**Commit outcome:** the defects four deep reviewers confirmed on this branch are fixed, each pinned by a test that fails without the fix.

## Context (self-contained)

- The branch `plan/website-feedback-pass` shipped the `.dev/feedback.md` backlog across 22 tickets: `/docs/`, `/blog/`, `/decks/` route trees, a docs-corpus loader, an extended markdown renderer, a 73-entry keyword registry with rule text, inline keyword reminders on card pages, hover keyword-ruling boxes, a related-cards rule, a site-wide breadcrumb, committed hero art, a rebuilt home page, an archetype-page refresh, removal of the card zoom viewer, and a footer/page-transition change.
- Four read-only reviewers (correctness, security, scope-drift, tests) then reviewed `git diff main...HEAD`. Scope-drift came back clean. The other three confirmed the defects below, each reproduced.
- This slice: fix exactly those defects and pin each with a test. Nothing else.
- Out of scope here: new features, the `.catalog-hero-art` 3:2 crop, a true HD upscale of the hero art, writing Playwright e2e specs (Playwright cannot run on this host), dead CSS cleanup, and every item listed under "Explicitly not in this ticket" below.

## Requirements

Nine fixes. Every one must be pinned by a test or build gate that fails when the fix is reverted.

### R1 — markdown emphasis corrupts identifiers (blocker)

`website/src/lib/markdown.ts` `inline()` escapes the text, substitutes links, substitutes `` ` `` code spans, and only **then** applies `/_([^_]+)_/g` for emphasis — over the HTML it just generated. Every `snake_case` identifier in the corpus is mangled, inside code spans and inside `href` attributes.

Confirmed live: 57 spurious `<em>` across 11 of the 34 `/docs/` pages, and **5 dead GitHub links** in `dist/docs/context/index.html` (`cards<em>mse/`, `original<em>cards/`, `original<em>images/`, `PROJECT<em>RESTRUCTURING</em>PLAN.md`, `WEBSITE<em>V2</em>SPEC.md`). `links:check` misses them because it skips `https:` targets.

Reproductions to fix:

- `` Use `cards_mse/00_drafts/` `` currently → `<code>cards<em>mse/00</em>drafts/</code>`. Must keep the underscores literal.
- `` [`cards_mse/`](../cards_mse/) `` currently emits `<em>` inside the `href`. Must not.

Fix approach: emphasis must only ever apply to plain-text runs — never inside a generated tag, attribute or code span. The straightforward way is to substitute links and code spans to placeholder tokens first, run emphasis on what remains, then restore the placeholders. Whatever the mechanism, the corpus contains **zero** intentional `_emphasis_`, so `_` between word characters must stay literal.

### R2 — `&` in a link URL is double-escaped (should-fix)

`website/src/lib/markdown.ts` — `escapeHtml` runs first, so the captured URL already contains `&amp;`, and the href construction escapes it again. `[Search](https://example.com/?a=1&b=2)` → `href="https://example.com/?a=1&amp;amp;b=2"`, which the browser resolves to a wrong URL. No live instance in the corpus; fix it before one appears.

### R3 — three chrome-gate checks fail open (blocker)

`website/scripts/check-chrome.mjs` — the new-cards check (~line 120), the section-tile check (~line 155) and the footer check (~line 170) are each guarded by `if (block)` and go **silent** when their container regex misses. Confirmed against the real `dist/index.html`: removing the entire new-cards section, renaming its `aria-labelledby`, removing the whole `<footer class="site-footer">`, adding a second class to the footer, or removing every `<a class="section-tile">` each returns `[]` — the build still prints `chrome: 151 pages carry the site header`.

Each of the three must **fail closed**: when the container regex misses on a page the rule applies to, push a problem, the way the nav check already does. The hero-art check (~lines 107/165) already fails closed — match its shape.

### R4 — the chrome unit tests pin the vacuity (blocker)

`website/tests/unit/chrome.test.ts` — `compliantHomeHtml` contains no footer and no new-cards section, yet the tests assert `chromeIssues('index.html', compliantHomeHtml, '/')` is `[]`. Extend the fixture so it is genuinely compliant, and add the missing negative cases: a home page with no new-cards section is flagged; a page with no footer is flagged; a home page with no section tiles is flagged.

### R5 — keyword `term` is unguarded into a raw-HTML sink (security, should-fix)

`website/scripts/content/keywords.mjs` rejects a `definition` containing `<` or `>` but validates `term` only as a non-empty normalized string. `website/src/layouts/BaseLayout.astro` emits the ruling map with `set:html={JSON.stringify(keywordRulings)}` inside `<script type="application/json" id="keyword-rulings">`, unescaped. A term containing `</script>` closes the JSON block and becomes live markup on all 151 pages — and `website/scripts/harden-csp.mjs` then hashes the injected script and allowlists it, so the CSP does not backstop it.

Input is owner-controlled (whoever edits `website/content/keywords.json`), so this is supply-chain class, not remote XSS — but the adjacent field is guarded for exactly this reason. Apply the same `<`/`>` rejection to `term`, with a message in the style of the existing one, and pin it with a registry-fixture test. Belt-and-braces: also escape `<` in the serialized JSON payload at the `set:html` site.

### R6 — `dist/404.html` ships with no CSP (security, should-fix)

`website/src/pages/404.astro` dropped `BaseLayout` and with it the CSP `<meta>`. `grep -rLl "Content-Security-Policy" --include=*.html dist` returns exactly that one file. GitHub Pages serves `404.html` for every unknown path, so the most-reachable URL surface is the only page with no policy. No gate catches it: `scan-dist.mjs` and `harden-csp.mjs` only object to `'unsafe-inline'` when a CSP is *present*, and `check-chrome.mjs` early-returns for `404.html`.

Give the 404 page the same CSP meta the other pages carry (keeping it a standalone meta-refresh document — do **not** reintroduce `BaseLayout`, which would re-add the header, breadcrumb and hover preview to a redirect stub), and extend `website/scripts/scan-dist.mjs` so a built HTML file with **no** CSP is an error, not a pass.

### R7 — the inline keyword reminders can silently become a no-op (blocker)

`website/src/components/RichText.astro` takes `definitions` as an optional prop. Deleting `definitions={ruleDefinitions}` at `website/src/pages/cards/[id].astro` and `website/src/pages/cards/[id]/versions/[package].astro` — or building `ruleDefinitions` as an empty `Map` — drops the 154 `class="reminder"` spans in `dist/` to zero while all unit tests and every gate stay green. Feedback "Cards #2" would be silently unshipped.

Add a build-time assertion that card pages actually emit reminder spans (a card-page rule in `check-chrome.mjs` is the natural home), so reverting the wiring fails `npm run build`.

### R8 — deck-store untrusted-input paths are unpinned (blocker)

`website/src/lib/decks.ts` parses `localStorage` content and user-pasted import JSON. These mutants all survive the current suite — add a test that kills each:

1. `parseEntries` duplicate-`cardId` rejection removed → an import can hold four copies of one card, breaching the two-copy cap, and `DeckManager.svelte`'s keyed `{#each}` throws on render.
2. `parseStoredDeck` returning `null` for one bad deck no longer rejecting the **whole** store (i.e. `continue` instead of `return null`) → a corrupt deck is silently dropped, contradicting the module's "rejected whole rather than partially applied" contract.
3. the `clamped > 0` filter removed → a `quantity: 0` entry survives and renders a zero-copy row.
4. the quantity type check removed → `quantity: "2"` is accepted and deck size concatenates strings.
5. the top-level `Array.isArray` check removed → a bare JSON array is accepted as a store.
6. `exportDeck` widened to emit `id`/`created`/`updated` → contradicts its documented `{ name, main, extra }` shape.

### R9 — `check-preflight.mjs` executes on import (should-fix)

`website/scripts/check-preflight.mjs` has no `import.meta.url === \`file://${process.argv[1]}\`` main-module guard, unlike `check-404.mjs` and `check-chrome.mjs`. `website/tests/unit/preflight.test.ts` imports it, so the gate runs mid-suite; on a host missing `original_images/` or `website/node_modules/astro`, the whole test file aborts at import and its five tests never run. Add the guard and a test that importing the module does not throw.

## Inputs

- `website/src/lib/markdown.ts` — `escapeHtml`, `inline()`, `headingSlug`, `renderSafeMarkdown`. The URL sanitizer allowlist (`https:`, `mailto:`, `#`, `/`) is **correct** — do not loosen it.
- `website/scripts/check-chrome.mjs` — `chromeIssues(file, html, base)`; the nav and hero-art checks are the fail-closed shape to copy; the module already has a main-module guard.
- `website/tests/unit/chrome.test.ts` — `compliantHtml` / `compliantHomeHtml` fixtures.
- `website/scripts/content/keywords.mjs` — `loadKeywordRegistry(file?)`, the `definition` `<`/`>` rejection to mirror, `normalizeKeyword`.
- `website/src/layouts/BaseLayout.astro` — the `#keyword-rulings` `set:html` site.
- `website/src/pages/404.astro` — standalone meta-refresh document; `website/scripts/scan-dist.mjs` — the `'unsafe-inline'` check to extend; `website/scripts/harden-csp.mjs` — do not change its hashing behaviour in this ticket.
- `website/src/components/RichText.astro`, `website/src/pages/cards/[id].astro`, `website/src/pages/cards/[id]/versions/[package].astro` — the reminder wiring.
- `website/src/lib/decks.ts`, `website/tests/unit/decks.test.ts`, `website/tests/unit/deck-persistence.test.ts`.
- `website/scripts/check-preflight.mjs`, `website/tests/unit/preflight.test.ts`.
- `website/tests/unit/markdown.test.ts`, `website/tests/unit/docs-corpus.test.ts`, `website/tests/unit/keywords.test.ts`.

## TDD

For every one of R1-R9: write the failing test first, watch it fail for the stated reason, then fix, then watch it pass. Name the R number in each test's description so the mapping stays legible.

R1 needs at least these cases, asserted verbatim:

- `renderSafeMarkdown('Use `cards_mse/00_drafts/` here', '/')` contains `<code>cards_mse/00_drafts/</code>` and no `<em>`.
- `renderSafeMarkdown('[`cards_mse/`](../cards_mse/)', '/')` — the emitted `href` contains no `<em>`.
- `renderSafeMarkdown('a snake_case_name b', '/')` contains `snake_case_name` and no `<em>`.
- A genuine emphasis case still works if the renderer supports one — if the chosen fix drops `_x_` emphasis entirely, assert that explicitly instead, and say so in the report.

R8 needs one test per surviving mutant listed above.

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| R1 code span keeps underscores | `` Use `cards_mse/00_drafts/` `` | `<code>cards_mse/00_drafts/</code>`, no `<em>` |
| R1 href keeps underscores | `` [`cards_mse/`](../cards_mse/) `` | href has no `<em>` |
| R1 prose identifier | `a snake_case_name b` | literal, no `<em>` |
| R2 ampersand in URL | `[S](https://example.com/?a=1&b=2)` | `href="https://example.com/?a=1&amp;b=2"` |
| R3/R4 missing new-cards block | home HTML with the section deleted | one problem naming the new-cards section |
| R3/R4 missing footer | home HTML with `<footer class="site-footer">` deleted | one problem naming the footer |
| R3/R4 missing section tiles | home HTML with every `.section-tile` deleted | one problem naming the tiles |
| R4 compliant fixture | extended `compliantHomeHtml` | `[]` |
| R5 term with `<` | registry fixture with term `</script><script>` | throws, message names the term |
| R6 404 CSP | built `dist/404.html` | contains a `Content-Security-Policy` meta, no `'unsafe-inline'` |
| R6 scan-dist | a built HTML file with no CSP | scan-dist errors |
| R7 reminders reach the build | built card page | at least one `class="reminder"` span; gate fails when the wiring is removed |
| R8.1 duplicate cardId | import JSON with the same `cardId` twice in one zone | `null` |
| R8.2 one bad deck | stored payload with one malformed deck among good ones | whole store rejected |
| R8.3 zero quantity | entry with `quantity: 0` | dropped |
| R8.4 string quantity | entry with `quantity: "2"` | `null` |
| R8.5 array store | top-level JSON array | `null` |
| R8.6 export shape | `exportDeck(deck)` | keys exactly `name`, `main`, `extra` |
| R9 import is inert | import `check-preflight.mjs` | does not execute the CLI tail |

## Impl steps

- [x] 1. R1 — write the four markdown cases, watch them fail, fix `inline()` so emphasis never runs over generated markup, watch them pass.
  - [x] 1a. Criterion: the four new `R1` cases in `tests/unit/markdown.test.ts` fail before the fix with the stated `<em>` corruption, and `npx vitest run tests/unit/markdown.test.ts` is green after.
  - [x] 1b. Criterion: re-rendered docs corpus differs from the pre-fix build **only** by the removal of spurious emphasis — diff of `dist/docs/**` against the pre-fix snapshot reviewed line by line.
- [x] 2. R2 — write the ampersand case, fix the double-escape, watch it pass.
  - [x] 2a. Criterion: `renderSafeMarkdown('[S](https://example.com/?a=1&b=2)', '/')` contains `href="https://example.com/?a=1&amp;b=2"` and not `&amp;amp;`.
- [x] 3. R3 — make the three `if (block)` checks in `check-chrome.mjs` fail closed.
  - [x] 3a. Criterion: in-memory mutation of the **real** built `dist/index.html` (new-cards section deleted, `aria-labelledby` renamed, `<footer class="site-footer">` deleted, footer class widened, every `.section-tile` deleted) each returns a non-empty `chromeIssues` result.
- [x] 4. R4 — extend `compliantHomeHtml` to be genuinely compliant and add the three negative cases.
  - [x] 4a. Criterion: `compliantHomeHtml` carries a new-cards section, section tiles and a `site-footer`, still returns `[]`, and the three new negative cases pass.
- [x] 5. R5 — reject `<`/`>` in `term` in `keywords.mjs` + fixture test; escape `<` at the `set:html` payload site.
  - [x] 5a. Criterion: a registry fixture whose `term` is `</script><script>` makes `loadKeywordRegistry` reject with a message naming the term.
  - [x] 5b. Criterion: `BaseLayout.astro` emits the ruling JSON with `<` escaped as `\u003c`; built pages contain no raw `<` inside `#keyword-rulings`.
- [x] 6. R6 — give `404.astro` a CSP meta without reintroducing `BaseLayout`; make `scan-dist.mjs` treat a missing CSP as an error; add the test.
  - [x] 6a. Criterion: `grep -rLl "Content-Security-Policy" --include=*.html dist` returns nothing.
  - [x] 6b. Criterion: running `scan-dist.mjs` with `OUT_DIR` pointed at a fixture dir holding one CSP-less HTML file exits non-zero naming the missing policy; the same dir with a CSP passes.
  - [x] 6c. Criterion: `dist/404.html` still has no site header/breadcrumb/hover preview (no `BaseLayout`).
- [x] 7. R7 — add the card-page reminder assertion to `check-chrome.mjs` and prove it fails when the `definitions` prop is removed.
  - [x] 7a. Criterion: `chromeIssues` over every real built page returns `[]`; stripping `<span class="reminder">` from real built card pages in memory returns problems.
  - [x] 7b. Criterion: an actual source revert of `definitions={ruleDefinitions}` makes `npm run build` fail at the chrome gate.
- [x] 8. R8 — add the six deck-store tests, confirm each fails against its mutant and passes against the real implementation.
  - [x] 8a. Criterion: each of the six mutants, applied to `src/lib/decks.ts` one at a time, makes its own test fail; the real implementation makes all six pass. **Seven of eight mutants killed — see Execution notes: R8.5's stated mutant (`Array.isArray(value)` in `importDeck`) is an equivalent mutant and cannot be killed by any input; the two adjacent killable `Array.isArray` guards are pinned instead.**
- [x] 9. R9 — add the main-module guard to `check-preflight.mjs` + the import-is-inert test.
  - [x] 9a. Criterion: `npx vitest run` no longer prints the `preflight: node 24, deps, 5 source illustrations ready` line, and the new test proves a bare import produces no stdout.
- [x] 10. Rebuild and re-verify the corpus: `dist/docs/context/index.html` has zero `<em>` inside any `href`, and the five GitHub links resolve to their real paths.
  - [x] 10a. Criterion: the five GitHub blob URLs read `cards_mse/`, `original_cards/`, `original_images/`, `PROJECT_RESTRUCTURING_PLAN.md`, `WEBSITE_V2_SPEC.md`.
- [x] 11. Run `npm run format`, `npm run lint`, `npm run check`.
  - [x] 11a. Criterion: all three exit 0.

## Execution notes

Two ticket statements did not survive contact; both are recorded rather than designed around.

1. **R1's second verbatim reproduction is unreachable as written.** `renderSafeMarkdown('[`cards_mse/`](../cards_mse/)', '/')` never reaches emphasis at all — the URL allowlist rejects `../` and throws `Unsafe Markdown URL: ../cards_mse/`. The corrupted `href` the reviewer saw in `dist` comes from the *post-`rewriteDocLinks`* form, where `docs.mjs` has already rewritten the relative target to an absolute `https://github.com/…/blob/main/cards_mse/` URL. The test pins that real corpus form, plus an allowlisted internal `/docs/a_b/` target, plus an explicit assertion that the relative form still throws.
2. **R8.5's mutant is equivalent, not surviving.** Removing `Array.isArray(value)` from `importDeck` changes no observable behaviour: a JSON array can never carry a string `name`, so `typeof record.name !== 'string'` rejects it on the very next line for every possible input. Verified by applying the mutant and finding no test — new or old — that could distinguish it. The R8.5 test asserts the documented contract anyway (arrays rejected) and additionally pins the two `Array.isArray` guards that *are* killable: `migrateDecks`'s `record.decks` check and `parseEntries`'s list check, each of which turns a documented `null` return into a thrown `TypeError` when removed.

One fail-open beyond the ticket's list was found and closed while proving R7: an **empty** `#keyword-rulings` map made the new reminder rule vacuous (mutating the built page to `{}` returned no problems). `check-chrome.mjs` now treats an empty ruling map as a problem in its own right, matching the fail-closed shape R3 asks for.

## Explicitly not in this ticket

Log these in the report as residual risk; do not fix them here.

- The `.catalog-hero-art` `aspect-ratio: 3 / 2` crop of the square hero art, and the fact that the art is a native-size 624px conversion rather than a true HD upscale (recorded in ADR 0018; the owner overwrites the same path later).
- Playwright e2e specs for the decks island, hover preview, header nav, 404 and the fade transition — Playwright cannot run on this host.
- `latestRelease = catalog.releases[0]` being stage-ranked rather than date-ranked (latent until a second package ships).
- Markdown images (`![alt](src)`) being unhandled, `[^)]+` truncating URLs containing `)`, cross-doc `#Fragment` not being slugified, and the other latent renderer gaps — no live instance in the corpus.
- The `<meta name="description">` strip in `website/src/pages/docs/[...path].astro` leaving `[](...)` syntax and de-hyphenating prose.
- `website/tests/unit/blog.test.ts` writing fixture posts into the tracked `website/content/blog/` tree instead of a temp dir.
- Dead `.zoom-dialog` / `.carousel-controls` CSS; the orphaned `/philosophy/` page; hard-coded corpus counts in tests; `headingSlug` collision handling.
- `harden-csp.mjs` hashing every inline script it finds (pre-existing, untouched by this branch).

## Outputs

- Files touched: `website/src/lib/markdown.ts`, `website/scripts/check-chrome.mjs`, `website/scripts/content/keywords.mjs`, `website/src/layouts/BaseLayout.astro`, `website/src/pages/404.astro`, `website/scripts/scan-dist.mjs`, `website/scripts/check-preflight.mjs`, `website/src/lib/decks.ts` (only if a test proves a real defect — R8 is primarily test debt), plus the test files above.
- No catalog schema change expected. If one becomes necessary, bump the version and update `website/src/lib/catalog.ts` and `website/tests/unit/catalog.test.ts`.

## Validation

- [x] `cd website && npx vitest run` — full suite green, and strictly more tests than the 231 on this branch today
- [x] `cd website && npm run build` — exit 0, all gates pass
- [x] `cd website && npm run links:check` — clean
- [x] `cd website && npm run budgets:check` — within limits
- [x] `cd website && npm run ci` — exit 0
- [x] R1 proof: zero `<em>` inside any `href` across `dist/**/*.html`, and zero `<em>` inside any `<code>` in `dist/docs/**`
- [x] R3/R7 proof: mutate the real built `dist/index.html` and a real built card page in memory, run `chromeIssues` against each mutation, and show every one now returns a problem
- [x] R6 proof: every built HTML file, `404.html` included, carries a CSP meta with no `'unsafe-inline'`
- [x] app functional — the site builds, every existing route still resolves, docs pages render their identifiers literally
- [x] commit msg draft: `fix(website): repair the defects the branch review confirmed`
