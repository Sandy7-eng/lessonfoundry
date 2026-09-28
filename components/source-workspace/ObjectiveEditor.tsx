"use client";

import type { Objective, WorkspaceValidation } from "@/lib/types";

interface ObjectiveEditorProps {
  objectives: Objective[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, text: string) => void;
  validation: WorkspaceValidation;
}

export function ObjectiveEditor({
  objectives,
  onAdd,
  onRemove,
  onChange,
  validation,
}: ObjectiveEditorProps) {
  const canRemove = objectives.length > 2;

  return (
    <section aria-labelledby="objectives-heading" className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-medium text-zinc-400 dark:text-zinc-600">
            02
          </span>
          <h2
            id="objectives-heading"
            className="text-base font-semibold text-zinc-950 dark:text-zinc-50"
          >
            Learning Objectives
          </h2>
        </div>
        <span className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
          {objectives.length} / minimum 2
        </span>
      </div>

      <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        State what the learner should be able to do after completing this material.
        Minimum 2 objectives required.
      </p>

      {/* Objective list */}
      <ol className="flex flex-col gap-3" aria-label="Learning objectives list">
        {objectives.map((obj, index) => {
          const isEmpty = validation.emptyObjectives.includes(obj.id);
          return (
            <li key={obj.id} className="flex items-start gap-3">
              {/* Objective number */}
              <span
                className="mt-2.5 w-6 shrink-0 font-mono text-xs font-medium text-zinc-400 dark:text-zinc-600"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              {/* Text input */}
              <div className="flex flex-1 flex-col gap-1">
                <input
                  type="text"
                  id={`objective-${obj.id}`}
                  aria-label={`Objective ${index + 1}`}
                  value={obj.text}
                  onChange={(e) => onChange(obj.id, e.target.value)}
                  placeholder={`Objective ${index + 1}…`}
                  className={`w-full border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600 ${
                    isEmpty
                      ? "border-amber-400 focus:ring-amber-400"
                      : "border-zinc-300 focus:ring-zinc-700 dark:border-zinc-700"
                  }`}
                />
                {isEmpty && (
                  <p
                    role="alert"
                    className="text-xs text-amber-600 dark:text-amber-500"
                  >
                    This objective cannot be empty.
                  </p>
                )}
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemove(obj.id)}
                disabled={!canRemove}
                aria-label={`Remove objective ${index + 1}`}
                title={
                  canRemove
                    ? "Remove this objective"
                    : "Minimum 2 objectives required"
                }
                className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center border border-zinc-200 text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-600 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Validation feedback */}
      {validation.tooFewObjectives && (
        <p role="alert" className="text-xs text-amber-600 dark:text-amber-500">
          At least 2 learning objectives are required.
        </p>
      )}

      {/* Add objective */}
      <button
        type="button"
        onClick={onAdd}
        className="mt-1 flex w-full items-center justify-center gap-2 border border-dashed border-zinc-300 py-2.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
      >
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="square"
            strokeLinejoin="miter"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        Add objective
      </button>
    </section>
  );
}
