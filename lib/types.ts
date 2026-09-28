// ─── Workspace Domain Types ───────────────────────────────────────────────────

export type TargetLevel = "beginner" | "intermediate" | "advanced";
export type Difficulty = "easy" | "moderate" | "advanced";
export type VocabularyMode = "standard" | "simplified" | "technical";
export type LengthMode = "concise" | "standard" | "detailed";
export type AnswerRevealPolicy = "hide" | "reveal-after-attempt" | "include-key";

export interface Objective {
  id: string;
  text: string;
}

export interface GenerationConstraints {
  vocabulary: VocabularyMode;
  length: LengthMode;
  answerReveal: AnswerRevealPolicy;
}

export interface WorkspaceState {
  source: string;
  objectives: Objective[];
  targetLevel: TargetLevel | "";
  difficulty: Difficulty | "";
  constraints: GenerationConstraints;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface WorkspaceValidation {
  isValid: boolean;
  sourceEmpty: boolean;
  tooFewObjectives: boolean;
  emptyObjectives: string[]; // ids of objectives with empty text
  noTargetLevel: boolean;
  noDifficulty: boolean;
}

export function validateWorkspace(state: WorkspaceState): WorkspaceValidation {
  const sourceEmpty = state.source.trim().length === 0;
  const tooFewObjectives = state.objectives.length < 2;
  const emptyObjectives = state.objectives
    .filter((o) => o.text.trim().length === 0)
    .map((o) => o.id);
  const noTargetLevel = state.targetLevel === "";
  const noDifficulty = state.difficulty === "";

  return {
    isValid:
      !sourceEmpty &&
      !tooFewObjectives &&
      emptyObjectives.length === 0 &&
      !noTargetLevel &&
      !noDifficulty,
    sourceEmpty,
    tooFewObjectives,
    emptyObjectives,
    noTargetLevel,
    noDifficulty,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function newObjective(): Objective {
  return { id: crypto.randomUUID(), text: "" };
}

export function defaultWorkspaceState(): WorkspaceState {
  return {
    source: "",
    objectives: [newObjective(), newObjective()],
    targetLevel: "",
    difficulty: "",
    constraints: {
      vocabulary: "standard",
      length: "standard",
      answerReveal: "hide",
    },
  };
}
