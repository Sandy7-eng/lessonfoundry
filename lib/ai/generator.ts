import { validateGenerationInput, inputValidationFailure } from "@/lib/ai/provider";
import { getActiveGenerationProvider } from "@/lib/ai/index";
import type { GenerationInput, GenerationResult, RawProviderOutput, RawQuizQuestion } from "@/lib/ai/types";
import type {
  LearningPack,
  LearningPackAsset,
  AssetProvenance,
  AnswerKeyEntry,
  ConceptExplanationAsset,
  WorkedExampleAsset,
  FormativeQuizAsset,
  DifferentiatedPracticeAsset,
  RevisionSheetAsset,
  AnswerKeyAsset,
  ISODateString,
  SourceId,
  PackId,
  AssetId
} from "@/lib/contracts";

export async function generateLearningPack(input: GenerationInput): Promise<GenerationResult> {
  const validation = validateGenerationInput(input);
  if (!validation.valid) {
    return inputValidationFailure(validation);
  }

  const provider = getActiveGenerationProvider();
  const result = await provider.generate(input);
  if (result.status === "failure") {
    // If the provider fails (e.g. rate limit, or the stub itself throws a typed failure)
    return { status: "failure", error: result.error };
  }

  const rawData: RawProviderOutput = result.data;
  const now: ISODateString = new Date().toISOString();

  const sourceId = input.sourceId;
  const packId = crypto.randomUUID() as PackId;

  const provenance: AssetProvenance = {
    sourceId: sourceId,
    sourceVersion: input.sourceVersion,
    sourceReference: input.sourceReference,
    modelId: provider.providerLabel,
    generatedAt: now,
    assetVersion: 1,
  };

  const assets: LearningPackAsset[] = [];
  const answerEntries: AnswerKeyEntry[] = [];

  const addAnswerEntries = (questions: RawQuizQuestion[]) => {
    questions.forEach((q) => {
      answerEntries.push({
        questionId: q.question.questionId,
        answer: q.answer,
        explanation: q.explanation,
      });
    });
  };

  // 1. Concept Explanation
  const conceptAsset: ConceptExplanationAsset = {
    ...rawData.conceptExplanation,
    type: "concept-explanation",
    assetId: crypto.randomUUID() as AssetId,
    provenance,
    reviewStatus: "draft",
  };
  assets.push(conceptAsset);

  // 2. Worked Example
  const workedExampleAsset: WorkedExampleAsset = {
    ...rawData.workedExample,
    type: "worked-example",
    assetId: crypto.randomUUID() as AssetId,
    provenance,
    reviewStatus: "draft",
  };
  assets.push(workedExampleAsset);

  // 3. Formative Quiz
  const quizAsset: FormativeQuizAsset = {
    type: "formative-quiz",
    assetId: crypto.randomUUID() as AssetId,
    provenance,
    reviewStatus: "draft",
    title: rawData.formativeQuiz.title,
    questions: rawData.formativeQuiz.questions.map((q) => q.question),
    objectiveAlignment: rawData.formativeQuiz.objectiveAlignment,
  };
  assets.push(quizAsset);
  addAnswerEntries(rawData.formativeQuiz.questions);

  // 4. Easy Practice
  const easyPracticeAsset: DifferentiatedPracticeAsset = {
    type: "differentiated-practice",
    practiceDifficulty: "easy",
    assetId: crypto.randomUUID() as AssetId,
    provenance,
    reviewStatus: "draft",
    title: rawData.easyPractice.title,
    questions: rawData.easyPractice.questions.map((q) => q.question),
    objectiveAlignment: rawData.easyPractice.objectiveAlignment,
  };
  assets.push(easyPracticeAsset);
  addAnswerEntries(rawData.easyPractice.questions);

  // 5. Advanced Practice
  const advPracticeAsset: DifferentiatedPracticeAsset = {
    type: "differentiated-practice",
    practiceDifficulty: "advanced",
    assetId: crypto.randomUUID() as AssetId,
    provenance,
    reviewStatus: "draft",
    title: rawData.advancedPractice.title,
    questions: rawData.advancedPractice.questions.map((q) => q.question),
    objectiveAlignment: rawData.advancedPractice.objectiveAlignment,
  };
  assets.push(advPracticeAsset);
  addAnswerEntries(rawData.advancedPractice.questions);

  // 6. Revision Sheet
  const revisionAsset: RevisionSheetAsset = {
    ...rawData.revisionSheet,
    type: "revision-sheet",
    assetId: crypto.randomUUID() as AssetId,
    provenance,
    reviewStatus: "draft",
  };
  assets.push(revisionAsset);

  // 7. Answer Key
  const answerKeyAsset: AnswerKeyAsset = {
    type: "answer-key",
    assetId: crypto.randomUUID() as AssetId,
    quizAssetId: quizAsset.assetId,
    entries: answerEntries,
    provenance,
    reviewStatus: "draft",
    // Copied from the quiz for lack of better alignment
    objectiveAlignment: rawData.formativeQuiz.objectiveAlignment,
  };
  assets.push(answerKeyAsset);

  const learningPack: LearningPack = {
    packId,
    packVersion: 1,
    sourceId,
    sourceVersion: input.sourceVersion,
    configuration: {
      objectives: input.objectives,
      targetLevel: input.targetLevel,
      difficulty: input.difficulty,
      vocabulary: input.vocabulary,
      length: input.length,
      answerReveal: input.answerReveal,
    },
    createdAt: now,
    reviewStatus: "draft",
    assets: assets,
    qualityIssues: [],
  };

  return { status: "success", pack: learningPack };
}
