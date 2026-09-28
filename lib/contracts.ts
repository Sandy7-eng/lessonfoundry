/**
 * lib/contracts.ts
 *
 * LessonFoundry Content Contract — Task 8
 *
 * This file defines the typed data model for the LessonFoundry generation
 * pipeline. It is ARCHITECTURE ONLY — no runtime logic, no API calls, no LLM
 * integration, no database access.
 *
 * Architectural separation:
 *
 *   SOURCE          → teacher-provided trusted knowledge
 *   CONFIGURATION   → objectives, learner profile, difficulty, constraints
 *   GENERATED OUTPUT→ learning-pack assets
 *   TEACHER DECISION→ draft / approved / needs-revision
 *   QUALITY EVIDENCE→ detected quality issues
 *   PROVENANCE      → where, how, and when an asset was generated
 *   VERSIONING      → controlled regeneration history
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/** ISO 8601 timestamp string. Stored as a string to survive JSON serialisation. */
export type ISODateString = string;

/** Opaque branded ID type — keeps IDs from being accidentally interchanged. */
type Brand<T, B extends string> = T & { readonly __brand: B };

export type SourceId     = Brand<string, "SourceId">;
export type ObjectiveId  = Brand<string, "ObjectiveId">;
export type PackId       = Brand<string, "PackId">;
export type AssetId      = Brand<string, "AssetId">;
export type QualityId    = Brand<string, "QualityId">;
export type VersionId    = Brand<string, "VersionId">;

// ─────────────────────────────────────────────────────────────────────────────
// 2. SOURCE CONTRACT
//    Represents the teacher-provided trusted knowledge.
//    The source version is explicit so that materials generated from an earlier
//    version remain traceable even after the source is later updated.
// ─────────────────────────────────────────────────────────────────────────────

