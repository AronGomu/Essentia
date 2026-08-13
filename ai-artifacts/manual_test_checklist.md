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

## OBSOLETE — T5 compact-header-overflow-menu

Superseded by feedback-batch T3. **Do not run this section:** `.utility-more` and `⋯` popover were deleted; three links now stay inline through 400px.

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open the served site at 1400px: the header shows the brand, the hamburger drawer trigger, and the utility nav as a plain inline row of three text links — "Learn about Essentia", "Blog", "Decks" — exactly as before this change; no `⋯` button is visible.
- [ ] Narrow the browser to 400px width: the utility nav collapses to a single small square `⋯` button (labelled "More sections"); the "Learn about Essentia" text link is not visible anywhere in the header.
- [ ] At 400px, the drawer trigger and the Find trigger show as icon-only squares (`☰` and `⌕`) with no visible text label.
- [ ] At 400px, click the `⋯` button: a small popover panel opens below the header at the right edge, listing "Learn", "Blog", "Decks" (short labels).
- [ ] With the popover open, inspect each link's accessible name via a screen reader or the browser's accessibility tree inspector: the docs link announces "Learn about Essentia" even though only "Learn" is visible; the drawer trigger announces "Catalog" (or "Docs & blog" in reading mode); the Find trigger announces "Find".
- [ ] Click outside the open popover (or press Escape): it closes.
- [ ] Resize the browser slowly from 1400px to 390px and back: the switch between the inline row and the `⋯` button still happens exactly at 44rem (704px) with no layout jump or flash of unstyled content. (Amended by T11: this is now the *third* of three changes you will pass on the way down — the labels shorten at 1024px and Find squares off at 896px first. Only the `⋯` switch is at 704px.)
- [ ] Open the browser devtools console at 400px while opening/closing the popover: no console errors.

## OBSOLETE — T6 header-single-row-guard

Superseded by feedback-batch T3 header checks below. **Do not run this section:** any instruction expecting `.utility-more`/`⋯` is invalid.

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

## OBSOLETE — T11 staged-header-degradation

Superseded by feedback-batch T3. **Do not run this section:** utility-link collapse into `⋯` no longer exists.

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

## OBSOLETE — T13 give-the-guards-teeth

Superseded by feedback-batch T3. **Do not run this section:** it targets deleted `.utility-more` markup and stale width constants.

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

- [ ] Run `python .script/verify_hd_inputs.py`: exactly five lines, exit 0. On current installed tree, four frame lines show `installed=15/9/18/35`, `wrong-size=0`; art line shows `sd=223 hd=223 missing=0`.
- [ ] Run `git status --ignored --short hd_inputs original_images_hd`: local source payload remains ignored. Do not resize, rename, or stage current approved inputs.
- [ ] Open `MSE/README.md`, `## HD inputs`: four pack names, pre-install `double` vs post-install `installed` states, local-rights restriction, upscaler `TODO(user)`.

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

## T6 collapsible docs rail

- [x] Desktop `/docs/rules/zones/`: active group open; sibling groups closed; root docs render as bare links above disclosures.
- [x] Desktop toggle persists across navigation/reload; active group overrides persisted closed state on arrival.
- [x] Desktop and 400px drawer contain no Docs/Blog rail switch; header retains Learn / Blog / Decks.
- [x] Keyboard: Tab reaches each summary; Enter toggles; drawer focus trap remains functional.
- [x] JavaScript-disabled SSR check: active group carries `open`; inactive groups remain closed.

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

## T9 related-graph

