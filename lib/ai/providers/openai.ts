/**
 * lib/ai/providers/openai.ts
 *
 * LessonFoundry — Concrete OpenAI provider implementation.
 *
 * SERVER-SIDE ONLY.
 * This file imports the OpenAI SDK. It must NEVER be imported by client
 * components, pages, or any module with "use client". If you see a bundler
 * error about this file in the client bundle, a client component is
 * accidentally importing it — fix the import chain, not this file.
 *
 * Security rules enforced here:
 *   - API key is read from process.env.OPENAI_API_KEY (server-side only).
 *   - API key is NEVER logged, serialised, or returned in any result object.
 *   - providerDetail in GenerationError is safe for server logs only.
 *   - No NEXT_PUBLIC_ prefix is used anywhere.
 */

import OpenAI, {
  APIConnectionError,
  AuthenticationError,
  RateLimitError,
  APIError,
} from "openai";

import type { AIGenerationProvider } from "@/lib/ai/provider";
import { validateGenerationInput, inputValidationFailure } from "@/lib/ai/provider";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import type { GenerationInput, GenerationError, ProofResult } from "@/lib/ai/types";
import {
  PROOF_OF_CONNECTION_SCHEMA,
  isProofOfConnectionResponse,
} from "@/lib/ai/proof-schema";

// ─────────────────────────────────────────────────────────────────────────────
// TASK 10 PROOF PROVIDER
// Implements AIGenerationProvider for the proof-of-connection run.
// Returns ProofResult instead of the full GenerationResult/LearningPack.
// When the full pack generator is built (future task), this will be replaced
// by a provider that returns a complete LearningPack.
// ─────────────────────────────────────────────────────────────────────────────

