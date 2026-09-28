/**
 * lib/review/index.ts
 *
 * LessonFoundry — Task 15: Teacher Review Gate
 *
 * Framework-independent, pure-function review workflow.
 *
 * States:  Draft  →  Approved
 *          Draft  →  Needs Revision
 *          Needs Revision → Draft
 *          Needs Revision → Approved
 *
 * Approved content is NEVER silently changed. Moving an Approved asset
 * back requires an explicit `revokeApproval` call — this is intentionally
 * a separate, named operation so that it cannot happen accidentally.
 *
 * All functions return NEW objects — originals are never mutated.
 * No AI calls. No persistence. No UI coupling.
 */

import type {
  ReviewStatus,
  LearningPackAsset,
  LearningPack,
  ISODateString,
  AssetProvenance,
  AssetId,
} from "../contracts";

// ─────────────────────────────────────────────────────────────────────────────
// 1. REVIEW DECISION METADATA
//    Lightweight record of a teacher's review decision. Does NOT include
//    teacher identity (no auth system exists yet).
// ─────────────────────────────────────────────────────────────────────────────

export interface ReviewDecision {
  /** The review status that was applied. */
  status: ReviewStatus;
  /** ISO 8601 timestamp of when the review decision was made. */
  reviewedAt: ISODateString;
  /** The asset version that was reviewed (mirrors provenance.assetVersion). */
  reviewVersion: number;
  /** Optional teacher note explaining the decision. */
  note?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. REVIEWED ASSET — asset with review decision attached
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A LearningPackAsset augmented with an explicit review decision record.
 * The `reviewStatus` on the base asset is always kept in sync with the
 * decision's status.
 */
export type ReviewedAsset = LearningPackAsset & {
  reviewDecision: ReviewDecision;
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. TRANSITION ERRORS
// ─────────────────────────────────────────────────────────────────────────────

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: ReviewStatus,
    public readonly to: ReviewStatus,
  ) {
    super(
      `Invalid review transition: "${from}" → "${to}". ` +
        (from === "approved"
          ? "Approved content requires an explicit revokeApproval call."
          : `Transition from "${from}" to "${to}" is not permitted.`),
    );
    this.name = "InvalidTransitionError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. VALID TRANSITIONS TABLE
// ─────────────────────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: ReadonlyMap<ReviewStatus, ReadonlySet<ReviewStatus>> =
  new Map([
    ["draft", new Set<ReviewStatus>(["approved", "needs-revision"])],
    ["needs-revision", new Set<ReviewStatus>(["draft", "approved"])],
    // "approved" has NO normal transitions — requires explicit revokeApproval
    ["approved", new Set<ReviewStatus>()],
  ]);

/**
 * Returns true if the transition from → to is valid under normal review rules.
 * Approved → anything is always false here; use `revokeApproval` instead.
 */
export function isValidTransition(
  from: ReviewStatus,
  to: ReviewStatus,
): boolean {
  return VALID_TRANSITIONS.get(from)?.has(to) ?? false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CORE REVIEW OPERATIONS — ASSET LEVEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Internal helper: applies a review transition to an asset.
 * Returns a new object; original is untouched.
 */
function applyAssetTransition(
  asset: LearningPackAsset,
  targetStatus: ReviewStatus,
  note?: string,
): ReviewedAsset {
  if (!isValidTransition(asset.reviewStatus, targetStatus)) {
    throw new InvalidTransitionError(asset.reviewStatus, targetStatus);
  }

  const now = new Date().toISOString();
  const decision: ReviewDecision = {
    status: targetStatus,
    reviewedAt: now,
    reviewVersion: asset.provenance.assetVersion,
    ...(note !== undefined ? { note } : {}),
  };

  return {
    ...asset,
    reviewStatus: targetStatus,
    reviewDecision: decision,
  };
}

/**
 * Approve an asset. The asset must be in "draft" or "needs-revision" status.
 * Returns a NEW object — the original is never mutated.
 */
export function approveAsset(
  asset: LearningPackAsset,
  note?: string,
): ReviewedAsset {
  return applyAssetTransition(asset, "approved", note);
}

/**
 * Request revision on an asset. The asset must be in "draft" status.
 * Returns a NEW object — the original is never mutated.
 */
export function requestRevision(
  asset: LearningPackAsset,
  note?: string,
): ReviewedAsset {
  return applyAssetTransition(asset, "needs-revision", note);
}

/**
 * Return a "needs-revision" asset back to "draft" (e.g. after the teacher
 * has revised and wants another look). Must be in "needs-revision" status.
 * Returns a NEW object.
 */
export function returnToDraft(
  asset: LearningPackAsset,
  note?: string,
): ReviewedAsset {
  return applyAssetTransition(asset, "draft", note);
}

/**
 * Explicitly revoke approval on an approved asset, setting it back to "draft".
 *
 * This is intentionally a separate function from `returnToDraft` to prevent
 * accidental status changes on approved content. The teacher must explicitly
 * call this; no other pathway can change an Approved asset's status.
 */
export function revokeApproval(
  asset: LearningPackAsset,
  note?: string,
): ReviewedAsset {
  if (asset.reviewStatus !== "approved") {
    throw new InvalidTransitionError(asset.reviewStatus, "draft");
  }

  const now = new Date().toISOString();
  const decision: ReviewDecision = {
    status: "draft",
    reviewedAt: now,
    reviewVersion: asset.provenance.assetVersion,
    ...(note !== undefined ? { note } : {}),
  };

  return {
    ...asset,
    reviewStatus: "draft",
    reviewDecision: decision,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CORE REVIEW OPERATIONS — PACK LEVEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Approve an entire pack. ALL assets must already be "approved".
 * Returns a new LearningPack object — original is never mutated.
 */
export function approvePack(pack: LearningPack): LearningPack {
  const allApproved = pack.assets.every((a) => a.reviewStatus === "approved");
  if (!allApproved) {
    throw new Error(
      "Cannot approve pack: not all assets are approved. " +
        "Approve each asset individually first.",
    );
  }
  if (pack.reviewStatus === "approved") {
    // Already approved — return a shallow copy (idempotent, no silent change)
    return { ...pack };
  }
  return {
    ...pack,
    reviewStatus: "approved" as ReviewStatus,
  };
}

/**
 * Request revision on a pack. Sets pack status to "needs-revision".
 * Does NOT change individual asset statuses — those are reviewed individually.
 */
export function requestPackRevision(pack: LearningPack): LearningPack {
  if (pack.reviewStatus === "approved") {
    throw new Error(
      "Cannot request revision on an approved pack. " +
        "Use revokePackApproval to explicitly revoke approval first.",
    );
  }
  return {
    ...pack,
    reviewStatus: "needs-revision" as ReviewStatus,
  };
}

/**
 * Explicitly revoke pack-level approval, returning it to "draft".
 */
export function revokePackApproval(pack: LearningPack): LearningPack {
  if (pack.reviewStatus !== "approved") {
    throw new Error(
      `Cannot revoke pack approval: pack is "${pack.reviewStatus}", not "approved".`,
    );
  }
  return {
    ...pack,
    reviewStatus: "draft" as ReviewStatus,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. STUDENT-READY CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true ONLY when the asset is "approved".
 * Draft → false, Needs Revision → false, Approved → true.
 */
export function isAssetStudentReady(asset: LearningPackAsset): boolean {
  return asset.reviewStatus === "approved";
}

/**
 * Returns true ONLY when ALL assets in the pack are "approved"
 * AND the pack itself is "approved".
 *
 * If even one required asset is not approved, returns false.
 */
export function isPackStudentReady(pack: LearningPack): boolean {
  if (pack.reviewStatus !== "approved") return false;
  return pack.assets.every((a) => a.reviewStatus === "approved");
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. VERSION / REVISION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new revision (version) of an asset. The new revision:
 * - starts as "draft" (NEVER automatically approved)
 * - gets an incremented assetVersion in its provenance
 * - retains the same assetId (it is the same logical asset)
 *
 * The PREVIOUS version object is NOT mutated and remains in whatever
 * review state it was in (typically "approved").
 *
 * This function does NOT perform regeneration — it only creates the
 * version shell. Content updates are the caller's responsibility.
 */
export function createAssetRevision<T extends LearningPackAsset>(
  approvedAsset: T,
  contentUpdates: Partial<Omit<T, "assetId" | "provenance" | "reviewStatus" | "type">>,
): T {
  const newProvenance: AssetProvenance = {
    ...approvedAsset.provenance,
    assetVersion: approvedAsset.provenance.assetVersion + 1,
    generatedAt: new Date().toISOString(),
  };

  return {
    ...approvedAsset,
    ...contentUpdates,
    provenance: newProvenance,
    reviewStatus: "draft" as ReviewStatus,
  } as T;
}
