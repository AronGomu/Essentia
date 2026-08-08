/**
 * Retractable catalog rail state.
 *
 * The state lives on the root element as `data-catalog="collapsed" |
 * "expanded"` and persists in `localStorage` under a bare string (not a
 * versioned JSON blob, unlike the rest of `lib/storage.ts`) so a tiny inline
 * `<head>` script can read it before the body renders without pulling in any
 * module machinery.
 */
export const RAIL_STORAGE_KEY = 'essentia.v1.catalog-rail';

export type RailState = 'collapsed' | 'expanded';

/** Anything that is not the literal 'collapsed' means expanded. */
export function normalizeRailState(value: string | null): RailState {
  return value === 'collapsed' ? 'collapsed' : 'expanded';
}

export function toggleRailState(value: RailState): RailState {
  return value === 'expanded' ? 'collapsed' : 'expanded';
}

/**
 * Reads the persisted state, defaulting to expanded when storage is
 * unreachable.
 *
 * The `globalThis.localStorage` *property* throws `SecurityError` outright when
 * cookies are blocked or the document is sandboxed without `allow-same-origin`,
 * so `?.` is no protection — the getter itself is what throws. An unguarded
 * read would abort the caller before it could mirror the state onto the root
 * element, leaving the rail's markup and the toggle's `aria-expanded`
 * disagreeing with what the pre-paint inline script already painted.
 */
export function readRailState(): RailState {
  try {
    return normalizeRailState(
      globalThis.localStorage?.getItem(RAIL_STORAGE_KEY) ?? null,
    );
  } catch {
    // Blocked by a privacy setting or a sandboxed context.
    return normalizeRailState(null);
  }
}
