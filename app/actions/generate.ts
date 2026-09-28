/**
 * app/actions/generate.ts
 *
 * Next.js Server Action — Generation Pipeline Entry Point.
 *
 * This is the ONLY place where client components cross the server boundary
 * to trigger generation. It:
 *   1. Re-validates workspace state on the server (trust boundary)
 *   2. Calls the application orchestrator
 *   3. Returns a serialisable result to the client
 *
 * The function is marked "use server" so Next.js compiles it as a Server
 * Action. Client components must import this file, not lib/ai/* directly.
 */

"use server";

import { validateWorkspace, type WorkspaceState } from "@/lib/types";
import { orchestrateGeneration, type OrchestrationResult } from "@/lib/generation/orchestrate";
import type { LearningPack } from "@/lib/contracts";
import type { ValidationResult } from "@/lib/validation";
import type { GenerationError } from "@/lib/ai/types";

// ─────────────────────────────────────────────────────────────────────────────
// SERIALISABLE RESULT
//    Plain objects only — branded ID types become plain strings when
//    serialised through the Server Action boundary.
// ─────────────────────────────────────────────────────────────────────────────

export type GenerateActionResult =
  | {
      status: "success";
      pack: LearningPack;
      validation: ValidationResult;
      sourceId: string;
      sourceVersion: number;
      sourceReference: string;
      generationInput: import("@/lib/ai/types").GenerationInput;
    }
  | {
      status: "failure";
      error: GenerationError;
    }
  | {
      status: "invalid-input";
      problems: string[];
    };

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTION
// ─────────────────────────────────────────────────────────────────────────────

export async function generateLearningPackAction(
  state: WorkspaceState
): Promise<GenerateActionResult> {
  // Server-side re-validation — never trust client-side validation alone.
  const validation = validateWorkspace(state);
  if (!validation.isValid) {
    const problems: string[] = [];
    if (validation.sourceEmpty) problems.push("Source content is empty.");
    if (validation.tooFewObjectives) problems.push("At least 2 learning objectives are required.");
    if (validation.emptyObjectives.length > 0)
      problems.push(`${validation.emptyObjectives.length} objective(s) have empty text.`);
    if (validation.noTargetLevel) problems.push("Target learner level is required.");
    if (validation.noDifficulty) problems.push("Expected difficulty is required.");

    return { status: "invalid-input", problems };
  }

  const result: OrchestrationResult = await orchestrateGeneration(state);
  return result;
}
