import { TrustedSource, SourceId } from "../contracts";

/**
 * Creates a new trusted source with sourceVersion = 1.
 */
export function createSource(
  label: string,
  content: string,
  sourceReference: string
): TrustedSource {
  return {
    sourceId: crypto.randomUUID() as SourceId,
    sourceVersion: 1,
    sourceReference,
    label,
    content,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Creates a new version of an existing source.
 * The original source object remains unmodified.
 * The sourceId and sourceReference remain the same, but the version increments.
 */
export function createSourceVersion(
  existingSource: TrustedSource,
  newContent: string,
  newLabel?: string
): TrustedSource {
  return {
    ...existingSource,
    sourceVersion: existingSource.sourceVersion + 1,
    label: newLabel ?? existingSource.label,
    content: newContent,
    createdAt: new Date().toISOString(),
  };
}
