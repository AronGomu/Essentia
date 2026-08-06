/**
 * Namespaced browser storage for Essentia.
 *
 * Every key lives under `essentia.v1.*` and every stored value carries a
 * `schemaVersion`. Reads run the value through a migration function so a stale
 * shape from an earlier visit is upgraded rather than throwing or silently
 * producing undefined behaviour.
 */
export const STORAGE_PREFIX = 'essentia.v1.';

export interface Versioned {
  schemaVersion: number;
}

export type Migrate<T extends Versioned> = (value: unknown) => T | null;

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Blocked by a privacy setting or a sandboxed context.
    return null;
  }
}

export function readStored<T extends Versioned>(
  key: string,
  migrate: Migrate<T>,
): T | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(`${STORAGE_PREFIX}${key}`);
  if (!raw) return null;
  try {
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export type WriteResult = 'ok' | 'quota-exceeded' | 'unavailable';

export function writeStored<T extends Versioned>(
  key: string,
  value: T,
): WriteResult {
  const store = storage();
  if (!store) return 'unavailable';
  try {
    store.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
    return 'ok';
  } catch (error) {
    const quota =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    return quota ? 'quota-exceeded' : 'unavailable';
  }
}

export function removeStored(key: string): void {
  storage()?.removeItem(`${STORAGE_PREFIX}${key}`);
}

export interface ImageQuality extends Versioned {
  schemaVersion: 1;
  /** `auto` respects Save-Data; `high` always upgrades; `low` never does. */
  mode: 'auto' | 'high' | 'low';
}

export const migrateImageQuality: Migrate<ImageQuality> = (value) => {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1) return null;
  return record.mode === 'auto' ||
    record.mode === 'high' ||
    record.mode === 'low'
    ? { schemaVersion: 1, mode: record.mode }
    : null;
};

export const IMAGE_QUALITY_KEY = 'image-quality';
