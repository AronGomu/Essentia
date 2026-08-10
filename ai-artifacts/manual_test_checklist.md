# Manual test checklist — steps a human still needs to eyeball in a real browser.

## T1 header-owns-top-row

- [ ] `cd website && npm run dev`, open `http://localhost:4321/` at a desktop width: the Essentia wordmark is flush to the top-left corner, with nothing floating over it.
- [ ] The site header spans the entire viewport width, edge to edge, and paints above the catalog rail.
- [ ] The catalog rail starts at the header's bottom border, not at the top of the viewport.
- [ ] Narrow the window to 900px: the hamburger sits immediately to the right of the wordmark, in the header row, and no longer floats over the top-left corner.
- [ ] At 900px, tapping the hamburger still opens the mobile drawer.
- [ ] Narrow to a phone width (390px): the wordmark still holds the top-left corner and the header does not overflow horizontally.
- [ ] Visit an inner page with a breadcrumb (for example `/docs/`): the order across the header is wordmark, then breadcrumb, then the utility nav and search.
- [ ] Scroll a long page: the header stays stuck to the top and nothing from the rail bleeds over it.

## T2 single-square-rail-toggle

- [ ] `cd website && npm run dev`, open `http://localhost:4321/` at 1400px: the catalog rail has exactly one collapse control — a small square in its bottom-right corner. There is no second toggle at the top of the rail.
- [ ] Click that square: the rail collapses to a narrow strip and the square is still visible in the strip's bottom-right corner.
- [ ] Click it again: the rail expands back. The square's size does not change between the two states.
- [ ] Watch the square while toggling: it stays a square (equal width and height) and stays pinned to the rail's bottom-right corner — it never stretches to the rail's full width.
- [ ] Collapse the rail, then navigate to a docs page (for example `/docs/`): the rail is still collapsed and the square is still reachable to reopen it.
- [ ] With the rail expanded, tab to the square with the keyboard: it takes focus with a visible focus ring, and Enter or Space toggles the rail.
- [ ] With a screen reader (or the accessibility inspector), confirm the control is announced as "Collapse catalog" when expanded and "Expand catalog" when collapsed.

## T3 flat-catalog-rail

- [ ] `cd website && npm run dev`, open `http://localhost:4321/` at 1400px: the catalog rail shows one flat list of links — no "Non-Archetype" toggle button, no "Archetypes" heading, no collapsible group.
- [ ] Every published section (currently Non-archetype, Burning Abyss, Nekroz — Shaddoll and Spellbook have no released cards yet in this checkout) appears as a link with its label and a count badge, in that order.
- [ ] Narrow to a phone width (390px or similar) and open the hamburger drawer: it shows the same flat list of links, no `<details>`/`<summary>` disclosure, no "Archetypes" heading.
- [ ] Visit `/docs/` and `/blog/`: the rail switches to its reading mode — the Docs/Blog switcher and grouped headings (e.g. "Design", chapter names) are unchanged from before this change.
- [ ] Click a catalog link (e.g. "Burning Abyss"): it navigates to that section and the link shows as current (a marker before it).
- [ ] Once Shaddoll and/or Spellbook cards are released, re-check this page: those sections should appear in the flat list in the same style, with no code changes needed.

