import type { LearningPack } from "../contracts";
import { isPackStudentReady } from "../review";

export interface StudentConceptExplanation {
  type: "concept-explanation";
  title: string;
  body: string;
}

export interface StudentWorkedExample {
  type: "worked-example";
  title: string;
  steps: Array<{ instruction: string; explanation?: string }>;
}

export interface StudentQuizOption {
  key: string;
  text: string;
}

export interface StudentMultipleChoiceQuestion {
  type: "multiple-choice";
  stem: string;
  options: StudentQuizOption[];
}

export interface StudentShortAnswerQuestion {
  type: "short-answer";
  prompt: string;
  maxWords?: number;
}

export type StudentQuizQuestion = StudentMultipleChoiceQuestion | StudentShortAnswerQuestion;

export interface StudentFormativeQuiz {
  type: "formative-quiz";
  title: string;
  questions: StudentQuizQuestion[];
}

export interface StudentAnswerKeyEntry {
  answer: string;
  explanation: string;
}

export interface StudentAnswerKey {
  type: "answer-key";
  entries: StudentAnswerKeyEntry[];
}

export interface StudentDifferentiatedPractice {
  type: "differentiated-practice";
  practiceDifficulty: "easy" | "advanced";
  title: string;
  questions: StudentQuizQuestion[];
}

export interface StudentRevisionSheet {
  type: "revision-sheet";
  title: string;
  points: string[];
}

export type StudentAsset =
  | StudentConceptExplanation
  | StudentWorkedExample
  | StudentFormativeQuiz
  | StudentAnswerKey
  | StudentDifferentiatedPractice
  | StudentRevisionSheet;

export interface StudentView {
  isStudentReady: boolean;
  assets: StudentAsset[];
}

export function getStudentView(pack: LearningPack): StudentView {
  const approvedAssets = pack.assets.filter(a => a.reviewStatus === "approved");
  
  const studentAssets: StudentAsset[] = [];
  
  for (const a of approvedAssets) {
    if (a.type === "concept-explanation") {
      studentAssets.push({ type: "concept-explanation", title: a.title, body: a.body });
    } else if (a.type === "worked-example") {
      studentAssets.push({
        type: "worked-example",
        title: a.title,
        steps: a.steps.map(s => ({ instruction: s.instruction, explanation: s.explanation }))
      });
    } else if (a.type === "formative-quiz") {
      studentAssets.push({
        type: "formative-quiz",
        title: a.title,
        questions: a.questions.map(q => {
          if (q.type === "multiple-choice") {
            return {
              type: "multiple-choice",
              stem: q.stem,
              options: q.options.map(o => ({ key: o.key, text: o.text }))
            };
          } else {
            return {
              type: "short-answer",
              prompt: q.prompt,
              maxWords: q.maxWords
            };
          }
        })
      });
    } else if (a.type === "answer-key") {
      if (pack.configuration.answerReveal === "include-key") {
        studentAssets.push({
          type: "answer-key",
          entries: a.entries.map(e => ({ answer: e.answer, explanation: e.explanation }))
        });
      }
    } else if (a.type === "differentiated-practice") {
      studentAssets.push({
        type: "differentiated-practice",
        practiceDifficulty: a.practiceDifficulty,
        title: a.title,
        questions: a.questions.map(q => {
          if (q.type === "multiple-choice") {
            return {
              type: "multiple-choice",
              stem: q.stem,
              options: q.options.map(o => ({ key: o.key, text: o.text }))
            };
          } else {
            return {
              type: "short-answer",
              prompt: q.prompt,
              maxWords: q.maxWords
            };
          }
        })
      });
    } else if (a.type === "revision-sheet") {
      studentAssets.push({
        type: "revision-sheet",
        title: a.title,
        points: [...a.points]
      });
    }
  }

  return {
    isStudentReady: isPackStudentReady(pack),
    assets: studentAssets,
  };
}