- [ ] Run `cd website && npm run content`, confirm it exits 0 and prints the one-line content summary with no errors.
- [ ] Open `website/src/generated/catalog.ts`, search for `"id": "tour-guide-from-the-underworld"`, confirm `burning-abyss-graff` and `burning-abyss-cir` are related to it (both Fiend, MV 1 — cards Tour Guide can Summon). (Superseded by feedback-batch-2 T6: they now sit in `related.archetype`, because the dedupe drops from `related.interaction` anything already listed as same archetype.)
- [ ] In the same file, search for `"id": "burning-abyss-graff"`, confirm its `related.archetype` array lists every other `burning-abyss-*` card id and does not include `burning-abyss-graff` itself.
- [ ] Search for `"id": "downerd-magician"`, confirm its `related.interaction` array does not include every card at MV 1 — only Xyz MV 1 creatures (e.g. `bagooska`, `tornado-dragon`), not `ash-blossom-and-joyous-spring` (MV 1, non-Xyz).
- [ ] Confirm `"schemaVersion": 11` near the top of `catalog.ts`.
- [ ] Confirm the card page at `/cards/tour-guide-from-the-underworld/` still built with the old flat related-cards list at the time this ticket shipped — this ticket only added the data field; see T10 for the UI that consumes it (superseded, T10 shipped after).

## T10 related-cards-ui

