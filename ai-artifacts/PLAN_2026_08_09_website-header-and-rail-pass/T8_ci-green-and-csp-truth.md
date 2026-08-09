# T8: Make the branch CI-green and the CSP story true

**Plan:** `./ai-artifacts/PLAN_2026_08_09_website-header-and-rail-pass.md`
**Depends:** T1–T7 (all shipped)
**Commit outcome:** `npm run test:e2e` exits 0, the site ships no CSP-violating
markup, and the console-error gate can actually fail.

## Context (self-contained)

Four independent deep reviewers audited `main..HEAD`. This ticket fixes the
merge-blocking findings. Everything below was CONFIRMED against built output,
not inferred.

1. **CI is red.** `website/tests/e2e/showcase.spec.ts:17` asserts the heading
   `No release packages published yet.`, which `website/src/pages/index.astro:142`
   renders **only when no sections are published**. Sections *are* published
   here: `website/dist/index.html` contains 0 occurrences of that string and 3
   `class="section-tile"`. So the test fails on chromium, firefox and webkit.
   `playwright.config.ts` has no `testIgnore`/`grep`, and
   `.github/workflows/verify-website.yml:79` runs `npm run test:e2e` with no
   `continue-on-error` — the branch cannot go green. The test name
   (`empty publication home is English and accessible`) describes a state the
   site is no longer in; its language/accessibility/brand assertions are still
   valuable and must be kept.

2. **This branch introduced 440 CSP violations.** `Navigation.svelte:149` and
   `:217` emit a `style="--nav-tint: …"` attribute server-side. Under the
   hardened `style-src 'self' 'sha256-…'` (no `'unsafe-hashes'`) a style
   *attribute* is blocked, so it is inert **and** raises a console error.
   Measured in `dist`: **440** such attributes across **110** HTML files.
   `git grep 'style=' main -- website/src/components/Navigation.svelte` returns
   nothing — this error class is **new on this branch**.
   The tint is actually painted by the `li.style.setProperty('--nav-tint', …)`
   pass in `onMount` (`Navigation.svelte:44-48`), which CSP does not police.
   Root cause of the inertness, for the record: Svelte 5 compiles
   `style:--nav-tint` to `set_style(node, '', prev, next)`, which short-circuits
   during hydration when the serialised value already equals the element's
   `style` attribute — the SSR attribute matches, so Svelte never writes to
   `element.style`, and the attribute itself is blocked.
   The SSR attribute therefore buys nothing and costs a violation on every
   catalog page. It exists only because
   `website/tests/unit/nav-accent.test.ts:40` asserts it.

3. **The console-error gate has a hole and a false comment.**
   `website/tests/e2e/header-row.spec.ts:46-51` calls the noise "Pre-existing,
   out of scope" — untrue per (2). Its predicate
   (`/style-src/i` + CSP wording, `:57-62`) never mentions `--nav-tint`, so it
   also swallows a genuine `harden-csp.mjs` hash mismatch on a real `<style>`
   block — i.e. the whole stylesheet being refused, page rendering unstyled,
   test still green. This is the **only** console-error assertion in the entire
   e2e suite.

4. **A hydration race.** `showcase.spec.ts:307-311`
   (`rail items carry their archetype colour`) reads the tinted background with
   a bare `expect`, but the tint now only exists after `onMount`. `page.goto`
   resolves on `load`, and the `client:load` island's chunk is a dynamic import
   that can settle later. Sibling tests in the same file guard this exact race
   with `expect.poll`; this first assertion does not.

5. **`nav-accent.test.ts` cannot detect a wrong colour.**
   `:26` greps `const tintStyle` for `kind === 'archetype'` and `: null` without
   ever asserting the returned value, and `:77`'s
   `/--ember:\s*oklch\([^)]*32[^)]*\)/` matches `32` anywhere inside the
   parens, so `oklch(0.32 0.1 250)` — blue — satisfies "Burning Abyss is
   orange". A `tintStyle` returning `'var(--relic)'` for every archetype passes
   the whole unit suite and the e2e. That is feedback line 6, the point of T4.

6. **Docs describe a mechanism that does not ship.** `docs/ADR/proposed/0028-flat-accent-tinted-catalog-rail.md`
   (§Decision 3) and `docs/website-shell-chrome.html:163` both say each `<li>`
   sets `--nav-tint` **inline**. Neither records that the tint requires
   hydration.

7. **A future "fix" can silently weaken the CSP.** `harden-csp.mjs:34` guards
   only the literal `'unsafe-inline'`, and `scan-dist.mjs`'s rule is
   `/(?:script|style)-src[^;]*'unsafe-inline'/i`. Authoring
   `style-src 'self' 'unsafe-inline' 'unsafe-hashes'` rewrites to
   `style-src 'self' 'sha256-…' 'unsafe-hashes'` and **passes both guards** —
   which is exactly the tempting "fix" for finding (2).

### Environment — verified by the parent, do not rediscover

