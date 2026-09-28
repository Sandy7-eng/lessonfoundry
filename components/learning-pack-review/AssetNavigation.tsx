"use client";

import type { LearningPackAsset, ReviewStatus } from "@/lib/contracts";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AssetNavigationProps {
  assets: LearningPackAsset[];
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getAssetTitle(asset: LearningPackAsset): string {
  if ("title" in asset && typeof asset.title === "string") {
    return asset.title;
  }
  // answer-key has no title field
  return formatAssetType(asset.type);
}

function formatAssetType(type: string): string {
  return type
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getAssetTypeLabel(asset: LearningPackAsset): string {
  if (asset.type === "differentiated-practice") {
    return `Practice (${asset.practiceDifficulty})`;
  }
  return formatAssetType(asset.type);
}

function statusLabel(status: ReviewStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "approved":
      return "Approved";
    case "needs-revision":
      return "Needs Revision";
    default:
      return status;
  }
}

function statusClasses(status: ReviewStatus): string {
  switch (status) {
    case "draft":
      return "border-zinc-300 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400";
    case "approved":
      return "border-emerald-400 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400";
    case "needs-revision":
      return "border-amber-400 text-amber-700 dark:border-amber-700 dark:text-amber-400";
    default:
      return "border-zinc-300 text-zinc-500";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AssetNavigation({
  assets,
  selectedAssetId,
  onSelectAsset,
}: AssetNavigationProps) {
  return (
    <nav aria-label="Asset list" className="flex flex-col">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h3 className="font-mono text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Assets ({assets.length})
        </h3>
      </div>

      <ul role="list" className="flex flex-col">
        {assets.map((asset, index) => {
          const isSelected = asset.assetId === selectedAssetId;
          return (
            <li key={asset.assetId}>
              <button
                type="button"
                onClick={() => onSelectAsset(asset.assetId)}
                aria-current={isSelected ? "true" : undefined}
                className={`
                  flex w-full flex-col gap-1.5 border-b border-zinc-200 px-4 py-3 text-left
                  transition-colors
                  dark:border-zinc-800
                  ${
                    isSelected
                      ? "bg-zinc-100 dark:bg-zinc-800/60"
                      : "bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  }
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-700
                `}
              >
                {/* Index + Title */}
                <div className="flex items-start gap-2">
                  <span className="mt-px font-mono text-xs text-zinc-300 dark:text-zinc-700">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`text-sm font-medium leading-tight ${
                      isSelected
                        ? "text-zinc-950 dark:text-zinc-50"
                        : "text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {getAssetTitle(asset)}
                  </span>
                </div>

                {/* Type + Status */}
                <div className="flex items-center gap-2 pl-6">
                  <span className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
                    {getAssetTypeLabel(asset)}
                  </span>
                  <span
                    className={`border px-1.5 py-0.5 font-mono text-xs ${statusClasses(
                      asset.reviewStatus
                    )}`}
                  >
                    {statusLabel(asset.reviewStatus)}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