## T4 accent-tinted-nav-items

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs` (production build — the tint's CSSOM fallback only matters once the CSP is hardened by `scripts/harden-csp.mjs`, which runs on build, not on `npm run dev`), open the served site at 1400px: Burning Abyss reads with a faint orange-brown wash, Nekroz with a faint blue-teal wash, and Non-archetype stays plain black.
- [ ] Hover Burning Abyss: its wash visibly deepens (goes from a faint tint to a stronger orange-brown, still readable). Move off: it returns to the faint resting wash.
- [ ] Hover Non-archetype: it lifts to the same plain `--sleeve` highlight as before this change — no colour appears.
- [ ] Tab to Burning Abyss with the keyboard: the same deepened wash appears on `:focus-visible` as on hover.
- [ ] Navigate to `/archetypes/burning-abyss/`: the Burning Abyss rail link shows the deepened wash as its "current page" state (no separate marker needed to tell it apart from hover/focus).
- [ ] Narrow to a phone width (390px) and open the hamburger drawer: the same tints (Burning Abyss orange, Nekroz blue, Non-archetype black) appear in the drawer's list, and hovering/tapping deepens them the same way.
- [ ] Open the browser devtools console while loading the page: no CSP violation reports and no other console errors.
- [ ] `cd website && npm run dev` (unhardened dev CSP), open at 1400px: the same tints render correctly (the dev-mode CSP still allows the plain inline `style=""` attribute, so this should look identical to the production build).

## T5 compact-header-overflow-menu

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open the served site at 1400px: the header shows the brand, the hamburger drawer trigger, and the utility nav as a plain inline row of three text links — "Learn about Essentia", "Blog", "Decks" — exactly as before this change; no `⋯` button is visible.
- [ ] Narrow the browser to 400px width: the utility nav collapses to a single small square `⋯` button (labelled "More sections"); the "Learn about Essentia" text link is not visible anywhere in the header.
- [ ] At 400px, the drawer trigger and the Find trigger show as icon-only squares (`☰` and `⌕`) with no visible text label.
- [ ] At 400px, click the `⋯` button: a small popover panel opens below the header at the right edge, listing "Learn", "Blog", "Decks" (short labels).
- [ ] With the popover open, inspect each link's accessible name via a screen reader or the browser's accessibility tree inspector: the docs link announces "Learn about Essentia" even though only "Learn" is visible; the drawer trigger announces "Catalog" (or "Docs & blog" in reading mode); the Find trigger announces "Find".
- [ ] Click outside the open popover (or press Escape): it closes.
- [ ] Resize the browser slowly from 1400px to 390px and back: the switch between the inline row and the `⋯` button still happens exactly at 44rem (704px) with no layout jump or flash of unstyled content. (Amended by T11: this is now the *third* of three changes you will pass on the way down — the labels shorten at 1024px and Find squares off at 896px first. Only the `⋯` switch is at 704px.)
- [ ] Open the browser devtools console at 400px while opening/closing the popover: no console errors.

## T6 header-single-row-guard

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open DevTools at exactly 400×800 on `/cards/ash-blossom-and-joyous-spring/`: the header stays one row (brand, hamburger icon, breadcrumb, `⋯` button, Find icon all sit on the same line — no wrap).
- [ ] At 400×800, the breadcrumb's last crumb ("Ash Blossom & Joyous Spring") is truncated with an ellipsis rather than wrapping the header to a second line.
- [ ] With the console open at 400×800, reload the page: no `[essentia] site-header wraps to …` warning appears and no console error appears.
- [ ] Resize the window from 401px down to 400px and back while watching the console: the wrap warning never appears at any width above 400px (the guard is a no-op there by design).
- [ ] Temporarily shrink the window well below 400px (e.g. 300px): if the header genuinely wraps, confirm a `[essentia] site-header wraps to N rows at …px` warning appears in the console and the page keeps working (no thrown error, nothing broken).
- [ ] Run `cd website && npm run build` from a terminal: confirm the build completes and exits 0 whether or not a `[warn] site-header may wrap …` line is printed (it should NOT print in the current checkout, since the shipped budget fits).
- [ ] Visit `/` and `/archetypes/burning-abyss/` at 400×800: both hold a single header row, same as the card page above.

## T7 catalog-hero-tightening

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open `/archetypes/nekroz/` at 1440px: the prose and the hero art read as one row with a visibly tighter gutter between them than before this change. (Superseded by T10: the `72rem` cap this line described was inert at this width and has since been removed — the row spans the page shell and it is the *content inside it* that is inset and centred. Check the T10 section instead.)
- [ ] At 1440px, the two columns keep their prior proportions — the prose column is still noticeably wider than the art column, just closer together.
- [ ] Resize down to 900px (the `64rem` stacked layout): the hero collapses to one column. (Superseded by T10: the art no longer shows at this width. See the T10 section.)
- [ ] Resize down to 704px and 704.1px. (Superseded by T10: the art now disappears at the 64rem stack point, so it is already gone on both sides of this boundary.)
- [ ] Resize down to 390px (a phone width): the hero art disappears entirely — no broken image box, no leftover whitespace where it was — and the archetype name heading plus the first card in the gallery below are visible without excess scrolling.
- [ ] With a screen reader (or the accessibility tree inspector), confirm at 390px that the hidden hero art (`role="img"`, `tabindex="0"`) is not announced and not reachable by Tab — it should be fully removed from the accessibility tree, not just visually hidden.
- [ ] Repeat the 1440px and 390px checks on `/sections/non-archetype/non-archetype/` (the non-archetype hero shares the same CSS class) to confirm both hero routes moved together.
- [ ] Open the browser devtools console while loading `/archetypes/nekroz/` at both 1440px and 390px: no console errors other than the known, pre-existing CSP-violation message for the inert `--nav-tint` inline style (queued separately, not part of this ticket).

## T8 ci-green-and-csp-truth

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open `/` at 1440px with DevTools **Console** visible: the page shows the section-tile archive (three tiles — Non-archetype, Burning Abyss, Nekroz), **not** the "No release packages published yet." hero, and the console is completely empty — no CSP violation, no error of any kind.
- [ ] Same page, same console: repeat on `/archetypes/burning-abyss/` and `/docs/`. Zero console errors on each. (Before this change every catalog page logged a `style-src` CSP violation for the inert `style="--nav-tint: …"` attribute; the T7 checklist line calling that "known, pre-existing" is now obsolete.)
- [ ] In DevTools **Elements**, inspect any `<li>` inside `#desktop-catalog-sections`: it must carry **no** `style` attribute in the served HTML source (View Source / Network response), yet `getComputedStyle` on it resolves `--nav-tint` once the page has hydrated.
- [ ] Look at the catalog rail on `/`: Burning Abyss rests on a faint orange wash, Nekroz on a faint blue one, Shaddoll and Spellbook on their own distinct colours, and Non-archetype sits on the plain rail black. Hovering each one deepens its own colour — no two archetypes share a tint.
- [ ] Open the mobile drawer at 390px (hamburger → Catalog): the same per-section tints appear there too, matching the desktop rail.
- [ ] Disable JavaScript in DevTools and reload `/`: the rail renders **untinted** (every entry on plain black, grey `--sleeve` hover) and every rail link is still readable and clickable. This is the documented, accepted consequence of the tint being hydration-gated — not a bug.
- [ ] Re-enable JavaScript and hard-reload `/` a few times while watching the rail: the tint appears as the page settles. A brief untinted flash before hydration is expected; a rail that stays untinted after the page is interactive is not.
- [ ] Regression check on the guards: temporarily edit `website/src/layouts/BaseLayout.astro` to author `style-src 'self' 'unsafe-inline' 'unsafe-hashes'`, run `cd website && npm run build`, and confirm it **fails** with `CSP hardening incomplete — 'unsafe-hashes'`. Revert the edit and confirm the build passes again.
- [ ] `cd website && npm run ci` from a clean checkout exits 0, and `grep -ro 'style="--nav-tint' website/dist | wc -l` prints `0`.

