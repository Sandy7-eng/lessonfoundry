import { orchestrateGeneration } from "../lib/generation/orchestrate";

async function runTests() {
  console.log("=== Task 17 Orchestration Integration Tests ===\n");

  const validState = {
    source:
      "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce oxygen and energy in the form of glucose.",
    objectives: [
      { id: "obj-1", text: "Explain the inputs and outputs of photosynthesis" },
      {
        id: "obj-2",
        text: "Describe where photosynthesis takes place in plant cells",
      },
    ],
    targetLevel: "beginner" as const,
    difficulty: "easy" as const,
    constraints: {
      vocabulary: "standard" as const,
      length: "standard" as const,
      answerReveal: "hide" as const,
    },
  };

  const result = await orchestrateGeneration(validState);
  console.log(
    "TEST C - Valid input produces result:",
    result.status === "success" ? "PASS" : "FAIL - got: " + result.status
  );

  if (result.status !== "success") {
    process.exit(1);
  }

  const allDraft =
    result.pack.assets.every((a) => a.reviewStatus === "draft") &&
    result.pack.reviewStatus === "draft";
  console.log("TEST D - Pack and all assets remain Draft:", allDraft ? "PASS" : "FAIL");

  const hasIssues = result.validation.issues.length > 0;
  console.log("TEST E - Validation issues zero (no placeholder):", !hasIssues ? "PASS" : "FAIL");
  console.log("         Issue count:", result.validation.issues.length);
  result.validation.issues.forEach((i) =>
    console.log(
      "         -",
      i.severity.toUpperCase(),
      i.issueType + ":",
      i.message.slice(0, 70)
    )
  );

  const hasProvenance =
    result.sourceId &&
    result.sourceVersion === 1 &&
    result.sourceReference === "teacher-provided-source";
  console.log(
    "TEST F - Source provenance correct:",
    hasProvenance ? "PASS" : "FAIL"
  );
  console.log("         sourceReference:", result.sourceReference);
  console.log("         sourceVersion:", result.sourceVersion);

  const providerLabel = result.pack.assets[0].provenance.modelId;
  const usesStub = providerLabel === "stub/deterministic-generator";
  console.log(
    "TEST G - Uses stub provider (no OpenAI):",
    usesStub ? "PASS" : "FAIL"
  );
  console.log("         Provider label:", providerLabel);

  console.log("\nAsset count:", result.pack.assets.length);
  result.pack.assets.forEach((a) =>
    console.log(
      "  -",
      a.type,
      "|",
      "title" in a ? a.title : "(no title)",
      "| reviewStatus:",
      a.reviewStatus
    )
  );

  console.log("\n=== All integration tests complete ===");
}

runTests().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
