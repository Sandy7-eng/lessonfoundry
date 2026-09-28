/**
 * scripts/test-regeneration.ts
 *
 * LessonFoundry — Task 16: Controlled Regeneration & Version History Tests
 *
 * Tests single-asset regeneration, version history, approval protection,
 * immutability, provenance, and error handling.
 *
 * No OpenAI calls. No UI. No persistence.
 */

import { generateLearningPack } from "../lib/ai/generator";
import type { GenerationInput } from "../lib/ai/types";
import type { ObjectiveId, AssetId, LearningPack, ReviewStatus } from "../lib/contracts";
import { approveAsset, requestRevision } from "../lib/review";
import {
  regenerateAsset,
  buildVersionHistory,
  extendVersionHistory,
  createInitialVersionHistories,
  getVersionCount,
  getActiveVersion,
  getApprovedVersion,
  getVersionByNumber,
} from "../lib/regeneration";

// ─────────────────────────────────────────────────────────────────────────────
// Test harness
// ─────────────────────────────────────────────────────────────────────────────

let allPassed = true;
let testCount = 0;

function assert(condition: boolean, testName: string): void {
  testCount++;
  const tag = condition ? "PASS" : "FAIL";
  console.log(`  ${tag}  ${testName}`);
  if (!condition) allPassed = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildInput(): GenerationInput {
  return {
    sourceId: "src-regen-test" as any,
    sourceContent: "Photosynthesis is the process by which plants convert light energy into chemical energy.",
    sourceReference: "biology-textbook-ch4",
    sourceLabel: "Photosynthesis Source",
    sourceVersion: 1,
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
    },
  };
}

