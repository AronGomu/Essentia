# Magic Set Editor

Magic Set Editor is editor/rendering tooling. Folder-form `.mse-set` projects under `cards_mse/` are canonical saves.

## Local setup

Magic Set Editor is vendored under [`MSE/`](../MSE/README.md) — executable, the 20 data
packages the cards render with, fonts, and resources. `MSE/manifest.json` is tracked and
pins every file by sha256; the payload is untracked because it is a GPLv2 binary plus
third-party frame art and fonts this CC0 repository cannot redistribute.

```bash
python launcher/setup_mse.py --source "/path/to/Full-Magic-Pack"   # first time
python launcher/setup_mse.py                                       # re-verify and re-wire
python launcher/setup_mse.py --verify                              # hashes only, no writes
```

Setup writes ignored `launcher/.env` keys `MSE_ROOT`, `MSE_EXECUTABLE`, `MSE_CLI`,
`MSE_DATA_DIR`, `MSE_FONTS_DIR`, and `MSE_PROJECTS_DIR`. A populated `MSE/` also works
without `.env`: `MSEConfig.load()` falls back to the vendored layout.

MSE resolves packages only through `~/.magicseteditor` and typefaces only through
fontconfig, so setup points both at `MSE/`. It replaces symlinks only and never deletes
a real `~/.magicseteditor/data` directory. Fonts are exact: adding one the canonical
renders were not produced with silently changes output.

Launch nested projects with `launcher/mse_project_menu.pyw`. Diagnostics write to ignored `launcher/.mse_launcher.log`.

## Save contract

- Use folder-form `.mse-set` directories containing `set`.
- Draft may keep one project per archetype/storage group. Active-development packages may regroup cards by set, not by archetype.
- A display-name card is editable in only one mutable root (draft **or** one pre-stage). See [GLOSSARY.md](GLOSSARY.md#card-uniqueness).
- Use title `Essentia -- [name]` in `set_info.title`.
- Use lifecycle painter marker from [RELEASES.md](RELEASES.md#stage-markers).
- Draft projects and open packages are mutable; locked packages and generated aggregates are read-only.
- Aggregate projects exist only in set packages and are generated from component manifests.
- Empty draft projects are allowed while their cards live in active development.

## Card ordering

After card additions/deletions/regeneration:

- Sort `include_file:` entries by visible `name:`.
- Number every present `card_code_text`, `card_code_text_2`, and `card_code_text_3` as `001/NNN R`, preserving rarity suffix.
- Make `NNN` equal manifest card count.

## Images

- High-resolution sources live under `original_images/<card_type>/`.
- Project-local imported images should use `mse_images/imageN.png`; existing valid root/JPEG paths may remain.
- Never point MSE cards directly at `original_images/`.
- Non-empty `image`, `image_2`, `mainframe_image`, `mainframe_image_2`, `symbol`, and `masterpiece_symbol` paths must resolve inside project/package.
- Published canonical renders live in package-level `renders/`. Existing draft-local preview exports are non-public and non-authoritative.

To import a compatible local image:

```bash
python .script/generate_mse_imported_image.py "PATH/Project.mse-set" "original_images/<type>/<name>.jpg" --card-file "card file"
```

To repair a whole project:

```bash
python .script/fix_mse_project_images.py --backup "PATH/Project.mse-set"
```

## Validation/export

```bash
python .script/lint_mse_card_style.py
python .script/release_package.py validate
```

A package build exports aggregate renders, records provenance, then hashes package files. Printing is not part of the build; see [Printing](#printing).

### Print masters

Print masters are exported through `mse_packages/essentia-print.mse-export-template`, whose script calls `write_image_file(card, file:, width:, height:)` so MSE re-renders each card at 1500 × 2092 instead of upscaling the 1× bitmap. That is 600 DPI at 63.5 × 88.9 mm, exactly 4× the stylesheet's native 375 × 523 declared by `magic-sevenhalf.mse-style`.

**Masters come from the export template, never from Preferences → Export scale.** Export scale is a per-machine UI preference; using it would make output depend on who ran the export. The template pins the size in tracked source, so every machine produces identical masters.

MSE only loads packages from its own data directories, so `launcher/setup_mse.py` copies the template into `MSE_DATA_DIR` and fails setup when the installed copy is missing or stale. `--print-masters` verifies every exported PNG is exactly 1500 × 2092 and fails loudly if it is not — a wrong size means the installed template is stale or MSE ignored the size request.

The template declares `create directory: true`, so MSE writes the PNGs to a sibling `<stem>-files/` rather than into the path it is handed. The export passes a filename inside its temporary directory to keep that sibling in scope.

Requires an MSE build whose `write_image_file` accepts `width:`/`height:` — the vendored `MSE/bin/magicseteditor` does. Provenance records the exporting MSE version; verify against it before trusting masters.

```bash
python .script/export_mse_renders.py <project> --output <dir> --print-masters
```

By default the exporter prints one summary line per project (`mse.render <project>: N cards loaded, N checked, N rendered, N print masters`). Pass `--verbose` to restore the full per-card `mse.render.plan` / `mse.render.complete` JSON.

Masters land in `renders_print/` beside `renders/` and their hashes are recorded in the provenance `print` block (schema 3). Masters are optional: until a package has `renders_print/`, the website upscales the 1× render and marks it draft resolution.

MSE export must be followed by real Save/Save As verification when source structure changes. If save fails, check missing includes, unresolved images/symbols, stale backup files, nested `.mse-set` projects, and generated files inside active projects.

## Diagnosing apparent corruption

Do not infer corruption from `3221225477` / `0xC0000005` alone. Build a sibling one-card diagnostic project, export directly from shell, then remove/change one field at a time. Automated subprocess exports can report false failures while producing valid PNGs.

## Generated artifacts

- Aggregate: `{set}_{version}_all_cards.mse-set/`
- Renders: `{set_dir}/renders/`
- Print masters (optional): `{set_dir}/renders_print/`
- Render audit: `{set_dir}/render-provenance.json`
- Package integrity: `{set_dir}/package-sha256.json`

Packages never store PDFs. Renders, provenance, aggregate, metadata, and component source belong to package status guard (`locked` = immutable).

## Printing

Prints are one-off and disposable, so they are generated on demand from renders and never tracked. Print every public-stage package, two copies per card:

```bash
python .script/generate_print_pdfs.py
```

Output lands in ignored root `print/` as `{setId}-{version}_print.pdf` plus a sibling manifest. Useful flags:

- `--copies N` — change the uniform copy count (default 2).
- `--copies-for "Card Name=N"` — per-card exception; repeatable; `N` of 0 omits the card. Unknown names fail the run.
- `--input PATH` — restrict to one `renders/` folder; repeatable.
- `--output-dir`, `--dpi`, `--page-size`, `--card-width`, `--card-height`, `--separator-px`.

A4 at 300 dpi with 2.5×3.5 in cards yields 9 cards per page. Reprint only when a card gets a new version; already-printed cards need no reprint.
