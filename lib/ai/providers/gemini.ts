import { GoogleGenAI, Type } from "@google/genai";
import {
  AIGenerationProvider,
  InputValidationResult,
  validateGenerationInput,
  inputValidationFailure,
} from "@/lib/ai/provider";
import type {
  GenerationInput,
  GenerationError,
  ProviderGenerationResult,
  RawProviderOutput,
} from "@/lib/ai/types";
import { buildGenerationPrompt } from "@/lib/ai/prompts";

function getRequiredEnvVar(name: string): string | GenerationError {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    return {
      code: "provider-unavailable",
      message: `Missing required environment variable: ${name}`,
    };
  }
  return value;
}

const objectiveAlignmentSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      objectiveId: { type: Type.STRING },
      rationale: { type: Type.STRING },
    },
    required: ["objectiveId", "rationale"],
  },
};

const rawQuizQuestionSchema = {
  type: Type.OBJECT,
  properties: {
    question: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING },
        questionId: { type: Type.STRING },
        stem: { type: Type.STRING },
        prompt: { type: Type.STRING },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              key: { type: Type.STRING },
              text: { type: Type.STRING },
            },
            required: ["key", "text"],
          },
        },
        objectiveAlignment: objectiveAlignmentSchema,
      },
      required: ["type", "questionId", "objectiveAlignment"],
    },
    answer: { type: Type.STRING },
    explanation: { type: Type.STRING },
  },
  required: ["question", "answer", "explanation"],
};

const rawProviderOutputSchema = {
  type: Type.OBJECT,
  properties: {
    conceptExplanation: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        body: { type: Type.STRING },
        objectiveAlignment: objectiveAlignmentSchema,
      },
      required: ["title", "body", "objectiveAlignment"],
    },
    workedExample: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              instruction: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ["instruction"],
          },
        },
        objectiveAlignment: objectiveAlignmentSchema,
      },
      required: ["title", "steps", "objectiveAlignment"],
    },
    formativeQuiz: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        questions: {
          type: Type.ARRAY,
          items: rawQuizQuestionSchema,
        },
        objectiveAlignment: objectiveAlignmentSchema,
      },
      required: ["title", "questions", "objectiveAlignment"],
    },
    easyPractice: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        questions: {
          type: Type.ARRAY,
          items: rawQuizQuestionSchema,
        },
        objectiveAlignment: objectiveAlignmentSchema,
      },
      required: ["title", "questions", "objectiveAlignment"],
    },
    advancedPractice: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        questions: {
          type: Type.ARRAY,
          items: rawQuizQuestionSchema,
        },
        objectiveAlignment: objectiveAlignmentSchema,
      },
      required: ["title", "questions", "objectiveAlignment"],
    },
    revisionSheet: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        points: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        objectiveAlignment: objectiveAlignmentSchema,
      },
      required: ["title", "points", "objectiveAlignment"],
    },
  },
  required: [
    "conceptExplanation",
    "workedExample",
    "formativeQuiz",
    "easyPractice",
    "advancedPractice",
    "revisionSheet",
  ],
};