- **Playwright cannot launch natively on this host** (NixOS, missing
  `libglib-2.0.so.0` / `libgtk-3.so.0`; `install-deps` needs blocked sudo).
  Run e2e through Docker:

  ```bash
  cd /home/aron/projects/essentia/website && docker run --rm --ipc=host \
    -v /home/aron/projects/essentia:/work -w /work/website \
    mcr.microsoft.com/playwright:v1.61.1-noble \
    bash -c "npm ci --no-audit --no-fund && npx playwright test tests/e2e/<spec>.spec.ts"
  ```

  The in-container `npm ci` is required and must run first, in the same
  `bash -c`. The config starts its own web server against `dist`.

- **After every Docker Playwright run, delete `website/playwright-report/` and
  `website/test-results/` before running `npm run ci` on the host** — otherwise
  `astro check` walks them and dies with `JavaScript heap out of memory`. Then
  confirm `find /home/aron/projects/essentia/website -not -user aron` is empty.

- **Pixel tolerances in this ticket's test code are guidance, not contract.** If
  one is unsatisfiable purely because of an untouched, out-of-scope value,
  widen it to the structural value plus slack and comment where the number came
  from. Do not chase it by editing out-of-scope CSS, and do not report it as a
  plan defect.

- **The built site runs a hashed CSP.** `website/scripts/harden-csp.mjs`
  rewrites `style-src`/`script-src` `'unsafe-inline'` into `sha256-`
  allowlists at build. A `<style>` block is hashed and works; a per-element
  `style="…"` **attribute** is blocked (that would need `'unsafe-hashes'`).
  `npm run dev` keeps `'unsafe-inline'`, so CSP bugs reproduce only in the
  built site — verify through the Docker runbook, which serves `dist`.

- **Only 3 of 5 configured sections publish here** (sole release
  `LOTA-0001-Alpha_0.1`): Non-archetype, Burning Abyss, Nekroz. Assertions that
  enumerate rail labels must expect three. Do not touch `cards_mse/`.

- **`.utility-nav a` (`global.css:1671`) is NOT dead — do not delete it.** An
  earlier note called it dead; a reviewer refuted that. `.utility-menu` is a
  child of `nav.utility-nav`, so the descendant selector still matches all
  three popover links, and being **unlayered** it beats `.utility-menu a` in
  `@layer layout`. It supplies the `⋯` menu's actual
  `min-height: 2.45rem; font-size: 0.85rem; padding: 0.35rem 0.5rem`.

- Shipped on this branch already, do not undo: T1 `9057dae` full-width header
  above the rail; T2 `ad45513` one square rail toggle; T3 `eebffe9` flat rail +
  drawer; T4 `017f911` accent tints; T5 `d712955` compact ≤44rem header with a
  native `⋯` popover; T6 `41b780e` single-row guard; T7 `4af3bd8` hero pass.


## Requirements

1. `cd website && npm run test:e2e` exits 0 on all three projects.
2. `website/dist` contains zero `style="--nav-tint` attributes after a build.
3. The rail tint still renders correctly in all three engines.
4. `header-row.spec.ts`'s console gate fails on a `style-src` error that is not
   the `--nav-tint` one; its comment states the truth.
5. `nav-accent.test.ts` asserts the **delivered** mechanism and would fail if an
   archetype rendered the wrong accent.
6. ADR 0028 and `docs/website-shell-chrome.html` describe what actually ships,
   including that the tint is hydration-gated.
7. `harden-csp.mjs` and `scan-dist.mjs` also reject `'unsafe-hashes'` and
   `'unsafe-eval'`.

## Inputs

- `website/tests/e2e/showcase.spec.ts`, `website/tests/e2e/header-row.spec.ts`
- `website/src/components/Navigation.svelte`
- `website/tests/unit/nav-accent.test.ts`
- `website/scripts/harden-csp.mjs`, `website/scripts/scan-dist.mjs`
- `docs/ADR/proposed/0028-flat-accent-tinted-catalog-rail.md`, `docs/website-shell-chrome.html`
- `website/src/pages/index.astro` — **read only**, to see both home branches.

## TDD

1. **Red** — update `nav-accent.test.ts` to assert real accent values per
   section and to pin the `onMount` CSSOM pass (both list ids) rather than the
   SSR attribute; confirm it fails against current code.
2. **Green** — apply the impl steps.
3. **Refactor** — keep green.

## Impl steps

- [x] 1. Rename and rewrite `showcase.spec.ts:7`'s test so it asserts the home
      page the site actually renders: keep the title, `.compact-brand img` alt,
      `.brand` count 0, `html[lang=en]` and the axe run; replace the
      empty-state heading assertion with one that holds for the published home
      (e.g. `.section-tile` count > 0). Rename the test accordingly.
      — validate: the new name no longer claims "empty".
- [x] 2. In `Navigation.svelte`, remove the SSR `style:--nav-tint` directive
      from both `<li>` sites (`:149`, `:217`). Keep `tintStyle` only if the
      `onMount` pass still uses it; keep the `onMount` `setProperty` pass and
      both list ids. Leave a comment explaining the attribute cannot be used
      because the hardened CSP blocks style attributes.
