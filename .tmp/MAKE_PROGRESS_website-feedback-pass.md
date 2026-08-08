# Progress: website-feedback-pass

- Goal: ship every item in `.dev/feedback.md` on the Astro site under `website/`
- Plan index: `ai-artifacts/PLAN_2026_08_07_website-feedback-pass.md`
- Tickets dir: `ai-artifacts/PLAN_2026_08_07_website-feedback-pass/`
- Workspace: branch `plan/website-feedback-pass`
- Started: 2026-08-07
- Updated: 2026-08-07

## Success

- [x] Every feedback line in `.dev/feedback.md` has a landing ticket marked done — the scope-drift reviewer walked all 23 items (Home 1-12, Cards 1-3, Archetype 1-5, Footer, Card Hover, Page Transition) against the built output and found all 23 landed, 0 silently missing
- [x] `npm run ci` green after every ticket commit — final parent run at HEAD: `CI_EXIT=0`, 151 pages, `csp: hashed inline content in 151 HTML files`, `dist scan: clean`, `404: redirects to site root`, `chrome: 151 pages carry the site header`
- [x] No broken internal link — `links: 151 pages clean`; the 5 broken outbound GitHub links the correctness reviewer found were fixed in T23
- [x] Every successful ticket commit pushed — `git log origin/plan/website-feedback-pass..HEAD` = 0 unpushed, 29 commits on the branch

## Out of scope

- MSE card source `cards_mse/`, print pipeline `.script/`, launcher, `MSE/`
- WEBSITE_V2_SPEC Phase 1-6 beyond what the feedback needs (`/keywords/`, `/search/`, published deck routes, `/releases/`, print basket)
- Rewriting `/rules/` and `/philosophy/` into curated landings

## Status

