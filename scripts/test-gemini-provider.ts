import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createGeminiGenerationProvider } from "../lib/ai/providers/gemini";
import type { GenerationInput } from "../lib/ai/types";
import type { SourceId } from "../lib/contracts";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^#\s]+?)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

async function runSmokeTest() {
  console.log("Starting Gemini Provider Smoke Test...");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.error("❌ GEMINI_API_KEY is not set in environment.");
    process.exit(1);
  }
  console.log("✅ GEMINI_API_KEY is present.");

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  console.log(`✅ Using model: ${model}`);

  const provider = createGeminiGenerationProvider();
  
  const dummyInput: GenerationInput = {
    sourceId: "src-123" as SourceId,
    sourceContent: "The water cycle describes how water evaporates from the surface of the earth, rises into the atmosphere, cools and condenses into rain or snow in clouds, and falls again to the surface as precipitation.",
    sourceReference: "Smoke Test Source",
    sourceLabel: "Water Cycle Demo",
    sourceVersion: 1,
    objectives: [
      { objectiveId: "obj-1" as import("../lib/contracts").ObjectiveId, text: "Explain evaporation and precipitation" },
      { objectiveId: "obj-2" as import("../lib/contracts").ObjectiveId, text: "Describe the role of clouds" },
    ],
    targetLevel: "Middle School (Ages 11-14)" as import("../lib/contracts").PackTargetLevel,
    difficulty: "standard" as import("../lib/contracts").PackDifficulty,
    vocabulary: "standard",
    length: "standard",
    answerReveal: "hide",
    modelConfig: {
      provider: "google",
      modelId: model,
      temperature: 0.2,
      configuredAt: new Date().toISOString(),
    },
  };

  console.log("Sending request to Gemini API...");
  const startTime = Date.now();
  
  try {
    const result = await provider.generate(dummyInput);
    const elapsed = Date.now() - startTime;
    
    if (result.status === "failure") {
      console.error(`❌ Generation failed (${elapsed}ms):`);
      console.error(`   Code: ${result.error.code}`);
      console.error(`   Message: ${result.error.message}`);
      if (result.error.providerDetail) {
        console.error(`   Detail: ${result.error.providerDetail}`);
      }
      process.exit(1);
    }
    
    console.log(`✅ Generation succeeded in ${elapsed}ms.`);
    console.log("Validating structured output shape...");
    
    const data = result.data;
    if (!data.conceptExplanation || !data.formativeQuiz || !data.workedExample) {
      console.error("❌ Missing required assets in output:");
      console.error(Object.keys(data));
      process.exit(1);
    }
    
    console.log("✅ Concept Explanation title:", data.conceptExplanation.title);
    console.log(`✅ Formative Quiz questions: ${data.formativeQuiz.questions.length}`);
    console.log("✅ Smoke test passed.");
    process.exit(0);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Unexpected execution error:", message);
    process.exit(1);
  }
}

runSmokeTest();
