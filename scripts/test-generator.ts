import { generateLearningPack } from "../lib/ai/generator";
import type { GenerationInput } from "../lib/ai/types";
import type { ObjectiveId } from "../lib/contracts";

const testInput: GenerationInput = {
  sourceContent: "Photosynthesis is the process by which green plants...",
  sourceLabel: "Photosynthesis stub",
  sourceVersion: 1,
  objectives: [
    { objectiveId: "obj-1" as ObjectiveId, text: "Explain photosynthesis." },
    { objectiveId: "obj-2" as ObjectiveId, text: "Identify inputs and outputs." }
  ],
  targetLevel: "beginner",
  difficulty: "easy",
  vocabulary: "standard",
  length: "concise",
  answerReveal: "include-key",
  modelConfig: {
    provider: "openai", // Ignored by stub anyway
    modelId: "stub-model",
    temperature: 0.2,
    configuredAt: new Date().toISOString(),
  }
};

async function main() {
  console.log("\n═══ LessonFoundry — Task 12: Stub Generator Test ═══\n");

  const start = Date.now();
  const result1 = await generateLearningPack(testInput);
  if (result1.status !== "success") {
    console.error("Test Failed: Expected success but got", result1.error);
    process.exit(1);
  }

  const pack1 = result1.pack;
  
  // 1. Valid input produces all required Learning Pack assets.
  const assetTypes = pack1.assets.map(a => a.type);
  const requiredTypes = [
    "concept-explanation",
    "worked-example",
    "formative-quiz",
    "differentiated-practice", // easy
    "differentiated-practice", // advanced
    "revision-sheet",
    "answer-key"
  ];
  
  let allTypesPresent = true;
  for (const t of requiredTypes) {
    if (!assetTypes.includes(t as any)) {
      allTypesPresent = false;
      console.error(`Missing asset type: ${t}`);
    }
  }
  // Check that we have exactly 2 differentiated practice assets
  const practiceAssets = pack1.assets.filter(a => a.type === "differentiated-practice");
  if (practiceAssets.length !== 2) {
    allTypesPresent = false;
    console.error(`Expected 2 differentiated practice assets, got ${practiceAssets.length}`);
  }

  console.log(`1. Valid input produces all required Learning Pack assets: ${allTypesPresent ? "PASS" : "FAIL"}`);

  // 2. Objective IDs are preserved in alignment.
  let objsPreserved = true;
  for (const asset of pack1.assets) {
    const alignedIds = asset.objectiveAlignment.map(a => a.objectiveId);
    if (!alignedIds.includes("obj-1" as ObjectiveId) || !alignedIds.includes("obj-2" as ObjectiveId)) {
      objsPreserved = false;
    }
  }
  console.log(`2. Objective IDs are preserved in alignment: ${objsPreserved ? "PASS" : "FAIL"}`);

  // 3. All generated assets start as Draft.
  const allDraft = pack1.assets.every(a => a.reviewStatus === "draft");
  console.log(`3. All generated assets start as Draft: ${allDraft ? "PASS" : "FAIL"}`);

  // 4. Provenance exists on every asset.
  let allProvenance = true;
  for (const asset of pack1.assets) {
    if (!asset.provenance || !asset.provenance.modelId || !asset.provenance.sourceId || !asset.provenance.generatedAt) {
      allProvenance = false;
    }
  }
  console.log(`4. Provenance exists on every asset: ${allProvenance ? "PASS" : "FAIL"}`);

  // 5. Invalid input produces a typed failure.
  const invalidInput = { ...testInput, sourceContent: "" };
  const resultInvalid = await generateLearningPack(invalidInput);
  const isTypedFailure = resultInvalid.status === "failure" && resultInvalid.error.code === "invalid-input";
  console.log(`5. Invalid input produces a typed failure: ${isTypedFailure ? "PASS" : "FAIL"}`);

  // 6. Running the same input twice produces equivalent content except for timestamp fields.
  const result2 = await generateLearningPack(testInput);
  if (result2.status === "success") {
    const pack2 = result2.pack;
    
    // Normalize pack1 and pack2 by zeroing out time-dependent or random ID fields to check equivalence
    const normalize = (pack: any) => {
      const clone = JSON.parse(JSON.stringify(pack));
      clone.packId = "normalized";
      clone.createdAt = "normalized";
      clone.assets.forEach((a: any) => {
        a.assetId = "normalized";
        a.provenance.generatedAt = "normalized";
        if (a.quizAssetId) a.quizAssetId = "normalized";
      });
      return clone;
    };

    const nPack1 = normalize(pack1);
    const nPack2 = normalize(pack2);
    
    const isEquivalent = JSON.stringify(nPack1) === JSON.stringify(nPack2);
    console.log(`6. Same input twice produces equivalent content: ${isEquivalent ? "PASS" : "FAIL"}`);
  } else {
    console.log(`6. Same input twice produces equivalent content: FAIL (second run failed)`);
  }

  console.log("\n═══ Test complete ═══\n");
}

main().catch((err) => {
  console.error("Unhandled error in test script:", err);
  process.exit(1);
});
