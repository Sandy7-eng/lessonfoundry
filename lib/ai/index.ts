/**
 * lib/ai/index.ts
 *
 * LessonFoundry AI Layer — Public Entry Point.
 *
 * SERVER-SIDE ONLY.
 * Future API routes and Server Actions import from here, not from individual
 * files. Client components must never import this module.
 *
 * Provider swap: replace the activeProvider export here. No other file changes.
 */

// ── Types (safe to import anywhere) ──────────────────────────────────────────
export type {
  GenerationInput,
  GenerationResult,
  GenerationError,
  ModelConfig,
  AIProvider,
  ProofResult,
} from "@/lib/ai/types";

// ── Provider interface and validation (server-only) ───────────────────────────
export type { AIGenerationProvider, InputValidationResult } from "@/lib/ai/provider";
export {
  validateGenerationInput,
  inputValidationFailure,
  stubProvider,
} from "@/lib/ai/provider";

// ── Prompt builder (server-only) ──────────────────────────────────────────────
export {
  buildGenerationPrompt,
  buildSystemPrompt,
  buildUserPrompt,
} from "@/lib/ai/prompts";

// ── Proof-of-connection schema (server-only) ──────────────────────────────────
export type {
  ProofOfConnectionResponse,
  ObjectiveCoverageEntry,
} from "@/lib/ai/proof-schema";

// ── OpenAI provider (server-only) ─────────────────────────────────────────────
export { createOpenAIProofProvider } from "@/lib/ai/providers/openai";

// ── Verification helper (server-only) ─────────────────────────────────────────
export { runProofOfConnection } from "@/lib/ai/verify";

// ── Generator layer (server-only) ─────────────────────────────────────────────
export { generateLearningPack } from "@/lib/ai/generator";

import { createGeminiGenerationProvider } from "@/lib/ai/providers/gemini";
export { createGeminiGenerationProvider };

import { stubProvider } from "@/lib/ai/provider";

/**
 * Returns the active AI generation provider.
 * Uses the deterministic stub if USE_STUB_PROVIDER="true", otherwise uses Gemini.
 */
export function getActiveGenerationProvider(): import("@/lib/ai/provider").AIGenerationProvider {
  if (process.env.USE_STUB_PROVIDER === "true") {
    return stubProvider;
  }
  return createGeminiGenerationProvider();
}

/**
 * The active provider label for logging and provenance records.
 * Swap this when a full pack provider is implemented.
 */
export const ACTIVE_PROVIDER_LABEL = "google/gemini";
