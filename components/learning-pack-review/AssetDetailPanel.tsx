"use client";

import type {
  LearningPackAsset,
  QualityIssue,
  LearningObjective,
  ReviewStatus,
} from "@/lib/contracts";
import type { AssetVersionHistory } from "@/lib/regeneration";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AssetDetailPanelProps {
  asset: LearningPackAsset;
  objectives: LearningObjective[];
  qualityIssues: QualityIssue[];
  history?: AssetVersionHistory | null;
  isRegenerating?: boolean;
  onApprove: () => void;
  onNeedsRevision: () => void;
  onRegenerate?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatAssetType(type: string): string {
  return type
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getAssetTypeLabel(asset: LearningPackAsset): string {
  if (asset.type === "differentiated-practice") {
    return `Differentiated Practice (${asset.practiceDifficulty})`;
  }
  return formatAssetType(asset.type);
}

function getAssetTitle(asset: LearningPackAsset): string {
  if ("title" in asset && typeof asset.title === "string") {
    return asset.title;
  }
  return formatAssetType(asset.type);
}

function statusLabel(status: ReviewStatus): string {
  switch (status) {
    case "draft":
      return "DRAFT";
    case "approved":
      return "APPROVED";
    case "needs-revision":
      return "NEEDS REVISION";
    default:
      return (status as string).toUpperCase();
  }
}

function statusBadgeClasses(status: ReviewStatus): string {
  switch (status) {
    case "draft":
      return "border-zinc-300 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400";
    case "approved":
      return "border-emerald-400 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/20";
    case "needs-revision":
      return "border-amber-400 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950/20";
    default:
      return "border-zinc-300 text-zinc-500";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Display content based on asset type */
function AssetContent({ asset }: { asset: LearningPackAsset }) {
  switch (asset.type) {
    case "concept-explanation":
      return (
        <div className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {asset.body}
        </div>
      );

    case "worked-example":
      return (
        <ol className="flex flex-col gap-3">
          {asset.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 shrink-0 font-mono text-xs text-zinc-400 dark:text-zinc-600">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-zinc-800 dark:text-zinc-200">
                  {step.instruction}
                </span>
                {step.explanation && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {step.explanation}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      );

    case "formative-quiz":
    case "differentiated-practice":
      return (
        <div className="flex flex-col gap-4">
          {asset.questions.map((q, i) => (
            <div
              key={q.questionId}
              className="border-l border-zinc-200 pl-4 dark:border-zinc-700"
            >
              <div className="mb-1 font-mono text-xs text-zinc-400 dark:text-zinc-600">
                Q{i + 1} · {q.type}
              </div>
              <div className="text-sm text-zinc-800 dark:text-zinc-200">
                {q.type === "multiple-choice" ? q.stem : q.prompt}
              </div>
              {q.type === "multiple-choice" && (
                <ul className="mt-2 flex flex-col gap-1">
                  {q.options.map((opt) => (
                    <li
                      key={opt.key}
                      className="flex items-start gap-2 font-mono text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      <span className="font-medium text-zinc-500">{opt.key}.</span>
                      <span>{opt.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      );

    case "answer-key":
      return (
        <div className="flex flex-col gap-3">
          {asset.entries.map((entry) => (
            <div
              key={entry.questionId}
              className="border-l border-zinc-200 pl-4 dark:border-zinc-700"
            >
              <div className="mb-1 font-mono text-xs text-zinc-400 dark:text-zinc-600">
                {entry.questionId}
              </div>
              <div className="text-sm text-zinc-800 dark:text-zinc-200">
                <span className="font-medium">Answer:</span> {entry.answer}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {entry.explanation}
              </div>
            </div>
          ))}
        </div>
      );

    case "revision-sheet":
      return (
        <ul className="flex flex-col gap-2">
          {asset.points.map((point, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
            >
              <span className="mt-0.5 text-zinc-300 dark:text-zinc-700" aria-hidden="true">
                —
              </span>
              {point}
            </li>
          ))}
        </ul>
      );

    default:
      return (
        <div className="text-sm text-zinc-500">
          No content renderer for this asset type.
        </div>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function AssetDetailPanel({
  asset,
  objectives,
  qualityIssues,
  history,
  isRegenerating,
  onApprove,
  onNeedsRevision,
  onRegenerate,
}: AssetDetailPanelProps) {
  const alignedObjectives = objectives.filter((obj) =>
    asset.objectiveAlignment.some((a) => a.objectiveId === obj.objectiveId)
  );
  const hasAlignmentIssues =
    asset.objectiveAlignment.length === 0 ||
    asset.objectiveAlignment.some(
      (a) => !objectives.some((obj) => obj.objectiveId === a.objectiveId)
    );

  const assetIssues = qualityIssues.filter(
    (issue) => issue.affectedAssetId === asset.assetId
  );
  const errorIssues = assetIssues.filter((i) => i.severity === "error");
  const warningIssues = assetIssues.filter((i) => i.severity === "warning");

  // Determine which review actions are valid for the current status
  const canApprove =
    asset.reviewStatus === "draft" || asset.reviewStatus === "needs-revision";
  const canNeedsRevision = asset.reviewStatus === "draft";

  return (
    <div className="flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {getAssetTitle(asset)}
            </h3>
            <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
              {getAssetTypeLabel(asset)}
            </span>
          </div>
          <span
            className={`border px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-wider ${statusBadgeClasses(
              asset.reviewStatus
            )}`}
          >
            {statusLabel(asset.reviewStatus)}
          </span>
        </div>
      </div>

      {/* ── Metadata grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-px border-b border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 sm:grid-cols-4">
        <MetaCell label="Review Status" value={statusLabel(asset.reviewStatus)} />
        <MetaCell label="Source Ref" value={asset.provenance.sourceReference} />
        <MetaCell label="Source Version" value={`v${asset.provenance.sourceVersion}`} />
        <MetaCell label="Asset Version" value={`v${asset.provenance.assetVersion}`} />
      </div>

      {/* ── Version History ───────────────────────────────────────────── */}
      {history && history.entries.length > 0 && (
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h4 className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Version History
          </h4>
          <ul className="flex flex-col gap-2">
            {history.entries.map((entry) => (
              <li
                key={entry.version.assetVersion}
                className={`flex flex-col gap-1 rounded-sm border p-3 ${
                  entry.version.assetVersion === asset.provenance.assetVersion
                    ? "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    v{entry.version.assetVersion} {entry.version.assetVersion === asset.provenance.assetVersion && "(Current)"}
                  </span>
                  <span
                    className={`rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusBadgeClasses(
                      entry.reviewStatus
                    )}`}
                  >
                    {statusLabel(entry.reviewStatus)}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 flex flex-col gap-0.5 mt-1">
                  <span className="font-mono">{new Date(entry.provenance.generatedAt).toLocaleString()}</span>
                  {entry.version.regenerationReason && <span>Reason: {entry.version.regenerationReason}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Objective Alignment ─────────────────────────────────────────── */}
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h4 className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Objective Alignment
        </h4>
        {alignedObjectives.length > 0 ? (
          <ul className="flex flex-col gap-2" role="list">
            {alignedObjectives.map((obj) => {
              const alignment = asset.objectiveAlignment.find(
                (a) => a.objectiveId === obj.objectiveId
              );
              return (
                <li
                  key={obj.objectiveId}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="mt-0.5 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                    ✓
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {obj.text}
                    </span>
                    {alignment?.rationale && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {alignment.rationale}
                      </span>
                    )}
                    <span className="font-mono text-xs text-zinc-300 dark:text-zinc-600">
                      {obj.objectiveId}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No objectives aligned.
          </p>
        )}
        {hasAlignmentIssues && (
          <div
            role="status"
            className="mt-3 flex items-center gap-2 border-l-2 border-amber-400 pl-3 text-xs text-amber-700 dark:border-amber-600 dark:text-amber-400"
          >
            <span aria-hidden="true">○</span>
            <span>
              Alignment issue: {asset.objectiveAlignment.length === 0
                ? "This asset has no objective alignment."
                : "References an objective not found in pack configuration."}
            </span>
          </div>
        )}
      </div>

      {/* ── Quality Issues ──────────────────────────────────────────────── */}
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h4 className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Quality Issues
        </h4>
        {assetIssues.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
            <span aria-hidden="true">✓</span>
            No flagged issues
          </p>
        ) : (
          <ul className="flex flex-col gap-2" role="list">
            {errorIssues.map((issue) => (
              <li
                key={issue.issueId}
                className="flex items-start gap-3 border-l-2 border-red-400 pl-3 dark:border-red-600"
              >
                <span className="shrink-0 font-mono text-xs font-medium text-red-600 dark:text-red-400">
                  ERROR
                </span>
                <span className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                  <span className="font-mono text-zinc-400 dark:text-zinc-600">
                    {issue.issueType} —{" "}
                  </span>
                  {issue.message}
                </span>
              </li>
            ))}
            {warningIssues.map((issue) => (
              <li
                key={issue.issueId}
                className="flex items-start gap-3 border-l-2 border-amber-400 pl-3 dark:border-amber-600"
              >
                <span className="shrink-0 font-mono text-xs font-medium text-amber-600 dark:text-amber-400">
                  WARNING
                </span>
                <span className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                  <span className="font-mono text-zinc-400 dark:text-zinc-600">
                    {issue.issueType} —{" "}
                  </span>
                  {issue.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h4 className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Content
        </h4>
        <AssetContent asset={asset} />
      </div>

      {/* ── Review Actions ──────────────────────────────────────────────── */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-mono text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Teacher Review
          </h4>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-2.5 py-1 rounded-sm border border-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700"
            >
              {isRegenerating ? "Regenerating..." : "Regenerate Asset"}
            </button>
          )}
        </div>

        {asset.reviewStatus === "approved" ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
            <span aria-hidden="true">✓</span>
            This asset has been approved.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onApprove}
              disabled={!canApprove}
              aria-disabled={!canApprove}
              className="border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={onNeedsRevision}
              disabled={!canNeedsRevision}
              aria-disabled={!canNeedsRevision}
              className="border border-amber-600 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-500 dark:bg-zinc-900 dark:text-amber-400 dark:hover:bg-amber-950/20"
            >
              Needs Revision
            </button>
          </div>
        )}

        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          {asset.reviewStatus === "approved"
            ? "Revoking approval requires an explicit action (not available in this view)."
            : asset.reviewStatus === "needs-revision"
            ? "This asset is marked for revision. You may approve it directly or wait for content updates."
            : "Review this asset's content, alignment, and quality before approving."}
        </p>
      </div>
    </div>
  );
}

// ─── Internal helper ──────────────────────────────────────────────────────────

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 bg-white px-4 py-3 dark:bg-zinc-950">
      <span className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
        {label}
      </span>
      <span className="font-mono text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {value}
      </span>
    </div>
  );
}
