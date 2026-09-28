/**
 * lib/ai/verify.ts
 *
 * LessonFoundry — Server-side generation verification helper.
 *
 * SERVER-SIDE ONLY. Not a public API endpoint.
 * For development use only — call from a Next.js Server Action or a local
 * script. Never import this from client components.
 *
 * Usage (from a Next.js Server Action, future task):
 *
 *   import { runProofOfConnection } from "@/lib/ai/verify";
 *   const result = await runProofOfConnection(input);
 */

import type { GenerationInput } from "@/lib/ai/types";
import type { ProofResult } from "@/lib/ai/types";
import { createOpenAIProofProvider } from "@/lib/ai/providers/openai";

/**
 * Runs a proof-of-connection request against the configured OpenAI provider.
 *
 * Returns ProofResult:
 *   { status: "success", proof: ProofOfConnectionResponse }
 *   { status: "failure", error: GenerationError }
 *
 * Failures are typed and explicit — never returns fake content.
 */
export async function runProofOfConnection(
  input: GenerationInput
): Promise<ProofResult> {
  const provider = createOpenAIProofProvider();
  return provider.verify(input);
}
