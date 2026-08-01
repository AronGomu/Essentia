# Magic Set Editor

Magic Set Editor is editor/rendering tooling. Folder-form `.mse-set` projects under `cards_mse/` are canonical saves.

## Local setup

```bash
python launcher/setup_mse.py
```

Setup writes ignored `launcher/.env` keys `MSE_ROOT`, `MSE_EXECUTABLE`, `MSE_CLI`, `MSE_DATA_DIR`, `MSE_FONTS_DIR`, and `MSE_PROJECTS_DIR`. Read `CONTEXT.md` under configured MSE root when present.

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

A package build exports aggregate renders, records provenance, creates one direct PDF, writes print manifest, then hashes package files.

MSE export must be followed by real Save/Save As verification when source structure changes. If save fails, check missing includes, unresolved images/symbols, stale backup files, nested `.mse-set` projects, and generated files inside active projects.

## Diagnosing apparent corruption

Do not infer corruption from `3221225477` / `0xC0000005` alone. Build a sibling one-card diagnostic project, export directly from shell, then remove/change one field at a time. Automated subprocess exports can report false failures while producing valid PNGs.

## Generated artifacts

- Aggregate: `{set}_{version}_all_cards.mse-set/`
- Renders: `{set_dir}/renders/`
- PDF: `{set_dir}/{set}_{version}_print.pdf`
- Print audit: `{set_dir}/print-manifest.json`
- Render audit: `{set_dir}/render-provenance.json`
- Package integrity: `{set_dir}/package-sha256.json`

No root `print/` directory exists. Renders, PDF, provenance, aggregate, metadata, and component source belong to package status guard (`locked` = immutable).
