/**
 * scripts/test-review.ts
 *
 * LessonFoundry — Task 15: Teacher Review Gate Tests
 *
 * Tests all review state transitions, student-ready behaviour,
 * immutability, approved-version protection, and provenance integrity.
 *
 * No OpenAI calls. No UI. No persistence.
 */

import { generateLearningPack } from "../lib/ai/generator";
import type { GenerationInput } from "../lib/ai/types";
import type { ObjectiveId, LearningPackAsset, ReviewStatus } from "../lib/contracts";
import {
  approveAsset,
  requestRevision,
  returnToDraft,
  revokeApproval,
  approvePack,
  requestPackRevision,
  isAssetStudentReady,
  isPackStudentReady,
  isValidTransition,
  createAssetRevision,
  InvalidTransitionError,
} from "../lib/review";

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

function assertThrows(fn: () => void, testName: string): void {
  testCount++;
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  const tag = threw ? "PASS" : "FAIL";
  console.log(`  ${tag}  ${testName}`);
  if (!threw) allPassed = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildInput(): GenerationInput {
  return {
    sourceId: "src-review-test" as any,
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

// ─────────────────────────────────────────────────────────────────────────────
// Main test suite
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n═══ LessonFoundry — Task 15: Teacher Review Gate Tests ═══\n");

  // Generate a pack to work with
  const result = await generateLearningPack(buildInput());
  if (result.status !== "success") {
    throw new Error("Generator failed — cannot run review tests");
  }
  const pack = result.pack;
  const asset = pack.assets[0]; // Concept explanation

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1: Newly generated asset starts as Draft
  // ─────────────────────────────────────────────────────────────────────────
  console.log("--- State Transitions ---");
  assert(
    asset.reviewStatus === "draft",
    "Test 1: Newly generated asset starts as Draft",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2: Draft → Approved works
  // ─────────────────────────────────────────────────────────────────────────
  const approved = approveAsset(asset, "Looks good");
  assert(
    approved.reviewStatus === "approved",
    "Test 2: Draft → Approved works",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3: Draft → Needs Revision works
  // ─────────────────────────────────────────────────────────────────────────
  const needsRev = requestRevision(asset, "Needs more detail");
  assert(
    needsRev.reviewStatus === "needs-revision",
    "Test 3: Draft → Needs Revision works",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4: Needs Revision → Draft works
  // ─────────────────────────────────────────────────────────────────────────
  const backToDraft = returnToDraft(needsRev, "Revised content");
  assert(
    backToDraft.reviewStatus === "draft",
    "Test 4: Needs Revision → Draft works",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 5: Needs Revision → Approved works
  // ─────────────────────────────────────────────────────────────────────────
  const approvedFromRevision = approveAsset(needsRev, "Fixed now");
  assert(
    approvedFromRevision.reviewStatus === "approved",
    "Test 5: Needs Revision → Approved works",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6: Approved content is student-ready
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Student-Ready Behaviour ---");
  assert(
    isAssetStudentReady(approved) === true,
    "Test 6: Approved content is student-ready",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 7: Draft content is NOT student-ready
  // ─────────────────────────────────────────────────────────────────────────
  assert(
    isAssetStudentReady(asset) === false,
    "Test 7: Draft content is NOT student-ready",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8: Needs Revision content is NOT student-ready
  // ─────────────────────────────────────────────────────────────────────────
  assert(
    isAssetStudentReady(needsRev) === false,
    "Test 8: Needs Revision content is NOT student-ready",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 9: Pack with one unapproved required asset is NOT student-ready
  // ─────────────────────────────────────────────────────────────────────────
  // Approve all assets except the last one
  const approvedAssets = pack.assets.map((a, i) =>
    i < pack.assets.length - 1 ? approveAsset(a) : a,
  );
  const partialPack = { ...pack, assets: approvedAssets };
  assert(
    isPackStudentReady(partialPack) === false,
    "Test 9: Pack with one unapproved required asset is NOT student-ready",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 10: Approving an asset does NOT mutate the original object
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Immutability ---");
  const originalStatus = asset.reviewStatus;
  const _approved2 = approveAsset(asset);
  assert(
    asset.reviewStatus === originalStatus && asset.reviewStatus === "draft",
    "Test 10: Approving an asset does NOT mutate the original object",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 11: Creating a new revision does NOT modify the previous Approved version
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Approved Version Protection ---");
  const approvedV1 = approveAsset(asset, "Approved v1");
  const revisionV2 = createAssetRevision(approvedV1, {});
  assert(
    approvedV1.reviewStatus === "approved" &&
      approvedV1.provenance.assetVersion === 1,
    "Test 11: Creating a new revision does NOT modify the previous Approved version",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 12: The new revision starts as Draft
  // ─────────────────────────────────────────────────────────────────────────
  assert(
    revisionV2.reviewStatus === "draft",
    "Test 12: The new revision starts as Draft",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 13: Existing provenance remains attached to the correct version
  // ─────────────────────────────────────────────────────────────────────────
  assert(
    approvedV1.provenance.assetVersion === 1 &&
      revisionV2.provenance.assetVersion === 2 &&
      approvedV1.provenance.sourceId === revisionV2.provenance.sourceId &&
      approvedV1.provenance.sourceVersion === revisionV2.provenance.sourceVersion,
    "Test 13: Existing provenance remains attached to the correct version",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Test 14: Running the same review operation produces deterministic state
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Determinism ---");
  const a1 = approveAsset(asset);
  const a2 = approveAsset(asset);
  assert(
    a1.reviewStatus === a2.reviewStatus &&
      a1.reviewStatus === "approved" &&
      a1.assetId === a2.assetId &&
      a1.provenance.assetVersion === a2.provenance.assetVersion,
    "Test 14: Running the same review operation produces deterministic state",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Additional tests — transition guards and edge cases
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Transition Guards ---");

  // Test 15: Approved → Approved throws (no silent re-approval)
  assertThrows(
    () => approveAsset(approved),
    "Test 15: Approved → Approved throws (no silent re-approval)",
  );

  // Test 16: Approved → Needs Revision throws (must use revokeApproval)
  assertThrows(
    () => requestRevision(approved),
    "Test 16: Approved → Needs Revision throws (must use revokeApproval)",
  );

  // Test 17: Approved → Draft via returnToDraft throws (must use revokeApproval)
  assertThrows(
    () => returnToDraft(approved),
    "Test 17: Approved → Draft via returnToDraft throws (must use revokeApproval)",
  );

  // Test 18: revokeApproval explicitly moves Approved → Draft
  const revoked = revokeApproval(approved, "Need to update content");
  assert(
    revoked.reviewStatus === "draft",
    "Test 18: revokeApproval explicitly moves Approved → Draft",
  );

  // Test 19: revokeApproval on non-approved asset throws
  assertThrows(
    () => revokeApproval(asset),
    "Test 19: revokeApproval on non-approved (draft) asset throws",
  );

  // Test 20: Draft → Draft throws (no self-transition)
  assertThrows(
    () => returnToDraft(asset),
    "Test 20: Draft → Draft throws (not a valid transition)",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Pack-level review tests
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Pack-Level Review ---");

  // Test 21: Pack with all assets approved can be approved
  const allApprovedAssets = pack.assets.map((a) => approveAsset(a));
  const approvedPack = approvePack({ ...pack, assets: allApprovedAssets });
  assert(
    approvedPack.reviewStatus === "approved",
    "Test 21: Pack with all assets approved can be approved",
  );

  // Test 22: Approved pack is student-ready
  assert(
    isPackStudentReady(approvedPack) === true,
    "Test 22: Approved pack IS student-ready",
  );

  // Test 23: Pack with unapproved assets cannot be approved
  assertThrows(
    () => approvePack(pack),
    "Test 23: Pack with unapproved assets cannot be approved",
  );

  // Test 24: Approved pack cannot have requestPackRevision called on it
  assertThrows(
    () => requestPackRevision(approvedPack),
    "Test 24: Approved pack cannot have requestPackRevision called directly",
  );

  // Test 25: Draft pack is NOT student-ready even if all assets are approved
  const draftPackWithApprovedAssets = {
    ...pack,
    assets: allApprovedAssets,
    reviewStatus: "draft" as ReviewStatus,
  };
  assert(
    isPackStudentReady(draftPackWithApprovedAssets) === false,
    "Test 25: Draft pack is NOT student-ready even if all assets are approved",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Review decision metadata tests
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Review Decision Metadata ---");

  // Test 26: Review decision metadata is attached after approval
  const approvedWithMeta = approveAsset(asset, "Content verified");
  assert(
    approvedWithMeta.reviewDecision !== undefined &&
      approvedWithMeta.reviewDecision.status === "approved" &&
      approvedWithMeta.reviewDecision.reviewVersion === asset.provenance.assetVersion &&
      approvedWithMeta.reviewDecision.note === "Content verified" &&
      typeof approvedWithMeta.reviewDecision.reviewedAt === "string",
    "Test 26: Review decision metadata is attached after approval",
  );

  // Test 27: Review decision metadata is attached after requesting revision
  const revWithMeta = requestRevision(asset, "Needs work");
  assert(
    revWithMeta.reviewDecision !== undefined &&
      revWithMeta.reviewDecision.status === "needs-revision" &&
      revWithMeta.reviewDecision.note === "Needs work",
    "Test 27: Review decision metadata is attached after requesting revision",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Transition table validation
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Transition Table Validation ---");

  assert(
    isValidTransition("draft", "approved") === true,
    "Test 28: Transition draft → approved is valid",
  );
  assert(
    isValidTransition("draft", "needs-revision") === true,
    "Test 29: Transition draft → needs-revision is valid",
  );
  assert(
    isValidTransition("needs-revision", "draft") === true,
    "Test 30: Transition needs-revision → draft is valid",
  );
  assert(
    isValidTransition("needs-revision", "approved") === true,
    "Test 31: Transition needs-revision → approved is valid",
  );
  assert(
    isValidTransition("approved", "draft") === false,
    "Test 32: Transition approved → draft is NOT valid (requires revokeApproval)",
  );
  assert(
    isValidTransition("approved", "needs-revision") === false,
    "Test 33: Transition approved → needs-revision is NOT valid",
  );
  assert(
    isValidTransition("approved", "approved") === false,
    "Test 34: Transition approved → approved is NOT valid",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Asset revision version incrementing
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n--- Version / Revision Interaction ---");

  const v1Approved = approveAsset(asset, "v1 approved");
  const v2Draft = createAssetRevision(v1Approved, {});
  const v2Approved = approveAsset(v2Draft, "v2 approved");
  const v3Draft = createAssetRevision(v2Approved, {});

  assert(
    v1Approved.provenance.assetVersion === 1 &&
      v2Draft.provenance.assetVersion === 2 &&
      v3Draft.provenance.assetVersion === 3,
    "Test 35: Asset version increments correctly across revisions",
  );

  assert(
    v1Approved.reviewStatus === "approved" &&
      v2Draft.reviewStatus === "draft" &&
      v2Approved.reviewStatus === "approved" &&
      v3Draft.reviewStatus === "draft",
    "Test 36: Each version maintains its own independent review status",
  );

  assert(
    v1Approved.assetId === v2Draft.assetId &&
      v2Draft.assetId === v3Draft.assetId,
    "Test 37: Asset ID remains stable across revisions",
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────
  console.log(
    `\n═══ Review test complete: ${allPassed ? "ALL PASSED" : "SOME FAILED"} (${testCount} tests) ═══\n`,
  );
  if (!allPassed) process.exit(1);
}

main().catch((err) => {
  console.error("Test failed with unexpected error:", err);
  process.exit(1);
});