## T9 new-badge-position

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open `/archetypes/burning-abyss/` at 1400×900: on the newest-release cards, the orange "NEW" pill sits below the card's title bar, over the illustration — it no longer covers the title bar / top corner of the card.
- [ ] Same page: confirm the pill's right edge still hugs the card's top-right corner the same distance as before this change (only the vertical offset moved; nothing else about the badge — colour, size, right offset, stacking order — changed).
- [ ] Open `/` at 1400×900: the "New" pill on the Non-archetype/Burning Abyss/Nekroz section tiles has also dropped lower, staying clear of the tile's title text.
- [ ] Narrow to a phone width (390px) on `/archetypes/nekroz/`: the badge still sits over the artwork at the lower position, not overlapping the card title, at this width too.
- [ ] Open DevTools, inspect a `.tile-badge` element's computed style: `top` resolves to `32px` (`2rem`) at every width checked.

## T10 hero-fidelity

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open `/archetypes/nekroz/` at exactly 1440px wide with the catalog rail expanded (its default): the prose and the hero art sit closer together than they did before this pass, and the pair reads as centred in the row — there is now visible breathing room outside the prose on the left and outside the art on the right, where before each ran to the edge of the page shell.
- [ ] Same view, DevTools: select the first `<div>` inside `.catalog-hero` and read its box width, then the `.catalog-hero-art` width. They must be about **656px** and **394px** — the same widths they had before this whole pass began. If either reads about 688px / 413px, the `fr` tracks have eaten the gutter again and the fix has regressed.
- [ ] Same view: measure the horizontal space between them (art's left edge minus the prose's right edge). It should be **36px**, down from 86px on `main`. This is the whole point of the change — a much tighter gutter with the columns unmoved.
- [ ] Repeat both measurements at exactly 1280px wide: expect roughly **562px** prose, **337px** art, **32px** gutter.
- [ ] Inspect `.catalog-hero` computed style at 1440px: `width` must NOT be `1152px` — the old `min(100%, 72rem)` cap is gone, so the element spans the full page shell (about 1136px) and the inset comes from `padding-inline` instead (about 25px each side).
- [ ] Widen the window past ~1500px: the hero keeps growing with the page instead of freezing at 1152px. Nothing should look clipped or off-centre.
- [ ] Resize down through 1025px → 1024px: at 1025px the hero is still two columns with the art beside the prose; the moment it drops to 1024px the hero stacks to one column **and the art disappears in the same step**. The art must never be visible below the prose. This is the feedback line being fixed — the old build kept showing it all the way down to 704px.
- [ ] At 900px: one column, no hero art, no leftover gap or empty box where it was, and the prose block lines up flush with the card gallery beneath it (no inset — the padding compensation is switched off when stacked).
- [ ] At 390px (phone): still no hero art; the archetype heading and the first gallery card are reachable without excessive scrolling.
- [ ] With a screen reader or the accessibility-tree inspector at 900px and 390px: the hero art container (`role="img"`, `tabindex="0"`) is absent from the tree and cannot be reached with Tab — removed, not merely visually hidden.
- [ ] Repeat the 1440px, 900px and 390px checks on `/sections/non-archetype/non-archetype/`: it shares `.catalog-hero`, so both hero routes must move together.
- [ ] Collapse the catalog rail (rail toggle) at 1440px and re-check: the columns shrink together with the page, the gutter stays tight, and neither column overlaps the other.
- [ ] DevTools **Network** tab, reload `/archetypes/nekroz/` at 900px and filter by image: the hero WebP **is still downloaded** even though it is hidden. This is a known, accepted cost recorded in T10's Outputs, not a bug to file — see the follow-up note there.
- [ ] DevTools **Console** on `/archetypes/nekroz/` at 1440px, 900px and 390px: completely empty, no CSP violation and no error.