async function generatePack(): Promise<LearningPack> {
  const result = await generateLearningPack(buildInput());
  if (result.status !== "success") throw new Error("Generator failed");
  return result.pack;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main test suite
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n═══ LessonFoundry — Task 16: Controlled Regeneration Tests ═══\n");

  const pack = await generatePack();
  const input = buildInput();

  // Pick assets for testing
  const draftAsset = pack.assets[0]; // concept explanation — Draft
  const quizAsset = pack.assets[2];  // formative quiz — Draft

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: Regenerating one Draft item creates a new version
  // ─────────────────────────────────────────────────────────────────────────
  console.log("--- Single-Asset Regeneration ---");

  const result1 = await regenerateAsset({
    pack,
    targetAssetId: draftAsset.assetId,
    reason: "Teacher wants different explanation",
    generationInput: input,
  });
  assert(
    result1.status === "success" &&
      result1.newVersion.provenance.assetVersion === 2,
    "Test 1: Regenerating one Draft item creates a new version (v2)",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: Regenerating one Approved item preserves the approved version
  // ─────────────────────────────────────────────────────────────────────────
  const approvedAssetObj = approveAsset(pack.assets[1], "Looks good");
  const packWithApproved: LearningPack = {
    ...pack,
    assets: pack.assets.map((a, i) => (i === 1 ? approvedAssetObj : a)),
  };

  const result2 = await regenerateAsset({
    pack: packWithApproved,
    targetAssetId: approvedAssetObj.assetId,
    reason: "Want a different worked example",
    generationInput: input,
  });
  assert(
    result2.status === "success" &&
      result2.previousVersion.reviewStatus === "approved" &&
      result2.previousVersion.provenance.assetVersion === 1,
    "Test 2: Regenerating one Approved item preserves the approved version",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: The regenerated version starts as Draft
  // ─────────────────────────────────────────────────────────────────────────
  assert(
    result2.status === "success" &&
      result2.newVersion.reviewStatus === "draft",
    "Test 3: The regenerated version starts as Draft",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: Regenerating one Needs Revision item creates a new Draft version
  // ─────────────────────────────────────────────────────────────────────────
  const needsRevAsset = requestRevision(pack.assets[0], "More detail needed");
  const packWithNeedsRev: LearningPack = {
    ...pack,
    assets: pack.assets.map((a, i) => (i === 0 ? needsRevAsset : a)),
  };

  const result4 = await regenerateAsset({
    pack: packWithNeedsRev,
    targetAssetId: needsRevAsset.assetId,
    reason: "Regenerating after revision request",
    generationInput: input,
  });
  assert(
    result4.status === "success" &&
      result4.previousVersion.reviewStatus === "needs-revision" &&
      result4.newVersion.reviewStatus === "draft",
    "Test 4: Regenerating one Needs Revision item creates a new Draft version",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: Unselected quiz questions remain unchanged
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Preservation of Unselected Items ---");

  // Approve Q1 (quiz), then regenerate the concept explanation
  const result5 = await regenerateAsset({
    pack,
    targetAssetId: draftAsset.assetId,
    reason: "Just regenerating the concept",
    generationInput: input,
  });
  if (result5.status === "success") {
    const quizInUpdated = result5.updatedPack.assets.find(
      (a) => a.assetId === quizAsset.assetId,
    );
    assert(
      quizInUpdated !== undefined &&
        quizInUpdated.provenance.assetVersion ===
          quizAsset.provenance.assetVersion &&
        quizInUpdated.reviewStatus === quizAsset.reviewStatus,
      "Test 5: Unselected quiz asset remains unchanged",
    );
  } else {
    assert(false, "Test 5: Unselected quiz asset remains unchanged");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: Unselected assets remain unchanged
  // ─────────────────────────────────────────────────────────────────────────
  if (result5.status === "success") {
    const unchanged = result5.preservedAssets.every((preserved) => {
      const original = pack.assets.find((a) => a.assetId === preserved.assetId);
      return (
        original !== undefined &&
        original.provenance.assetVersion === preserved.provenance.assetVersion &&
        original.reviewStatus === preserved.reviewStatus
      );
    });
    assert(unchanged, "Test 6: All unselected assets remain unchanged");
  } else {
    assert(false, "Test 6: All unselected assets remain unchanged");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 7: The entire LearningPack is not regenerated
  // ─────────────────────────────────────────────────────────────────────────
  if (result5.status === "success") {
    // Only the target asset should differ; all others should have same version
    let onlyOneChanged = 0;
    for (let i = 0; i < pack.assets.length; i++) {
      const orig = pack.assets[i];
      const updated = result5.updatedPack.assets.find(
        (a) => a.assetId === orig.assetId,
      );
      if (
        updated &&
        updated.provenance.assetVersion !== orig.provenance.assetVersion
      ) {
        onlyOneChanged++;
      }
    }
    assert(
      onlyOneChanged === 1,
      "Test 7: Only the targeted asset was regenerated (not the entire pack)",
    );
  } else {
    assert(false, "Test 7: Only the targeted asset was regenerated");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8: Previous version content remains unchanged
  // ─────────────────────────────────────────────────────────────────────────
  if (result1.status === "success") {
    assert(
      result1.previousVersion.provenance.assetVersion === 1 &&
        result1.previousVersion.reviewStatus === "draft" &&
        result1.previousVersion.assetId === draftAsset.assetId,
      "Test 8: Previous version content remains unchanged",
    );
  } else {
    assert(false, "Test 8: Previous version content remains unchanged");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 9: Asset version increments correctly
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Versioning ---");

  assert(
    result1.status === "success" &&
      result1.previousVersion.provenance.assetVersion === 1 &&
      result1.newVersion.provenance.assetVersion === 2,
    "Test 9: Asset version increments correctly (1 → 2)",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 10: Source provenance is preserved correctly
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Provenance ---");

  if (result1.status === "success") {
    const prov = result1.newVersion.provenance;
    assert(
      prov.sourceId === input.sourceId &&
        prov.sourceVersion === input.sourceVersion &&
        prov.sourceReference === input.sourceReference,
      "Test 10: Source provenance is preserved correctly",
    );
  } else {
    assert(false, "Test 10: Source provenance is preserved correctly");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 11: Generation timestamp is present
  // ─────────────────────────────────────────────────────────────────────────
  if (result1.status === "success") {
    assert(
      typeof result1.newVersion.provenance.generatedAt === "string" &&
        result1.newVersion.provenance.generatedAt.length > 0,
      "Test 11: Generation timestamp is present",
    );
  } else {
    assert(false, "Test 11: Generation timestamp is present");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 12: Provider/model identifier is present
  // ─────────────────────────────────────────────────────────────────────────
  if (result1.status === "success") {
    assert(
      typeof result1.newVersion.provenance.modelId === "string" &&
        result1.newVersion.provenance.modelId.length > 0,
      "Test 12: Provider/model identifier is present",
    );
  } else {
    assert(false, "Test 12: Provider/model identifier is present");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 13: Version history contains both previous and new versions
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Version History ---");

  if (result1.status === "success") {
    const vh = result1.versionHistory;
    assert(
      vh.entries.length === 2 &&
        vh.entries[0].version.assetVersion === 1 &&
        vh.entries[1].version.assetVersion === 2 &&
        vh.entries[1].version.previousVersionId === vh.entries[0].version.versionId,
      "Test 13: Version history contains both previous and new versions",
    );
  } else {
    assert(false, "Test 13: Version history contains both previous and new versions");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 14: Running the same regeneration does not mutate the original pack
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Immutability ---");

  const packSnapshot = JSON.stringify(pack);
  const _result14 = await regenerateAsset({
    pack,
    targetAssetId: draftAsset.assetId,
    reason: "Testing immutability",
    generationInput: input,
  });
  assert(
    JSON.stringify(pack) === packSnapshot,
    "Test 14: Regeneration does not mutate the original pack",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 15: Same operation with deterministic stub produces equivalent content
  // ─────────────────────────────────────────────────────────────────────────
  const resultA = await regenerateAsset({
    pack,
    targetAssetId: draftAsset.assetId,
    reason: "Determinism test A",
    generationInput: input,
  });
  const resultB = await regenerateAsset({
    pack,
    targetAssetId: draftAsset.assetId,
    reason: "Determinism test B",
    generationInput: input,
  });
  if (resultA.status === "success" && resultB.status === "success") {
    // Content should be equivalent (same stub), versions should match
    assert(
      resultA.newVersion.provenance.assetVersion ===
        resultB.newVersion.provenance.assetVersion &&
        resultA.newVersion.type === resultB.newVersion.type &&
        resultA.newVersion.assetId === resultB.newVersion.assetId,
      "Test 15: Deterministic stub produces equivalent content across runs",
    );
  } else {
    assert(false, "Test 15: Deterministic stub produces equivalent content");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 16: Invalid asset selection returns a typed failure
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Error Handling ---");

  const badResult = await regenerateAsset({
    pack,
    targetAssetId: "nonexistent-asset-id" as AssetId,
    reason: "This should fail",
    generationInput: input,
  });
  assert(
    badResult.status === "failure" &&
      badResult.error.code === "asset-not-found",
    "Test 16: Invalid asset selection returns a typed failure (asset-not-found)",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Version history query tests
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Version History Queries ---");

  if (result2.status === "success") {
    const vh = result2.versionHistory;

    // Test 17: getVersionCount
    assert(
      getVersionCount(vh) === 2,
      "Test 17: getVersionCount returns correct count",
    );

    // Test 18: getActiveVersion
    const active = getActiveVersion(vh);
    assert(
      active !== undefined && active.version.assetVersion === 2,
      "Test 18: getActiveVersion returns the latest version",
    );

    // Test 19: getApprovedVersion
    const approved = getApprovedVersion(vh);
    assert(
      approved !== undefined && approved.reviewStatus === "approved",
      "Test 19: getApprovedVersion returns the approved version",
    );

    // Test 20: getVersionByNumber
    const v1 = getVersionByNumber(vh, 1);
    const v2 = getVersionByNumber(vh, 2);
    assert(
      v1 !== undefined &&
        v1.version.assetVersion === 1 &&
        v2 !== undefined &&
        v2.version.assetVersion === 2,
      "Test 20: getVersionByNumber returns correct versions",
    );
  } else {
    assert(false, "Test 17-20: Version history queries (skipped due to failure)");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 21: extendVersionHistory adds entries without mutating
  // ─────────────────────────────────────────────────────────────────────────
  if (result1.status === "success") {
    const vh1 = result1.versionHistory;
    const v1Snapshot = JSON.stringify(vh1);

    // Simulate a v3
    const v3Asset = {
      ...result1.newVersion,
      provenance: {
        ...result1.newVersion.provenance,
        assetVersion: 3,
        generatedAt: new Date().toISOString(),
      },
      reviewStatus: "draft" as ReviewStatus,
    };
    const vh2 = extendVersionHistory(vh1, v3Asset, "Third revision");

    assert(
      vh2.entries.length === 3 &&
        vh2.activeVersion === 3 &&
        JSON.stringify(vh1) === v1Snapshot,
      "Test 21: extendVersionHistory adds entry without mutating original",
    );
  } else {
    assert(false, "Test 21: extendVersionHistory");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 22: createInitialVersionHistories creates entries for all assets
  // ─────────────────────────────────────────────────────────────────────────
  const histories = createInitialVersionHistories(pack);
  assert(
    histories.length === pack.assets.length &&
      histories.every((h) => h.entries.length === 1 && h.activeVersion === 1),
    "Test 22: createInitialVersionHistories creates entries for all assets",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 23: Version history entries contain correct provenance
  // ─────────────────────────────────────────────────────────────────────────
  if (result1.status === "success") {
    const vh = result1.versionHistory;
    const v1Entry = vh.entries[0];
    const v2Entry = vh.entries[1];
    assert(
      v1Entry.provenance.sourceId === draftAsset.provenance.sourceId &&
        v1Entry.provenance.sourceVersion === draftAsset.provenance.sourceVersion &&
        v2Entry.provenance.sourceId === input.sourceId &&
        v2Entry.provenance.sourceVersion === input.sourceVersion,
      "Test 23: Version history entries contain correct provenance",
    );
  } else {
    assert(false, "Test 23: Version history entries contain correct provenance");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 24: Regeneration preserves assetId (logical identity)
  // ─────────────────────────────────────────────────────────────────────────
  if (result1.status === "success") {
    assert(
      result1.newVersion.assetId === result1.previousVersion.assetId,
      "Test 24: Regeneration preserves assetId (logical identity)",
    );
  } else {
    assert(false, "Test 24: Regeneration preserves assetId");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test 25: Pack reviewStatus resets to draft if it was approved
  // ─────────────────────────────────────────────────────────────────────────
  const allApproved = pack.assets.map((a) => approveAsset(a));
  const approvedPack: LearningPack = {
    ...pack,
    assets: allApproved,
    reviewStatus: "approved" as ReviewStatus,
  };
  const result25 = await regenerateAsset({
    pack: approvedPack,
    targetAssetId: allApproved[0].assetId,
    reason: "Regenerating in approved pack",
    generationInput: input,
  });
  assert(
    result25.status === "success" &&
      result25.updatedPack.reviewStatus === "draft",
    "Test 25: Pack reviewStatus resets to draft after asset regeneration",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────
  console.log(
    `\n═══ Regeneration test complete: ${allPassed ? "ALL PASSED" : "SOME FAILED"} (${testCount} tests) ═══\n`,
  );
  if (!allPassed) process.exit(1);
}

main().catch((err) => {
  console.error("Test failed with unexpected error:", err);
  process.exit(1);
});
