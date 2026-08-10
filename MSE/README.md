# Vendored Magic Set Editor

Essentia renders cards with a Magic Set Editor tree it owns, not with whatever MSE
happens to be installed on the machine. This directory is that tree.

## Layout

| Path | Contents |
| --- | --- |
| `manifest.json` | Tracked schema v2. Separate upstream/source hashes, staged-overlay input hashes, and exact final hashes. |
| `bin/magicseteditor` | The MSE build. Its `write_image_file` accepts `width:`/`height:`, which print masters require. |
| `data/` | The 20 packages the checked-in cards actually render with. |
| `fonts/` | The nine typefaces the vendored frames name. |
| `resource/` | MSE's own UI resources. |

Only `manifest.json` and this file are tracked. Payload stays local because it
contains a GPLv2 binary plus Wizards of the Coast frame art and proprietary fonts;
this CC0 repository has no publication rights for those files. Schema v2 keeps three
contracts separate: `sourceFiles` pins the 529-file Full Magic Pack input,
`hdFrames.inputs` pins 77 user-staged files, and `files` pins the exact 560-file final
tree. Overlay-only files need not exist upstream.

## Populate from a fresh clone

Required local inputs:

1. Full Magic Pack source at commit `71b382d5da74efd533ae25a23ac324a80c3dfeb4`.
2. Four exact owner-supplied packs under ignored `hd_inputs/frames/`, with names below.

Run one command:

```bash
python launcher/setup_mse.py --source /path/to/Full-Magic-Pack --hd-frames hd_inputs/frames
```

Setup validates/copies upstream hashes, validates the strict four-pack overlay
allowlist plus every staged hash, installs staged images, scales four styles once,
normalises Capenna, then verifies all 560 final hashes. Re-running is idempotent.
It also installs repo-owned packages, wires `~/.magicseteditor/{data,resource}`,
publishes fonts, and writes `launcher/.env`.

Afterwards `python launcher/setup_mse.py` re-verifies and re-wires without local
inputs. `python launcher/setup_mse.py --verify` checks all final hashes and changes
nothing. Staged frame payload remains local/ignored; never add it to git.

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

Phase B raises every MSE frame plus 177 card-art files to HD (renders 750×1046,
print masters 1500×2092), with four accepted art skips listed below. Frame install
needs four HD frame packs the user supplies by
hand, staged under `hd_inputs/frames/` (git-ignored, third-party art, never
committed):

- `magic-sevenhalf.mse-style/`
- `magic-m15-spellbook.mse-style/`
- `magic-m15-sketch.mse-style/`
- `magic-m15-showcase-praetor.mse-style/`

Each staged image is exactly 2× its upstream SD counterpart. Before installation,
`python .script/verify_hd_inputs.py` reports those files as `double=<n>`; after
installation, identical staged/final bytes report `installed=<n>`, not wrong-size.
Output always remains four frame lines plus one art line.

Capenna uses a deterministic special case: resize each upstream bitmap uniformly to
750×1047 with LANCZOS, then crop only the last/bottom row. Final bitmaps and style
canvas are therefore exactly 750×1046 while preserving prior render geometry.

`TODO(user)`: record which upscaler tool and settings produced the 223 files in
`original_images_hd/`. Nothing in the repo names them — ADR 0018 only says
"manual, outside the repository".

T13 updated 177 card-art files. AronGomu explicitly accepted four permanent batch
skips because no matching canonical HD source exists; their current MSE art remains
unchanged and must not be fetched, fabricated, or upscaled:

- `Absolute King Back Jack`
- `Crane Crane`
- `Fiend Griefing`
- `Fiendish Rhino Warrior`
