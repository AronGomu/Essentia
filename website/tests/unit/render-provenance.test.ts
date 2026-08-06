import { describe, expect, it } from 'vitest';
import {
  isSupportedRenderProvenance,
  isValidPrintBlock,
} from '../../scripts/render-provenance.mjs';

const transform = { id: 'transparent-white-corners', version: 1 };
const printBlock = {
  template: 'essentia-print.mse-export-template',
  width: 1500,
  height: 2092,
  cards: [{ id: 'card x', print: 'X.png', printHash: 'abc' }],
};

describe('render provenance compatibility', () => {
  it('accepts legacy schema v1 during migration', () => {
    expect(isSupportedRenderProvenance({ schemaVersion: 1 })).toBe(true);
  });

  it('accepts schema v2 with the transparent-corner transform', () => {
    expect(
      isSupportedRenderProvenance({
        schemaVersion: 2,
        renderTransform: {
          id: 'transparent-white-corners',
          version: 1,
        },
      }),
    ).toBe(true);
  });

  it.each([
    undefined,
    { id: 'other-transform', version: 1 },
    { id: 'transparent-white-corners', version: 2 },
  ])('rejects schema v2 transform %j', (renderTransform) => {
    expect(
      isSupportedRenderProvenance({ schemaVersion: 2, renderTransform }),
    ).toBe(false);
  });

  it('accepts schema v3 with a print block', () => {
    expect(
      isSupportedRenderProvenance({
        schemaVersion: 3,
        renderTransform: transform,
        print: printBlock,
      }),
    ).toBe(true);
  });

  it('accepts schema v3 without a print block — masters are optional', () => {
    expect(
      isSupportedRenderProvenance({
        schemaVersion: 3,
        renderTransform: transform,
      }),
    ).toBe(true);
  });

  it('rejects an unknown future schema', () => {
    expect(
      isSupportedRenderProvenance({
        schemaVersion: 4,
        renderTransform: transform,
      }),
    ).toBe(false);
  });

  it.each([
    { ...printBlock, width: 750 },
    { ...printBlock, height: 1046 },
    { ...printBlock, template: 'some-other.mse-export-template' },
    { ...printBlock, cards: [{ id: 'card x' }] },
    { ...printBlock, cards: 'not-an-array' },
  ])('rejects a print block that is not a 1500x2092 master set %j', (print) => {
    expect(isValidPrintBlock(print)).toBe(false);
    expect(
      isSupportedRenderProvenance({
        schemaVersion: 3,
        renderTransform: transform,
        print,
      }),
    ).toBe(false);
  });
});