| ID | Title | File | State | Evidence | Note |
| --- | --- | --- | --- | --- | --- |
| T1 | Preflight and asset gate | `T1_preflight-and-env.md` | done | vitest 5 passed; `npm run preflight` exit 0; `npm run ci` exit 0, 110 pages | `74b3557` |
| T2 | Unknown route redirects home | `T2_route-404-redirect-home.md` | done | vitest 5 passed; `links:check` 110 pages clean; curl on unknown path → meta-refresh to `/`; `npm run ci` exit 0 | `89059c6` |
| T3 | Markdown renderer extension | `T3_markdown-renderer-extension.md` | done | red 11 failed → green 14 passed; `npm run test` 92 passed; `npm run ci` exit 0 | `5f6a9c6` |
| T4 | Docs corpus loader | `T4_docs-corpus-loader.md` | done | vitest 12 passed; `content:check` `37 docs`; `npm run ci` exit 0 | `0b6e796`, `2c62d53` — first run failed on plan defect, parent amended ticket, deep repair passed |
| T5 | Docs routes + presentation page | `T5_docs-routes-and-presentation.md` | done | vitest 4 passed; `content:check` `38 docs`; build 148 pages; `links:check` clean; `npm run ci` exit 0 | `155953c` |
| T6 | Blog loader and routes | `T6_blog-loader-and-routes.md` | done | vitest 7 passed; `content:check` `1 posts`; build 150 pages; `links:check` clean; `npm run ci` exit 0 | `c198a34`, `35c2e3b` |
| T7 | Local deck storage | `T7_local-deck-storage.md` | done | vitest 17 passed; `npm run test` 132 passed; `npm run ci` exit 0; module not yet bundled (grep dist clean) | `e71122b`, `238d1b2` |
| T8 | Decks page | `T8_decks-page.md` | done | vitest 6+3 passed; build 151 pages, CSP hashed, no `unsafe-inline`; `budgets:check` within limits; `npm run ci` exit 0 | `1270412`, `cf6b507` |
| T9 | Header nav three buttons | `T9_header-nav-three-buttons.md` | done | vitest 5 passed; build gate `chrome: 151 pages carry the site header`; `links:check` clean; `npm run ci` exit 0 | `eea006b` |
| T10 | Site-wide breadcrumb | `T10_breadcrumb-component.md` | done | vitest 9 passed; build gate: every non-home page has one `<nav class="breadcrumb">`, none on home; `npm run ci` exit 0, 150 tests | `8b86c3f`, `a239667` |
| T11 | Iconic section hero art | `T11_iconic-hd-art.md` | done | vitest 5 passed; 5 hero webps 624px, 67-114 KB, no EXIF; `budgets:check` within limits; `npm run ci` exit 0 | `5984f8d` |
| T12 | Home hero copy and art | `T12_home-hero-copy-and-art.md` | done | vitest 14 passed; `dist/index.html` has Trishula hero + new headline/lead + `Learn about Essentia` → `/docs/`; WEBSITE_V2_SPEC welcome page deleted; `npm run ci` exit 0 | `bafb188` |
| T13 | Home new-cards grid | `T13_new-cards-grid.md` | done | vitest 21 passed; `dist/index.html` 15 `new-card-item` in a 3x5 grid + `View all 50 new cards`, carousel gone; `npm run ci` exit 0 | `1253e9c` |
| T14 | Home archetype tiles | `T14_home-archetype-tiles.md` | done | vitest 24 passed; `dist/index.html` h2 `Archetypes`, hero-art tiles, `tile-badge`; hover/focus border + forced-colors + reduced-motion in compiled CSS; `npm run ci` exit 0 | `3c67c05` |
| T15 | Archetype members only | `T15_archetype-members-only.md` | done | vitest 20 passed; burning-abyss now 13 printed-name cards (Tour Guide/Beatrice moved to non-archetype); `npm run ci` exit 0, 181 tests | `d27454e` |
| T16 | Archetype page refresh | `T16_archetype-page-refresh.md` | done | vitest 28 passed; galleries alphabetical, 0 `day-group`, NEW badges 50/50; nekroz page shows only `August 1, 2026` (date incoherence gone); gate mutation-probed; `npm run ci` exit 0, 188 tests | `03c17c7` |
| T17 | Remove card zoom | `T17_remove-card-zoom.md` | done | full vitest 192 passed; no `zoom-trigger`/`zoom-dialog` in dist, `ImageZoom.svelte` deleted, zoom tier dropped (images 255 → 205); `npm run ci` exit 0 | `e8e4eec` |
| T18 | Keyword definitions registry | `T18_keyword-definitions-registry.md` | done | vitest 21 passed; 73 keywords carry `definition`/`origin`/`doc` (51 essentia, 22 magic), all 73 verbatim-audited against the ticket table; catalog v7; `npm run ci` exit 0, 202 tests | `acda3ed` |
| T19 | Card text keyword rulings | `T19_card-text-keyword-rulings.md` | done | vitest 34 passed; card page prints `<strong>Discard</strong><span class="reminder">(...)</span>`, 0 reminders on home/gallery; `npm run ci` exit 0 | `cf27107` |
| T20 | Hover keyword boxes | `T20_card-hover-keyword-boxes.md` | done | vitest 34 passed, full suite 219; hover preview carries 51-entry essentia-only ruling payload, no `innerHTML`; CSP hashed, budgets within limits; `npm run ci` exit 0 | `1339c26` |
| T21 | Related cards rule | `T21_related-cards-rule.md` | done | vitest 8 passed; Dante's related list = 12 BA members + Tour Guide; Dark Hole has no section; `npm run ci` exit 0, 227 tests | `7a55fb8` |
| T22 | Footer line and black fade | `T22_footer-and-black-transition.md` | done | vitest 34 passed; footer nav-then-`legal-line` gated; view-transition fades through `--blackfoil` (380ms) with reduced-motion override; CSP clean; `npm run ci` exit 0 | `a01013a` |

| T23 | Review repairs (post-review) | `T23_review-repairs.md` | done | R1-R9 all pass; vitest 231 → 265; `dist/docs` `<em>` 57 → 0, 5 GitHub links resolve; 3 chrome gates + reminder gate now fail closed; every built page incl. `404.html` carries a CSP; `npm run ci` exit 0 | `89ef227` |

States: pending|running|done|failed|blocked_user|blocked_dep|skipped

## Assumptions

- Branch `plan/website-feedback-pass` cut from `main` at `361a772`; plan artefacts committed as `9e01059` before ticket work.
- Pre-existing unrelated dirty paths left untouched: `TODO.md`, `docs/ADR/README.md`, deleted `PROJECT_RESTRUCTURING_PLAN.md`, `.dev/`, `CLAUDE.md`, `.graphifyignore`, `.claude/settings.json`, `.tmp/`.
- Playwright e2e cannot run on this host; every gate is deterministic Node/vitest/build-time.
- Production ship confirmations auto-approved inside this run (user invoked make).

## Residual risk

