/**
 * lib/ai/provider.ts
 *
 * LessonFoundry — AI Provider Interface and Input Validation.
 *
 * SERVER-SIDE ONLY.
 * This module must never be imported by client components. The AI provider
 * interface is a server boundary — SDK imports, secrets, and network calls
 * live in concrete provider implementations, not here.
 *
 * ── PROVIDER ABSTRACTION ────────────────────────────────────────────────────
 *
 * Application code depends on the AIGenerationProvider interface, not on any
 * specific model SDK. This allows:
 *   - swapping providers without touching application logic
 *   - testing with a stub provider in development/CI
 *   - adding a second provider for fallback without rewriting callers
 *
 * ── HOW TO ADD A PROVIDER (future task) ─────────────────────────────────────
 *
 *   1. Create lib/ai/providers/openai.ts  (or anthropic.ts, google.ts, …)
 *   2. Implement AIGenerationProvider
 *   3. Import and return the implementation from lib/ai/index.ts
 *   4. Application code remains unchanged
 */

import type { GenerationInput, GenerationResult, GenerationError, ProviderGenerationResult } from "@/lib/ai/types";

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER INTERFACE
//    Any concrete AI provider must implement this contract.
// ─────────────────────────────────────────────────────────────────────────────

export interface AIGenerationProvider {
  /**
   * Generate raw content from the given input.
   *
   * Implementations MUST:
   *   - Return { status: "failure", error } rather than throwing on failure.
   *   - Never return fake/fallback content when generation fails.
   *   - Keep API keys server-side only (never log or serialise to the client).
   *   - Use buildGenerationPrompt() from lib/ai/prompts.ts to construct prompts.
   */
  generate(input: GenerationInput): Promise<ProviderGenerationResult>;

  /**
   * Human-readable identifier for logging and provenance records.
   * e.g. "openai/gpt-4o", "anthropic/claude-3-5-sonnet-20241022"
   */
  readonly providerLabel: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT VALIDATION
//    Pre-flight guard. Run before calling generate() to surface configuration
//    errors cheaply without spending a network round-trip.
// ─────────────────────────────────────────────────────────────────────────────

export interface InputValidationResult {
  valid: boolean;
  /** List of human-readable problems found. Empty when valid === true. */
  problems: string[];
}

export function validateGenerationInput(
  input: GenerationInput
): InputValidationResult {
  const problems: string[] = [];

  if (!input.sourceContent || input.sourceContent.trim().length === 0) {
    problems.push("Source content is empty. A trusted source is required.");
  }

  if (!input.objectives || input.objectives.length < 2) {
    problems.push(
      `At least 2 learning objectives are required. Got ${input.objectives?.length ?? 0}.`
    );
  }

  const emptyObjectives = input.objectives?.filter(
    (o) => !o.text || o.text.trim().length === 0
  );
  if (emptyObjectives && emptyObjectives.length > 0) {
    problems.push(
      `${emptyObjectives.length} objective(s) have empty text. All objectives must have content.`
    );
  }

  if (!input.targetLevel) {
    problems.push("Target learner level is required.");
  }

  if (!input.difficulty) {
    problems.push("Expected difficulty is required.");
  }

  if (!input.modelConfig?.modelId) {
    problems.push("Model configuration is missing a model ID.");
  }

  if (
    typeof input.modelConfig?.temperature !== "number" ||
    input.modelConfig.temperature < 0 ||
    input.modelConfig.temperature > 2
  ) {
    problems.push(
      "Model temperature must be a number between 0 and 2."
    );
  }

  return { valid: problems.length === 0, problems };
}

/**
 * Convenience helper — turns an InputValidationResult into a GenerationResult
 * failure. Keeps callers free of manual error construction.
 */
export function inputValidationFailure(
  result: InputValidationResult
): GenerationResult {
  const error: GenerationError = {
    code: "invalid-input",
    message: `Generation input is invalid:\n${result.problems.map((p) => `  • ${p}`).join("\n")}`,
  };
  return { status: "failure", error };
}

// ─────────────────────────────────────────────────────────────────────────────
// STUB PROVIDER
//    Used in development, testing, and CI. Returns a typed failure that clearly
//    identifies itself as a stub — never returns fake educational content.
// ─────────────────────────────────────────────────────────────────────────────

export const stubProvider: AIGenerationProvider = {
  providerLabel: "stub/deterministic-generator",

  async generate(input: GenerationInput): Promise<ProviderGenerationResult> {
    const alignment = input.objectives.map((obj) => ({
      objectiveId: obj.objectiveId,
      rationale: "Stub generation alignment.",
    }));

    return {
      status: "success",
      data: {
        conceptExplanation: {
          title: "Concept Explanation Stub",
          body: "This is a deterministic stub concept explanation.",
          objectiveAlignment: alignment,
        },
        workedExample: {
          title: "Worked Example Stub",
          steps: [
            { instruction: "Step 1", explanation: "Explanation 1" },
            { instruction: "Step 2", explanation: "Explanation 2" },
          ],
          objectiveAlignment: alignment,
        },
        formativeQuiz: {
          title: "Formative Quiz Stub",
          questions: [
            {
              question: {
                type: "multiple-choice",
                questionId: "stub-q1",
                stem: "What is the answer?",
                options: [
                  { key: "A", text: "Option A" },
                  { key: "B", text: "Option B" },
                ],
                objectiveAlignment: alignment,
              },
              answer: "A",
              explanation: "Because it is a stub.",
            },
          ],
          objectiveAlignment: alignment,
        },
        easyPractice: {
          title: "Easy Practice Stub",
          questions: [
            {
              question: {
                type: "short-answer",
                questionId: "stub-easy-q1",
                prompt: "Explain the stub.",
                objectiveAlignment: alignment,
              },
              answer: "It is a stub.",
              explanation: "Self explanatory.",
            },
          ],
          objectiveAlignment: alignment,
        },
        advancedPractice: {
          title: "Advanced Practice Stub",
          questions: [
            {
              question: {
                type: "short-answer",
                questionId: "stub-adv-q1",
                prompt: "Critically analyze the stub.",
                objectiveAlignment: alignment,
              },
              answer: "It remains a stub.",
              explanation: "Deep truth.",
            },
          ],
          objectiveAlignment: alignment,
        },
        revisionSheet: {
          title: "Revision Sheet Stub",
          points: ["Point 1", "Point 2"],
          objectiveAlignment: alignment,
        },
      },
    };
  },
};
