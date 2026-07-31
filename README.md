# YGO-x-MTG

Yu-Gi-Oh! cards adapted as Magic: The Gathering cards and saved as Magic Set Editor projects.

## Source of truth

Card fields live only in folder-form MSE projects under [`cards_mse/`](cards_mse/). Current editable projects are drafts under `cards_mse/00_drafts/`. ALPHA, BETA, and Release packages are immutable publication history. Documentation starts at [`docs/CONTEXT.md`](docs/CONTEXT.md).

## First-time MSE setup

```bash
python launcher/setup_mse.py
```

Setup validates executable, data/style packages, symbol fonts, Magic fonts, and recursive `cards_mse/` projects. It writes ignored `launcher/.env`. Re-run after moving repository or MSE install.

Unattended setup:

```bash
python launcher/setup_mse.py --mse-root "/path/to/Magic Set Editor"
```

Browse projects by lifecycle/group/set:

```bash
python launcher/mse_project_menu.pyw --list
```

Double-click `launcher/mse_project_menu.pyw` for GUI. Diagnostics write to ignored `launcher/.mse_launcher.log`.

## Lifecycle tooling

```bash
python .script/release_package.py validate
python .script/release_package.py promote --from-stage 01_pre_alpha --to-stage 02_alpha --released-on YYYY-MM-DD
python .script/release_package.py prepare-next cards_mse/02_alpha/<set_version> --to-stage 03_pre_beta
python .script/check_immutable_stages.py --base <merge-base>
```

See [`docs/RELEASES.md`](docs/RELEASES.md) and [`docs/MSE.md`](docs/MSE.md). Legend of Alpha 0.1 decklists are defined in [`docs/rules/DECKLISTS_ALPHA_0.1.md`](docs/rules/DECKLISTS_ALPHA_0.1.md); their 48 unique custom cards are assembled in Pre-ALPHA. No immutable ALPHA package exists yet.

## Showcase website

`website/` contains read-only Astro + Svelte publication UI. It reads only immutable `02_alpha`, `04_beta`, and `06_released` packages. Draft-only repository builds valid empty catalog.

```bash
cd website
npm ci
npm run dev
```

Website setup, checks, rights, history, and deployment live in [`website/README.md`](website/README.md).

## Verification

```bash
python -m unittest discover -s tests
python .script/lint_mse_card_style.py
python .script/release_package.py validate
cd website && npm run ci && npm run test:e2e
```