- [ ] Run `cd website && npm run build && node scripts/serve-dist.mjs`, open `/cards/burning-abyss-graff/`.
- [ ] Confirm a headed section appears after the card pager: `Same archetype`, showing a gallery grid of card tiles (thumbnail + name), not bare text links. (Superseded by feedback-batch-2 T6: Graff's interaction targets were all same-archetype duplicates, so only one section renders here now. Use `/cards/tour-guide-from-the-underworld/` — the only card left that fills both lists — to see `Same archetype` and `Interacts with this card` together.)
- [ ] Confirm the old flat `Related cards` bullet list is gone.
- [ ] Hover a tile in either gallery: confirm the shared hover-preview card render/rulings pop up, same as any other gallery tile on the site.
- [ ] Open `/cards/tour-guide-from-the-underworld/`: confirm its Burning Abyss fetch targets appear. (Superseded by feedback-batch-2 T6: the two lists are now disjoint, so `Burning Abyss - Graff` and the rest sit under `Same archetype`, not under `Interacts with this card`, which now lists only `Bagooska` and `Evilswarm Exciton Knight`.)
- [ ] Find a card whose `Same archetype` list exceeds 12 — currently only `/cards/tour-guide-from-the-underworld/` (13; each Burning Abyss card sits at exactly 12 and shows no overflow link): confirm the gallery caps at 12 tiles and a trailing `View all N … cards` link appears, pointing at that card's own section page (`/sections/non-archetype/non-archetype/` for Tour Guide).
- [ ] For a card whose `Interacts with this card` list exceeds 12 (if any exists in the current catalog), confirm the trailing text reads `N more` with no link.
- [ ] Open a card whose both related lists are empty, if one exists in the current catalog (check `card.related` in `src/generated/catalog.ts`): confirm neither related section renders at all.

## T11 frame-hd-spike

- [ ] Run both probe CLI commands from T11 and confirm each emits a 1500×2092 measurement with `verdict: rescale-to-750-space`.
- [ ] Confirm ADR 0030 records both measured rows, MSE 2.1.2 build commit, 2026-08-10 date, and `rescale-to-750-space` verdict.
- [ ] Run `git status --porcelain MSE/` after both probes and confirm output is empty.

## T12 install-hd-frames

- [ ] From a fresh clone with Full Magic Pack at declared commit plus four exact local packs, run one command: `python launcher/setup_mse.py --source /path/to/Full-Magic-Pack --hd-frames hd_inputs/frames`. It completes deterministic install plus final verification.
- [ ] Run `python launcher/setup_mse.py --verify`: `event=config.mse.verified files=560`, no missing/modified paths. Re-run installer; HD event reports `files=0` (idempotent).
- [ ] Export `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set` and `cards_mse/00_drafts/00_non_archetype/00_YGO_Non_Archetype.mse-set` to separate scratch dirs with `.script/export_mse_renders.py --output`; every PNG is 750×1046.
- [ ] At equal display size, compare `Book of Moon` (sevenhalf), `Bagooska` (spellbook), `Herald of the Arc Light` (sketch), `Nekroz - Brionac` (praetor), `Cross-Sheep` (Capenna), and `Elder Entity N'tss` (Fusion control) against their pre-change renders. Title bars, art boxes, type lines, rules boxes, and P/T boxes do not move.
- [ ] Inspect a 50% overlay plus amplified pixel diff for all six representatives. Frame detail may sharpen; duplicated/ghosted bars or text indicate bad coordinate scaling and must fail this check.
- [ ] Confirm every installed Capenna bitmap and its style canvas is exactly 750×1046. Installer resized to 750×1047 then cropped last/bottom source row; scratch geometry remains unchanged.

## T13 hd-card-art

- [ ] Open one regenerated card from each non-empty draft project and the open alpha package in MSE; confirm the illustration is visibly sharper and the saved `image:` path is unchanged.
- [ ] Compare `Mathematician`, `Raigeki`, and `Maxx “C”` before/after at equal display size; confirm centre framing matches with no stretched or clipped subject.
- [ ] Confirm 177 art files were updated; user-accepted permanent skips `Absolute King Back Jack`, `Crane Crane`, `Fiend Griefing`, and `Fiendish Rhino Warrior` retain prior art. Do not fetch/fabricate/upscale them.

## T14 hd-renders-and-print

- [ ] Run `cd website && npm run rights:check`: `rights: 100 approved assets` (50 independent display sources + 50 print masters), approved by AronGomu on 2026-08-10.
- [ ] At 1920px viewport width and 100% browser zoom, compare a card page against its pre-HD screenshot and confirm the render is visibly sharper. This manual visual check remains pending until performed.

## T1 lint-perf

- [ ] Run `time python .script/lint_mse_card_style.py` on a clean checkout: wall clock stays well under 2 seconds (was ~25.6s before this change).
- [ ] Run the lint script twice with `PYTHONHASHSEED=0` and `PYTHONHASHSEED=1` (`PYTHONHASHSEED=0 python .script/lint_mse_card_style.py` vs `PYTHONHASHSEED=1 python .script/lint_mse_card_style.py`); confirm stdout is identical between the two runs.
- [ ] Diff the lint output against a pre-change capture (capture the pre-change output from a scratch copy of the old script — do not stash a dirty tree): 248 findings before and after, same files, same lines, same rule codes. The output is **not** byte-identical: exactly one MSE008 message changed, on `card nekroz - shurit:19`, from `'Shurit'` to `'Nekroz'`. That single line is expected — equal-length alias ties used to fall out of set iteration order and are now deterministic. Any *other* difference is a regression.
- [ ] Edit a card's rule text to introduce a known keyword in plain (non-bold) text, e.g. remove `<b>` around `Discard`; confirm the linter still reports `MSE014` for it, proving the perf rewrite didn't silently drop a rule.

## T2 rebuild-progress

- [ ] Run `cd website && npm run cards:rebuild` (or `python .script/rebuild_open_packages.py` from repo root) and watch the terminal: five numbered `rebuild <package> [i/5] <phase>` lines appear with matching `... done (N.NNs)` lines, never a long silent stretch.
- [ ] During the same run, confirm one `mse.render i/50 <card name>` line prints per card as renders happen, followed by one `mse.print i/50 <card name>` line per card during print-master export.
- [ ] Confirm no carriage returns, spinners, or ANSI colour codes appear — every progress line is a plain, scrollable, greppable terminal line.
- [ ] Confirm the run still ends with the existing `mse.render <package>: N cards loaded, ...` summary line and `rebuild: 1 package rebuilt` line, unchanged from before.
- [ ] Run `python .script/export_mse_renders.py <project> --canonical --quiet` on a project: confirm no `mse.render i/n` lines print, only the final summary line.

## T3 rebuild-skip-stamp

- [ ] Run `python .script/rebuild_open_packages.py` twice in a row from repo root: the first run does the full ~40s render; the second prints `rebuild <package> unchanged, skipped (N.Ns)` and returns in well under 1 second.
- [ ] Open a card file in Magic Set Editor, make a real edit (e.g. change rule text), save, then run `python .script/rebuild_open_packages.py` again: it does the full rebuild again (not skipped), because the input hash changed.
- [ ] Run `python .script/rebuild_open_packages.py --force` after a skipped run: it always does the full rebuild, ignoring the stamp.
- [ ] Run `python .script/release_package.py lock <package>`: confirm it always rebuilds fully even if a matching stamp exists (locking must never skip).
- [ ] Confirm `.cache/mse-rebuild/` appears at the repo root after a rebuild and is not tracked by git (`git status --porcelain .cache` prints nothing).

## T5 card-render-size-and-full-size

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open `/cards/nekroz-trishula/` at a desktop width (e.g. 1440px): the card render is visibly bigger than before this change — it now fills the column up to 40rem (640px) instead of being capped at 25rem (400px).
- [ ] Directly under the render, confirm a `Show full size` link/button appears, styled like the pager buttons (bordered, rounded, dark background), centred under the image.
- [ ] Click `Show full size`: it opens a new tab with the raw print-master PNG (1500 × 2092), not the on-page render.
- [ ] Narrow the viewport to a phone width (~390px): the render still fills its column responsively (no overflow, no clipping) and the `Show full size` link is still present and tappable.
- [ ] Repeat the render-size and full-size-link checks on a second card, e.g. `/cards/burning-abyss-graff/`.
- [ ] Open DevTools console while loading a card page: no console errors, no CSP violations.

## T4 hover-overlay

- [ ] `cd website && npm run dev`, open `/archetypes/nekroz/` at a desktop width: hover a card tile — a large preview appears directly over the tile, roughly 75% of the viewport's height.
- [ ] While hovering, move the pointer slightly off the tile edge but still over the preview image itself: the preview stays visible (pointer events pass through it to whatever is underneath), and moving off the tile fully hides it.
- [ ] Hover a tile whose card prints an authored keyword (e.g. a `Static` or `Trap` card on `/archetypes/burning-abyss/`): the keyword rulings float beside the big preview, on whichever side of the screen has more room, not squeezed into a fixed side-by-side column.
- [ ] Hover a tile near the left edge of the viewport and one near the right edge: the rulings column flips to the side with space, and clamps fully on-screen in both cases (never clipped off the viewport).
- [ ] Shrink the browser to a narrow desktop width (~900px) where neither side has 320px free: the rulings column disappears entirely, but the big preview itself stays put and fully visible.
- [ ] Tab through the tiles with the keyboard (no mouse): focusing a tile shows the same overlay preview as hovering it, and tabbing away hides it.
- [ ] Resize or scroll the page while a preview is open: it stays correctly positioned over its tile (doesn't drift or detach).

## T7 related-band-layout

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open `/cards/burning-abyss-graff/` at 1440px: `Same archetype` renders below the card render and text, inside a visibly tinted full-width band with a hairline top border. (Graff renders that one section only — see T6 below. For a page with both sections in the band, use `/cards/tour-guide-from-the-underworld/`.) The band's background spans edge to edge; the gallery content inside it stays inset to the page shell width.
- [ ] Slowly scroll the page: the card render (`.render-column`) stays pinned (sticky) while the rules text scrolls past it, then once the transcription column runs out, the render and the related band scroll away together — the render never overlaps or bleeds into the related band.
- [ ] Confirm the related galleries are visibly wider than they were before (up to 6 columns at ≥ 90rem viewport width, vs. 5 for other `.card-grid` usages on the site).
- [ ] Resize down to 44rem / 704px and below: the render column unsticks (`position: static`) and the two-column `.card-detail` grid stacks to one column, same as before this ticket.
- [ ] Check 1440px, 1024px and 390px widths for a horizontal scrollbar. None should appear at 1440 or 390. At 1024px there is a pre-existing ~48px page-level overflow that also reproduces on the untouched `/` homepage (confirmed unrelated to this ticket) — confirm it is not visibly worse or different in character on the card page.
- [ ] Confirm the breadcrumb, pager, release history, Rules block, and design notes are still inside the narrower transcription column (unchanged width/position), only the two related sections moved.

## T6 related-dedupe-and-badge

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open `/cards/tour-guide-from-the-underworld/` (the only card that still fills both lists): no card name appears under both `Same archetype` and `Interacts with this card`.
- [ ] On the same page, confirm neither related gallery shows a `New` badge on any tile.
- [ ] Open `/cards/burning-abyss-graff/`: only the `Same archetype` block renders (its interaction targets were all same-archetype duplicates and are now gone), and no tile in it carries a `New` badge.
- [ ] Open `/archetypes/burning-abyss/` and the home page: the `New` badge still renders on those section grids, unchanged.
- [ ] Hover a tile inside a related gallery: the hover preview still works (the badge opt-out did not affect the preview data attributes).

## T8 archetype-backgrounds

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open `/archetypes/nekroz/`: a dim, icy photographic backdrop is visible behind the atmosphere gradient, sitting behind all content, and text stays comfortably readable.
- [ ] Open `/archetypes/burning-abyss/`: a dim, lava/chained photographic backdrop is visible behind the atmosphere gradient, and text stays comfortably readable.
- [ ] Open `/archetypes/shaddoll/` if it resolves in your checkout (it currently 404s here — Shaddoll has no published cards yet, unrelated to this ticket): confirm no photo backdrop appears and nothing else changed.
- [ ] Open `/cards/nekroz-trishula/`: confirm there is no photo backdrop on a card page, even though its theme is `nekroz` (only archetype pages carry `data-page="archetype"`).
- [ ] Open DevTools console on `/archetypes/nekroz/` and `/archetypes/burning-abyss/`: no CSP violations (the injected `<style>` setting `--page-photo` is hashed by `harden-csp.mjs`, confirmed by `npm run build` succeeding).

## T9 markdown-images

- [ ] `cd website && npm run dev`, open `http://localhost:4201/docs/`: the Nekroz of Trishula card render appears in the "What is published here" section, at roughly 60% of the reading column's width, bordered like other reading-body media.
- [ ] Confirm the image is lazy-loaded (`loading="lazy"`) and does not shift surrounding layout on load.
- [ ] Open DevTools console on `/docs/`: no CSP violations (no inline `style` attribute is present on the `<img>`; the scale comes from a `md-image-scale-60` class).
- [ ] Resize the browser to a narrow width (~390px): the image scales down proportionally with the reading column, no overflow or clipping.

## T10 review-fixes

- [ ] `cd website && npm run build && node scripts/serve-dist.mjs`, open `/archetypes/nekroz/` at 1440px: the icy photo backdrop fills the whole viewport (no tiled seam, no small unscaled image sitting in the middle of the page). Before this fix the Nekroz theme's five background layers cycled a three-value `background-size` list and left the photo at its intrinsic size; Burning Abyss happened to land on `cover` and looked right.
- [ ] Repeat on `/archetypes/burning-abyss/` at 1440px and at 390px: the backdrop still covers, and the gradients above it look unchanged (they have no intrinsic size, so `cover` is a no-op for them).
- [ ] Run `python .script/rebuild_open_packages.py` twice. **The first run after this commit does a full rebuild even if nothing changed** — `STAMP_SCHEMA` went 1 → 2, so every existing stamp is invalid once. The second run must print `unchanged, skipped` in well under a second.
- [ ] Edit `website/content/identities.json` (e.g. add a route alias), then run `python .script/rebuild_open_packages.py`: it rebuilds instead of skipping. The stamp now covers the identity registry, which the aggregate is built from.
- [ ] Delete the PNGs inside an open package's `renders/` (keep the directory) and run the rebuild: it rebuilds rather than treating the empty directory as a finished output.
- [ ] `grep -rn '/home/' website/content/art-provenance.json` prints nothing: the two archetype-background entries now record `owner-supplied (outside repo): <file>.png`. The source images themselves still live outside the repo, under `~/Downloads`.
- [ ] Read the T1 lint-perf line above: it no longer asks anyone to verify byte-identical lint output. The true expectation is 248 findings with one changed MSE008 message on `card nekroz - shurit:19`.

## T1 derivative cache

- [ ] `cd website && rm -rf public/generated && npm run content`: output reports 1 release, 3 sections, 50 current cards; `public/generated/.derivative-manifest.json` exists with 250 entries.
- [ ] Immediately rerun `cd website && time npm run content`: output stays identical; real time remains under 3 seconds.
- [ ] Compare derivative hashes before and after warm run: all 250 derivative bytes remain unchanged.
- [ ] Delete one derivative, rerun `npm run content`: missing file returns; unrelated derivative mtimes remain unchanged.
- [ ] Open `/`, `/archetypes/burning-abyss/`, `/cards/burning-abyss-dante/`: card images load at thumb/display tiers; print link still resolves.

## T3 quoted-name relations

- [x] `cd website && npm run content`: exits 0 for 50 current cards with no `related:` guard failure.
- [x] Built catalog sanity: all 50 cards have empty `related.references`; no `related.interaction` key remains.
- [x] `/cards/tour-guide-from-the-underworld/` built HTML contains `Same archetype`, its 13-card overflow link, and no empty `References` heading.
- [x] Focused `related-cards.spec.ts` passes under Chromium, Firefox, and WebKit using the authorized NixOS Playwright shim: 15 passed.
- [x] Related galleries render without `New` badges; empty reference data renders no `References` section.

## T4 archetype backdrop

- [x] Nekroz and Burning Abyss photos start at `<main>` below the header and end above the footer at 1440 px and 400 px.
- [x] Both backdrops use `position: absolute`, scroll with content, and produce zero horizontal overflow at both widths.
- [x] Focused `archetype-background.spec.ts` passes under Chromium, Firefox, and WebKit using the authorized NixOS Playwright shim: 15 passed.
- [x] Full Playwright suite passes using the authorized NixOS shim: 205 passed, 2 owner-gated accessibility scans skipped.

## T5 folder-derived docs

- [x] `/docs/` shows the Essentia presentation page.
- [x] `/docs/rules/zones/` still resolves.
- [x] Docs rail renders one heading per folder-derived group; root docs stay ungrouped first.

## T7 blog landing

- [x] `/blog/` shows the 2026-08-08 post in full and has no `.post-list`; its canonical points to that post's `/blog/{slug}/` route.
- [x] Desktop rail and mobile drawer show both posts newest first, each full-width title above `08/08/2026` or `01/08/2026`, with no blog group heading.
- [x] `/blog/lota-alpha-v0-1-presentation/` still renders and declares itself canonical.

## T9 review fixes

- [ ] Run `cd website && npm run content`, then immediately run `time npm run content`: second run finishes in under 3 seconds.
- [ ] Hash all generated derivative files before and after warm run: every derivative remains byte-identical.
- [ ] Delete one generated derivative, rerun `npm run content`: deleted file returns; unrelated derivative mtimes remain unchanged.
- [ ] Run focused symlink tests on filesystem supporting symlinks: generated-root plus manifest sentinels remain unchanged after rejection.

## T10 security review fixes

- [ ] Run `cd website && npx vitest run tests/unit/image-cache.test.ts` on a filesystem supporting symlinks: public-parent, generated-root, derivative-file, and manifest symlink cases reject; every external sentinel remains byte-identical.
- [ ] Delete one generated `*-print.png`, rerun `npm run content`, and confirm the print image is recreated while unrelated derivative mtimes remain unchanged.
- [ ] Run `cd website && npm run content && time npm run content`: the cold/repair run succeeds, the immediate warm run finishes under 3 seconds, and card-image output remains visually unchanged.
- [ ] Read the T2 verifier contract before implementation: only its own fresh, empty, canonical direct child of the canonical system temp root with the exact `essentia-derivatives-` prefix is accepted; relative, nested, non-empty, absent, or symlinked overrides reject before writes.

## T11 cache proof tests

- [ ] On a filesystem supporting symlinks, replace the manifest no-follow write temporarily with a direct `writeFile`, run `cd website && npx vitest run tests/unit/image-cache.test.ts -t 'refuses a symlinked manifest without changing its external target'`, and confirm it fails; revert the mutation.
- [ ] Temporarily append one byte to each encoded derivative before writing, run `cd website && npx vitest run tests/unit/image-cache.test.ts -t 'emits bytes identical to direct Sharp encoding'`, and confirm the AVIF byte comparison fails; revert the mutation.
- [ ] Run the unmodified focused suite and confirm all 17 tests pass, including external sentinel preservation and direct Sharp byte equivalence for AVIF, WebP, and PNG derivatives.
