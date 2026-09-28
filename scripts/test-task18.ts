/**
 * scripts/test-task18.ts
 *
 * LessonFoundry — Task 18: Teacher Learning Pack Review Workspace Tests
 *
 * Tests the review workflow using existing contracts/review functions.
 * Verifies asset-level review behaviour, pack-level readiness,
 * transition rules, and that the review workspace can operate on
 * a generated LearningPack.
 *
 * No OpenAI calls. No UI rendering. No persistence.
 */

import { generateLearningPack } from "../lib/ai/generator";
import type { GenerationInput } from "../lib/ai/types";
import type { ObjectiveId, LearningPackAsset, ReviewStatus, LearningPack } from "../lib/contracts";
import {
  approveAsset,
  requestRevision,
  returnToDraft,
  revokeApproval,
  isAssetStudentReady,
  isPackStudentReady,
  isValidTransition,
  InvalidTransitionError,
} from "../lib/review";

// ─────────────────────────────────────────────────────────────────────────────
// Test harness
// ─────────────────────────────────────────────────────────────────────────────

let allPassed = true;
let testCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string): void {
  testCount++;
  if (condition) {
    console.log(`  PASS  ${testName}`);
  } else {
    console.log(`  FAIL  ${testName}`);
    allPassed = false;
    failCount++;
  }
}

