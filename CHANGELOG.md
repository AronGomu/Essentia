# Changelog

All notable changes to this project, newest first.

🖨️ Move printing out of the release pipeline: packages no longer store PDFs; `.script/generate_print_pdfs.py` builds one-off PDFs from renders (2 copies per card) into ignored root `print/`.
♻️ Realign lifecycle: drop pre-stages; packages use `open`/`locked` status under `01_alpha`/`02_beta`/`03_release`.
🏷️ Rename set to Legend of the Alpha (`LOTA-0001`, package `LOTA-0001-Alpha_0.1`, status `open`).
🛡️ Hard-lock Legend of Alpha v0.1 into ALPHA (`cards_mse/02_alpha/Legend_of_Alpha_0.1/`).
📝 Add `validate-set-stage` skill + `docs/SET_PROMOTIONS.md` hard-lock log.
🏷️ Rename project to YGO × MTG: Essentia, with Essentia as its short name.
♻️ Consolidate draft MSE projects into numbered non-archetype, Burning Abyss, Shaddoll, Nekroz, and Spellbook sets with collision-free assets.
🎨 Add Draft, Alpha, Beta, and Release tabs to the MSE project launcher.
