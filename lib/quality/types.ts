/**
 * lib/quality/types.ts
 *
 * LessonFoundry — AI Quality Verification Type Contracts (Task 21A).
 *
 * PURE TYPES — no runtime logic, no SDK imports, no network calls.
 * Safe to import from both server and client code.
 *
 * ── DESIGN DECISIONS ────────────────────────────────────────────────────────
 *
 * 1. AIQualityVerifier is a SEPARATE interface from AIGenerationProvider.
 *    Verification evaluates existing content; generation creates new content.
 *    These are fundamentally different operations with different contracts.
 *
 * 2. VerificationResult uses a three-state discriminated union:
 *    "verified"       → AI ran, found no unsupported claims
 *    "issues-found"   → AI ran, found unsupported claims
 *    "not-evaluated"  → AI could not run (provider failure, missing key, etc.)
 *
 *    There is no ambiguity: provider failure is NEVER represented as "verified".
 *
 * 3. Reuses existing GenerationErrorCode for unavailability reasons,
 *    keeping the error vocabulary consistent across the AI layer.
 */

import type {
  LearningPack,
  QualityIssue,
  LearningObjective,
} from "@/lib/contracts";
import type { GenerationErrorCode } from "@/lib/ai/types";

// ─────────────────────────────────────────────────────────────────────────────
// 1. VERIFICATION INPUT
// ─────────────────────────────────────────────────────────────────────────────

export interface VerificationInput {
  /** The generated learning pack to verify. */
  pack: LearningPack;
  /** The full plain-text trusted source content used to ground generation. */
  sourceContent: string;
  /** The objectives that drove generation — for context in the AI prompt. */
  objectives?: LearningObjective[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. VERIFICATION RESULT
//    Three-state discriminated union. No silent failures.
// ─────────────────────────────────────────────────────────────────────────────

/** AI verification ran successfully and found no unsupported claims. */
export interface VerificationClean {
  status: "verified";
  /** How many assets were checked. */
  assetsChecked: number;
}

/** AI verification ran successfully and found unsupported claims. */
export interface VerificationIssuesFound {
  status: "issues-found";
  /** The unsupported-claim QualityIssues to surface to the teacher. */
  issues: QualityIssue[];
  /** How many assets were checked. */
  assetsChecked: number;
}

/**
 * Unavailable reasons — reuses GenerationErrorCode where applicable,
 * plus a few verification-specific codes.
 */
export type VerificationUnavailableReason =
  | "provider-unavailable"
  | "rate-limited"
  | "parse-failed"
  | "timeout"
  | "missing-api-key";

/** AI verification could not run. */
export interface VerificationNotEvaluated {
  status: "not-evaluated";
  reason: VerificationUnavailableReason;
  /** Human-readable message for the teacher UI. */
  message: string;
}

export type VerificationResult =
  | VerificationClean
  | VerificationIssuesFound
  | VerificationNotEvaluated;

// ─────────────────────────────────────────────────────────────────────────────
// 3. AI QUALITY VERIFIER INTERFACE
//    Implementations provide the actual AI call.
//    Application code depends on this interface, not on any specific SDK.
// ─────────────────────────────────────────────────────────────────────────────

export interface AIQualityVerifier {
  /**
   * Verify whether the generated content in the pack is grounded in the
   * trusted source. Returns a VerificationResult — never throws.
   */
  verify(input: VerificationInput): Promise<VerificationResult>;

  /** Human-readable label for logging and provenance. */
  readonly verifierLabel: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. RAW AI RESPONSE SCHEMA
//    The structured JSON shape the AI model must return.
//    Each finding identifies an unsupported claim with evidence.
// ─────────────────────────────────────────────────────────────────────────────

export interface RawGroundingFinding {
  /** The asset type containing the unsupported claim. */
  assetType: string;
  /**
   * Index of the asset in the pack's assets array.
   * Used to map back to the correct AssetId.
   */
  assetIndex: number;
  /** The specific claim or content that appears unsupported. */
  claim: string;
  /** Why this claim appears unsupported — what source evidence was checked. */
  reasoning: string;
}

export interface RawGroundingResponse {
  /** "grounded" if all content is supported by the source, "issues-found" otherwise. */
  verdict: "grounded" | "issues-found";
  /** List of unsupported claims found. Empty array when verdict is "grounded". */
  findings: RawGroundingFinding[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. JSON SCHEMA FOR STRUCTURED OUTPUT
//    Passed to OpenAI response_format to enforce structure.
// ─────────────────────────────────────────────────────────────────────────────

export const GROUNDING_VERIFICATION_SCHEMA = {
  type: "object",
  properties: {
    verdict: {
      type: "string",
      enum: ["grounded", "issues-found"],
      description:
        "'grounded' if all generated content is supported by the trusted source. 'issues-found' if any claims lack source support.",
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          assetType: {
            type: "string",
            description:
              "The type of the asset containing the unsupported claim (e.g. 'concept-explanation', 'worked-example').",
          },
          assetIndex: {
            type: "integer",
            description:
              "Zero-based index of the asset in the pack's assets array.",
          },
          claim: {
            type: "string",
            description:
              "The specific text or claim from the generated content that is not supported by the source.",
          },
          reasoning: {
            type: "string",
            description:
              "A concise explanation of why this claim appears unsupported, referencing what source evidence was checked.",
          },
        },
        required: ["assetType", "assetIndex", "claim", "reasoning"],
        additionalProperties: false,
      },
    },
  },
  required: ["verdict", "findings"],
  additionalProperties: false,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 6. TYPE GUARD
//    Runtime validation of the raw AI response.
// ─────────────────────────────────────────────────────────────────────────────

export function isRawGroundingResponse(
  value: unknown,
): value is RawGroundingResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v["verdict"] !== "grounded" && v["verdict"] !== "issues-found")
    return false;
  if (!Array.isArray(v["findings"])) return false;
  return v["findings"].every(
    (f) =>
      typeof f === "object" &&
      f !== null &&
      typeof (f as Record<string, unknown>)["assetType"] === "string" &&
      typeof (f as Record<string, unknown>)["assetIndex"] === "number" &&
      typeof (f as Record<string, unknown>)["claim"] === "string" &&
      typeof (f as Record<string, unknown>)["reasoning"] === "string",
  );
}
