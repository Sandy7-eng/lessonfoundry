"use client";

import type { WorkspaceState, WorkspaceValidation, TargetLevel, Difficulty } from "@/lib/types";

interface LearnerProfileProps {
  targetLevel: WorkspaceState["targetLevel"];
  difficulty: WorkspaceState["difficulty"];
  onLevelChange: (value: TargetLevel) => void;
  onDifficultyChange: (value: Difficulty) => void;
  validation: WorkspaceValidation;
}

const LEVELS: { value: TargetLevel; label: string; description: string }[] = [
  { value: "beginner", label: "Beginner", description: "Little to no prior knowledge" },
  { value: "intermediate", label: "Intermediate", description: "Familiar with foundational concepts" },
  { value: "advanced", label: "Advanced", description: "Strong existing knowledge base" },
];

const DIFFICULTIES: { value: Difficulty; label: string; description: string }[] = [
  { value: "easy", label: "Easy", description: "Accessible, low cognitive load" },
  { value: "moderate", label: "Moderate", description: "Balanced challenge" },
  { value: "advanced", label: "Advanced", description: "Complex, higher cognitive demand" },
];

export function LearnerProfile({
  targetLevel,
  difficulty,
  onLevelChange,
  onDifficultyChange,
  validation,
}: LearnerProfileProps) {
  return (
    <section aria-labelledby="learner-heading" className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <span className="font-mono text-xs font-medium text-zinc-400 dark:text-zinc-600">
          03
        </span>
        <h2
          id="learner-heading"
          className="text-base font-semibold text-zinc-950 dark:text-zinc-50"
        >
          Learner Profile
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Target Level */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="target-level"
            className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Target level
            {validation.noTargetLevel && (
              <span className="ml-2 font-mono text-xs font-normal text-amber-600 dark:text-amber-500">
                — required
              </span>
            )}
          </label>
          <select
            id="target-level"
            value={targetLevel}
            onChange={(e) => onLevelChange(e.target.value as TargetLevel)}
            className={`w-full border bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 dark:bg-zinc-900 dark:text-zinc-100 ${
              validation.noTargetLevel
                ? "border-amber-400 focus:ring-amber-400"
                : "border-zinc-300 focus:ring-zinc-700 dark:border-zinc-700"
            }`}
            aria-describedby={validation.noTargetLevel ? "level-error" : undefined}
          >
            <option value="" disabled>
              Select level…
            </option>
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label} — {l.description}
              </option>
            ))}
          </select>
          {validation.noTargetLevel && (
            <p
              id="level-error"
              role="alert"
              className="text-xs text-amber-600 dark:text-amber-500"
            >
              Target level is required.
            </p>
          )}
        </div>

        {/* Expected Difficulty */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="difficulty"
            className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Expected difficulty
            {validation.noDifficulty && (
              <span className="ml-2 font-mono text-xs font-normal text-amber-600 dark:text-amber-500">
                — required
              </span>
            )}
          </label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value as Difficulty)}
            className={`w-full border bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 dark:bg-zinc-900 dark:text-zinc-100 ${
              validation.noDifficulty
                ? "border-amber-400 focus:ring-amber-400"
                : "border-zinc-300 focus:ring-zinc-700 dark:border-zinc-700"
            }`}
            aria-describedby={validation.noDifficulty ? "difficulty-error" : undefined}
          >
            <option value="" disabled>
              Select difficulty…
            </option>
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label} — {d.description}
              </option>
            ))}
          </select>
          {validation.noDifficulty && (
            <p
              id="difficulty-error"
              role="alert"
              className="text-xs text-amber-600 dark:text-amber-500"
            >
              Expected difficulty is required.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