- T3: `renderSafeMarkdown`'s pre-existing link-URL regex `\(([^)]+)\)` truncates a URL containing `)`. Still rejects unsafe schemes, so no security impact. Not in scope of any ticket.
- T4: `docs/CONTEXT.md:62` cites `../PROJECT_RESTRUCTURING_PLAN.md`, which is deleted on disk in the pre-existing unstaged changes. The link became a GitHub blob URL that will 404 once that deletion lands. Needs a follow-up outside this plan.
- T4: `docs/rules/DECKLISTS_ALPHA_0.1.md` had no `#` heading; the worker promoted its first line to `# Release Alpha 0.1` so the documented no-heading build guard could stay hard. One-character corpus edit, no other doc body touched.

- T16: `.catalog-hero-art` still declares `aspect-ratio: 3 / 2` + `object-fit: cover`, so the square 624px hero is centre-cropped on the section page (the home tile crops the same asset the same way, so the two surfaces stay consistent). No ticket authorised changing the aspect ratio. Follow-up if "full iconic illustration" was meant literally.

Left open by T23's explicit out-of-scope list, all recorded and none blocking:

- ~~Hero art is a native-size 624px conversion~~ — **closed 2026-08-07** (`59cc451`). `non-archetype`, `burning-abyss` and `nekroz` now ship 1920 px manual upscales committed under `original_images_hd/`; `shaddoll` and `spellbook` have no upscale yet and stay at 624 px, which their provenance line states. `npm run hero:art` regenerates all five.
- No Playwright e2e specs were written for the decks island, hover preview, header nav, 404 or the fade transition. **Root cause of "cannot run on this host": NixOS.** The Playwright browsers under `~/.cache/ms-playwright/` are FHS binaries and fail at launch with `libglib-2.0.so.0: cannot open shared object file`; `playwright install-deps` is apt-only and cannot fix it. `npx playwright test --list` works, so the specs parse — only the browser launch fails. Fix is host-level: point `PLAYWRIGHT_BROWSERS_PATH` at `nixpkgs.playwright-driver.browsers` with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`, or run the suite inside an FHS shell (`steam-run` / `buildFHSEnv`). CI is not NixOS and does run Playwright. Separately, the two existing specs (`showcase.spec.ts`, `smoke.spec.ts`) still assert the pre-rewrite site and would need updating.
- ~~`latestRelease = catalog.releases[0]` is stage-ranked, not date-ranked~~ — **not a defect, closed 2026-08-07** (`309fb58`). A stage has one release date and every package in it carries that date, so stage-rank order and date order are the same order. The build now asserts it (`stageDateIssues`) rather than relying on it.
- Markdown gaps with no live instance in the corpus: images `![alt](src)` unhandled, `[^)]+` truncates a URL containing `)`, cross-doc `#Fragment` is not slugified, `headingSlug` has no collision handling.
- ~~`<meta name="description">` on docs pages strips `-` and leaves `[](...)` syntax~~ — **closed 2026-08-07** (`a1f083b`). `docDescription()` removes each markdown construct by its own rule and truncates on a word boundary; 0 docs descriptions now contain markdown syntax.
- `website/tests/unit/blog.test.ts` writes fixture posts into the tracked `website/content/blog/` tree; a crash mid-test could leave a fixture post that the next build publishes.
- Dead `.zoom-dialog` / `.carousel-controls` CSS; `/philosophy/` is now orphaned (zero inbound links after the header rewrite — the plan authorised leaving the page as-is).
- `harden-csp.mjs` hashes every inline script it finds, so the CSP is not a backstop against build-time injection. Pre-existing, untouched by this branch. T23 closed the reachable path into it by guarding keyword `term`.

## Log

- 2026-08-07 pre-flight done — branch `plan/website-feedback-pass` pushed, plan artefacts committed `9e01059`
- 2026-08-07 T1-T22 done in dependency order, one worker per ticket, one commit+push each. T4 failed once on a plan defect (the ADR-link rule made the build unbuildable against the real corpus); parent amended the ticket to rewrite ADR links to GitHub URLs, deep repair worker passed.
- 2026-08-07 reviewer fan-out, 4 deep read-only children, one dimension each. Scope-drift clean. Correctness 1 blocker + 4 should-fix, security 2 should-fix, tests 6 blockers + 5 should-fix.
- 2026-08-07 parent wrote repair ticket `T23_review-repairs.md` (R1-R9), one deep fix worker, `89ef227`. All nine pass; suite 231 → 265 tests.
- 2026-08-07 final parent validation — `npm run ci` exit 0 at HEAD, 0 unpushed commits, 29 commits on the branch.
- 2026-08-07 post-run follow-ups from user review, three commits: `59cc451` HD hero art, `309fb58` stage/date invariant, `a1f083b` docs meta description. Suite 265 → 296 tests, `npm run ci` exit 0.
