/**
 * app/actions/regenerate.ts
 *
 * Next.js Server Action — Single-Asset Regeneration Entry Point.
 *
 * This is the ONLY way client components may trigger regeneration.
 * It runs exclusively on the server, ensuring:
 *   - GEMINI_API_KEY is never exposed to the browser.
 *   - All AI calls happen behind the server boundary.
 *   - Inputs are re-validated on the server (never trust the client).
 *
 * The function accepts plain, serialisable arguments across the boundary
 * and returns a serialisable result — no class instances, no branded IDs.
 */

"use server";

import type { LearningPack, AssetId } from "@/lib/contracts";
import type { GenerationInput } from "@/lib/ai/types";
import {
  regenerateAsset,
  type RegenerationSuccess,
} from "@/lib/regeneration";

// ─────────────────────────────────────────────────────────────────────────────
// INPUT
//    Kept deliberately minimal — only what the server needs to know.
//    The client must never send its own AI config or model secrets.
// ─────────────────────────────────────────────────────────────────────────────

export interface RegenerateActionInput {
  /** The current pack (in-memory state, no persistence yet). */
  pack: LearningPack;
  /** The assetId of the single asset to regenerate. */
  targetAssetId: string;
  /** Teacher-provided reason displayed in version history. */
  reason: string;
  /**
   * Generation context originally built by the source workspace.
   * Re-validated server-side before use.
   */
  generationInput: GenerationInput;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT
//    Serialisable discriminated union — plain objects only.
//    Never include Error instances, branded types, or class instances.
// ─────────────────────────────────────────────────────────────────────────────

export type RegenerateActionResult =
  | {
      status: "success";
      /** The updated pack with the regenerated asset in place. */
      updatedPack: LearningPack;
      /** The version history for the regenerated asset, for UI display. */
      versionHistory: RegenerationSuccess["versionHistory"];
    }
  | {
      status: "failure";
      /** Human-readable error message for display in the review UI. */
      message: string;
      /** Machine-readable error code for programmatic handling. */
      code: string;
    }
  | {
      status: "invalid-input";
      problems: string[];
    };

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTION
// ─────────────────────────────────────────────────────────────────────────────

export async function regenerateAssetAction(
  input: RegenerateActionInput
): Promise<RegenerateActionResult> {
  // ── Server-side input validation ─────────────────────────────────────────
  const problems: string[] = [];

  if (!input.pack || !Array.isArray(input.pack.assets)) {
    problems.push("Invalid pack: missing or malformed asset list.");
  }

  if (!input.targetAssetId || typeof input.targetAssetId !== "string") {
    problems.push("targetAssetId must be a non-empty string.");
  }

  if (
    !input.reason ||
    typeof input.reason !== "string" ||
    input.reason.trim().length === 0
  ) {
    problems.push("A regeneration reason is required.");
  }

  if (
    !input.generationInput?.sourceContent ||
    input.generationInput.sourceContent.trim().length === 0
  ) {
    problems.push("Source content is required for regeneration.");
  }

  if (
    !input.generationInput?.objectives ||
    input.generationInput.objectives.length < 2
  ) {
    problems.push("At least 2 learning objectives are required.");
  }

  if (problems.length > 0) {
    return { status: "invalid-input", problems };
  }

  // ── Delegate to domain service (lib/regeneration) ───────────────────────
  const result = await regenerateAsset({
    pack: input.pack,
    targetAssetId: input.targetAssetId as AssetId,
    reason: input.reason.trim(),
    generationInput: input.generationInput,
    // No `provider` override — production always uses getActiveGenerationProvider()
    // which reads GEMINI_API_KEY from server environment variables.
  });

  // ── Map to serialisable result ───────────────────────────────────────────
  if (result.status === "failure") {
    return {
      status: "failure",
      message: result.error.message,
      code: result.error.code,
    };
  }

  return {
    status: "success",
    updatedPack: result.updatedPack,
    versionHistory: result.versionHistory,
  };
}