## T11 staged-header-degradation

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open the served site at 1400px on `/archetypes/burning-abyss/`: nothing has changed from T5 — brand, breadcrumb, the three full text links "Learn about Essentia" / "Blog" / "Decks", and a wide `⌕ Find ⌘ K` box. No `⋯` button.
- [ ] Narrow to exactly 1024px: the three links now read "Learn", "Blog", "Decks" **inline in the header row** (not in a popover), the hamburger and Find lose their "Catalog"/"Find" text, and the Find box is still wide with its `⌘ K` hint. Still no `⋯` button. This is the change T11 exists for — before it, "Learn" could only be seen inside the `⋯` popover.
- [ ] At 1025px the labels are long again: the switch is exactly at 64rem.
- [ ] Narrow to exactly 896px: the Find box collapses to a small square `⌕` button and the `⌘ K` hint disappears — while "Learn", "Blog", "Decks" are **still inline**. At 897px Find is still wide: the switch is exactly at 56rem.
- [ ] Narrow to exactly 704px: only now do the three links fold into the single square `⋯` button. At 705px they are still inline.
- [ ] Do that whole sweep once more watching the wordmark: it never gets squeezed thin or clipped at any width between 400px and 1400px. (Before T11 it was crushed to zero width between 720px and 864px.)
- [ ] Do the sweep once more watching for a horizontal scrollbar at the bottom of the window: none appears at any width. (Before T11, `/archetypes/burning-abyss/` overflowed by up to 95px around 720px.)
- [ ] Repeat the three boundary checks (1024, 896, 704) on `/` — a page with no breadcrumb — and on `/cards/ash-blossom-and-joyous-spring/`: the header is one row at each.
- [ ] At 896px and at 704px, use the keyboard shortcut `⌘ K` / `Ctrl K`: the Find dialog still opens even though the hint glyph is hidden.
- [ ] At 1024px, inspect the accessibility tree for the docs link: it still announces "Learn about Essentia" although only "Learn" is drawn.
- [ ] With DevTools open, sweep from 1400px to 390px and back: no console error and no `[essentia] site-header wraps to …` warning at any width.

