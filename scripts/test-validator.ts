import { generateLearningPack } from "../lib/ai/generator";
import type { GenerationInput } from "../lib/ai/types";
import type { ObjectiveId, FormativeQuizAsset, AnswerKeyAsset, DifferentiatedPracticeAsset } from "../lib/contracts";
import { validateLearningPack } from "../lib/validation";

const testInput: GenerationInput = {
  sourceId: "test-source-id" as any,
  sourceContent: "Photosynthesis is the process by which green plants...",
  sourceReference: "manual entry",
  sourceLabel: "Photosynthesis stub",
  sourceVersion: 1,
  objectives: [
    { objectiveId: "obj-1" as ObjectiveId, text: "Explain photosynthesis." },
    { objectiveId: "obj-2" as ObjectiveId, text: "Identify inputs and outputs." }
  ],
  targetLevel: "beginner",
  difficulty: "easy",
  vocabulary: "standard",
  length: "concise",
  answerReveal: "include-key",
  modelConfig: {
    provider: "openai",
    modelId: "stub-model",
    temperature: 0.2,
    configuredAt: new Date().toISOString(),
  }
};

async function main() {
  console.log("\n═══ LessonFoundry — Task 13: Validator Tests ═══\n");

  const result1 = await generateLearningPack(testInput);
  if (result1.status !== "success") throw new Error("Generator failed");
  const basePack = result1.pack;

  // Helper to deep clone the pack
  const clone = () => JSON.parse(JSON.stringify(basePack)) as typeof basePack;

  // Test 1: Valid generated pack → no blocking issues.
  const t1Pack = clone();
  const v1 = validateLearningPack(t1Pack);
  // It may have the "unsupported-claim" warning
  const t1HasErrors = v1.issues.some(i => i.severity === "error");
  console.log(`Test 1 (Valid pack): ${!t1HasErrors ? "PASS" : "FAIL"}`);

  // Test 2: Remove objective alignment from one quiz question → alignment issue detected.
  const t2Pack = clone();
  const t2Quiz = t2Pack.assets.find(a => a.type === "formative-quiz") as FormativeQuizAsset;
  t2Quiz.questions[0].objectiveAlignment = [];
  const v2 = validateLearningPack(t2Pack);
  const t2Pass = v2.issues.some(i => i.issueType === "missing-objective-coverage" && i.message.includes("Question"));
  console.log(`Test 2 (Missing question alignment): ${t2Pass ? "PASS" : "FAIL"}`);

  // Test 3: Create two identical quiz prompts → duplicate question issue detected.
  const t3Pack = clone();
  const t3Quiz = t3Pack.assets.find(a => a.type === "formative-quiz") as FormativeQuizAsset;
  t3Quiz.questions.push(JSON.parse(JSON.stringify(t3Quiz.questions[0]))); // duplicate
  t3Quiz.questions[1].questionId = "dup-q-id"; // make ID unique to only trigger duplicate prompt
  const v3 = validateLearningPack(t3Pack);
  const t3Pass = v3.issues.some(i => i.issueType === "duplicate-question");
  console.log(`Test 3 (Duplicate question): ${t3Pass ? "PASS" : "FAIL"}`);

  // Test 4: Make a quiz prompt contain its expected answer → answer leakage issue detected.
  const t4Pack = clone();
  const t4Quiz = t4Pack.assets.find(a => a.type === "formative-quiz") as FormativeQuizAsset;
  const t4Key = t4Pack.assets.find(a => a.type === "answer-key") as AnswerKeyAsset;
  
  // Find a question and its answer
  const t4Q = t4Quiz.questions[0];
  const t4Ans = t4Key.entries.find(e => e.questionId === t4Q.questionId)!;
  // Let's set the answer to "chloroplasts" and put it in the prompt
  t4Ans.answer = "chloroplasts";
  if (t4Q.type === "multiple-choice") {
    t4Q.stem = "What happens in chloroplasts?";
  } else {
    t4Q.prompt = "What happens in chloroplasts?";
  }
  const v4 = validateLearningPack(t4Pack);
  const t4Pass = v4.issues.some(i => i.issueType === "answer-leakage");
  console.log(`Test 4 (Answer leakage): ${t4Pass ? "PASS" : "FAIL"}`);

  // Test 5: Remove all content mapped to one objective → missing objective coverage detected.
  const t5Pack = clone();
  t5Pack.assets.forEach(a => {
    a.objectiveAlignment = a.objectiveAlignment.filter(o => o.objectiveId !== "obj-1");
    if (a.type === "formative-quiz" || a.type === "differentiated-practice") {
      a.questions.forEach(q => {
        q.objectiveAlignment = q.objectiveAlignment.filter(o => o.objectiveId !== "obj-1");
      });
    }
  });
  const v5 = validateLearningPack(t5Pack);
  const t5Pass = v5.issues.some(i => i.issueType === "missing-objective-coverage" && i.affectedObjectiveId === "obj-1");
  console.log(`Test 5 (Missing objective coverage): ${t5Pass ? "PASS" : "FAIL"}`);

  // Test 6: Break an answer-key reference → malformed answer key detected.
  const t6Pack = clone();
  const t6Key = t6Pack.assets.find(a => a.type === "answer-key") as AnswerKeyAsset;
  t6Key.entries[0].questionId = "broken-id";
  const v6 = validateLearningPack(t6Pack);
  const t6Pass = v6.issues.some(i => i.issueType === "malformed-answer-key");
  console.log(`Test 6 (Malformed answer key): ${t6Pass ? "PASS" : "FAIL"}`);

  // Test 7: Make easy and advanced practice prompts identical → near-identical variant issue detected.
  const t7Pack = clone();
  const t7Easy = t7Pack.assets.find(a => a.type === "differentiated-practice" && a.practiceDifficulty === "easy") as DifferentiatedPracticeAsset;
  const t7Adv = t7Pack.assets.find(a => a.type === "differentiated-practice" && a.practiceDifficulty === "advanced") as DifferentiatedPracticeAsset;
  // copy easy question over to advanced
  t7Adv.questions = JSON.parse(JSON.stringify(t7Easy.questions));
  t7Adv.questions[0].questionId = "diff-id-but-same-prompt";
  const v7 = validateLearningPack(t7Pack);
  const t7Pass = v7.issues.some(i => i.issueType === "near-identical-variants");
  console.log(`Test 7 (Near-identical variants): ${t7Pass ? "PASS" : "FAIL"}`);

  // Test 8: Create an obvious difficulty metadata mismatch → difficulty mismatch detected.
  const t8Pack = clone();
  t8Pack.configuration.difficulty = "easy";
  // Remove easy practice, so we only have advanced
  t8Pack.assets = t8Pack.assets.filter(a => !(a.type === "differentiated-practice" && a.practiceDifficulty === "easy"));
  const v8 = validateLearningPack(t8Pack);
  const t8Pass = v8.issues.some(i => i.issueType === "difficulty-mismatch");
  console.log(`Test 8 (Difficulty mismatch): ${t8Pass ? "PASS" : "FAIL"}`);

  // Test 9: Use an invalid objective ID → orphan alignment issue detected.
  const t9Pack = clone();
  t9Pack.assets[0].objectiveAlignment.push({ objectiveId: "invalid-obj-id" as ObjectiveId, rationale: "test" });
  const v9 = validateLearningPack(t9Pack);
  const t9Pass = v9.issues.some(i => i.issueType === "orphan-alignment" && i.affectedObjectiveId === "invalid-obj-id");
  console.log(`Test 9 (Orphan alignment): ${t9Pass ? "PASS" : "FAIL"}`);

  // Test 10: Run validator twice on the same input → equivalent results.
  const v10a = validateLearningPack(t1Pack);
  const v10b = validateLearningPack(t1Pack);
  // Need to strip random issue IDs for comparison
  const stripId = (issues: any[]) => issues.map(i => ({ ...i, issueId: "ID" }));
  const isEquivalent = JSON.stringify(stripId(v10a.issues)) === JSON.stringify(stripId(v10b.issues));
  console.log(`Test 10 (Deterministic validator): ${isEquivalent ? "PASS" : "FAIL"}`);

  console.log("\n═══ Validation test complete ═══\n");
}

main().catch(err => {
  console.error("Test failed", err);
  process.exit(1);
});
