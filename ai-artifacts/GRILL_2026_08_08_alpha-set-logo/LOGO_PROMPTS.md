# Legend of the Alpha — set symbol prompts (5 variants)

## Hard constraints (from MSE source, apply to all 5)

- Renders at **60 × 60 px** inside the card. Anything finer than ~2 px at that
  size disappears.
- MSE import = greyscale → **hard 1-bit threshold** → edge trace → vector
  `.mse-symbol`. Gradients, greys, shadows, antialiasing, paper texture,
  ink bleed: **all destroyed**. Only the black silhouette survives.
- Therefore every prompt below asks for: pure black on pure white, no grey,
  no texture, closed solid shapes, thick strokes, generous counters, square canvas.

Generate at 1024×1024 or larger, then downscale — do not generate small.

---

## Prompt 1 — Garalde old-style capital (classic, safest)

```
A single capital letter "A" as a logo mark, classic old-style serif letterform
in the Garamond / Caslon tradition. Solid pure black on a pure white background.
Bold weight, moderate stroke contrast: thick left diagonal, thinner right
diagonal, thick horizontal crossbar. Bracketed serifs — the serifs curve
smoothly into the stems. Flat-cut angled apex at the top of the A. Large open
triangular counter. Perfectly centered in a square frame with even margins.
Flat vector, no gradients, no shading, no outlines, no texture, no antialiasing
effects, no background elements, no drop shadow, no 3D. Pure silhouette.
Clean crisp edges. Icon design, single color, high contrast.
```

## Prompt 2 — Victorian wood-type slab (heaviest, most "print press")

```
A single capital letter "A" as a logo mark, 19th-century Victorian wood-type
poster style, heavy slab serif / Egyptian. Solid pure black on a pure white
background. Very heavy uniform stroke weight with almost no thin-thick
contrast. Thick rectangular unbracketed slab serifs, blunt and squared, sitting
flat on the baseline. Flat slab-capped apex. Wide sturdy stance, compact and
blocky, filling a square frame. Counter kept large and open so it stays legible
when shrunk. Flat vector, single color, no gradients, no shading, no wood grain,
no ink texture, no distressing, no outlines, no background elements. Pure black
silhouette, crisp edges. Icon design, high contrast.
```

## Prompt 3 — Fantasy Lombardic / illuminated initial (most characterful)

```
A single capital letter "A" as a logo mark, medieval Lombardic illuminated
initial in the style of an early printed grimoire or incunabula chapter drop
cap. Solid pure black on a pure white background. Broad rounded uncial-style
strokes, heavy and calligraphic in shape but rendered as flat solid black
geometry, not as brush strokes. Slight flare where strokes terminate. One
simple bold curl or spur on the left leg — restrained, no fine filigree.
Compact and square-proportioned. All internal openings large and clearly
separated. Flat vector, single color, no gradients, no shading, no gold, no
color, no fine hairlines, no ornamental frame, no background elements, no
parchment texture. Pure black silhouette, crisp edges. Icon design.
```

## Prompt 4 — Old-school MTG expansion symbol (roundel-contained)

```
A set expansion symbol icon: a capital letter "A" in a bold classic serif,
enclosed in a simple solid circular seal. Solid pure black on a pure white
background. The circle is a thick black ring; the A sits centered inside it with
clear space on all sides. Heavy stroke weight, blunt bracketed serifs, flat
apex. The mark must read instantly at very small size — silhouette-first,
minimal detail, no fine lines. Square canvas, mark centered, even margins.
Flat vector, single color, no gradients, no shading, no bevel, no emboss, no
gloss, no outlines beyond the ring itself, no background elements, no text
other than the letter. Pure black silhouette, crisp edges. Icon design, high
contrast.
```

## Prompt 5 — Yu-Gi-Oh! angular / heraldic hybrid (sharpest, most modern-aggressive)

```
A single capital letter "A" as a logo mark, sharp angular heraldic serif,
in the spirit of a trading-card-game set emblem. Solid pure black on a pure
white background. Heavy uniform strokes with hard geometric cuts; serifs are
sharp wedge-shaped triangular spurs rather than rounded brackets. Pointed
apex with a small overhanging beak to the left. The crossbar sits low, giving
a tall open counter. Slight upward flare at the feet so the letter reads as a
crest. Compact, centered in a square frame. Flat vector, single color, no
gradients, no shading, no glow, no metallic effect, no outlines, no background
elements, no motion lines. Pure black silhouette, crisp edges. Icon design,
high contrast.
```

---

## Negative-prompt block (append if the generator supports one)

```
gradient, grayscale, shading, drop shadow, glow, bevel, emboss, 3D, metallic,
texture, grain, paper, parchment, distressed, ink bleed, watercolor, sketch,
pencil, outline, stroke outline, thin hairlines, filigree, background, frame,
border, color, multiple letters, words, text, watermark, signature, photo,
mockup, perspective
```

## Acceptance test before importing to MSE

1. Open in an image viewer, downscale to **60 × 60**. Still an unmistakable A? If not, reject.
2. Threshold to pure 1-bit black/white. Any part vanish or fuse shut? If yes, reject.
3. Counters (the triangle in the A, the ring gap) must stay open at 60 px.
