/**
 * lib/regeneration/index.ts
 *
 * LessonFoundry — Task 16: Controlled Regeneration & Version History
 *
 * Framework-independent, pure-function controlled regeneration service.
 *
 * Key invariants:
 * - Only the targeted asset is regenerated; the rest of the pack is untouched.
 * - Approved versions are preserved — never overwritten or mutated.
 * - New versions always start as Draft.
 * - Version history is maintained as an in-memory domain structure.
 * - Regeneration routes through the existing AI provider abstraction.
 * - No OpenAI calls. No persistence. No UI coupling.
 */

import type {
  LearningPack,
  LearningPackAsset,
  AssetProvenance,
  AssetId,
  AssetVersion,
  VersionId,
  ReviewStatus,
  ISODateString,
  SourceId,
  PackConfiguration,
} from "../contracts";
import type { GenerationInput } from "../ai/types";
import type { AIGenerationProvider } from "../ai/provider";

// ─────────────────────────────────────────────────────────────────────────────
// 1. REGENERATION INPUT
//    Identifies exactly what to regenerate and in what context.
// ─────────────────────────────────────────────────────────────────────────────

export interface RegenerationRequest {
  /** The pack containing the asset to regenerate. */
  pack: LearningPack;
  /** The assetId of the specific asset to regenerate. */
  targetAssetId: AssetId;
  /** Teacher-provided reason for regeneration. */
  reason: string;
  /** Generation input context (source, objectives, config). */
  generationInput: GenerationInput;
  /** Optional: AI provider to use. Defaults to stubProvider. */
  provider?: AIGenerationProvider;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. REGENERATION ERROR
// ─────────────────────────────────────────────────────────────────────────────

export type RegenerationErrorCode =
  | "asset-not-found"
  | "generation-failed"
  | "invalid-request";

export interface RegenerationError {
  code: RegenerationErrorCode;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. VERSION HISTORY ENTRY
//    Snapshot of an asset version for the version history ledger.
// ─────────────────────────────────────────────────────────────────────────────

export interface VersionHistoryEntry {
  /** The version record metadata. */
  version: AssetVersion;
  /** Full snapshot of the asset at this version. */
  asset: LearningPackAsset;
  /** Review status at the time this entry was created. */
  reviewStatus: ReviewStatus;
  /** Provenance of this version. */
  provenance: AssetProvenance;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. VERSION HISTORY
//    In-memory history for a single logical asset across versions.
// ─────────────────────────────────────────────────────────────────────────────

export interface AssetVersionHistory {
  /** The logical asset ID shared across all versions. */
  assetId: AssetId;
  /** Ordered list of version entries (oldest first). */
  entries: VersionHistoryEntry[];
  /** The currently active (latest) version number. */
  activeVersion: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. REGENERATION RESULT
//    Discriminated union — success or failure, never a silent substitution.
// ─────────────────────────────────────────────────────────────────────────────

export interface RegenerationSuccess {
  status: "success";
  /** The updated pack with the regenerated asset in place. */
  updatedPack: LearningPack;
  /** The previous version of the asset (preserved, unchanged). */
  previousVersion: LearningPackAsset;
  /** The newly regenerated asset (Draft). */
  newVersion: LearningPackAsset;
  /** Version history for the regenerated asset. */
  versionHistory: AssetVersionHistory;
  /** Assets that were NOT regenerated (should be unchanged). */
  preservedAssets: LearningPackAsset[];
}

export type RegenerationResult =
  | RegenerationSuccess
  | { status: "failure"; error: RegenerationError };

// ─────────────────────────────────────────────────────────────────────────────
// 6. VERSION HISTORY BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a version history entry for an asset.
 */
function createVersionEntry(
  asset: LearningPackAsset,
  previousVersionId: VersionId | null,
  reason: string,
): VersionHistoryEntry {
  const versionRecord: AssetVersion = {
    versionId: crypto.randomUUID() as VersionId,
    assetId: asset.assetId,
    assetVersion: asset.provenance.assetVersion,
    previousVersionId,
    regenerationReason: reason,
    createdAt: new Date().toISOString(),
  };

  return {
    version: versionRecord,
    asset: { ...asset },
    reviewStatus: asset.reviewStatus,
    provenance: { ...asset.provenance },
  };
}

/**
 * Builds a version history from a previous asset and a newly regenerated asset.
 */
export function buildVersionHistory(
  previousAsset: LearningPackAsset,
  newAsset: LearningPackAsset,
  reason: string,
): AssetVersionHistory {
  const prevEntry = createVersionEntry(previousAsset, null, "Initial generation");
  const newEntry = createVersionEntry(newAsset, prevEntry.version.versionId, reason);

  return {
    assetId: previousAsset.assetId,
    entries: [prevEntry, newEntry],
    activeVersion: newAsset.provenance.assetVersion,
  };
}

/**
 * Extends an existing version history with a new version entry.
 * Returns a NEW history object — the original is never mutated.
 */
export function extendVersionHistory(
  history: AssetVersionHistory,
  newAsset: LearningPackAsset,
  reason: string,
): AssetVersionHistory {
  const lastEntry = history.entries[history.entries.length - 1];
  const newEntry = createVersionEntry(
    newAsset,
    lastEntry.version.versionId,
    reason,
  );

  return {
    assetId: history.assetId,
    entries: [...history.entries, newEntry],
    activeVersion: newAsset.provenance.assetVersion,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. VERSION HISTORY QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the number of versions in the history.
 */
export function getVersionCount(history: AssetVersionHistory): number {
  return history.entries.length;
}

/**
 * Returns the currently active version entry.
 */
export function getActiveVersion(
  history: AssetVersionHistory,
): VersionHistoryEntry | undefined {
  return history.entries.find(
    (e) => e.version.assetVersion === history.activeVersion,
  );
}

/**
 * Returns the approved version entry, if one exists.
 */
export function getApprovedVersion(
  history: AssetVersionHistory,
): VersionHistoryEntry | undefined {
  return history.entries.find((e) => e.reviewStatus === "approved");
}

/**
 * Returns a specific version entry by version number.
 */
export function getVersionByNumber(
  history: AssetVersionHistory,
  versionNumber: number,
): VersionHistoryEntry | undefined {
  return history.entries.find(
    (e) => e.version.assetVersion === versionNumber,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. ASSET TYPE TO STUB CONTENT MAPPING
//    Maps an asset type to the appropriate content from the stub provider
//    output. This keeps the regeneration service decoupled from the raw
//    provider shape — it goes through generate() like the full generator.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given a full pack generation result and a target asset type + hints,
 * extract the matching regenerated content from the newly generated pack.
 */
function findMatchingAsset(
  generatedPack: LearningPack,
  originalAsset: LearningPackAsset,
): LearningPackAsset | undefined {
  // Match by type and, for differentiated practice, by practiceDifficulty
  return generatedPack.assets.find((a) => {
    if (a.type !== originalAsset.type) return false;
    if (
      a.type === "differentiated-practice" &&
      originalAsset.type === "differentiated-practice"
    ) {
      return a.practiceDifficulty === originalAsset.practiceDifficulty;
    }
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. CORE REGENERATION OPERATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Regenerate a single asset within a pack.
 *
 * - Only the targeted asset receives a new version.
 * - All other assets remain unchanged.
 * - The previous version is preserved (never mutated).
 * - The new version starts as Draft.
 * - Approved content is never silently overwritten.
 *
 * Uses the AI provider abstraction (defaults to stub provider).
 */
export async function regenerateAsset(
  request: RegenerationRequest,
): Promise<RegenerationResult> {
  const { pack, targetAssetId, reason, generationInput } = request;

  // ── Validate: find the target asset ──
  const targetIndex = pack.assets.findIndex(
    (a) => a.assetId === targetAssetId,
  );
  if (targetIndex === -1) {
    return {
      status: "failure",
      error: {
        code: "asset-not-found",
        message: `Asset "${targetAssetId}" not found in pack "${pack.packId}".`,
      },
    };
  }

  const originalAsset = pack.assets[targetIndex];

  // ── Generate new content via the generator (single call) ──
  // We call generateLearningPack once and extract only the matching asset.
  // This avoids the double-generation bug where provider.generate() and
  // generateLearningPack() were both called, wasting a full API round-trip.
  const { generateLearningPack } = await import("../ai/generator");
  const fullResult = await generateLearningPack(generationInput);
  if (fullResult.status !== "success") {
    return {
      status: "failure",
      error: {
        code: "generation-failed",
        message: fullResult.error.message,
      },
    };
  }

  const matchingAsset = findMatchingAsset(fullResult.pack, originalAsset);
  if (!matchingAsset) {
    return {
      status: "failure",
      error: {
        code: "generation-failed",
        message: `Could not find matching asset of type "${originalAsset.type}" in regenerated output.`,
      },
    };
  }

  // ── Build the new version ──
  const now = new Date().toISOString();
  const newProvenance: AssetProvenance = {
    sourceId: generationInput.sourceId,
    sourceVersion: generationInput.sourceVersion,
    sourceReference: generationInput.sourceReference,
    modelId: matchingAsset.provenance.modelId,
    generatedAt: now,
    assetVersion: originalAsset.provenance.assetVersion + 1,
  };

  // Create the new version: same assetId, new content, new provenance, Draft
  const newVersion: LearningPackAsset = {
    ...matchingAsset,
    assetId: originalAsset.assetId, // preserve logical identity
    provenance: newProvenance,
    reviewStatus: "draft" as ReviewStatus,
  };

  // ── Build updated pack (only the target asset is replaced) ──
  const updatedAssets = pack.assets.map((a, i) =>
    i === targetIndex ? newVersion : a,
  );

  const updatedPack: LearningPack = {
    ...pack,
    assets: updatedAssets,
    // If pack was approved, it's no longer approved after regeneration
    reviewStatus:
      pack.reviewStatus === "approved"
        ? ("draft" as ReviewStatus)
        : pack.reviewStatus,
  };

  // ── Build version history ──
  const versionHistory = buildVersionHistory(originalAsset, newVersion, reason);

  // ── Identify preserved assets ──
  const preservedAssets = pack.assets.filter((_, i) => i !== targetIndex);

  return {
    status: "success",
    updatedPack,
    previousVersion: originalAsset,
    newVersion,
    versionHistory,
    preservedAssets,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. INITIAL VERSION HISTORY FROM PACK
//     Creates version history entries for all assets in a fresh pack.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates initial version history for all assets in a pack.
 * Useful when a pack is first generated and you want to start tracking.
 */
export function createInitialVersionHistories(
  pack: LearningPack,
): AssetVersionHistory[] {
  return pack.assets.map((asset) => {
    const entry = createVersionEntry(asset, null, "Initial generation");
    return {
      assetId: asset.assetId,
      entries: [entry],
      activeVersion: asset.provenance.assetVersion,
    };
  });
}
