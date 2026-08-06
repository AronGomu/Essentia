/**
 * Render provenance schemas.
 *
 * v1 — bare card attestations.
 * v2 — adds the `transparent-white-corners` render transform.
 * v3 — adds the optional `print` block recording export-template masters
 *      (1500 × 2092). Absent `print` is valid: a package simply has no masters
 *      yet and the website falls back to upscaled draft-resolution output.
 */
export const PRINT_MASTER = { width: 1500, height: 2092 };

function hasValidTransform(provenance) {
  return (
    provenance.renderTransform?.id === 'transparent-white-corners' &&
    provenance.renderTransform?.version === 1
  );
}

export function isSupportedRenderProvenance(provenance) {
  if (provenance.schemaVersion === 1) return true;
  if (provenance.schemaVersion === 2) return hasValidTransform(provenance);
  if (provenance.schemaVersion === 3)
    return hasValidTransform(provenance) && isValidPrintBlock(provenance.print);
  return false;
}

export function isValidPrintBlock(print) {
  if (print === undefined || print === null) return true;
  return (
    typeof print === 'object' &&
    print.template === 'essentia-print.mse-export-template' &&
    print.width === PRINT_MASTER.width &&
    print.height === PRINT_MASTER.height &&
    Array.isArray(print.cards) &&
    print.cards.every(
      (card) =>
        typeof card?.id === 'string' && typeof card?.printHash === 'string',
    )
  );
}