function assertThrows(fn: () => void, testName: string): void {
  testCount++;
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (threw) {
    console.log(`  PASS  ${testName}`);
  } else {
    console.log(`  FAIL  ${testName}`);
    allPassed = false;
    failCount++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildInput(): GenerationInput {
  return {
    sourceId: "src-task18-test" as any,
    sourceContent:
      "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce oxygen and energy in the form of glucose.",
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
    length: "standard",
    answerReveal: "include-key",
    modelConfig: {
      provider: "openai",
      modelId: "stub/deterministic-generator",
      temperature: 0.2,
      configuredAt: new Date().toISOString(),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main test suite
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n═══ LessonFoundry — Task 18: Learning Pack Review Workspace Tests ═══\n");

  // Generate a pack to work with
  const result = await generateLearningPack(buildInput());
  if (result.status !== "success") {
    throw new Error("Generator failed — cannot run review tests");
  }
  const pack = result.pack;

  console.log(`Generated pack with ${pack.assets.length} assets:\n`);
  pack.assets.forEach((a, i) => {
    const title = "title" in a ? a.title : a.type;
    console.log(`  ${String(i + 1).padStart(2, "0")}. ${a.type} — "${title}" [${a.reviewStatus}]`);
  });
  console.log("");

  // ─────────────────────────────────────────────────────────────────────────
  // TEST A: A generated asset starts as draft
  // ─────────────────────────────────────────────────────────────────────────
  console.log("--- TEST A: Generated assets start as draft ---");
  for (const asset of pack.assets) {
    assert(
      asset.reviewStatus === "draft",
      `Asset "${asset.type}" starts as draft`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST B: Approving one asset changes only that asset to approved
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST B: Approving one asset changes only that asset ---");

  const firstAsset = pack.assets[0];
  const approvedFirst = approveAsset(firstAsset);

  assert(
    approvedFirst.reviewStatus === "approved",
    "Approved asset becomes approved"
  );
  assert(
    approvedFirst.assetId === firstAsset.assetId,
    "Approved asset retains same assetId"
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TEST C: Marking one asset as needs-revision changes only that asset
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST C: Needs-revision changes only that asset ---");

  const secondAsset = pack.assets[1];
  const revisedSecond = requestRevision(secondAsset);

  assert(
    revisedSecond.reviewStatus === "needs-revision",
    "Revised asset becomes needs-revision"
  );
  assert(
    revisedSecond.assetId === secondAsset.assetId,
    "Revised asset retains same assetId"
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TEST D: Other assets remain unchanged
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST D: Other assets remain unchanged ---");

  // The original pack assets should not have been mutated
  for (let i = 0; i < pack.assets.length; i++) {
    assert(
      pack.assets[i].reviewStatus === "draft",
      `Original asset ${i} still "draft" (immutability check)`
    );
  }

  // After approving asset[0], asset[1..n] should still be draft in a simulated
  // state array
  const stateAfterApprove: LearningPackAsset[] = pack.assets.map((a) =>
    a.assetId === firstAsset.assetId ? approvedFirst : a
  );

  for (let i = 1; i < stateAfterApprove.length; i++) {
    assert(
      stateAfterApprove[i].reviewStatus === "draft",
      `Asset ${i} unchanged after approving asset 0`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST E: Pack is not student-ready if only one asset is approved
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST E: Pack not student-ready with partial approval ---");

  const packWithOneApproved: LearningPack = {
    ...pack,
    assets: stateAfterApprove,
  };

  assert(
    !isPackStudentReady(packWithOneApproved),
    "Pack with one approved asset is NOT student-ready"
  );

  // Even if pack reviewStatus is set to approved, if assets aren't all approved:
  const packForcedApproved: LearningPack = {
    ...pack,
    reviewStatus: "approved",
    assets: stateAfterApprove,
  };

  assert(
    !isPackStudentReady(packForcedApproved),
    "Pack with forced approved status but unapproved assets is NOT student-ready"
  );

  // Verify that approving ALL assets (and pack) makes it student-ready
  const allApprovedAssets = pack.assets.map((a) => approveAsset(a));
  const fullyApprovedPack: LearningPack = {
    ...pack,
    reviewStatus: "approved",
    assets: allApprovedAssets,
  };

  assert(
    isPackStudentReady(fullyApprovedPack),
    "Pack with all approved assets AND approved pack status IS student-ready"
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TEST F: Review workspace can operate on a generated LearningPack
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST F: Review workspace can render a generated LearningPack ---");

  // Simulate what the LearningPackReview component does:
  // It reads pack.assets, pack.configuration.objectives, pack.qualityIssues
  // and calls approveAsset / requestRevision on individual assets.
  let renderError: string | null = null;
  try {
    // Verify all data access patterns used by the review workspace
    const assets = pack.assets;
    const objectives = pack.configuration.objectives;
    const qualityIssues = pack.qualityIssues;

    // Iterate assets like the navigation does
    for (const asset of assets) {
      const _id = asset.assetId;
      const _type = asset.type;
      const _status = asset.reviewStatus;
      const _provenance = asset.provenance;
      const _alignment = asset.objectiveAlignment;

      // Check title access pattern
      const _title = "title" in asset ? asset.title : asset.type;

      // Check type-specific content access
      switch (asset.type) {
        case "concept-explanation":
          void asset.body;
          break;
        case "worked-example":
          void asset.steps;
          break;
        case "formative-quiz":
          void asset.questions;
          break;
        case "differentiated-practice":
          void asset.practiceDifficulty;
          void asset.questions;
          break;
        case "revision-sheet":
          void asset.points;
          break;
        case "answer-key":
          void asset.quizAssetId;
          void asset.entries;
          break;
      }

      // Check quality issues filter
      const _issues = qualityIssues.filter((i) => i.affectedAssetId === asset.assetId);

      // Check objective alignment lookup
      const _aligned = objectives.filter((obj) =>
        asset.objectiveAlignment.some((a) => a.objectiveId === obj.objectiveId)
      );
    }

    // Verify pack-level derived state
    const _approvedCount = assets.filter((a) => a.reviewStatus === "approved").length;
    const _draftCount = assets.filter((a) => a.reviewStatus === "draft").length;
    const _allApproved = _approvedCount === assets.length;
  } catch (e: unknown) {
    renderError = e instanceof Error ? e.message : String(e);
  }

  assert(
    renderError === null,
    `Review workspace data access succeeds without errors${renderError ? `: ${renderError}` : ""}`
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TEST G: Review-state transition rules are respected
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST G: Transition rules respected ---");

  // G1: Draft → Approved is valid
  assert(isValidTransition("draft", "approved"), "draft → approved is valid");

  // G2: Draft → Needs-Revision is valid
  assert(isValidTransition("draft", "needs-revision"), "draft → needs-revision is valid");

  // G3: Needs-Revision → Approved is valid
  assert(isValidTransition("needs-revision", "approved"), "needs-revision → approved is valid");

  // G4: Needs-Revision → Draft is valid
  assert(isValidTransition("needs-revision", "draft"), "needs-revision → draft is valid");

  // G5: Approved → anything is NOT valid through normal transitions
  assert(!isValidTransition("approved", "draft"), "approved → draft is NOT valid (requires revokeApproval)");
  assert(!isValidTransition("approved", "needs-revision"), "approved → needs-revision is NOT valid");

  // G6: Cannot approve an already-approved asset normally
  const alreadyApproved = approveAsset(firstAsset);
  assertThrows(
    () => approveAsset(alreadyApproved),
    "Cannot approve already-approved asset (throws InvalidTransitionError)"
  );

  // G7: Cannot request revision on an already-approved asset
  assertThrows(
    () => requestRevision(alreadyApproved),
    "Cannot request revision on approved asset (throws InvalidTransitionError)"
  );

  // G8: Revoke approval works on approved asset
  const revoked = revokeApproval(alreadyApproved);
  assert(revoked.reviewStatus === "draft", "revokeApproval returns to draft");

  // G9: Cannot revoke approval on non-approved asset
  assertThrows(
    () => revokeApproval(firstAsset),
    "Cannot revokeApproval on draft asset (throws)"
  );

  // G10: Needs-revision → approved (teacher decides revision is adequate)
  const needsRev = requestRevision(pack.assets[2]);
  const approvedAfterRev = approveAsset(needsRev);
  assert(
    approvedAfterRev.reviewStatus === "approved",
    "needs-revision → approved works"
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────

  console.log(`\n═══ Results: ${testCount - failCount}/${testCount} passed ═══\n`);

  if (!allPassed) {
    console.error("Some tests FAILED.");
    process.exit(1);
  }
  console.log("All Task 18 tests passed.\n");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
