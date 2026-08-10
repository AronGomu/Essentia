# Vendored Magic Set Editor

Essentia renders cards with a Magic Set Editor tree it owns, not with whatever MSE
happens to be installed on the machine. This directory is that tree.

## Layout

| Path | Contents |
| --- | --- |
| `manifest.json` | Tracked. Every vendored file, pinned by sha256, plus the upstream it came from. |
| `bin/magicseteditor` | The MSE build. Its `write_image_file` accepts `width:`/`height:`, which print masters require. |
| `data/` | The 20 packages the checked-in cards actually render with. |
| `fonts/` | The nine typefaces the vendored frames name. |
| `resource/` | MSE's own UI resources. |

Only `manifest.json` and this file are tracked. The payload is untracked because it
is a GPLv2 binary plus Wizards of the Coast frame art and proprietary fonts, none of
which this CC0 repository may redistribute. The manifest still gives full control:
the exact file set is reviewable in git, and any drift is a hash mismatch.

## Populate

```bash
python launcher/setup_mse.py --source /path/to/Full-Magic-Pack
```

Setup copies the manifest's files in, refuses to continue if any source file has the
wrong hash, installs the repo-owned export template into `data/`, points
`~/.magicseteditor/{data,resource}` at this tree, publishes `fonts/` to
`~/.local/share/fonts/Magic-Set-Editor`, and writes `launcher/.env`.

Afterwards `python launcher/setup_mse.py` re-verifies and re-wires without a source,
and `python launcher/setup_mse.py --verify` checks hashes and changes nothing.

`~/.magicseteditor` and fontconfig are the only two locations MSE cannot be told to
look elsewhere, so setup manages them. It replaces symlinks only; a real
`~/.magicseteditor/data` directory is reported, never deleted.

## How the file set was chosen

The full Full Magic Pack `data/` is 960 MB across 528 packages. The vendored subset is
20 MB and was derived, not guessed:

1. `openat` syscalls were traced (cold cache) across a full canonical render of all
   seven checked-in projects. That gives the packages and image files MSE genuinely
   reads — 231 files.
2. Every non-image file of those same packages was added, so style variants the
   current cards do not exercise still resolve — 374 files.
3. Dictionaries were cut to `en_US`; the other locales are 34 MB of the original.

Rendering all 231 cards against the pruned tree produced byte-identical PNGs, and
`.script/export_mse_renders.py --attest-canonical` matched the tracked canonical
renders.

To widen the set, add packages or files to `manifest.json` with their sha256 and
re-run setup. To re-derive it from scratch, repeat the trace above against a full
pack, then rebuild the manifest with `launcher.mse_vendor.build_manifest`.

## HD inputs

Phase B raises every MSE frame and every card art to HD (renders 750×1046, print
masters 1500×2092). The frame side needs four HD frame packs the user supplies by
hand, staged under `hd_inputs/frames/` (git-ignored, third-party art, never
committed):

- `magic-sevenhalf.mse-style/`
- `magic-m15-spellbook.mse-style/`
- `magic-m15-sketch.mse-style/`
- `magic-m15-showcase-praetor.mse-style/`

Each staged image must be exactly 2× the pixel dimensions of the vendored SD
counterpart at the same relative path under `MSE/data/<pack>/`.

Run `python .script/verify_hd_inputs.py` to see, per pack, whether it's staged, its
file count, how many images pass the 2× check, and how many card arts in
`original_images/` still have no `original_images_hd/` counterpart.

`TODO(user)`: record which upscaler tool and settings produced the 223 files in
`original_images_hd/`. Nothing in the repo names them — ADR 0018 only says
"manual, outside the repository".

T13 skipped four cards because no matching canonical HD source exists. Their current
MSE art remains unchanged:

- `Absolute King Back Jack`
- `Crane Crane`
- `Fiend Griefing`
- `Fiendish Rhino Warrior`
