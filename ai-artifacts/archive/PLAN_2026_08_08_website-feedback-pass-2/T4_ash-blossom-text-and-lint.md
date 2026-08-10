# T4: Ash Blossom text and lint

**Plan:** `./ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md`
**Depends:** T3
**Commit outcome:** Ash Blossom & Joyous Spring reads `(Draw, Mill X, Search, etc.)` with all three actions bold, the MSE style linter accepts a bare action keyword named as an example inside an italic reminder, and the Alpha package is rebuilt and valid.

## Context (self-contained)

- Goal: website feedback pass 2. This ticket delivers feedback item
  **"/sections/non-archetype/ 3"**: "Update `Ash Blossom & Joyous Spring` card text
  in MSE and website. `1 Spell or ability whose effect interacts with Deck (draw,
  Mill X, search, etc.)` ⇒ `1 Spell or ability whose effect interacts with Deck
  (Draw, Mill X, Search, etc.)`. Draw and Search become bold Action keywords. Add
  Search as text box hover preview."
- This slice: one card's `rule_text`, one linter exemption, one package rebuild.
  Because `Search` already carries `preview: true`, bolding it is what puts it in
  the hover box — no extra wiring is needed.
- Out of scope here: any other card, any other archetype, the website layout, the
  nav, hero art, section intros, docs/blog rails.
- Assumptions in force: `graphify` is not installed — do not run it.
  `MSE/bin/magicseteditor` is a native Linux binary and runs without Wine (verified
  in T1), so `release_package.py rebuild` — which shells out to
  `.script/export_mse_renders.py` — works on this machine.

> **Parent note (inlined 2026-08-08) — Pillow is missing from the bare interpreter.**
> The host python (`/etc/profiles/per-user/aron/bin/python`, 3.13.14, NixOS, no venv,
> no `pip`) has **no `PIL`**, so a bare `python .script/release_package.py validate`
> exits 1 with `ModuleNotFoundError: No module named 'PIL'`. That is an environment
> gap, not a code defect: the import has been on `main` since `02f6e17` (2026-07-19),
> and **both** `validate` and `rebuild` genuinely reach PIL —
> `validate` → `validate_package` → `validate_project` → `_validate_local_refs` →
> `load_manifest` → `mse_content.validate_image` → `Image.open()`; `rebuild`
> additionally shells out to `export_mse_renders.py`, which imports PIL at module
> level.
>
> **Therefore: run every `.script/release_package.py` command in this ticket inside a
> nix-shell that provides Pillow.** Verified working by the parent — this exact
> command exits **0** and prints `lifecycle valid`:
>
> ```bash
> nix-shell -p python313Packages.pillow --run "python .script/release_package.py validate"
> ```
>
> Use the same wrapper for the `rebuild` in step 8. A
> `warning: Nix search path entry '/nix/var/nix/profiles/per-user/root/channels' does
> not exist, ignoring` line on stderr is expected noise. The pure-python commands
> (`python -m unittest …`, `python .script/lint_mse_card_style.py`) do **not** need
> the wrapper. Do not install Pillow globally, do not add a dependency file, do not
> edit `.script/mse_content.py` to make the import lazy — the wrapper is the whole fix.

## Requirements

- `rule_text` of the component card file becomes, on one line, exactly:

  ```
  	rule_text: <i-auto>(1 - Activated <kw-a>Flash</kw-a> Hard)</i-auto> <b>Discard</b> Ash Blossom and <b>Target</b> 1 Spell or ability whose effect interacts with Deck <i-auto>(<b>Draw</b>, <b>Mill X</b>, <b>Search</b>, etc.)</i-auto>; <b>Counter</b> it.
  ```

  (leading character is a TAB, matching the surrounding file).
- `.script/lint_mse_card_style.py` stops raising **MSE009** for a bold action
  keyword that (a) sits inside an italic range and (b) is immediately followed by
  `,`, `)` or ` or `. Everything else about MSE009 is unchanged.
- The Alpha package is rebuilt so the aggregate set, renders, provenance and
  `package-sha256.json` all agree.
- After `cd website && npm run content`, the Ash Blossom catalog entry's `keywords`
  array contains `Counter`, `Discard`, `Draw`, `Mill N`, `Search`, `Target`.

