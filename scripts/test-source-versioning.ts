import { createSource, createSourceVersion } from "../lib/source";
import { generateLearningPack } from "../lib/ai/generator";
import type { GenerationInput } from "../lib/ai/types";
import type { ObjectiveId } from "../lib/contracts";

async function main() {
  console.log("\n═══ LessonFoundry — Task 14: Source Versioning Tests ═══\n");

  let allPassed = true;
  const assert = (condition: boolean, testName: string) => {
    console.log(`${testName}: ${condition ? "PASS" : "FAIL"}`);
    if (!condition) {
      allPassed = false;
    }
  };

  // 1. Creating a source starts at version 1.
  const s1 = createSource("My Source", "content v1", "ref-1");
  assert(s1.sourceVersion === 1, "Test 1: Creating a source starts at version 1");

  // 2. Creating a new version increments sourceVersion.
  const s2 = createSourceVersion(s1, "content v2", "My Source Updated");
  assert(s2.sourceVersion === 2, "Test 2: Creating a new version increments sourceVersion");

  // 3. Version 1 content remains unchanged after version 2 is created.
  assert(s1.content === "content v1", "Test 3: Version 1 content remains unchanged after version 2 is created");

  // 4. sourceId remains stable across versions.
  assert(s1.sourceId === s2.sourceId, "Test 4: sourceId remains stable across versions");
  assert(s1.sourceReference === s2.sourceReference, "Test 4b: sourceReference remains stable across versions");

  // 5. Different source entities receive different sourceIds.
  const s3 = createSource("Another Source", "content 3", "ref-3");
  assert(s1.sourceId !== s3.sourceId, "Test 5: Different source entities receive different sourceIds");

  // Prepare input for generation
  const buildInput = (source: typeof s1): GenerationInput => ({
    sourceId: source.sourceId,
    sourceContent: source.content,
    sourceReference: source.sourceReference,
    sourceLabel: source.label,
    sourceVersion: source.sourceVersion,
    objectives: [
      { objectiveId: "obj-1" as ObjectiveId, text: "Explain photosynthesis." },
      { objectiveId: "obj-2" as ObjectiveId, text: "Identify inputs and outputs." },
    ],
    targetLevel: "beginner",
    difficulty: "easy",
    vocabulary: "standard",
    length: "concise",
    answerReveal: "include-key",
    modelConfig: {
      provider: "openai",
      modelId: "stub-model",
      temperature: 0.2,
      configuredAt: new Date().toISOString(),
    }
  });

  // 6. Generated assets from version 1 retain version 1 provenance.
  const resultA = await generateLearningPack(buildInput(s1));
  if (resultA.status !== "success") throw new Error("Generator failed on v1");
  const packA = resultA.pack;
  const packA_assets_all_v1 = packA.assets.every(a => a.provenance.sourceVersion === 1 && a.provenance.sourceId === s1.sourceId);
  assert(packA_assets_all_v1, "Test 6: Generated assets from version 1 retain version 1 provenance");

  // 7. Generated assets from version 2 retain version 2 provenance.
  const resultB = await generateLearningPack(buildInput(s2));
  if (resultB.status !== "success") throw new Error("Generator failed on v2");
  const packB = resultB.pack;
  const packB_assets_all_v2 = packB.assets.every(a => a.provenance.sourceVersion === 2 && a.provenance.sourceId === s2.sourceId);
  assert(packB_assets_all_v2, "Test 7: Generated assets from version 2 retain version 2 provenance");

  // 8. Existing Pack A provenance remains unchanged after version 2 exists.
  const packA_still_v1 = packA.assets.every(a => a.provenance.sourceVersion === 1);
  assert(packA_still_v1, "Test 8: Existing Pack A provenance remains unchanged after version 2 exists");

  // 9. Provider/model identifier and generation timestamp exist in provenance.
  const prov = packB.assets[0].provenance;
  const hasModelAndDate = !!prov.modelId && !!prov.generatedAt;
  assert(hasModelAndDate, "Test 9: Provider/model identifier and generation timestamp exist in provenance");

  // 10. Running the versioning operations does not mutate the original source objects.
  // Covered by test 3 but let's just make absolutely sure
  assert(s1.sourceVersion === 1 && s1.label === "My Source", "Test 10: Running the versioning operations does not mutate the original source objects");

  console.log(`\n═══ Versioning test complete: ${allPassed ? "PASS" : "FAIL"} ═══\n`);
  if (!allPassed) process.exit(1);
}

main().catch(err => {
  console.error("Test failed", err);
  process.exit(1);
});
