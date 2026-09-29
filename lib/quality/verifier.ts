/**
 * lib/quality/verifier.ts
 *
 * LessonFoundry — Core Grounding Verification Logic (Task 21A).
 *
 * SERVER-SIDE ONLY.
 *
 * This is the primary callable API for AI grounding verification.
 * It is independently testable and does not depend on the generation pipeline.
 *
 * Usage:
 *
 *   import { verifyLearningPackGrounding } from "@/lib/quality";
 *   const result = await verifyLearningPackGrounding({
 *     pack,
 *     sourceContent,
 *     objectives,
 *   });
 *
 * ── FAILURE INVARIANT ────────────────────────────────────────────────────────
 *
 * AI verification failure NEVER breaks the deterministic workflow.
 * All provider failures produce { status: "not-evaluated", reason, message }.
 * This function never throws.
 */

import type { QualityIssue, QualityId, AssetId } from "@/lib/contracts";
import type {
  VerificationInput,
  VerificationResult,
  AIQualityVerifier,
  RawGroundingResponse,
} from "./types";
import { isRawGroundingResponse } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// CORE VERIFICATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies whether the generated content in a LearningPack is grounded
 * in the trusted source content.
 *
 * @param input - The pack, source content, and optional objectives.
 * @param verifier - The AI quality verifier implementation.
 * @returns VerificationResult — never throws.
 */
export async function verifyLearningPackGrounding(
  input: VerificationInput,
  verifier: AIQualityVerifier,
): Promise<VerificationResult> {
  try {
    return await verifier.verify(input);
  } catch {
    // Catch-all safety net — should never happen if the verifier follows
    // its contract, but we guarantee no unhandled exceptions escape.
    return {
      status: "not-evaluated",
      reason: "provider-unavailable",
      message:
        "An unexpected error occurred during AI quality verification. The deterministic checks remain valid.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RAW RESPONSE → VERIFICATION RESULT CONVERSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a validated RawGroundingResponse into a VerificationResult,
 * mapping findings to QualityIssue objects.
 *
 * This function is used by provider implementations after parsing the AI
 * response. It is intentionally exported so that mock/stub verifiers
 * can also use it.
 */
export function convertGroundingResponse(
  raw: RawGroundingResponse,
  pack: { assets: Array<{ assetId: AssetId; type: string }> },
): VerificationResult {
  const assetsChecked = pack.assets.length;

  if (raw.verdict === "grounded" || raw.findings.length === 0) {
    return {
      status: "verified",
      assetsChecked,
    };
  }

  const issues: QualityIssue[] = raw.findings.map((finding) => {
    // Map assetIndex to the actual AssetId — clamp to valid range
    const clampedIndex = Math.max(
      0,
      Math.min(finding.assetIndex, pack.assets.length - 1),
    );
    const affectedAsset = pack.assets[clampedIndex];

    return {
      issueId: crypto.randomUUID() as QualityId,
      issueType: "unsupported-claim" as const,
      severity: "warning" as const,
      affectedAssetId: affectedAsset.assetId,
      message: `Unsupported claim in ${finding.assetType}: "${finding.claim}" — ${finding.reasoning}`,
    };
  });

  return {
    status: "issues-found",
    issues,
    assetsChecked,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STUB VERIFIER
// Used in development, testing, and CI.
// Returns "verified" (no issues) for any input.
// ─────────────────────────────────────────────────────────────────────────────

export const stubVerifier: AIQualityVerifier = {
  verifierLabel: "stub/quality-verifier",

  async verify(input: VerificationInput): Promise<VerificationResult> {
    return {
      status: "verified",
      assetsChecked: input.pack.assets.length,
    };
  },
};
