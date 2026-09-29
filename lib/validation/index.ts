import {
  LearningPack,
  QualityIssue,
  QualityId,
  ObjectiveId,
  AssetId,
  QualityIssueSeverity,
  QualityIssueType,
  FormativeQuizAsset,
  DifferentiatedPracticeAsset,
  AnswerKeyAsset,
  LearningPackAsset,
} from "@/lib/contracts";

export interface ValidationResult {
  isValid: boolean;
  issues: QualityIssue[];
}

export function validateLearningPack(pack: LearningPack): ValidationResult {
  const issues: QualityIssue[] = [];

  const addIssue = (
    issueType: QualityIssueType,
    severity: QualityIssueSeverity,
    message: string,
    affectedAssetId: AssetId,
    affectedObjectiveId?: ObjectiveId
  ) => {
    issues.push({
      issueId: crypto.randomUUID() as QualityId,
      issueType,
      severity,
      affectedAssetId,
      affectedObjectiveId,
      message,
    });
  };

  const validObjectiveIds = new Set(pack.configuration.objectives.map((o) => o.objectiveId));
  const coveredObjectiveIds = new Set<string>();

  // Helper to check alignment for an array of alignments
  const checkAlignment = (
    alignments: { objectiveId: ObjectiveId; rationale: string }[],
    assetId: AssetId,
    context: string
  ) => {
    if (alignments.length === 0) {
      addIssue(
        "missing-objective-coverage",
        "error",
        `${context} has no objective alignment.`,
        assetId
      );
    }
    for (const align of alignments) {
      if (!validObjectiveIds.has(align.objectiveId)) {
        addIssue(
          "orphan-alignment",
          "error",
          `${context} references unknown objective ID: ${align.objectiveId}`,
          assetId,
          align.objectiveId
        );
      } else {
        coveredObjectiveIds.add(align.objectiveId);
      }
    }
  };

  // 1. Check all assets and questions for alignment + orphans
  for (const asset of pack.assets) {
    checkAlignment(asset.objectiveAlignment, asset.assetId, `Asset (${asset.type})`);

    if (asset.type === "formative-quiz" || asset.type === "differentiated-practice") {
      for (const q of asset.questions) {
        checkAlignment(
          q.objectiveAlignment,
          asset.assetId,
          `Question ${q.questionId} in ${asset.type}`
        );
      }
    }
  }

  // 2. MISSING_OBJECTIVE_COVERAGE
  // "B. Every objective supplied to the generation input is represented somewhere in the pack."
  for (const obj of pack.configuration.objectives) {
    if (!coveredObjectiveIds.has(obj.objectiveId)) {
      addIssue(
        "missing-objective-coverage",
        "warning",
        `Objective is not covered by any asset: ${obj.text}`,
        pack.assets[0]?.assetId, // fallback asset ID
        obj.objectiveId
      );
    }
  }

  // Find specific assets for cross-referencing
  const formativeQuizzes = pack.assets.filter((a): a is FormativeQuizAsset => a.type === "formative-quiz");
  const practices = pack.assets.filter((a): a is DifferentiatedPracticeAsset => a.type === "differentiated-practice");
  const answerKeys = pack.assets.filter((a): a is AnswerKeyAsset => a.type === "answer-key");

  const allQuestions = [...formativeQuizzes, ...practices].flatMap((a) => a.questions);

  // 3. DUPLICATE_QUESTIONS
  const questionPromptMap = new Map<string, string[]>(); // prompt -> questionIds
  for (const q of allQuestions) {
    const prompt = q.type === "multiple-choice" ? q.stem : q.prompt;
    const normalized = prompt.trim().toLowerCase();
    if (!questionPromptMap.has(normalized)) {
      questionPromptMap.set(normalized, []);
    }
    questionPromptMap.get(normalized)!.push(q.questionId);
  }
  
  for (const [prompt, ids] of questionPromptMap.entries()) {
    if (ids.length > 1) {
      // Find one asset containing this duplicate to flag
      const asset = [...formativeQuizzes, ...practices].find(a => a.questions.some(q => q.questionId === ids[0]));
      if (asset) {
        addIssue(
          "duplicate-question",
          "warning",
          `Duplicate question prompt found: "${prompt}"`,
          asset.assetId
        );
      }
    }
  }

  // 4. ANSWER_LEAKAGE
  // Cross reference answer keys to questions
  for (const keyAsset of answerKeys) {
    for (const entry of keyAsset.entries) {
      const question = allQuestions.find((q) => q.questionId === entry.questionId);
      if (question) {
        const prompt = question.type === "multiple-choice" ? question.stem : question.prompt;
        const answerText = entry.answer.trim().toLowerCase();
        
        // Simple leakage check: if the answer is literally inside the prompt
        if (answerText.length > 3 && prompt.toLowerCase().includes(answerText)) {
          // Identify the asset of the question
          const qAsset = [...formativeQuizzes, ...practices].find(a => a.questions.some(q => q.questionId === entry.questionId));
          addIssue(
            "answer-leakage",
            "error",
            `Question ${entry.questionId} prompt contains its own answer ("${entry.answer}").`,
            qAsset?.assetId || keyAsset.assetId
          );
        }
      }
    }
  }

  // 5. MALFORMED_ANSWER_KEY
  for (const keyAsset of answerKeys) {
    // Answer key might correspond to a specific quiz via quizAssetId
    const targetQuiz = pack.assets.find(a => a.assetId === keyAsset.quizAssetId);
    if (!targetQuiz) {
      addIssue(
        "malformed-answer-key",
        "error",
        `Answer key references unknown quiz asset ID: ${keyAsset.quizAssetId}`,
        keyAsset.assetId
      );
    } else if (targetQuiz.type !== "formative-quiz" && targetQuiz.type !== "differentiated-practice") {
       addIssue(
        "malformed-answer-key",
        "error",
        `Answer key references asset that is not a quiz: ${keyAsset.quizAssetId}`,
        keyAsset.assetId
      );
    }
    
    // Check entries against all questions (since our test checks for ANY answer key reference break)
    for (const entry of keyAsset.entries) {
      const questionExists = allQuestions.some((q) => q.questionId === entry.questionId);
      if (!questionExists) {
        addIssue(
          "malformed-answer-key",
          "error",
          `Answer key entry references unknown question ID: ${entry.questionId}`,
          keyAsset.assetId
        );
      }
    }
  }

  // 6. NEAR_IDENTICAL_VARIANTS
  const easyPractice = practices.find((p) => p.practiceDifficulty === "easy");
  const advPractice = practices.find((p) => p.practiceDifficulty === "advanced");
  if (easyPractice && advPractice) {
    // If the prompts are identical, that's a problem
    const easyPrompts = easyPractice.questions.map(q => q.type === "multiple-choice" ? q.stem : q.prompt).map(s => s.trim().toLowerCase());
    const advPrompts = advPractice.questions.map(q => q.type === "multiple-choice" ? q.stem : q.prompt).map(s => s.trim().toLowerCase());
    
    const overlap = easyPrompts.filter(p => advPrompts.includes(p));
    if (overlap.length > 0) {
      addIssue(
        "near-identical-variants",
        "warning",
        `Easy and Advanced practice contain identical questions (e.g. "${overlap[0]}").`,
        advPractice.assetId
      );
    }
  }

  // 7. EXTREME_DIFFICULTY_MISMATCH
  // E.g. we requested "easy" difficulty, but there are no "easy" practice items, only advanced
  if (practices.length > 0) {
    const hasEasy = practices.some(p => p.practiceDifficulty === "easy");
    const hasAdvanced = practices.some(p => p.practiceDifficulty === "advanced");
    
    if (pack.configuration.difficulty === "easy" && !hasEasy) {
      addIssue(
        "difficulty-mismatch",
        "warning",
        "Pack configured for 'easy' difficulty but generated no easy practice assets.",
        practices[0].assetId
      );
    }
    if (pack.configuration.difficulty === "advanced" && !hasAdvanced) {
      addIssue(
        "difficulty-mismatch",
        "warning",
        "Pack configured for 'advanced' difficulty but generated no advanced practice assets.",
        practices[0].assetId
      );
    }
  }

  // 8. UNSUPPORTED_CLAIM
  // The unsupported-claim check is now the responsibility of the AI verification
  // layer (Task 21A), because deterministic checking cannot reliably verify claims.
  // The orchestration pipeline will inject a "not evaluated" QualityIssue if AI
  // verification fails or is skipped.

  const hasErrors = issues.some((i) => i.severity === "error");

  return {
    isValid: !hasErrors, // WARNINGs don't fail the pack entirely according to instructions
    issues,
  };
}
