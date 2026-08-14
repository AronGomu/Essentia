import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import catalog from '../../src/generated/catalog';

const packageRoot = path.resolve('../cards_mse/01_alpha/LOTA-0001-Alpha_0.1');
const provenance = JSON.parse(
  await readFile(path.join(packageRoot, 'render-provenance.json'), 'utf8'),
);

const sha256 = async (file: string) =>
  createHash('sha256')
    .update(await readFile(file))
    .digest('hex');
const stableId = (value: string) => value.replace(/^card /, '');

describe('generated card images', () => {
  it('catalog reports native display and print tiers', () => {
    expect(catalog.cards).toHaveLength(54);
    for (const card of catalog.cards) {
      expect(card.images.width).toBe(750);
      expect(card.images.height).toBe(1046);
      expect(card.images.display.width).toBe(750);
      expect(card.images.print.width).toBe(1500);
      expect(card.images.print.height).toBe(2092);
      expect(card.images.print.draftResolution).toBe(false);
    }
  });

  it('inspects all 54 display binaries, ids, dimensions, provenance hashes', async () => {
    const files = (await readdir(path.join(packageRoot, 'renders'))).filter(
      (file) => file.endsWith('.png'),
    );
    expect(files).toHaveLength(54);
    expect(provenance.cards).toHaveLength(54);
    expect(
      new Set(
        provenance.cards.map((entry: { id: string }) => stableId(entry.id)),
      ),
    ).toEqual(new Set(catalog.cards.map((card) => card.id)));

    for (const entry of provenance.cards) {
      const file = path.join(packageRoot, 'renders', entry.render);
      const metadata = await sharp(file).metadata();
      expect([metadata.width, metadata.height]).toEqual([750, 1046]);
      expect(await sha256(file)).toBe(entry.renderHash);
    }
  });

  it('inspects all 54 print binaries, ids, dimensions, provenance hashes', async () => {
    const files = (
      await readdir(path.join(packageRoot, 'renders_print'))
    ).filter((file) => file.endsWith('.png'));
    expect(files).toHaveLength(54);
    expect(provenance.print.cards).toHaveLength(54);
    expect(
      new Set(
        provenance.print.cards.map((entry: { id: string }) =>
          stableId(entry.id),
        ),
      ),
    ).toEqual(new Set(catalog.cards.map((card) => card.id)));

    for (const entry of provenance.print.cards) {
      const file = path.join(packageRoot, 'renders_print', entry.print);
      const metadata = await sharp(file).metadata();
      expect([metadata.width, metadata.height]).toEqual([1500, 2092]);
      expect(await sha256(file)).toBe(entry.printHash);
    }
  });
});