## T12 ruling-keywords

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open the served site (not `npm run dev` — the hashed CSP only exists in the build) at `/archetypes/burning-abyss/`.
- [ ] Hover **Burning Abyss - Alich**: the hover preview shows the card render *and* a rulings column. It lists `Static`, `Activated`, `Triggered`, `Hard` and `Linked` alongside the archetype rulings it already showed (`Abyssal Curse`, `Descent`, `On Send Grave`, `Target`). Before T12 only the bold keywords appeared.
- [ ] Read the `Static` entry in full: "Passive ability. Does not use the Stack. Active as soon as the card enters the required zone to take effect. Default zone is Field." Confirm it matches the rule you wrote — the wording is meant to be yours, with only spelling and grammar corrected.
- [ ] Same for `Hard` ("You can use this ability of {Name of the Card} only once per turn. …") and `Linked` ("All Soft abilities are grouped together. Same independently for Hard abilities. …"): check `independently`, `ruling` and the single "all other abilities" read correctly — those were the three corrections.
- [ ] Hover **Burning Abyss - Fire Lake** (a `Trap Instant`): the rulings column includes `Trap` — "Cannot be cast from Hand. Can only be Set face down." — and `Resolution`. This is the super-type keyword; it is the one of the eight that comes from the type line rather than the ability prefix.
- [ ] Hover a card with no ability prefix and no Trap type (e.g. a plain vanilla creature in `/sections/non-archetype/non-archetype/`): the hover box shows the render with **no** rulings column, exactly as before. The new terms must not appear on cards that never print them.
- [ ] Open `/cards/burning-abyss-alich/` and read the printed rule text on the card page: the italic ability prefixes `(1 - Static)`, `(2 - Activated Hard Linked)`, `(3 - Triggered Hard Linked)` are unchanged, and **no** `(reminder)` text has been appended after them. The new rulings live only in the hover box, never on the card face.
- [ ] Tab (do not hover) to a gallery card that prints `Static`: the same rulings appear — the hover box is keyboard-reachable, not pointer-only.
- [ ] DevTools **Console** on `/archetypes/burning-abyss/` while hovering several cards: completely empty. In particular no `Content-Security-Policy` violation — the ruling map ships as a hashed `<script type="application/json">` island, so a CSP error here would mean the island stopped being hashed.
- [ ] Open `/docs/keywords/` and `/docs/rules/templating/`: the keyword index now lists ability metadata and super-type keywords as classes 5 and 6, and its links to `rules/TEMPLATING.md` and `rules/CARD_TYPES.md` resolve to real pages (no 404).
- [ ] Judgement call to confirm or reject: the hover box on a three-ability Burning Abyss card now lists up to nine rulings and is noticeably taller. If that is too much at once, say so — the fix is to flip `preview: false` on some of the eight in `docs/keywords/*.md`, which needs no code change.

