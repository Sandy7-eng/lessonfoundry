/**
 * lib/ai/proof-schema.ts
 *
 * Task 10 — Proof-of-connection structured output schema.
 *
 * SERVER-SIDE ONLY.
 *
 * This is a TEMPORARY, MINIMAL structured output used solely to prove:
 *   1. The provider connection works.
 *   2. Structured JSON is returned and parseable.
 *   3. Source grounding is operating.
 *   4. Objective coverage can be mapped.
 *
 * It is NOT the full LearningPack. The full pack generation is a future task.
 */

// ─── The JSON shape requested from the model ─────────────────────────────────

export interface ObjectiveCoverageEntry {
  objectiveId: string;
  covered: boolean;
  /** Short sentence from the source that supports coverage, or gap explanation. */
  evidence: string;
}

/** The complete proof-of-connection response the model must return. */
export interface ProofOfConnectionResponse {
  status: "ok" | "insufficient-source";
  /**
   * A 1–3 sentence summary grounded ONLY in the source content.
   * Must not introduce information absent from the source.
   */
  summary: string;
  objectiveCoverage: ObjectiveCoverageEntry[];
}

/**
 * JSON Schema passed to OpenAI response_format to enforce structure.
 * Using a schema keeps the model output machine-readable without brittle
 * string parsing.
 */
export const PROOF_OF_CONNECTION_SCHEMA = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["ok", "insufficient-source"],
      description:
        "'ok' if the source contains enough information to address the objectives. 'insufficient-source' if the source is too thin.",
    },
    summary: {
      type: "string",
      description:
        "1–3 sentences summarising what the source covers relative to the objectives. Grounded only in source content.",
    },
    objectiveCoverage: {
      type: "array",
      items: {
        type: "object",
        properties: {
          objectiveId: {
            type: "string",
            description: "The exact objectiveId from the request.",
          },
          covered: {
            type: "boolean",
            description:
              "true if the source provides enough material to address this objective.",
          },
          evidence: {
            type: "string",
            description:
              "A short phrase or sentence from the source that supports coverage, or a clear explanation of the gap.",
          },
        },
        required: ["objectiveId", "covered", "evidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["status", "summary", "objectiveCoverage"],
  additionalProperties: false,
} as const;

// ─── Type guard ───────────────────────────────────────────────────────────────

export function isProofOfConnectionResponse(
  value: unknown
): value is ProofOfConnectionResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v["status"] !== "ok" && v["status"] !== "insufficient-source") return false;
  if (typeof v["summary"] !== "string") return false;
  if (!Array.isArray(v["objectiveCoverage"])) return false;
  return v["objectiveCoverage"].every(
    (e) =>
      typeof e === "object" &&
      e !== null &&
      typeof (e as Record<string, unknown>)["objectiveId"] === "string" &&
      typeof (e as Record<string, unknown>)["covered"] === "boolean" &&
      typeof (e as Record<string, unknown>)["evidence"] === "string"
  );
}
