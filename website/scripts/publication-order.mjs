function versionKey(value) {
  if (!/^\d+\.\d+(?:\.\d+)?$/.test(value)) {
    throw new Error(`Invalid publication version: ${value}`);
  }
  return value.split('.').map(Number);
}

export function compareSemanticVersion(leftValue, rightValue) {
  const left = versionKey(leftValue);
  const right = versionKey(rightValue);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta) return delta;
  }
  return 0;
}

export function comparePublicationVersion(left, right) {
  return (
    left.stageRank - right.stageRank ||
    compareSemanticVersion(left.version, right.version) ||
    left.releasedOn.localeCompare(right.releasedOn) ||
    left.packageId.localeCompare(right.packageId)
  );
}

export function selectCurrentVersion(versions) {
  if (!versions.length) throw new Error('Cannot select from empty versions');
  const keys = new Set();
  for (const version of versions) {
    const key = `${version.stage}:${version.version}`;
    if (keys.has(key)) {
      throw new Error(`Duplicate lifecycle/version: ${key}`);
    }
    keys.add(key);
  }
  return [...versions].sort(comparePublicationVersion).at(-1);
}