## T13 give-the-guards-teeth

T13 changes only tests and test infrastructure — no site CSS, no runtime
behaviour. So these steps verify two things: that the corrected width constants
match what the browser actually draws, and that the guards now scream when the
regressions they exist to catch are reintroduced.

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open the served site at `/cards/ash-blossom-and-joyous-spring/` and set the viewport to exactly **400 × 800**.
- [ ] In DevTools, run `['.compact-brand img','.drawer-trigger','.utility-more','.search-trigger'].map(s => [s, document.querySelector(s).getBoundingClientRect().width])`. Expect roughly `32`, `34`, `39.2`, `39.8` — these are the numbers `website/shared/header-row.mjs` now claims. Before T13 it claimed `36` for the hamburger and `48` for Find, which is the drift this ticket removed. A deviation of more than ~1px is a real disagreement: report the measured values rather than editing the constants.
- [ ] Run `document.querySelector('.breadcrumb').getBoundingClientRect().width` at the same width: it is whatever room is left, and shrinking the window shrinks it rather than wrapping the header. `header-row.mjs` reserves `0` for it now (it reserved `64`), which is what `.breadcrumb { min-width: 0 }` actually says.
- [ ] Still at 400px, confirm the header is **one row** and the console shows no `[essentia] site-header wraps to …` warning. The budget arithmetic changed (`contentPx` 248 → 173.8) so this is the check that the new numbers are the safe ones.
- [ ] Run `cd website && HEADER_ROW_VIEWPORT_PX=200 node scripts/check-header-row.mjs; echo "exit=$?"`. It must print two `[warn] site-header may wrap at 200px …` lines and `exit=0`. This is the branch that previously had no test at all, only a grep of the file for the string `console.warn`.
- [ ] Run `cd website && node scripts/check-header-row.mjs; echo "exit=$?"` with no override: no output, `exit=0`.
- [ ] Optional, the mutation check a reviewer would repeat. In `website/src/styles/global.css`, temporarily change `.utility-more { width: 2.45rem }` to `6rem` and run `cd website && npx vitest run tests/unit/header-row.test.ts`. It must fail with `utility-more: expected 96 to be close to 39.2`. Before T13 this passed. `git checkout -- website/src/styles/global.css` afterwards.
- [ ] Optional, second mutation. Add `margin-left: auto` to `.compact-brand` and run `npx vitest run tests/unit/header-brand.test.ts`: the two `brand holds the left edge` tests must fail. Before T13 they passed while the wordmark sat flush right. Revert.
- [ ] Judgement call to confirm or reject: `header-row.mjs` now records two numbers CSS cannot state — `intrinsicPx` 18 for the `☰` glyph plus its border, and `11` for `⌕` plus its border. They come from a real 400px render, and a font change would move them. If you would rather the compact header pinned those two controls to explicit widths in `global.css` so nothing is measured at all, say so — that is a CSS change and was out of scope here.

## T1 hd-input-handoff

