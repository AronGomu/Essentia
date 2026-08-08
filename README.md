# Essentia

**YGO × MTG: Essentia**, usually shortened to **Essentia**, adapts Yu-Gi-Oh! cards as Magic: The Gathering cards and saves them as Magic Set Editor projects. The name reflects the project's goal: preserve the essence of Yu-Gi-Oh! inside Magic's card-game rules.

## Source of truth

Card fields live only in folder-form MSE projects under [`cards_mse/`](cards_mse/). Editable roots are drafts under `cards_mse/00_drafts/` and open packages under `01_alpha`/`02_beta`/`03_release`. Locked packages are immutable publication history. Documentation starts at [`docs/CONTEXT.md`](docs/CONTEXT.md).

## First-time MSE setup

Magic Set Editor lives in this repository, under [`MSE/`](MSE/). Only its
`manifest.json` is tracked; populate the payload once from a Full Magic Pack checkout:

```bash
python launcher/setup_mse.py --source "/path/to/Full-Magic-Pack"
```

Setup copies every manifest file, verifies each by sha256, installs the repo-owned
export template, points `~/.magicseteditor` and fontconfig at `MSE/`, and writes
ignored `launcher/.env`. Afterwards re-run it without `--source` to re-verify and
re-wire; `--verify` checks hashes and changes nothing.

Browse projects by lifecycle/group/set:

```bash
python launcher/mse_project_menu.pyw --list
```

Double-click `launcher/mse_project_menu.pyw` for GUI. Diagnostics write to ignored `launcher/.mse_launcher.log`.

## Lifecycle tooling

```bash
python .script/release_package.py validate
python .script/release_package.py rebuild cards_mse/01_alpha/<setId-version>
python .script/release_package.py lock cards_mse/01_alpha/<setId-version> --released-on YYYY-MM-DD
python .script/release_package.py advance cards_mse/01_alpha/<setId-version> --to-stage 02_beta --version Beta_X.Y
python .script/check_immutable_stages.py --base <merge-base>
```

## Printing

Prints are one-off and never tracked. Generate PDFs for every public-stage package from its renders, two copies per card:

```bash
python .script/generate_print_pdfs.py
```

PDFs and manifests land in ignored root `print/`. Use `--copies-for "Card Name=N"` for per-card exceptions and `--copies N` to change the uniform count. Details in [`docs/MSE.md`](docs/MSE.md#printing).

See [`docs/RELEASES.md`](docs/RELEASES.md) and [`docs/MSE.md`](docs/MSE.md). Legend of the Alpha (`LOTA-0001`) Alpha_0.1 decklists are defined in [`docs/rules/DECKLISTS_ALPHA_0.1.md`](docs/rules/DECKLISTS_ALPHA_0.1.md); package lives at `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/` with status `open`.

## Showcase website

`website/` contains read-only Astro + Svelte publication UI. It reads `01_alpha`, `02_beta`, and `03_release` packages (open or locked). Draft-only repository builds valid empty catalog.

```bash
cd website
npm ci
npm run dev
```

Website setup, checks, rights, history, and deployment live in [`website/README.md`](website/README.md).

- `blog/` : Published blog articles, one `YYYY-MM-DD-slug.md` per post; `cd website && npm run content` regenerates the site.

## Verification

```bash
python -m unittest discover -s tests
python .script/lint_mse_card_style.py
python .script/release_package.py validate
cd website && npm run ci && npm run test:e2e
```
