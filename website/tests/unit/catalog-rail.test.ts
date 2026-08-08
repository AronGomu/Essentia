import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import {
  RAIL_STORAGE_KEY,
  applyRailState,
  normalizeRailState,
  readRailState,
  toggleRailState,
  writeRailState,
} from '../../src/lib/catalog-rail';

const baseLayout = readFileSync(
  new URL('../../src/layouts/BaseLayout.astro', import.meta.url),
  'utf-8',
);

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

  it('is the key the pre-paint inline script reads', () => {
    // BaseLayout paints the collapsed rail in <head>, before hydration, from a
    // hardcoded key — nothing else binds it to this module. Renaming the
    // constant and this test together would still leave a returning visitor
    // with an expanded rail painted on the first frame that snaps shut once
    // Navigation mounts. Assert the literal in the layout instead.
    expect(baseLayout).toContain(`localStorage.getItem('${RAIL_STORAGE_KEY}')`);
  });
});

const originalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  'localStorage',
);
const originalDocument = Object.getOwnPropertyDescriptor(
  globalThis,
  'document',
);

function defineLocalStorage(descriptor: PropertyDescriptor) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    ...descriptor,
  });
}

/** A localStorage stand-in backed by a Map, so writes are readable back. */
function memoryStorage(seed: Record<string, string> = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
}

function defineDocument(value: unknown) {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    writable: true,
    value,
  });
}

afterEach(() => {
  if (originalStorage)
    Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete (globalThis as { localStorage?: unknown }).localStorage;
  if (originalDocument)
    Object.defineProperty(globalThis, 'document', originalDocument);
  else delete (globalThis as { document?: unknown }).document;
});

describe('readRailState', () => {
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

describe('writeRailState', () => {
  it('persists under the shared key and reads back', () => {
    const storage = memoryStorage();
    defineLocalStorage({ value: storage, writable: true });

    writeRailState('collapsed');
    expect(storage.store.get(RAIL_STORAGE_KEY)).toBe('collapsed');
    expect(readRailState()).toBe('collapsed');

    writeRailState('expanded');
    expect(storage.store.get(RAIL_STORAGE_KEY)).toBe('expanded');
    expect(readRailState()).toBe('expanded');
  });

  it('survives a setItem that throws', () => {
    defineLocalStorage({
      value: {
        getItem: () => null,
        setItem() {
          throw new DOMException('Quota exceeded.', 'QuotaExceededError');
        },
      },
      writable: true,
    });
    expect(() => writeRailState('collapsed')).not.toThrow();
  });

  it('survives a localStorage property that throws SecurityError', () => {
    defineLocalStorage({
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
    expect(() => writeRailState('collapsed')).not.toThrow();
  });

  it('does nothing with no storage at all', () => {
    defineLocalStorage({ value: undefined, writable: true });
    expect(() => writeRailState('collapsed')).not.toThrow();
  });
});

describe('applyRailState', () => {
  it('mirrors the state onto the root element', () => {
    const dataset: Record<string, string> = {};
    defineDocument({ documentElement: { dataset } });

    applyRailState('collapsed');
    expect(dataset.catalog).toBe('collapsed');

    applyRailState('expanded');
    expect(dataset.catalog).toBe('expanded');
  });

  it('is a no-op without a document', () => {
    defineDocument(undefined);
    expect(() => applyRailState('collapsed')).not.toThrow();
  });
});

describe('the toggle round-trip', () => {
  it('paints and persists the state the next visit will read', () => {
    // What Navigation.toggleRail does, in order: flip, mirror onto the root
    // element for CSS, persist for the pre-paint script on the next
    // navigation. Nothing else covers the write half of that pair.
    const storage = memoryStorage();
    defineLocalStorage({ value: storage, writable: true });
    const dataset: Record<string, string> = {};
    defineDocument({ documentElement: { dataset } });

    let railState = readRailState();
    expect(railState).toBe('expanded');

    railState = toggleRailState(railState);
    applyRailState(railState);
    writeRailState(railState);

    expect(dataset.catalog).toBe('collapsed');
    expect(storage.store.get(RAIL_STORAGE_KEY)).toBe('collapsed');
    // The next page load starts from storage, not from the default.
    expect(readRailState()).toBe('collapsed');

    railState = toggleRailState(readRailState());
    applyRailState(railState);
    writeRailState(railState);

    expect(dataset.catalog).toBe('expanded');
    expect(readRailState()).toBe('expanded');
  });
});