export interface TrustedSource {
  sourceId: SourceId;
  /** Monotonically incrementing integer — v1, v2, … */
  sourceVersion: number;
  /** Human-readable label given by the teacher. */
  label: string;
  /** Full plain-text content of the source. */
  content: string;
  createdAt: ISODateString;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LEARNING OBJECTIVE CONTRACT
//    Kept deliberately thin. Assets reference objectives by ID so that
//    alignment remains traceable without duplicating text everywhere.
// ─────────────────────────────────────────────────────────────────────────────

export interface LearningObjective {
  objectiveId: ObjectiveId;
  /** Exactly the text the teacher entered in the Source Workspace. */
  text: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PACK CONFIGURATION
//    The inputs that drove generation (distinct from the source itself).
// ─────────────────────────────────────────────────────────────────────────────

export type PackTargetLevel  = "beginner" | "intermediate" | "advanced";
export type PackDifficulty   = "easy" | "moderate" | "advanced";
export type VocabularyMode   = "standard" | "simplified" | "technical";
export type LengthMode       = "concise" | "standard" | "detailed";
export type AnswerRevealPolicy = "hide" | "reveal-after-attempt" | "include-key";

export interface PackConfiguration {
  objectives: LearningObjective[];
  targetLevel: PackTargetLevel;
  difficulty: PackDifficulty;
  vocabulary: VocabularyMode;
  length: LengthMode;
  answerReveal: AnswerRevealPolicy;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. TEACHER REVIEW STATUS
//    Used uniformly across all asset types and at the pack level.
// ─────────────────────────────────────────────────────────────────────────────

export type ReviewStatus = "draft" | "approved" | "needs-revision";

// ─────────────────────────────────────────────────────────────────────────────
// 6. PROVENANCE
//    Records the exact circumstances under which an asset was generated.
//    Required by the challenge for each generated asset.
// ─────────────────────────────────────────────────────────────────────────────

export interface AssetProvenance {
  /** Reference to the source that grounded generation. */
  sourceId: SourceId;
  /** Source version at the time of generation. */
  sourceVersion: number;
  /** Model identifier, e.g. "claude-3-5-sonnet-20241022" or "gpt-4o". */
  modelId: string;
  generatedAt: ISODateString;
  /** This asset's own version — incremented on each regeneration. */
  assetVersion: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ALIGNMENT
//    Lightweight mapping that answers: which objective does this item support?
// ─────────────────────────────────────────────────────────────────────────────

export interface ObjectiveAlignment {
  objectiveId: ObjectiveId;
  /**
   * Short human-readable rationale written by the generation pipeline,
   * e.g. "Directly tests recall of [concept] as stated in objective 2."
   */
  rationale: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. QUIZ CONTRACT
//    Discriminated union keeps question types explicit and validator-friendly.
// ─────────────────────────────────────────────────────────────────────────────

export interface MultipleChoiceOption {
  /** Single capital letter: "A" | "B" | "C" | "D" */
  key: string;
  text: string;
}

export interface MultipleChoiceQuestion {
  type: "multiple-choice";
  questionId: string;
  stem: string;
  options: MultipleChoiceOption[];
  /** Key of the correct option — stored separately in the answer key, not here.
   *  Omitting it here enforces the answer-leakage contract. */
  objectiveAlignment: ObjectiveAlignment[];
}

export interface ShortAnswerQuestion {
  type: "short-answer";
  questionId: string;
  prompt: string;
  /** Max words the model expects a valid answer to be. */
  maxWords?: number;
  objectiveAlignment: ObjectiveAlignment[];
}

export type QuizQuestion = MultipleChoiceQuestion | ShortAnswerQuestion;

/** Answer key stored as a separate asset so it can be hidden from learners. */
export interface AnswerKeyEntry {
  questionId: string;
  /**
   * For multiple-choice: the option key ("B").
   * For short-answer: a model answer or key points.
   */
  answer: string;
  /** Brief explanation of why this is correct. */
  explanation: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. ASSET BASE
//    All generated assets share this foundation.
// ─────────────────────────────────────────────────────────────────────────────

interface AssetBase {
  assetId: AssetId;
  provenance: AssetProvenance;
  reviewStatus: ReviewStatus;
  /** Objectives this asset directly supports. */
  objectiveAlignment: ObjectiveAlignment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. SPECIFIC ASSET TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** 1. Concept explanation — prose clarification of the topic. */
export interface ConceptExplanationAsset extends AssetBase {
  type: "concept-explanation";
  title: string;
  body: string;
}

/** 2. Worked / guided example — a step-by-step demonstration. */
export interface WorkedExampleAsset extends AssetBase {
  type: "worked-example";
  title: string;
  /**
   * Ordered steps. Each step has an instruction and an optional
   * explanation of why this step is taken.
   */
  steps: Array<{ instruction: string; explanation?: string }>;
}

/** 3. Formative quiz — questions only (no answers). */
export interface FormativeQuizAsset extends AssetBase {
  type: "formative-quiz";
  title: string;
  questions: QuizQuestion[];
}

/** 4. Quiz answer key — paired answer for every question. */
export interface AnswerKeyAsset extends AssetBase {
  type: "answer-key";
  /** Back-reference to the quiz this key belongs to. */
  quizAssetId: AssetId;
  entries: AnswerKeyEntry[];
}

/**
 * 5. Differentiated practice — exactly two cognitive levels per pack.
 *    The generation contract must produce a meaningful difference in
 *    cognitive demand (not merely rephrased wording).
 */
export type PracticeDifficulty = "easy" | "advanced";

export interface DifferentiatedPracticeAsset extends AssetBase {
  type: "differentiated-practice";
  practiceDifficulty: PracticeDifficulty;
  title: string;
  questions: QuizQuestion[];
}

/** 6. Concise revision sheet — a short summary / reference card. */
export interface RevisionSheetAsset extends AssetBase {
  type: "revision-sheet";
  title: string;
  /** Bullet-point or short prose summary lines. */
  points: string[];
}

/** Discriminated union of all asset types. */
export type LearningPackAsset =
  | ConceptExplanationAsset
  | WorkedExampleAsset
  | FormativeQuizAsset
  | AnswerKeyAsset
  | DifferentiatedPracticeAsset
  | RevisionSheetAsset;

// ─────────────────────────────────────────────────────────────────────────────
// 11. VERSION CONTRACT
//    Supports controlled regeneration: regenerate one asset → new version,
//    all approved assets remain unchanged.
// ─────────────────────────────────────────────────────────────────────────────

export interface AssetVersion {
  versionId: VersionId;
  assetId: AssetId;
  assetVersion: number;
  /** ID of the version this was generated from, null for the first version. */
  previousVersionId: VersionId | null;
  /** Why was this asset regenerated? Teacher-provided or system-generated note. */
  regenerationReason: string;
  createdAt: ISODateString;
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. QUALITY ISSUE CONTRACT
//    Represents a detected problem for future quality-engine output.
// ─────────────────────────────────────────────────────────────────────────────

export type QualityIssueSeverity = "warning" | "error";

export type QualityIssueType =
  | "duplicate-question"
  | "answer-leakage"
  | "unsupported-claim"
  | "missing-objective-coverage"
  | "difficulty-mismatch"
  | "malformed-answer-key"
  | "near-identical-variants";

export interface QualityIssue {
  issueId: QualityId;
  issueType: QualityIssueType;
  severity: QualityIssueSeverity;
  /** The asset that contains the problem. */
  affectedAssetId: AssetId;
  /** Human-readable explanation for the teacher review UI. */
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. LEARNING PACK (top-level)
//    The complete, self-contained generated output for one generation run.
// ─────────────────────────────────────────────────────────────────────────────

export interface LearningPack {
  packId: PackId;
  packVersion: number;
  /** Reference to the source that grounded this pack. */
  sourceId: SourceId;
  /** Source version at time of pack generation. */
  sourceVersion: number;
  configuration: PackConfiguration;
  createdAt: ISODateString;
  /** Pack-level review status — approved only when all assets are approved. */
  reviewStatus: ReviewStatus;
  /**
   * All assets for this pack. Typed as a discriminated union so
   * exhaustive switches are possible when rendering or validating.
   */
  assets: LearningPackAsset[];
  /**
   * Quality issues detected across the pack.
   * Empty array means no issues detected.
   */
  qualityIssues: QualityIssue[];
}
