import { afterEach, describe, expect, it } from 'vitest';
import {
  RAIL_STORAGE_KEY,
  normalizeRailState,
  readRailState,
  toggleRailState,
} from '../../src/lib/catalog-rail';

describe('normalizeRailState', () => {
  it('defaults to expanded when unset', () => {
    expect(normalizeRailState(null)).toBe('expanded');
  });

  it('defaults to expanded on garbage', () => {
    expect(normalizeRailState('yes')).toBe('expanded');
  });

  it('reads the collapsed marker', () => {
    expect(normalizeRailState('collapsed')).toBe('collapsed');
  });
});

describe('toggleRailState', () => {
  it('toggles expanded to collapsed', () => {
    expect(toggleRailState('expanded')).toBe('collapsed');
  });

  it('toggles collapsed to expanded', () => {
    expect(toggleRailState('collapsed')).toBe('expanded');
  });
});

describe('RAIL_STORAGE_KEY', () => {
  it('exports the prefixed storage key', () => {
    expect(RAIL_STORAGE_KEY).toBe('essentia.v1.catalog-rail');
  });
});

describe('readRailState', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  function defineLocalStorage(descriptor: PropertyDescriptor) {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      ...descriptor,
    });
  }

  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('defaults to expanded with no storage at all', () => {
    defineLocalStorage({ value: undefined, writable: true });
    expect(readRailState()).toBe('expanded');
  });

  it('reads the persisted collapsed state', () => {
    defineLocalStorage({
      value: {
        getItem: (key: string) =>
          key === RAIL_STORAGE_KEY ? 'collapsed' : null,
      },
      writable: true,
    });
    expect(readRailState()).toBe('collapsed');
  });

  it('survives a localStorage property that throws SecurityError', () => {
    // Chrome with "Block all cookies", or a sandboxed iframe without
    // allow-same-origin: the property getter itself throws, so `?.` never gets
    // a chance to help.
    defineLocalStorage({
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
    expect(() => readRailState()).not.toThrow();
    expect(readRailState()).toBe('expanded');
  });

  it('survives a getItem that throws', () => {
    defineLocalStorage({
      value: {
        getItem() {
          throw new DOMException('Access denied.', 'SecurityError');
        },
      },
      writable: true,
    });
    expect(readRailState()).toBe('expanded');
  });
});
