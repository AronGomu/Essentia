import { COMPACT_VIEWPORT_PX, headerRowBudget } from '../shared/header-row.mjs';

// A wrapped header is a layout smell, not a broken build: this warns and
// always exits 0, per the feedback that asked for a warning here.
for (const withBreadcrumb of [true, false]) {
  const budget = headerRowBudget(COMPACT_VIEWPORT_PX, { withBreadcrumb });
  if (budget.fits) continue;
  console.warn(
    `[warn] site-header may wrap at ${COMPACT_VIEWPORT_PX}px` +
      `${withBreadcrumb ? ' with a breadcrumb' : ''}: ` +
      `needs ${budget.contentPx}px, has ${budget.availablePx}px ` +
      `(over by ${budget.overflowPx}px)`,
  );
}