## Inputs

- Edit: `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set/card ash blossom  joyous spring`
  (note the double space in the filename), line 18. Current value:
  ```
  	rule_text: <i-auto>(1 - Activated <kw-a>Flash</kw-a> Hard)</i-auto> <b>Discard</b> Ash Blossom and <b>Target</b> 1 Spell or ability whose effect interacts with Deck <i-auto>(draw, <b>Mill X</b>, search, etc.)</i-auto>; <b>Counter</b> it.
  ```
- Do **not** hand-edit
  `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/LOTA-0001-Alpha_0.1_all_cards.mse-set/card ash-blossom-and-joyous-spring`;
  `release_package.py rebuild` regenerates the aggregate from the component set
  (`generate_aggregate()`), then re-exports renders and rewrites hashes.
- `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/release.json` has `"status": "open"`, so
  `rebuild` is permitted (it refuses on `locked`).
- `.script/lint_mse_card_style.py`:
  - `lint_visible_style(path, line_number, text)` starts with
    `visible, bold_ranges, italic_ranges = visible_text_and_format_ranges(text)` and
    defines `containers(match)` over `bold_ranges` only.
  - The MSE009 branch is:
    ```python
    elif not action_use and any(visible[start:end].strip().casefold() == canonical.casefold() for start, end in enclosing):
        findings.append(Finding(path, line_number, "MSE009", f"'{actual}' is not an action in this context", f"use plain {actual.casefold()}"))
    ```
  - `is_action_use()` returns `False` for `Draw`/`Search` followed by a comma, which
    is exactly why the bolded enumeration would trip MSE009 today.
  - `KNOWN_KEYWORDS` already contains every `ACTION_WORDS` entry, so `Draw` and
    `Search` in bold do **not** trip MSE004.
- Test conventions: `tests/test_mse_card_style.py` loads the linter by path into
  `LINTER`, and `write_project(root, rule_text, *, name='Test Card')` writes a
  throwaway `.mse-set` in a temp dir; assertions read
  `{finding.rule for finding in LINTER.lint(Path(directory))}`.
- **From Depends (T3):** `docs/keywords/search.md` has `preview: true`,
  `docs/keywords/mill-n.md` has `preview: true`, `docs/keywords/counter.md` has
  `reminder: false`. `previewKeywordsFor()` in `website/src/lib/catalog.ts` fills
  `data-card-keywords`. `reminderDefinitions()` fills card rule-text reminders.

## TDD

1. **Red** — add the Python tests below (enumeration accepted, comma-followed bold
   action outside italics still rejected) and the website test asserting Ash
   Blossom's keyword list; they fail.
2. **Green** — add the linter exemption, edit the card text, rebuild the package,
   regenerate the catalog.
3. **Refactor** — none.

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `tests/test_mse_card_style.py` › `test_bold_action_in_italic_enumeration_is_accepted` | `write_project(root, "<b>Target</b> 1 Spell <i-auto>(<b>Draw</b>, <b>Mill X</b>, <b>Search</b>, etc.)</i-auto>")` | `MSE009` not in the rule set |
| `tests/test_mse_card_style.py` › `test_bold_action_before_comma_outside_italic_is_rejected` | `write_project(root, "<b>Draw</b>, then stop.")` | `MSE009` in the rule set |
| `tests/test_mse_card_style.py` › existing `MSE009` cases (`the <b>Target</b>`, `Predator <b>Counter</b>`, `<b>Draw</b> step`, …) | unchanged | still `MSE009` |
| `python .script/lint_mse_card_style.py` | whole repo | exit 0 |
| `python .script/release_package.py validate` | whole repo | exit 0 |
| `website/tests/unit/card-text.test.ts` › `exposes the keywords of Ash Blossom` | `catalog.cards.find(c => c.id === 'ash-blossom-and-joyous-spring')?.keywords` | `['Counter','Discard','Draw','Mill N','Search','Target']` |
| `website/tests/unit/card-text.test.ts` › `prints the capitalised deck-interaction examples` | same card's `ruleTextPlain` | contains `(Draw, Mill X, Search, etc.)` and not `(draw,` |

