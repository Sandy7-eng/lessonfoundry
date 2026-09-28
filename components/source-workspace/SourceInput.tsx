"use client";

import { useRef } from "react";
import type { WorkspaceState, WorkspaceValidation } from "@/lib/types";

// ─── Word count helper ────────────────────────────────────────────────────────
function wordCount(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

interface SourceInputProps {
  source: string;
  onChange: (value: string) => void;
  validation: WorkspaceValidation;
}

export function SourceInput({ source, onChange, validation }: SourceInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = source.length;
  const words = wordCount(source);
  const hasContent = source.trim().length > 0;

  return (
    <section aria-labelledby="source-heading" className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-medium text-zinc-400 dark:text-zinc-600">
            01
          </span>
          <h2
            id="source-heading"
            className="text-base font-semibold text-zinc-950 dark:text-zinc-50"
          >
            Trusted Source
          </h2>
        </div>
        {/* Source status badge */}
        <span
          className={`font-mono text-xs font-medium ${
            hasContent
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-500"
          }`}
          aria-live="polite"
        >
          {hasContent ? "● Source ready" : "○ Source required"}
        </span>
      </div>

      {/* Helper text */}
      <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        Paste or type the instructional content the teacher trusts. All generated
        learning material must remain grounded in this source — the AI will not
        introduce information beyond what is provided here.
      </p>

      {/* Textarea */}
      <div className="flex flex-col gap-1">
        <textarea
          id="source-text"
          aria-label="Source text"
          aria-describedby="source-counter"
          value={source}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste the lesson source text here…"
          rows={12}
          className={`w-full resize-y border bg-white p-4 font-mono text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600 ${
            validation.sourceEmpty && source !== ""
              ? "border-amber-400 focus:ring-amber-400"
              : validation.sourceEmpty
              ? "border-zinc-300 focus:ring-zinc-700 dark:border-zinc-700"
              : "border-zinc-300 focus:ring-zinc-700 dark:border-zinc-700"
          }`}
          spellCheck={true}
        />
        {/* Word / char counter */}
        <div
          id="source-counter"
          className="flex justify-end font-mono text-xs text-zinc-400 dark:text-zinc-600"
          aria-live="polite"
          aria-atomic="true"
        >
          {words} {words === 1 ? "word" : "words"} · {charCount}{" "}
          {charCount === 1 ? "character" : "characters"}
        </div>
      </div>

      {/* Validation message */}
      {validation.sourceEmpty && (
        <p role="alert" className="text-xs text-amber-600 dark:text-amber-500">
          A trusted source is required before generating learning material.
        </p>
      )}

      {/* Upload control — UI only, no file processing */}
      <div className="mt-1">
        <p className="mb-2 font-mono text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
          Upload source (PDF — coming soon)
        </p>
        <div
          className="flex cursor-not-allowed flex-col items-center justify-center gap-2 border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/50"
          aria-label="PDF upload area — not yet available"
          title="PDF source upload will be available in a future task"
        >
          <svg
            className="h-7 w-7 text-zinc-300 dark:text-zinc-700"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="square"
              strokeLinejoin="miter"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <span className="text-xs text-zinc-400 dark:text-zinc-600">
            PDF upload not yet implemented
          </span>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="mt-1 border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-400 opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-600"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            disabled
          />
        </div>
      </div>
    </section>
  );
}
