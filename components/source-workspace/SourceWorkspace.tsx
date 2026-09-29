"use client";

import { useState, useCallback, useTransition } from "react";
import {
  defaultWorkspaceState,
  newObjective,
  validateWorkspace,
  type WorkspaceState,
  type TargetLevel,
  type Difficulty,
  type GenerationConstraints,
} from "@/lib/types";
import { SourceInput } from "./SourceInput";
import { ObjectiveEditor } from "./ObjectiveEditor";
import { LearnerProfile } from "./LearnerProfile";
import { GenerationConstraintsPanel } from "./GenerationConstraints";
import { GenerationResult } from "./GenerationResult";
import { generateLearningPackAction, type GenerateActionResult } from "@/app/actions/generate";

export function SourceWorkspace() {
  const [state, setState] = useState<WorkspaceState>(defaultWorkspaceState);
  // Only show validation feedback after the user has attempted to proceed
  const [showValidation, setShowValidation] = useState(false);
  // Generation result state
  const [generationResult, setGenerationResult] = useState<GenerateActionResult | null>(null);
  // useTransition: keeps UI responsive during async server action
  const [isPending, startTransition] = useTransition();

  const validation = validateWorkspace(state);

  // ─── Source handlers ─────────────────────────────────────────────────────
  const handleSourceChange = useCallback((value: string) => {
    setState((prev) => ({ ...prev, source: value }));
  }, []);

  // ─── Objective handlers ───────────────────────────────────────────────────
  const handleObjectiveAdd = useCallback(() => {
    setState((prev) => ({
      ...prev,
      objectives: [...prev.objectives, newObjective()],
    }));
  }, []);

  const handleObjectiveRemove = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      objectives: prev.objectives.filter((o) => o.id !== id),
    }));
  }, []);

  const handleObjectiveChange = useCallback((id: string, text: string) => {
    setState((prev) => ({
      ...prev,
      objectives: prev.objectives.map((o) => (o.id === id ? { ...o, text } : o)),
    }));
  }, []);

  // ─── Profile handlers ─────────────────────────────────────────────────────
  const handleLevelChange = useCallback((value: TargetLevel) => {
    setState((prev) => ({ ...prev, targetLevel: value }));
  }, []);

  const handleDifficultyChange = useCallback((value: Difficulty) => {
    setState((prev) => ({ ...prev, difficulty: value }));
  }, []);

  // ─── Constraint handler ───────────────────────────────────────────────────
  const handleConstraintChange = useCallback(
    <K extends keyof GenerationConstraints>(
      key: K,
      value: GenerationConstraints[K]
    ) => {
      setState((prev) => ({
        ...prev,
        constraints: { ...prev.constraints, [key]: value },
      }));
    },
    []
  );

  // ─── Generate ─────────────────────────────────────────────────────────────
  const handleGenerate = () => {
    setShowValidation(true);

    if (!validation.isValid) {
      // Show validation errors — do not call the server
      return;
    }

    startTransition(async () => {
      setGenerationResult(null);
      const result = await generateLearningPackAction(state);
      setGenerationResult(result);
    });
  };

  const activeValidation = showValidation
    ? validation
    : {
        isValid: false,
        sourceEmpty: false,
        tooFewObjectives: false,
        emptyObjectives: [],
        noTargetLevel: false,
        noDifficulty: false,
      };

  // Button is disabled while generation is in flight
  const generateDisabled = isPending;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Workspace title / breadcrumb */}
      <div className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div className="mb-1 font-mono text-xs text-zinc-400 dark:text-zinc-600">
          Workspace / New Learning Pack
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
          Source Workspace
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Configure the source, objectives, and constraints, then generate learning material.
        </p>
      </div>

      {/* Validation status bar — shown after first attempt */}
      {showValidation && !validation.isValid && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 flex items-center gap-3 border border-amber-200 bg-amber-50 px-4 py-3 font-mono text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <span>○</span>
          <span>Complete all required fields to generate a Learning Pack.</span>
        </div>
      )}

      {/* Main form sections */}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          handleGenerate();
        }}
        className="flex flex-col gap-10"
      >
        <SourceInput
          source={state.source}
          onChange={handleSourceChange}
          validation={activeValidation}
        />

        <ObjectiveEditor
          objectives={state.objectives}
          onAdd={handleObjectiveAdd}
          onRemove={handleObjectiveRemove}
          onChange={handleObjectiveChange}
          validation={activeValidation}
        />

        <LearnerProfile
          targetLevel={state.targetLevel}
          difficulty={state.difficulty}
          onLevelChange={handleLevelChange}
          onDifficultyChange={handleDifficultyChange}
          validation={activeValidation}
        />

        <GenerationConstraintsPanel
          constraints={state.constraints}
          onChange={handleConstraintChange}
        />

        {/* Action bar */}
        <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Status note */}
            <p className="text-xs text-zinc-400 dark:text-zinc-600">
              {isPending
                ? "Generating…"
                : showValidation && !validation.isValid
                ? "Fix the errors above to enable generation."
                : "Uses Gemini AI provider for generation."}
            </p>

            {/* Primary action */}
            <button
              type="submit"
              disabled={generateDisabled}
              aria-disabled={generateDisabled}
              className="flex items-center gap-2 border border-zinc-950 bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 dark:disabled:opacity-40"
            >
              {isPending ? (
                <>
                  <span
                    aria-hidden="true"
                    className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-zinc-900 dark:border-t-transparent"
                  />
                  Generating…
                </>
              ) : (
                <>
                  Generate Learning Pack
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* ── Generation Result Panel ────────────────────────────────────────── */}
      {/* Only shown after at least one generation attempt */}
      {generationResult !== null && (
        <div className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <div className="mb-4">
            <div className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
              05
            </div>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Generation Result
            </h2>
          </div>
          <GenerationResult result={generationResult} />
        </div>
      )}
    </div>
  );
}