export interface OpenAIProofProvider {
  readonly providerLabel: string;
  verify(input: GenerationInput): Promise<ProofResult>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT CHECKS
// ─────────────────────────────────────────────────────────────────────────────

function getRequiredEnvVar(name: string): string | GenerationError {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    return {
      code: "provider-unavailable",
      message: `Required environment variable ${name} is not set. Add it to .env.local.`,
    };
  }
  return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROOF-OF-CONNECTION PROMPT
// Extends the base prompt builder with Task 10 specific instructions.
// ─────────────────────────────────────────────────────────────────────────────

function buildProofSystemPrompt(): string {
  return (
    buildSystemPrompt() +
    `
## Task 10 — Proof of connection

You are performing a connectivity and grounding verification, NOT generating a full learning pack.

Respond with ONLY a valid JSON object matching this exact schema — no markdown, no explanation, no text outside the JSON:

{
  "status": "ok" | "insufficient-source",
  "summary": "<1–3 sentences grounded only in the source>",
  "objectiveCoverage": [
    {
      "objectiveId": "<exact ID from the request>",
      "covered": true | false,
      "evidence": "<phrase from source or gap explanation>"
    }
  ]
}

Rules:
- "status" is "ok" if the source contains enough to address ALL objectives, "insufficient-source" otherwise.
- "summary" must reference only content explicitly in the source. Do not invent details.
- Every objective in the request must appear exactly once in objectiveCoverage.
- "evidence" must be a direct excerpt or paraphrase from the source, or a clear gap explanation.
- Do not add any fields not shown in the schema.
`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export function createOpenAIProofProvider(): OpenAIProofProvider {
  return {
    providerLabel: "openai/proof-provider",

    async verify(input: GenerationInput): Promise<ProofResult> {
      // 1. Pre-flight: validate input
      const validation = validateGenerationInput(input);
      if (!validation.valid) {
        const failure = inputValidationFailure(validation);
        // inputValidationFailure returns GenerationResult; map to ProofResult
        return {
          status: "failure",
          error: (failure as { status: "failure"; error: GenerationError }).error,
        };
      }

      // 2. Pre-flight: check environment variables
      const apiKeyOrError = getRequiredEnvVar("OPENAI_API_KEY");
      if (typeof apiKeyOrError !== "string") {
        return { status: "failure", error: apiKeyOrError };
      }

      const modelOrError = getRequiredEnvVar("OPENAI_MODEL");
      if (typeof modelOrError !== "string") {
        return { status: "failure", error: modelOrError };
      }

      const apiKey = apiKeyOrError;
      const model = modelOrError;

      // 3. Build prompt
      const system = buildProofSystemPrompt();
      const user = buildUserPrompt(input);

      // 4. Instantiate client — key is local to this scope, never returned
      const client = new OpenAI({ apiKey });

      // 5. Send request with structured output
      try {
        const response = await client.chat.completions.create({
          model,
          temperature: input.modelConfig.temperature,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "proof_of_connection",
              strict: true,
              schema: PROOF_OF_CONNECTION_SCHEMA,
            },
          },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        });

        // 6. Extract content
        const content = response.choices[0]?.message?.content;
        if (!content || content.trim() === "") {
          return {
            status: "failure",
            error: {
              code: "empty-result",
              message:
                "The model returned an empty response. This may indicate a content filtering block or a model configuration issue.",
            },
          };
        }

        // 7. Parse JSON
        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          return {
            status: "failure",
            error: {
              code: "parse-failed",
              message:
                "The model response could not be parsed as JSON. The structured output contract may have been violated.",
              providerDetail: `Raw content (server log only): ${content.slice(0, 200)}`,
            },
          };
        }

        // 8. Type-guard validation
        if (!isProofOfConnectionResponse(parsed)) {
          return {
            status: "failure",
            error: {
              code: "parse-failed",
              message:
                "The model returned JSON but it did not match the expected proof-of-connection schema.",
              providerDetail: `Parsed shape (server log only): ${JSON.stringify(parsed).slice(0, 300)}`,
            },
          };
        }

        return { status: "success", proof: parsed };
      } catch (err: unknown) {
        return mapOpenAIError(err);
      }
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR MAPPING
// Maps SDK-specific error types to typed GenerationError values.
// providerDetail is safe for server-side logging only — never sent to client.
// ─────────────────────────────────────────────────────────────────────────────

function mapOpenAIError(err: unknown): ProofResult {
  // Authentication failure (401)
  if (err instanceof AuthenticationError) {
    return {
      status: "failure",
      error: {
        code: "provider-unavailable",
        message:
          "OpenAI authentication failed. Check that OPENAI_API_KEY in .env.local is correct and active.",
        providerDetail: `AuthenticationError status=${err.status}`,
      },
    };
  }

  // Rate limit (429)
  if (err instanceof RateLimitError) {
    return {
      status: "failure",
      error: {
        code: "rate-limited",
        message:
          "OpenAI rate limit exceeded. Wait a moment and try again, or upgrade your API plan.",
        providerDetail: `RateLimitError status=${err.status}`,
      },
    };
  }

  // Network / connection failure
  if (err instanceof APIConnectionError) {
    return {
      status: "failure",
      error: {
        code: "provider-unavailable",
        message:
          "Could not reach the OpenAI API. Check your internet connection and try again.",
        providerDetail: `APIConnectionError: ${err.message}`,
      },
    };
  }

  // General API error (covers 5xx, 4xx not caught above)
  if (err instanceof APIError) {
    return {
      status: "failure",
      error: {
        code: "generation-failed",
        message: `OpenAI returned an error (status ${err.status}). The request could not be completed.`,
        providerDetail: `APIError status=${err.status} message=${err.message}`,
      },
    };
  }

  // Unknown error
  const message =
    err instanceof Error ? err.message : "An unknown error occurred.";
  return {
    status: "failure",
    error: {
      code: "generation-failed",
      message: "An unexpected error occurred during generation.",
      providerDetail: `Unknown error: ${message}`,
    },
  };
}