- [ ] Run `python .script/verify_hd_inputs.py` before staging anything: it prints exactly 5 lines, all four frame packs `present=no`, and the `hd.art` line shows `sd=223 hd=50 missing=173` with 5 example filenames.
- [ ] Create `hd_inputs/frames/magic-sevenhalf.mse-style/` and drop in one PNG that is exactly 2× the size of the matching file under `MSE/data/magic-sevenhalf.mse-style/`. Re-run the script: that pack now reports `present=yes files=1 double=1 wrong-size=0`.
- [ ] Rename or resize that same PNG to a size that is not exactly 2×. Re-run the script: `double=0 wrong-size=1`.
- [ ] Run `git status`: files under `hd_inputs/frames/<pack>/` do not show up as trackable/stageable (they stay ignored), but `hd_inputs/frames/.gitkeep` is trackable.
- [ ] Open `MSE/README.md`, `## HD inputs` section: confirms the four pack names, the 2× rule, and the `TODO(user)` line naming the missing upscaler-tool fact.

## T2 quiet-render-log

- [ ] Run `python .script/export_mse_renders.py cards_mse/01_alpha/LOTA-0001-Alpha_0.1/LOTA-0001-Alpha_0.1_all_cards.mse-set --output /tmp/render-check`: stdout is exactly one line, `mse.render LOTA-0001-Alpha_0.1: 50 cards loaded, … checked, 50 rendered, 0 print masters` — no per-card JSON dump.
- [ ] Re-run the same command with `--verbose` appended: stdout is the old-style indented `mse.render.plan` JSON followed by the `mse.render.complete` JSON, one card entry per card.
- [ ] Run `cd website && npm run cards:rebuild`: stdout is exactly two lines — one `mse.render …` summary line per open package, then `rebuild: N package(s) rebuilt`. No `rebuilding: …` / `rebuilt: …` pair per package.
- [ ] Run `cd website && npm run dev`: it still starts cleanly and the site loads at `http://localhost:4201/` (the `cards:rebuild` step in `predev` prints only the quiet summary line, not a JSON dump).
- [ ] Skim `docs/MSE.md`'s exporter CLI section: it documents `--verbose` and states default output is one summary line per project.

## T3 header-inline-links

- [ ] Run `cd website && npm run build && node scripts/serve-dist.mjs`, open `/archetypes/burning-abyss/` and set the viewport to exactly **400 × 800**.
- [ ] Confirm the header is one row: the brand mark, hamburger, breadcrumb, and the three links `Learn` / `Blog` / `Decks` all sit on the same visual line, with no wrapped second row.
- [ ] Confirm there is no `⋯` button anywhere in the header at this width, and clicking near where it used to sit does nothing.
- [ ] Confirm all three links (`Learn`, `Blog`, `Decks`) are visible inline (not hidden, not behind a click-to-open panel) and each is a working link.
- [ ] Widen the window slowly from 400px to 1024px: the header never wraps to two rows at any point, and the three links stay inline the whole time (no popover ever appears).
- [ ] At 400px, confirm the breadcrumb's last crumb (`Burning Abyss`) is visible, truncated with an ellipsis rather than missing or overflowing the header.
- [ ] Widen to ~900px: the breadcrumb's last crumb now reads in full (`Burning Abyss`, not truncated), confirming the `flex: 1 1 0` breadcrumb change didn't collapse it at wider widths.
- [ ] Load `/` (no breadcrumb) at 400px: header still holds one row with the three links inline.

## T4 home-new-cards-content

- [ ] Run `cd website && npm run build && node scripts/serve-dist.mjs`, open `/` in a browser.
- [ ] Count the card tiles under the "New cards" heading: exactly 10.
- [ ] Confirm there is no paragraph/blurb text directly under the "New cards" heading (no "Latest cards from alpha/beta/release packages." line).
- [ ] Confirm the "View all 50 new cards" link below the grid renders as a solid accent button (not a plain inline text link), centered under the grid.
- [ ] Click that button: it lands on `/updates/` and that page lists all 50 cards.
- [ ] In the hero section, confirm the secondary button reads "View new cards" (not "See what changed") and clicking it also lands on `/updates/`.

