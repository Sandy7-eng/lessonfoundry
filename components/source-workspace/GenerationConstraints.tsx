"use client";

import type {
  GenerationConstraints,
  VocabularyMode,
  LengthMode,
  AnswerRevealPolicy,
} from "@/lib/types";

interface GenerationConstraintsProps {
  constraints: GenerationConstraints;
  onChange: <K extends keyof GenerationConstraints>(
    key: K,
    value: GenerationConstraints[K]
  ) => void;
}

// ─── Radio group primitive ────────────────────────────────────────────────────
interface RadioGroupProps<T extends string> {
  id: string;
  legend: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
}

function RadioGroup<T extends string>({
  id,
  legend,
  value,
  options,
  onChange,
}: RadioGroupProps<T>) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {legend}
      </legend>
      <div className="flex flex-col gap-0 border border-zinc-200 dark:border-zinc-700">
        {options.map((opt) => {
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              htmlFor={`${id}-${opt.value}`}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                checked
                  ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950"
                  : "bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <input
                type="radio"
                id={`${id}-${opt.value}`}
                name={id}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <span
                className={`h-1.5 w-1.5 shrink-0 ${
                  checked ? "bg-white dark:bg-zinc-950" : "border border-zinc-400"
                }`}
                aria-hidden="true"
              />
              <span className="flex-1 font-medium">{opt.label}</span>
              {opt.hint && (
                <span
                  className={`font-mono text-xs ${
                    checked ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400 dark:text-zinc-600"
                  }`}
                >
                  {opt.hint}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function GenerationConstraintsPanel({
  constraints,
  onChange,
}: GenerationConstraintsProps) {
  return (
    <section aria-labelledby="constraints-heading" className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <span className="font-mono text-xs font-medium text-zinc-400 dark:text-zinc-600">
          04
        </span>
        <h2
          id="constraints-heading"
          className="text-base font-semibold text-zinc-950 dark:text-zinc-50"
        >
          Generation Constraints
        </h2>
      </div>

      <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        Configure how generated material will be shaped. These settings do not trigger
        generation.
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <RadioGroup<VocabularyMode>
          id="vocabulary"
          legend="Vocabulary"
          value={constraints.vocabulary}
          onChange={(v) => onChange("vocabulary", v)}
          options={[
            { value: "standard", label: "Standard", hint: "Default" },
            { value: "simplified", label: "Simplified", hint: "Plain language" },
            { value: "technical", label: "Technical", hint: "Domain terms" },
          ]}
        />

        <RadioGroup<LengthMode>
          id="length"
          legend="Length"
          value={constraints.length}
          onChange={(v) => onChange("length", v)}
          options={[
            { value: "concise", label: "Concise", hint: "Shorter" },
            { value: "standard", label: "Standard", hint: "Default" },
            { value: "detailed", label: "Detailed", hint: "Longer" },
          ]}
        />

        <RadioGroup<AnswerRevealPolicy>
          id="answer-reveal"
          legend="Answer reveal"
          value={constraints.answerReveal}
          onChange={(v) => onChange("answerReveal", v)}
          options={[
            { value: "hide", label: "Hide answers" },
            { value: "reveal-after-attempt", label: "Reveal after attempt" },
            { value: "include-key", label: "Include answer key" },
          ]}
        />
      </div>
    </section>
  );
}
