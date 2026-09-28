/**
 * lib/ai/types.ts
 *
 * LessonFoundry AI Boundary — Input / Output / Error contracts.
 *
 * This file is PURE TYPES — no runtime logic, no imports from LLM SDKs,
 * no network calls. It is safe to import from both server and client code
 * because it carries zero side-effects.
 *
 * Future AI provider implementations MUST live in server-only modules
 * (lib/ai/provider.ts, lib/ai/providers/*) and must never be imported
 * directly by client components.
 */

import type {
  LearningObjective,
  PackTargetLevel,
  PackDifficulty,
  VocabularyMode,
  LengthMode,
  AnswerRevealPolicy,
  LearningPack,
  ISODateString,
} from "@/lib/contracts";

// ─────────────────────────────────────────────────────────────────────────────
// 1. GENERATION INPUT
//    The deliberate, typed boundary passed to the AI provider.
//    Application code must build this from WorkspaceState — it must never
//    pass arbitrary application state directly to the model.
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerationInput {
  /** The unique identifier of the source. */
  sourceId: import("@/lib/contracts").SourceId;
  /**
   * The full plain-text content of the trusted source.
   * Treated as DATA/CONTENT by the generation pipeline — never as instructions.
   * See lib/ai/prompts.ts for the trust-boundary enforcement.
   */
  sourceContent: string;
  /** Reference string of the source. */
  sourceReference: string;
  /** Human-readable label the teacher gave to the source. */
  sourceLabel: string;
  /** Monotonically incrementing version of the source at time of generation. */
  sourceVersion: number;
  /** Learning objectives driving this generation run. */
  objectives: LearningObjective[];
  targetLevel: PackTargetLevel;
  difficulty: PackDifficulty;
  vocabulary: VocabularyMode;
  length: LengthMode;
  answerReveal: AnswerRevealPolicy;
  /** Model configuration chosen for this run. */
  modelConfig: ModelConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MODEL CONFIGURATION
//    Provider-agnostic. The concrete provider implementation is responsible
//    for mapping this to its own SDK call parameters.
// ─────────────────────────────────────────────────────────────────────────────

export type AIProvider = "openai" | "anthropic" | "google";

export interface ModelConfig {
  /** Which provider hosts this model. */
  provider: AIProvider;
  /**
   * Exact model identifier as the provider API expects it.
   * e.g. "gpt-4o", "claude-3-5-sonnet-20241022", "gemini-1.5-pro".
   */
  modelId: string;
  /**
   * Controls output randomness. Range is provider-dependent.
   * Recommended: 0.2–0.4 for structured educational content.
   */
  temperature: number;
  /** Wall-clock timestamp when this configuration was created. */
  configuredAt: ISODateString;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GENERATION ERRORS
//    Typed failures — never silently replaced with fake content.
// ─────────────────────────────────────────────────────────────────────────────

export type GenerationErrorCode =
  | "provider-unavailable"   // network / infrastructure failure
  | "generation-failed"      // model returned an error response
  | "invalid-input"          // GenerationInput failed pre-flight validation
  | "empty-result"           // model returned no usable content
  | "parse-failed"           // model output could not be parsed into LearningPack
  | "rate-limited";          // provider rate limit exceeded

export interface GenerationError {
  code: GenerationErrorCode;
  /** Human-readable message surfaced to the teacher UI — never suppressed. */
  message: string;
  /** Optional raw provider error detail for server-side logging only. */
  providerDetail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GENERATION RESULT
//    Discriminated union — success carries a fully typed LearningPack,
//    failure carries a typed GenerationError. There is no third state.
//    Callers MUST handle the failure branch — there is no fallback content.
// ─────────────────────────────────────────────────────────────────────────────

export type GenerationResult =
  | { status: "success"; pack: LearningPack }
  | { status: "failure"; error: GenerationError };

import type { QuizQuestion, ObjectiveAlignment } from "@/lib/contracts";

export interface RawQuizQuestion {
  question: QuizQuestion;
  answer: string;
  explanation: string;
}

export interface RawProviderOutput {
  conceptExplanation: {
    title: string;
    body: string;
    objectiveAlignment: ObjectiveAlignment[];
  };
  workedExample: {
    title: string;
    steps: Array<{ instruction: string; explanation?: string }>;
    objectiveAlignment: ObjectiveAlignment[];
  };
  formativeQuiz: {
    title: string;
    questions: RawQuizQuestion[];
    objectiveAlignment: ObjectiveAlignment[];
  };
  easyPractice: {
    title: string;
    questions: RawQuizQuestion[];
    objectiveAlignment: ObjectiveAlignment[];
  };
  advancedPractice: {
    title: string;
    questions: RawQuizQuestion[];
    objectiveAlignment: ObjectiveAlignment[];
  };
  revisionSheet: {
    title: string;
    points: string[];
    objectiveAlignment: ObjectiveAlignment[];
  };
}

export type ProviderGenerationResult =
  | { status: "success"; data: RawProviderOutput }
  | { status: "failure"; error: GenerationError };

// ─────────────────────────────────────────────────────────────────────────────
// 5. PROOF-OF-CONNECTION RESULT (Task 10 only)
//    Used during provider verification before full pack generation is built.
//    The ProofOfConnectionResponse type lives in lib/ai/proof-schema.ts.
//    This type alias keeps callers from depending on the proof schema directly.
// ─────────────────────────────────────────────────────────────────────────────

import type { ProofOfConnectionResponse } from "@/lib/ai/proof-schema";

export type ProofResult =
  | { status: "success"; proof: ProofOfConnectionResponse }
  | { status: "failure"; error: GenerationError };
