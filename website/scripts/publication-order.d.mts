export interface PublicationVersion {
  stage: string;
  stageRank: number;
  version: string;
  releasedOn: string;
  packageId: string;
}

export function compareSemanticVersion(left: string, right: string): number;
export function comparePublicationVersion(
  left: PublicationVersion,
  right: PublicationVersion,
): number;
export function selectCurrentVersion<T extends PublicationVersion>(
  versions: T[],
): T;