export function createGeminiGenerationProvider(): AIGenerationProvider {
  let activeLabel = "google/gemini";

  return {
    get providerLabel() {
      return activeLabel;
    },

    async generate(input: GenerationInput): Promise<ProviderGenerationResult> {
      // Reset label to a generic one at the start of a new run
      activeLabel = "google/gemini";

      const validation = validateGenerationInput(input);
      if (!validation.valid) {
        const failure = inputValidationFailure(validation);
        return {
          status: "failure",
          error: (failure as { status: "failure"; error: GenerationError }).error,
        };
      }

      const apiKeyOrError = getRequiredEnvVar("GEMINI_API_KEY");
      if (typeof apiKeyOrError !== "string") {
        return { status: "failure", error: apiKeyOrError };
      }

      const apiKey = apiKeyOrError;
      const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
      const fallbackModel = process.env.GEMINI_FALLBACK_MODEL;

      const promptParts = buildGenerationPrompt(input);
      const ai = new GoogleGenAI({ apiKey });

      async function attemptCall(targetModel: string): Promise<RawProviderOutput> {
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: promptParts.user,
          config: {
            systemInstruction: promptParts.system,
            temperature: input.modelConfig.temperature,
            responseMimeType: "application/json",
            responseSchema: rawProviderOutputSchema,
          },
        });

        const content = response.text;
        if (!content || content.trim() === "") {
          throw { _isAppError: true, code: "empty-result", message: "The model returned an empty response." };
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          throw {
            _isAppError: true,
            code: "parse-failed",
            message: "The model response could not be parsed as JSON.",
            providerDetail: `Raw content: ${content.slice(0, 200)}`,
          };
        }

        return parsed as RawProviderOutput;
      }

      let attempt = 1;
      const maxAttempts = 3;
      let lastErrorResult: ProviderGenerationResult | null = null;

      while (attempt <= maxAttempts) {
        try {
          const parsed = await attemptCall(model);
          activeLabel = model;
          return { status: "success", data: parsed };
        } catch (err: unknown) {
          if (err && typeof err === "object" && "_isAppError" in err) {
            // Non-transient application error (e.g. empty response, JSON parse failure)
            const appErr = err as any;
            return {
              status: "failure",
              error: {
                code: appErr.code,
                message: appErr.message,
                providerDetail: appErr.providerDetail,
              },
            };
          }

          const mappedError = mapGeminiError(err);
          if (isTransientGeminiError(err)) {
            lastErrorResult = mappedError;
            if (attempt < maxAttempts) {
              const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 200;
              await new Promise((resolve) => setTimeout(resolve, delay));
              attempt++;
              continue;
            } else {
              break; // Exhausted retries
            }
          } else {
            // Non-transient error (e.g. 401, 403, 400), do not retry and do not fallback
            return mappedError;
          }
        }
      }

      // If we got here, primary model exhausted its transient retries.
      if (fallbackModel && lastErrorResult) {
        try {
          const parsed = await attemptCall(fallbackModel);
          activeLabel = fallbackModel;
          return { status: "success", data: parsed };
        } catch (err: unknown) {
          if (err && typeof err === "object" && "_isAppError" in err) {
            const appErr = err as any;
            return {
              status: "failure",
              error: {
                code: appErr.code,
                message: appErr.message,
                providerDetail: appErr.providerDetail,
              },
            };
          }
          return mapGeminiError(err);
        }
      }

      return lastErrorResult || {
        status: "failure",
        error: {
          code: "generation-failed",
          message: "An unexpected error occurred during generation with Gemini.",
        },
      };
    },
  };
}

function isTransientGeminiError(err: unknown): boolean {
  const errorObj = (err || {}) as Record<string, unknown>;
  const message = typeof errorObj.message === "string" ? errorObj.message.toLowerCase() : "";
  const status = typeof errorObj.status === "number" ? errorObj.status : (typeof errorObj.statusCode === "number" ? errorObj.statusCode : 0);

  if (status === 503 || status === 429 || status === 408 || (status >= 500 && status < 600)) {
    return true;
  }
  
  if (
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("exhausted") ||
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("unavailable")
  ) {
    return true;
  }

  return false;
}

function mapGeminiError(err: unknown): ProviderGenerationResult {
  const errorObj = err as Record<string, unknown>;
  const message = typeof errorObj.message === "string" ? errorObj.message : "";
  const status = typeof errorObj.status === "number" ? errorObj.status : (typeof errorObj.statusCode === "number" ? errorObj.statusCode : 0);

  if (status === 401 || status === 403 || message.toLowerCase().includes("api key") || message.toLowerCase().includes("authentication")) {
    return {
      status: "failure",
      error: {
        code: "provider-unavailable",
        message: "Gemini API authentication failed. Check that GEMINI_API_KEY in .env.local is correct.",
        providerDetail: message,
      },
    };
  }

  if (status === 429 || message.toLowerCase().includes("quota") || message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("exhausted")) {
    return {
      status: "failure",
      error: {
        code: "rate-limited",
        message: "Gemini API rate limit or quota exceeded. Please try again later.",
        providerDetail: message,
      },
    };
  }

  if (status >= 500 || message.toLowerCase().includes("fetch") || message.toLowerCase().includes("network") || message.toLowerCase().includes("timeout")) {
    return {
      status: "failure",
      error: {
        code: "provider-unavailable",
        message: "Could not reach the Gemini API or service is unavailable. Check your internet connection or try again later.",
        providerDetail: message,
      },
    };
  }

  return {
    status: "failure",
    error: {
      code: "generation-failed",
      message: "An unexpected error occurred during generation with Gemini.",
      providerDetail: message,
    },
  };
}
