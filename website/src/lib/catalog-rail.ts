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
