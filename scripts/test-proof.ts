/**
 * scripts/test-proof.ts
 *
 * Task 11 — One-shot live verification script.
 * Run with: npx tsx scripts/test-proof.ts
 *
 * SERVER-SIDE ONLY. Not a production endpoint.
 * Loads .env.local via dotenv-style reading for standalone execution.
 * Never logs or prints the API key.
 */

// Environment loaded via --env-file flag

import { runProofOfConnection } from "../lib/ai/verify";
import type { GenerationInput } from "../lib/ai/types";
import type { ObjectiveId } from "../lib/contracts";

// ─── Test input (exact values from Task 11 spec) ─────────────────────────────

const testInput: GenerationInput = {
  sourceContent:
    "Photosynthesis is the process by which green plants use light energy to convert carbon dioxide and water into glucose, releasing oxygen as a byproduct.",
  sourceLabel: "Photosynthesis — Task 11 Test",
  sourceVersion: 1,
  objectives: [
    {
      objectiveId: "obj-test-01" as ObjectiveId,
      text: "Explain what photosynthesis is.",
    },
    {
      objectiveId: "obj-test-02" as ObjectiveId,
      text: "Identify the main inputs and output of photosynthesis.",
    },
  ],
  targetLevel: "beginner",
  difficulty: "easy",
  vocabulary: "standard",
  length: "concise",
  answerReveal: "include-key",
  modelConfig: {
    provider: "openai",
    modelId: process.env.OPENAI_MODEL || "(not set)",
    temperature: 0.3,
    configuredAt: new Date().toISOString(),
  },
};

// ─── Run ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n═══ LessonFoundry — Task 11: Live AI Proof Test ═══\n");

  // 1. Environment check (print presence only, never values)
  const keySet = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
  const modelSet = !!(process.env.OPENAI_MODEL && process.env.OPENAI_MODEL.trim());

  console.log(`OPENAI_API_KEY set: ${keySet}`);
  console.log(`OPENAI_MODEL set:   ${modelSet}`);
  if (modelSet) {
    console.log(`OPENAI_MODEL value: ${process.env.OPENAI_MODEL}`);
  }

  if (!keySet || !modelSet) {
    console.log("\n✗ Missing environment variables. Cannot run live test.");
    console.log("  Add OPENAI_API_KEY and OPENAI_MODEL to .env.local");
    console.log("\n── Verifying failure-path typing ──");

    const result = await runProofOfConnection(testInput);
    console.log(`  Result status: ${result.status}`);
    if (result.status === "failure") {
      console.log(`  Error code: ${result.error.code}`);
      console.log(`  Error message: ${result.error.message}`);
      console.log("  ✓ Failure path returns typed GenerationError as expected.");
    }

    console.log("\n═══ Test complete (no live call made) ═══\n");
    return;
  }

  // 2. Run ONE live request
  console.log("\n── Sending ONE live request ──\n");
  const start = Date.now();
  const result = await runProofOfConnection(testInput);
  const elapsed = Date.now() - start;

  console.log(`Response time: ${elapsed}ms`);
  console.log(`Result status: ${result.status}`);

  if (result.status === "failure") {
    console.log(`\n✗ FAILURE`);
    console.log(`  Error code: ${result.error.code}`);
    console.log(`  Error message: ${result.error.message}`);
    // providerDetail is server-log safe
    if (result.error.providerDetail) {
      console.log(`  Provider detail: ${result.error.providerDetail}`);
    }
    console.log("\n═══ Test complete (live call failed) ═══\n");
    return;
  }

  // 3. Success — inspect the proof
  const { proof } = result;
  console.log(`\n✓ SUCCESS`);
  console.log(`\n── Proof of Connection Response ──\n`);
  console.log(`Status:  ${proof.status}`);
  console.log(`Summary: ${proof.summary}`);
  console.log(`\nObjective coverage:`);
  for (const entry of proof.objectiveCoverage) {
    console.log(`  [${entry.objectiveId}] covered=${entry.covered}`);
    console.log(`    evidence: ${entry.evidence}`);
  }

  // 4. Validation checks
  console.log(`\n── Validation ──\n`);
  const hasObj1 = proof.objectiveCoverage.some((e) => e.objectiveId === "obj-test-01");
  const hasObj2 = proof.objectiveCoverage.some((e) => e.objectiveId === "obj-test-02");
  console.log(`Both objective IDs present: ${hasObj1 && hasObj2 ? "PASS" : "FAIL"}`);
  console.log(`Summary is non-empty:       ${proof.summary.length > 0 ? "PASS" : "FAIL"}`);
  console.log(`Status is valid value:      ${["ok", "insufficient-source"].includes(proof.status) ? "PASS" : "FAIL"}`);

  console.log("\n═══ Test complete (live call succeeded) ═══\n");
}

main().catch((err) => {
  console.error("Unhandled error in test script:", err);
  process.exit(1);
});
