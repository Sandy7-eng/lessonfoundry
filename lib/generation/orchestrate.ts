/**
 * lib/generation/orchestrate.ts
 *
 * Application-level orchestration for the LessonFoundry generation pipeline.
 *
 * This module is the single entry point for the full vertical slice:
 *
 *   WorkspaceState
 *     → createSource()
 *     → GenerationInput
 *     → generateLearningPack()
 *     → validateLearningPack()
 *     → OrchestrationResult
 *
 * SERVER-SIDE ONLY. Never import from client components.
 * Client components call the Server Action in app/actions/generate.ts instead.
 *
 * Architectural position:
 *   UI → Server Action → orchestrate() → domain services → AI provider
 */

import { createSource } from "@/lib/source";
import { generateLearningPack } from "@/lib/ai/generator";
import { validateLearningPack, type ValidationResult } from "@/lib/validation";
import type { LearningPack, SourceId, ObjectiveId } from "@/lib/contracts";
import type { GenerationInput, GenerationError } from "@/lib/ai/types";
import type { WorkspaceState } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// RESULT TYPE
// ─────────────────────────────────────────────────────────────────────────────

export type OrchestrationResult =
  | {
      status: "success";
      pack: LearningPack;
      validation: ValidationResult;
      sourceId: string;
      sourceVersion: number;
      sourceReference: string;
    }
  | {
      status: "failure";
      error: GenerationError;
    };

// ─────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the complete generation pipeline from workspace state to a validated
 * LearningPack. The caller is responsible for validating WorkspaceState
 * before calling this function (i.e. validateWorkspace() returns isValid:true).
 *
 * Does NOT automatically approve content. The pack remains "draft".
 * Does NOT call OpenAI. Uses the deterministic stub provider.
 */
export async function orchestrateGeneration(
  state: WorkspaceState
): Promise<OrchestrationResult> {
  // ── Step 1: Create TrustedSource ──────────────────────────────────────────
  const source = createSource(
    "Teacher-provided source", // label
    state.source,
    "teacher-provided-source" // stable local reference — no external URL needed
  );

  // ── Step 2: Build GenerationInput ─────────────────────────────────────────
  // Map WorkspaceState Objectives (lib/types) → LearningObjective (lib/contracts)
  const objectives = state.objectives.map((obj) => ({
    objectiveId: obj.id as ObjectiveId,
    text: obj.text,
  }));

  const generationInput: GenerationInput = {
    sourceId: source.sourceId as SourceId,
    sourceContent: source.content,
    sourceReference: source.sourceReference,
    sourceLabel: source.label,
    sourceVersion: source.sourceVersion,
    objectives,
    targetLevel: state.targetLevel as GenerationInput["targetLevel"],
    difficulty: state.difficulty as GenerationInput["difficulty"],
    vocabulary: state.constraints.vocabulary,
    length: state.constraints.length,
    answerReveal: state.constraints.answerReveal,
    modelConfig: {
      provider: "openai", // value used for provenance label only — stub doesn't connect
      modelId: "stub/deterministic-generator",
      temperature: 0.2,
      configuredAt: new Date().toISOString(),
    },
  };

  // ── Step 3: Generate ──────────────────────────────────────────────────────
  const generationResult = await generateLearningPack(generationInput);

  if (generationResult.status === "failure") {
    return { status: "failure", error: generationResult.error };
  }

  // ── Step 4: Validate ──────────────────────────────────────────────────────
  // Run immediately after generation. Do NOT silently modify the pack.
  const validation = validateLearningPack(generationResult.pack);

  // ── Step 5: Return combined result ────────────────────────────────────────
  return {
    status: "success",
    pack: generationResult.pack,
    validation,
    sourceId: source.sourceId,
    sourceVersion: source.sourceVersion,
    sourceReference: source.sourceReference,
  };
}
