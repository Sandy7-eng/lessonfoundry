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

import { createOpenAIQualityVerifier } from "@/lib/quality/providers/openai";
import { verifyLearningPackGrounding } from "@/lib/quality/verifier";
import type { AIQualityVerifier } from "@/lib/quality/types";
import type { QualityId } from "@/lib/contracts";

export type OrchestrationResult =
  | {
      status: "success";
      pack: LearningPack;
      validation: ValidationResult;
      sourceId: string;
      sourceVersion: number;
      sourceReference: string;
      generationInput: GenerationInput;
      aiVerificationStatus?: "verified" | "issues-found" | "not-evaluated";
      aiVerificationReason?: string;
    }
  | {
      status: "failure";
      error: GenerationError;
    };

export async function orchestrateGeneration(
  state: WorkspaceState,
  options?: { verifier?: AIQualityVerifier }
): Promise<OrchestrationResult> {
  const source = createSource(
    "Teacher-provided source",
    state.source,
    "teacher-provided-source"
  );

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
      provider: "openai",
      modelId: "stub/deterministic-generator",
      temperature: 0.2,
      configuredAt: new Date().toISOString(),
    },
  };

  const generationResult = await generateLearningPack(generationInput);

  if (generationResult.status === "failure") {
    return { status: "failure", error: generationResult.error };
  }

  const validation = validateLearningPack(generationResult.pack);

  // AI Verification (Task 21B)
  const verifier = options?.verifier ?? createOpenAIQualityVerifier();
  const verificationResult = await verifyLearningPackGrounding(
    {
      pack: generationResult.pack,
      sourceContent: source.content,
      objectives: generationInput.objectives,
    },
    verifier
  );

  if (verificationResult.status === "issues-found") {
    validation.issues.push(...verificationResult.issues);
  } else if (verificationResult.status === "not-evaluated") {
    validation.issues.push({
      issueId: crypto.randomUUID() as QualityId,
      issueType: "unsupported-claim",
      severity: "warning",
      affectedAssetId: generationResult.pack.assets[0]?.assetId,
      message: `AI verification: NOT EVALUATED — ${verificationResult.reason}. ${verificationResult.message}`,
    });
  }

  return {
    status: "success",
    pack: generationResult.pack,
    validation,
    sourceId: source.sourceId,
    sourceVersion: source.sourceVersion,
    sourceReference: source.sourceReference,
    generationInput,
    aiVerificationStatus: verificationResult.status,
    aiVerificationReason:
      verificationResult.status === "not-evaluated" ? verificationResult.reason : undefined,
  };
}
