"use client";

import { useState } from "react";
import type { GenerateActionResult } from "@/app/actions/generate";
import { LearningPackReview } from "@/components/learning-pack-review/LearningPackReview";

interface GenerationResultProps {
  result: GenerateActionResult;
}

/**
 * GenerationResult
 *
 * Minimal, high-contrast result panel. Displays:
 *   - Success / failure state
 *   - Pack status (always "draft")
 *   - Validation summary (issue count, objective coverage)
 *   - Quality warnings listed individually
 *   - Error message on failure
 *   - "Review Assets" entry point into the Learning Pack Review workspace
 *
 * Does NOT automatically approve content.
 * Follows Swiss modernist design direction — no gradients, no glow, no glass.
 */
export function GenerationResult({ result }: GenerationResultProps) {
  const [showReview, setShowReview] = useState(false);
  if (result.status === "invalid-input") {
    return (
      <section
        aria-labelledby="result-heading"
        className="border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30"
      >
        <div className="flex items-center gap-3 border-b border-amber-200 pb-4 dark:border-amber-800">
          <span className="font-mono text-xs font-medium text-amber-700 dark:text-amber-400">
            ○ INVALID INPUT
          </span>
          <h2
            id="result-heading"
            className="text-sm font-semibold text-amber-900 dark:text-amber-200"
          >
            Generation blocked — fix the following
          </h2>
        </div>
        <ul className="mt-4 flex flex-col gap-1.5" role="list">
          {result.problems.map((p, i) => (
            <li key={i} className="flex items-start gap-2 font-mono text-xs text-amber-800 dark:text-amber-300">
              <span aria-hidden="true">—</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (result.status === "failure") {
    return (
      <section
        aria-labelledby="result-heading"
        className="border border-red-300 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/30"
      >
        <div className="flex items-center gap-3 border-b border-red-200 pb-4 dark:border-red-800">
          <span className="font-mono text-xs font-medium text-red-700 dark:text-red-400">
            ✕ GENERATION FAILED
          </span>
          <h2
            id="result-heading"
            className="text-sm font-semibold text-red-900 dark:text-red-200"
          >
            {result.error.code}
          </h2>
        </div>
        <p className="mt-4 font-mono text-xs leading-relaxed text-red-800 dark:text-red-300">
          {result.error.message}
        </p>
        <p className="mt-4 text-xs text-red-600 dark:text-red-400">
          Your source content and objectives are preserved above. Correct the error and try again.
        </p>
      </section>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  const { pack, validation, sourceId, sourceVersion, sourceReference } = result;

  const errorCount = validation.issues.filter((i) => i.severity === "error").length;
  const warningCount = validation.issues.filter((i) => i.severity === "warning").length;
  const totalIssues = validation.issues.length;

  const objectiveIds = new Set(pack.configuration.objectives.map((o) => o.objectiveId));
  const coveredObjectiveIds = new Set<string>();
  for (const asset of pack.assets) {
    for (const align of asset.objectiveAlignment) {
      coveredObjectiveIds.add(align.objectiveId);
    }
  }
  const uncoveredCount = [...objectiveIds].filter((id) => !coveredObjectiveIds.has(id)).length;
  const allObjectivesCovered = uncoveredCount === 0;

  return (
    <>
    <section
      aria-labelledby="result-heading"
      className="border border-zinc-200 dark:border-zinc-800"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
            ✓ GENERATED
          </span>
          <h2
            id="result-heading"
            className="text-sm font-semibold text-zinc-950 dark:text-zinc-50"
          >
            Learning Pack
          </h2>
        </div>
        {/* Draft badge — content is never auto-approved */}
        <span className="border border-zinc-300 bg-white px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          Draft
        </span>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-px border-b border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 sm:grid-cols-4">
        <MetricCell label="Pack ID" value={pack.packId.slice(0, 8) + "…"} mono />
        <MetricCell label="Assets" value={String(pack.assets.length)} />
        <MetricCell label="Objectives" value={String(pack.configuration.objectives.length)} />
        <MetricCell
          label="Review status"
          value={pack.reviewStatus.toUpperCase()}
          highlight={pack.reviewStatus === "draft" ? "neutral" : "ok"}
          mono
        />
      </div>

      {/* Source provenance */}
      <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <p className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
          <span className="text-zinc-600 dark:text-zinc-400">Source</span>
          {" · "}
          <span>ref: {sourceReference}</span>
          {" · "}
          <span>v{sourceVersion}</span>
          {" · "}
          <span>id: {sourceId.slice(0, 8)}…</span>
        </p>
      </div>

      {/* Validation summary */}
      <div
        className={`border-b px-5 py-4 dark:border-zinc-800 ${
          errorCount > 0
            ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
            : warningCount > 0
            ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
            : "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20"
        }`}
      >
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={`font-mono text-xs font-medium ${
              errorCount > 0
                ? "text-red-700 dark:text-red-400"
                : warningCount > 0
                ? "text-amber-700 dark:text-amber-400"
                : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {errorCount > 0
              ? `✕ ${errorCount} error${errorCount !== 1 ? "s" : ""}`
              : warningCount > 0
              ? `○ ${warningCount} warning${warningCount !== 1 ? "s" : ""}`
              : "✓ No errors"}
          </span>
          <span className="font-mono text-xs text-zinc-500">
            {totalIssues} quality issue{totalIssues !== 1 ? "s" : ""} total
          </span>
          <span
            className={`font-mono text-xs ${
              allObjectivesCovered
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-amber-700 dark:text-amber-400"
            }`}
          >
            {allObjectivesCovered
              ? "✓ All objectives covered"
              : `○ ${uncoveredCount} objective${uncoveredCount !== 1 ? "s" : ""} not covered`}
          </span>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Validation issues are informational. Teacher review is required before any content is approved.
        </p>
      </div>

      {/* Quality issue list */}
      {validation.issues.length > 0 && (
        <div className="px-5 py-4">
          <p className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
            Quality issues
          </p>
          <ul className="flex flex-col gap-2" role="list">
            {validation.issues.map((issue) => (
              <li
                key={issue.issueId}
                className={`flex items-start gap-3 border-l-2 pl-3 ${
                  issue.severity === "error"
                    ? "border-red-400 dark:border-red-600"
                    : "border-amber-400 dark:border-amber-600"
                }`}
              >
                <span
                  className={`shrink-0 font-mono text-xs font-medium ${
                    issue.severity === "error"
                      ? "text-red-600 dark:text-red-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {issue.severity.toUpperCase()}
                </span>
                <span className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                  <span className="font-mono text-zinc-400 dark:text-zinc-600">
                    {issue.issueType}
                    {" — "}
                  </span>
                  {issue.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Asset overview */}
      <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <p className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
          Generated assets ({pack.assets.length})
        </p>
        <ul className="flex flex-col gap-1.5" role="list">
          {pack.assets.map((asset) => (
            <li
              key={asset.assetId}
              className="flex flex-wrap items-center gap-3 font-mono text-xs text-zinc-600 dark:text-zinc-400"
            >
              <span className="w-4 text-zinc-300 dark:text-zinc-700">—</span>
              <span className="text-zinc-900 dark:text-zinc-100">
                {"title" in asset ? asset.title : asset.type}
              </span>
              <span className="text-zinc-400 dark:text-zinc-600">{asset.type}</span>
              <span className="border border-zinc-200 px-1.5 py-0.5 text-zinc-400 dark:border-zinc-700 dark:text-zinc-600">
                {asset.reviewStatus}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Teacher action — Review Assets */}
      <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
        {!showReview ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Teacher review is required before this pack is approved.
            </p>
            <button
              type="button"
              onClick={() => setShowReview(true)}
              className="border border-zinc-950 bg-zinc-950 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-700 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Review Assets →
            </button>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Review workspace is open below.
          </p>
        )}
      </div>
    </section>

    {/* ── Learning Pack Review Workspace ──────────────────────────────── */}
    {showReview && result.status === "success" && (
      <div className="mt-6">
        <LearningPackReview
          pack={result.pack}
          qualityIssues={result.validation.issues}
          generationInput={result.generationInput}
          onClose={() => setShowReview(false)}
        />
      </div>
    )}
    </>
  );
}

// ─── Internal helper ──────────────────────────────────────────────────────────

interface MetricCellProps {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: "ok" | "neutral";
}

function MetricCell({ label, value, mono, highlight }: MetricCellProps) {
  return (
    <div className="flex flex-col gap-0.5 bg-white px-4 py-3 dark:bg-zinc-950">
      <span className="font-mono text-xs text-zinc-400 dark:text-zinc-600">{label}</span>
      <span
        className={`text-sm font-semibold ${mono ? "font-mono" : ""} ${
          highlight === "ok"
            ? "text-emerald-700 dark:text-emerald-400"
            : highlight === "neutral"
            ? "text-zinc-500 dark:text-zinc-400"
            : "text-zinc-950 dark:text-zinc-50"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
