/**
 * scripts/test-task19.ts
 *
 * LessonFoundry — Task 19: Teacher Learning Pack Review Workspace Regeneration
 *
 * Tests the specific requirement that regeneration outcomes inside the Review
 * Workspace correctly increment versions, preserve history, and reset status to draft.
 */

import { generateLearningPack } from "../lib/ai/generator";
import type { GenerationInput } from "../lib/ai/types";
import type { ObjectiveId, LearningPack } from "../lib/contracts";
import { regenerateAsset, createInitialVersionHistories } from "../lib/regeneration";

let allPassed = true;
let testCount = 0;

function assert(condition: boolean, testName: string): void {
  testCount++;
  if (condition) {
    console.log(`  PASS  ${testName}`);
  } else {
    console.log(`  FAIL  ${testName}`);
    allPassed = false;
  }
}

function buildInput(): GenerationInput {
  return {
    sourceId: "src-task19-test" as any,
    sourceContent: "Test content.",
    sourceReference: "ref",
    sourceLabel: "Test",
    sourceVersion: 1,
    objectives: [
      { objectiveId: "obj-1" as ObjectiveId, text: "Obj 1" },
      { objectiveId: "obj-2" as ObjectiveId, text: "Obj 2" },
    ],
    targetLevel: "beginner",
    difficulty: "easy",
    vocabulary: "standard",
    length: "standard",
    answerReveal: "hide",
    modelConfig: {
      provider: "openai",
      modelId: "stub/deterministic-generator",
      temperature: 0.2,
      configuredAt: new Date().toISOString(),
    },
  };
}

async function main() {
  console.log("\n═══ LessonFoundry — Task 19: UI Regeneration Tests ═══\n");

  const input = buildInput();
  const packResult = await generateLearningPack(input);
  if (packResult.status !== "success") throw new Error("Gen failed");
  const pack = packResult.pack;

  // Initialize UI-like state
  let histories = createInitialVersionHistories(pack);
  
  const targetAsset = pack.assets[0];
  const targetHistory = histories.find(h => h.assetId === targetAsset.assetId);

  // 1. Initial State
  assert(targetHistory?.entries.length === 1, "Initial history has 1 entry");
  assert(targetAsset.reviewStatus === "draft", "Asset starts as draft");

  // 2. Regenerate
  const regenResult = await regenerateAsset({
    pack,
    targetAssetId: targetAsset.assetId,
    reason: "Teacher requested regeneration",
    generationInput: input
  });

  if (regenResult.status === "failure") throw new Error("Regen failed");

  // 3. Version increment
  assert(regenResult.newVersion.provenance.assetVersion === 2, "Asset version increments to 2");

  // 4. Status reset to draft
  assert(regenResult.newVersion.reviewStatus === "draft", "Status resets to draft");

  // 5. History preservation
  histories = histories.map(h => 
    h.assetId === targetAsset.assetId ? regenResult.versionHistory : h
  );
  
  const updatedHistory = histories.find(h => h.assetId === targetAsset.assetId);
  assert(updatedHistory?.entries.length === 2, "History correctly records new version and preserves previous version");

  console.log(`\n═══ Results: ${allPassed ? "ALL PASSED" : "FAILED"} (${testCount} tests) ═══\n`);
  if (!allPassed) process.exit(1);
}

main().catch(console.error);
