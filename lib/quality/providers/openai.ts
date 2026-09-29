/**
 * lib/quality/providers/openai.ts
 *
 * LessonFoundry — Concrete OpenAI quality verifier implementation.
 *
 * SERVER-SIDE ONLY.
 * Never imported by client components.
 */

import OpenAI, {
  APIConnectionError,
  AuthenticationError,
  RateLimitError,
  APIError,
} from "openai";

import type { GenerationError } from "@/lib/ai/types";
import type {
  AIQualityVerifier,
  VerificationInput,
  VerificationResult,
} from "../types";
import {
  GROUNDING_VERIFICATION_SCHEMA,
  isRawGroundingResponse,
} from "../types";
import { convertGroundingResponse } from "../verifier";
import {
  buildVerificationSystemPrompt,
  buildVerificationUserPrompt,
} from "../prompts";

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

export function createOpenAIQualityVerifier(): AIQualityVerifier {
  return {
    verifierLabel: "openai/quality-verifier",

    async verify(input: VerificationInput): Promise<VerificationResult> {
      // 1. Pre-flight checks
      const apiKeyOrError = getRequiredEnvVar("OPENAI_API_KEY");
      if (typeof apiKeyOrError !== "string") {
        return {
          status: "not-evaluated",
          reason: "missing-api-key",
          message: apiKeyOrError.message,
        };
      }

      const modelOrError = getRequiredEnvVar("OPENAI_MODEL");
      if (typeof modelOrError !== "string") {
        return {
          status: "not-evaluated",
          reason: "provider-unavailable",
          message: modelOrError.message,
        };
      }

      const apiKey = apiKeyOrError;
      const model = modelOrError;

      const system = buildVerificationSystemPrompt();
      const user = buildVerificationUserPrompt(
        input.pack,
        input.sourceContent,
        input.objectives
      );

      const client = new OpenAI({ apiKey });

      try {
        const response = await client.chat.completions.create({
          model,
          temperature: 0.0, // Verification requires deterministic analysis
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "grounding_verification",
              strict: true,
              schema: GROUNDING_VERIFICATION_SCHEMA,
            },
          },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content || content.trim() === "") {
          return {
            status: "not-evaluated",
            reason: "parse-failed",
            message: "The model returned an empty response.",
          };
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          return {
            status: "not-evaluated",
            reason: "parse-failed",
            message: "The model response could not be parsed as JSON.",
          };
        }

        if (!isRawGroundingResponse(parsed)) {
          return {
            status: "not-evaluated",
            reason: "parse-failed",
            message:
              "The model returned JSON but it did not match the expected schema.",
          };
        }

        return convertGroundingResponse(parsed, input.pack);
      } catch (err: unknown) {
        return mapOpenAIError(err);
      }
    },
  };
}

function mapOpenAIError(err: unknown): VerificationResult {
  if (err instanceof AuthenticationError) {
    return {
      status: "not-evaluated",
      reason: "missing-api-key", // or provider-unavailable
      message:
        "OpenAI authentication failed. Check that OPENAI_API_KEY in .env.local is correct.",
    };
  }

  if (err instanceof RateLimitError) {
    return {
      status: "not-evaluated",
      reason: "rate-limited",
      message:
        "OpenAI rate limit exceeded. Wait a moment and try again, or upgrade your API plan.",
    };
  }

  if (err instanceof APIConnectionError) {
    return {
      status: "not-evaluated",
      reason: "provider-unavailable",
      message:
        "Could not reach the OpenAI API. Check your internet connection and try again.",
    };
  }

  if (err instanceof APIError && (err.status === 408 || err.status === 504)) {
    return {
      status: "not-evaluated",
      reason: "timeout",
      message: "The request to the OpenAI API timed out.",
    };
  }

  if (err instanceof APIError) {
    return {
      status: "not-evaluated",
      reason: "provider-unavailable",
      message: `OpenAI returned an error (status ${err.status}). The request could not be completed.`,
    };
  }

  return {
    status: "not-evaluated",
    reason: "provider-unavailable",
    message: "An unexpected error occurred during AI quality verification.",
  };
}
