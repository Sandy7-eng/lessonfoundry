"use client";

import { useState, useCallback } from "react";
import type { LearningPack, LearningPackAsset, QualityIssue, ReviewStatus } from "@/lib/contracts";
import { approveAsset, requestRevision, isPackStudentReady } from "@/lib/review";
import { createInitialVersionHistories, regenerateAsset } from "@/lib/regeneration";
import type { AssetVersionHistory } from "@/lib/regeneration";
import type { GenerationInput } from "@/lib/ai/types";
import { AssetNavigation } from "./AssetNavigation";
import { AssetDetailPanel } from "./AssetDetailPanel";
import { StudentMode } from "@/components/student-mode";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface LearningPackReviewProps {
  pack: LearningPack;
  qualityIssues: QualityIssue[];
  generationInput: GenerationInput;
  /** Called when teacher wants to return to the generation result view */
  onClose?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LearningPackReview
 *
 * Teacher-facing review workspace for inspecting and reviewing a generated
 * LearningPack. Operates on in-memory state — no persistence.
 *
 * Responsive layout:
 *   Desktop → asset list left, detail right
 *   Mobile  → stacked, list on top
 *
 * Uses existing review domain logic from lib/review/index.ts.
 * Swiss modernist design: monochrome, strong typography, 1px borders.
 */
export function LearningPackReview({
  pack: initialPack,
  qualityIssues,
  generationInput,
  onClose,
}: LearningPackReviewProps) {
  // ── Local mutable state ──────────────────────────────────────────────────
  const [assets, setAssets] = useState<LearningPackAsset[]>(initialPack.assets);
  const [histories, setHistories] = useState<AssetVersionHistory[]>(() =>
    createInitialVersionHistories(initialPack)
  );
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationError, setRegenerationError] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(
    initialPack.assets[0]?.assetId ?? null
  );

  const selectedAsset = assets.find((a) => a.assetId === selectedAssetId) ?? null;
  const selectedHistory = histories.find((h) => h.assetId === selectedAssetId) ?? null;
  const [showStudentMode, setShowStudentMode] = useState(false);

  // ── Derived pack-level state ─────────────────────────────────────────────
  const approvedCount = assets.filter((a) => a.reviewStatus === "approved").length;
  const needsRevisionCount = assets.filter(
    (a) => a.reviewStatus === "needs-revision"
  ).length;
  const draftCount = assets.filter((a) => a.reviewStatus === "draft").length;
  const allApproved = approvedCount === assets.length;

  // Build a synthetic pack for isPackStudentReady check
  const currentPack: LearningPack = {
    ...initialPack,
    assets,
    reviewStatus: allApproved ? "approved" : initialPack.reviewStatus,
  };
  const studentReady = isPackStudentReady(currentPack);

  // ── Review handlers ──────────────────────────────────────────────────────

  const handleApprove = useCallback(() => {
    if (!selectedAssetId) return;
    setAssets((prev) =>
      prev.map((a) => {
        if (a.assetId !== selectedAssetId) return a;
        try {
          return approveAsset(a);
        } catch {
          // Invalid transition — leave asset unchanged
          return a;
        }
      })
    );
  }, [selectedAssetId]);

  const handleNeedsRevision = useCallback(() => {
    if (!selectedAssetId) return;
    setAssets((prev) =>
      prev.map((a) => {
        if (a.assetId !== selectedAssetId) return a;
        try {
          return requestRevision(a);
        } catch {
          // Invalid transition — leave asset unchanged
          return a;
        }
      })
    );
  }, [selectedAssetId]);

  const handleRegenerate = useCallback(async () => {
    if (!selectedAssetId) return;
    setIsRegenerating(true);
    setRegenerationError(null);
    try {
      // Find current asset inside currentPack so TypeScript is happy with types
      const assetToRegenerate = currentPack.assets.find(a => a.assetId === selectedAssetId);
      if (!assetToRegenerate) return;
      
      const res = await regenerateAsset({
        pack: currentPack,
        targetAssetId: assetToRegenerate.assetId,
        reason: "Teacher requested regeneration",
        generationInput,
      });

      if (res.status === "failure") {
        setRegenerationError(res.error.message);
      } else {
        setAssets(res.updatedPack.assets);
        setHistories((prev) =>
          prev.map((h) =>
            h.assetId === selectedAssetId ? res.versionHistory : h
          )
        );
      }
    } catch (e: any) {
      setRegenerationError(e.message || "An unexpected error occurred");
    } finally {
      setIsRegenerating(false);
    }
  }, [selectedAssetId, currentPack, generationInput]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (showStudentMode) {
    return <StudentMode pack={currentPack} onExit={() => setShowStudentMode(false)} />;
  }

  return (
    <section
      aria-labelledby="review-workspace-heading"
      className="border border-zinc-200 dark:border-zinc-800"
    >
      {/* ── Pack-level header ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h2
              id="review-workspace-heading"
              className="text-base font-semibold text-zinc-950 dark:text-zinc-50"
            >
              Learning Pack Review
            </h2>
            <span
              className={`border px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-wider ${
                studentReady
                  ? "border-emerald-400 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/20"
                  : "border-zinc-300 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
              }`}
            >
              {studentReady ? "Student Ready" : "Not Student Ready"}
            </span>
          </div>
          <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
            Pack {initialPack.packId.slice(0, 8)}… · v{initialPack.packVersion}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowStudentMode(true)}
            className="border border-zinc-950 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-700 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Student Mode →
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              ← Back to result
            </button>
          )}
        </div>
      </div>

      {/* ── Pack-level review summary ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-px border-b border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 sm:grid-cols-4">
        <PackMetricCell label="Total Assets" value={String(assets.length)} />
        <PackMetricCell
          label="Approved"
          value={String(approvedCount)}
          highlight={allApproved ? "ok" : undefined}
        />
        <PackMetricCell
          label="Needs Revision"
          value={String(needsRevisionCount)}
          highlight={needsRevisionCount > 0 ? "warn" : undefined}
        />
        <PackMetricCell label="Draft" value={String(draftCount)} />
      </div>

      {/* ── Student-ready notice ───────────────────────────────────────── */}
      <div
        role="status"
        aria-live="polite"
        className={`border-b px-5 py-3 text-xs dark:border-zinc-800 ${
          studentReady
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-400"
            : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400"
        }`}
      >
        {studentReady
          ? "✓ All assets are approved. This pack is student-ready."
          : `This pack is not student-ready. ${
              draftCount > 0
                ? `${draftCount} asset${draftCount !== 1 ? "s" : ""} remain in draft.`
                : ""
            }${
              needsRevisionCount > 0
                ? `${draftCount > 0 ? " " : ""}${needsRevisionCount} asset${
                    needsRevisionCount !== 1 ? "s" : ""
                  } need${needsRevisionCount === 1 ? "s" : ""} revision.`
                : ""
            } Approving one asset does not approve others.`}
      </div>

      {/* ── Split layout: navigation + detail ──────────────────────────── */}
      <div className="flex flex-col md:flex-row md:min-h-[480px]">
        {/* Asset list (left / top on mobile) */}
        <div className="w-full shrink-0 border-b border-zinc-200 md:w-72 md:border-b-0 md:border-r dark:border-zinc-800">
          <AssetNavigation
            assets={assets}
            selectedAssetId={selectedAssetId}
            onSelectAsset={setSelectedAssetId}
          />
        </div>

        {/* Asset detail (right / bottom on mobile) */}
        <div className="flex-1 min-w-0 flex flex-col">
          {regenerationError && (
            <div className="mx-5 mt-5 p-3 text-sm text-red-600 bg-red-50 border border-red-200">
              {regenerationError}
            </div>
          )}
          {selectedAsset ? (
            <AssetDetailPanel
              asset={selectedAsset}
              objectives={initialPack.configuration.objectives}
              qualityIssues={qualityIssues}
              history={selectedHistory}
              isRegenerating={isRegenerating}
              onApprove={handleApprove}
              onNeedsRevision={handleNeedsRevision}
              onRegenerate={handleRegenerate}
            />
          ) : (
            <div className="flex items-center justify-center px-5 py-16">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                Select an asset from the list to review.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Internal helper ──────────────────────────────────────────────────────────

function PackMetricCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "ok" | "warn";
}) {
  return (
    <div className="flex flex-col gap-0.5 bg-white px-4 py-3 dark:bg-zinc-950">
      <span className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
        {label}
      </span>
      <span
        className={`font-mono text-sm font-semibold ${
          highlight === "ok"
            ? "text-emerald-700 dark:text-emerald-400"
            : highlight === "warn"
            ? "text-amber-700 dark:text-amber-400"
            : "text-zinc-950 dark:text-zinc-50"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