- [x] 3. In `header-row.spec.ts`, correct the comment at `:46-51` (this is new
      on this branch, not pre-existing) and narrow `isKnownCspNoise` so it also
      requires `--nav-tint`. After step 2 removes the violation entirely,
      prefer deleting the filter outright and asserting no console errors —
      only keep a narrowed filter if a violation genuinely remains.
- [x] 4. In `showcase.spec.ts`, wrap the first tint assertion
      (`rail items carry their archetype colour`, `:307-311`) in `expect.poll`
      so it waits for hydration, matching the sibling tests' pattern.
- [x] 5. Rewrite `nav-accent.test.ts` per the TDD step: assert Burning Abyss
      resolves its ember token and Nekroz its ice token as **distinct** values,
      that non-archetype gets none, and that the `onMount` pass targets both
      `#desktop-catalog-sections` and `#mobile-catalog-sections`. Delete or fix
      the `32`-anywhere regex at `:77` and the wrong diagnosis comment at
      `:34-39` (`var()` inside `color-mix()` resolves fine; the real cause is
      the CSP + Svelte `set_style` short-circuit described in Context).
- [x] 6. In `harden-csp.mjs` extend the post-rewrite guard, and in
      `scan-dist.mjs` extend the forbidden-CSP rule, to also reject
      `'unsafe-hashes'` and `'unsafe-eval'`.
- [x] 7. Update ADR 0028 §Decision 3 and `docs/website-shell-chrome.html:163`
      to describe the CSSOM mechanism and state that the tint is applied on
      hydration (no tint with JS disabled).
- [x] 8. Delete `website/playwright-report/` and `website/test-results/`, then
      run `cd website && npm run format && npm run ci`.
      — both directories removed, `find website -not -user aron` empty,
      `=== NPM RUN CI EXIT=0 ===` (`dist scan: clean`, 152 pages).
- [x] 9. Run the FULL e2e suite through the Docker runbook
      (`npx playwright test`, no file argument) on all three projects.
      — `58 passed, 2 skipped`, `PLAYWRIGHT EXIT=0`. The 2 skips are
      `showcase.spec.ts:49`'s own `test.skip(browserName !== 'chromium')`.
      Notably green on chromium+firefox+webkit: `no console error or wrap
      warning at 400px` (with the filter deleted) and `rail items carry their
      archetype colour`.
- [x] 10. Confirm zero violations: after a build,
      `grep -rc 'style="--nav-tint' website/dist | grep -v ':0' | wc -l` → `0`.
      — `0` files, and `grep -ro 'style="--nav-tint' dist | wc -l` → `0`
      raw occurrences (was 440 across 110 files).
- [x] 11. Run `graphify update .` from the repo root.
      — `Rebuilt: 3060 nodes, 4288 edges, 311 communities`, exit 0.

### Executor note — one file the ticket did not list

Finding (1) named `showcase.spec.ts:17` as the stale empty-state assertion. The
full-suite run turned up a **second, identical** one the audit missed:
`website/tests/e2e/smoke.spec.ts:6` asserted the same
`No release packages published yet.` heading plus the empty branch's
"…is open under alpha" paragraph, and failed on all three projects for exactly
the reason in finding (1). It is not in `Inputs`, but Requirement 1 (`npm run
test:e2e` exits 0) cannot hold while it stands, so it got the same treatment as
Impl step 1: renamed to `production preview serves the published section
archive`, empty-branch assertions replaced with `.empty-publication` count 0,
the `Archetypes` heading, and `.section-tile` count > 0. Its original point —
preview answers 200, home is the archive and not a card gallery — is kept,
including `.gallery-card` count 0 (verified still 0 in `dist/index.html`).

## Outputs

- Behaviour change: no CSP-violating markup ships; e2e suite exits 0.
- Contract: the rail tint is applied only by `onMount`; docs say so.

## Validation

- [x] `cd website && npm run test:e2e` exits 0 on all three projects (full suite)
      — Docker runbook, no file argument: `58 passed, 2 skipped`, `EXIT=0`,
      chromium + firefox + webkit.
- [x] `cd website && npm run ci` exits 0 — `=== NPM RUN CI EXIT=0 ===`
- [x] built `dist` has zero `style="--nav-tint` attributes
      — `files=0 occurrences=0` after the CI build (was 440 across 110 files)
- [x] `nav-accent.test.ts` fails if `tintStyle` returns one accent for every archetype (prove by temporary mutation, then revert)
      — mutation `` `var(--${section.accent})` `` → `` `var(--relic)` ``: `Tests 2 failed | 10 passed`
      (`each archetype resolves its own accent…`, `no two archetypes share a tint`); reverted, `12 passed`.
      TDD red also confirmed: with the pre-T8 component stashed back in,
      `no <li> ships a CSP-blocked style attribute` fails.
- [x] app functional — rail is tinted in a real browser run
      — `rail items carry their archetype colour` passes against the built
      `dist` in all three engines: Burning Abyss' resting background is
      non-transparent (the ember tint landed via the CSSOM pass),
      Non-archetype's stays transparent, and hover shifts it again.
- [ ] commit msg draft: `fix(website): stop shipping CSP-blocked tint markup and get the e2e suite green`