`catalog.cards[].keywords` is produced by `extractKeywords()` which returns a
**sorted, deduped** list, hence the alphabetical expectation above.

## Impl steps

- [x] 1. In `.script/lint_mse_card_style.py`, next to the other module-level
      regexes (after `EXILE_ZONE_CONTEXT_RE`, ~line 101), add:
      ```python
      # A bold action named as an example inside an italic reminder — "(Draw, Mill X,
      # Search, etc.)" — is a legitimate keyword invocation with no argument.
      ENUMERATED_ACTION_RE = re.compile(r"\s*(?:,|\)|or\b)")
      ```
- [x] 2. In `lint_visible_style`, directly under the existing `containers` closure,
      add:
      ```python
      def italic_containers(match: re.Match[str]) -> list[tuple[int, int]]:
          return [item for item in italic_ranges if item[0] <= match.start() and item[1] >= match.end()]
      ```
- [x] 3. Rewrite the MSE009 branch of the `ACTION_RE` loop to:
      ```python
      elif not action_use and any(visible[start:end].strip().casefold() == canonical.casefold() for start, end in enclosing):
          if italic_containers(match) and ENUMERATED_ACTION_RE.match(visible[match.end():]):
              continue
          findings.append(Finding(path, line_number, "MSE009", f"'{actual}' is not an action in this context", f"use plain {actual.casefold()}"))
      ```
- [x] 4. Add the two new tests from the test plan to `tests/test_mse_card_style.py`,
      in the class that already holds `test_plain_non_action_keywords_and_prefix_are_rejected`.
- [ ] 5. `python -m unittest tests.test_mse_card_style` → exit 0.
- [x] 6. Edit line 18 of
      `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set/card ash blossom  joyous spring`
      to the exact string in **Requirements**. Change nothing else in the file.
- [ ] 7. `python .script/lint_mse_card_style.py` → exit 0.
- [x] 8. `python .script/release_package.py rebuild cards_mse/01_alpha/LOTA-0001-Alpha_0.1`
      → exit 0. This regenerates the aggregate set, re-exports renders via
      `MSE/bin/magicseteditor`, refreshes `render-provenance.json` and
      `package-sha256.json`.
- [x] 9. `python .script/release_package.py validate` → exit 0.
- [x] 10. `git diff --stat cards_mse/` — expect the component card, the aggregate
      card, `aggregate-manifest.json`, `render-provenance.json`,
      `package-sha256.json` and the Ash Blossom render PNG(s) to appear. If the PNG
      is unchanged, the render did not re-run — investigate before continuing.
- [x] 11. `cd website && npm run content` → exit 0.
- [x] 12. Add the two `card-text.test.ts` rows.
- [x] 13. `cd website && npm run test` → exit 0.
- [x] 14. `cd website && npm run build` → exit 0 (the `check-chrome.mjs` reminder
      gate must stay silent: `Draw`, `Mill X` and `Search` all resolve, and only
      `Mill N` / `Search` are in the page ruling map, both of which carry
      `reminder: true`).

## Outputs

- Files touched:
  `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set/card ash blossom  joyous spring`,
  the rebuilt package artefacts under `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/`,
  `.script/lint_mse_card_style.py`, `tests/test_mse_card_style.py`,
  `website/tests/unit/card-text.test.ts`, `website/src/generated/catalog.ts`.
- Public API / behaviour change: MSE009 gains one narrow exemption; Ash Blossom's
  printed text and keyword list change.
- Migrate / config: none.

## Validation

- [ ] tests pass: `python -m unittest discover -s tests`; `python .script/lint_mse_card_style.py`; `python .script/release_package.py validate`; `cd website && npm run ci`
- [x] manual check: `/cards/ash-blossom-and-joyous-spring/` shows
      `(Draw, Mill X, Search, etc.)` with the three actions bold, and no `Counter(…)`
      reminder
- [x] manual check: hovering the Ash Blossom `gallery-card` on
      `/sections/non-archetype/non-archetype/` lists **Mill N** and **Search** rulings
- [x] app functional — `cd website && npm run build` exits 0
- [ ] commit msg draft: `fix(cards): capitalise and bold the deck-interaction actions on Ash Blossom`