## T5 one-card-per-row

- [ ] Run `cd website && npm run build && node scripts/serve-dist.mjs`, open `/` and set the viewport to exactly **400 × 800**.
- [ ] Confirm the "New cards" grid on the homepage shows exactly one card per row — every tile's left edge lines up, none sit side by side.
- [ ] Widen the viewport to **560 × 800**: the same grid now shows exactly two cards per row.
- [ ] Widen further to **900 × 800**: the grid shows three cards per row; widen to **1200 × 800**: five per row.
- [ ] Open `/archetypes/burning-abyss/` at **400 × 800**: the archetype gallery also shows exactly one card per row.
- [ ] Narrow slowly from 560px down to 400px: the new-cards grid drops from two columns to one somewhere around 480px, with no card ever clipped or overlapping another.

## T6 home-spacing-first-paint

- [ ] Run `cd website && npm run build && node scripts/serve-dist.mjs`, open `/` in a browser window sized to exactly **1920 × 1080** (no browser chrome eating extra vertical space, or use DevTools device toolbar at that size).
- [ ] Confirm the "New cards" heading is fully visible without scrolling — the whole heading text sits above the bottom edge of the viewport on first load.
- [ ] Confirm the page has not auto-scrolled: the very top of the hero (the "The Yu-Gi-Oh! Feel. With Magic Rules." headline) is also visible at the top of the viewport.
- [ ] Confirm the gap between the "New cards" heading and the first card tile below it reads visually tight, not the large airy gap from before.
- [ ] Scroll down to the "Archetypes" heading: confirm it also sits close to the row of archetype tiles beneath it, not floating far above them.
- [ ] Resize the window narrower (down to ~400px): the hero still displays correctly (no clipped text, no overlap) — the shorter hero height does not break small-screen layout.
- [ ] Open the browser devtools console while loading `/` at 1920×1080: no console errors.

## T7 archetype-hero-panel

- [ ] Run `cd website && npm run build && node scripts/serve-dist.mjs`, open `/archetypes/burning-abyss/`.
- [ ] Confirm the title, intro paragraph, and stats row (published card count / latest release) sit inside a single bordered, translucent panel, visually lifted off the background art.
- [ ] Confirm the panel does not shift the two-column hero layout: the archetype art still sits to the right, same as before.
- [ ] Narrow the viewport to ~400px wide: the panel padding shrinks slightly (no squeezed/clipped intro text).
- [ ] Open `/sections/non-archetype/non-archetype/`: confirm there is no bordered panel around its hero text (out of scope for this change).
- [ ] Open `/archetypes/nekroz/` and confirm the same panel treatment applies there too.

## T8 card-rules-block

- [ ] Run `cd website && npm run build && node scripts/serve-dist.mjs`, open `/cards/burning-abyss-graff/`.
- [ ] Confirm the rule text under the card render prints no `(ruling)` parentheses next to bold keyword phrases — only the printed numbered ability prefixes like `(1 - Static)` remain, because those are on the card face.
- [ ] Below the card facts (`Current: …`, `Published …`, `Rarity: …`, `Collection: …`), confirm a `Rules` heading appears with 9 rows (one per keyword bold or italic on the card: Abyssal Curse, Activated, Descent, Hard, Linked, On Send Grave, Static, Summon, Triggered), each with a bold term and an indented definition below it.
- [ ] Confirm that `Rules` block sits above `Release history`.
- [ ] Hover a burning-abyss-graff gallery tile at `/archetypes/burning-abyss/`: the hover preview's keyword rulings still match the ones on the card page.
- [ ] Click into `Release history` → the alpha version link, e.g. `/cards/burning-abyss-graff/versions/alpha-LOTA-0001-Alpha-0-1/`: confirm that page still prints inline `(ruling)` reminders in its rule text, unlike the card page.
