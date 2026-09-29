import { createGeminiGenerationProvider } from "../lib/ai/providers/gemini";
import { stubProvider } from "../lib/ai/provider";
import type { GenerationInput, RawProviderOutput } from "../lib/ai/types";

// Mock dummy input
const dummyInput: GenerationInput = {
  sourceId: "src-123" as import("../lib/contracts").SourceId,
  sourceContent: "Test content",
  sourceReference: "Ref",
  sourceLabel: "Label",
  sourceVersion: 1,
  objectives: [{ objectiveId: "obj-1" as import("../lib/contracts").ObjectiveId, text: "Obj1" }, { objectiveId: "obj-2" as import("../lib/contracts").ObjectiveId, text: "Obj2" }],
  targetLevel: "Middle School (Ages 11-14)" as import("../lib/contracts").PackTargetLevel,
  difficulty: "standard" as import("../lib/contracts").PackDifficulty,
  vocabulary: "standard",
  length: "standard",
  answerReveal: "hide",
  modelConfig: {
    provider: "google",
    modelId: "gemini-3.5-flash",
    temperature: 0.2,
    configuredAt: new Date().toISOString(),
  },
};

const dummySuccessPayload: RawProviderOutput = {
  conceptExplanation: { title: "C", body: "C", objectiveAlignment: [] },
  workedExample: { title: "W", steps: [], objectiveAlignment: [] },
  formativeQuiz: { title: "F", questions: [], objectiveAlignment: [] },
  easyPractice: { title: "E", questions: [], objectiveAlignment: [] },
  advancedPractice: { title: "A", questions: [], objectiveAlignment: [] },
  revisionSheet: { title: "R", points: [], objectiveAlignment: [] },
};

function mockFetch(responses: { status: number, data?: unknown }[]) {
  let callCount = 0;
  const originalFetch = global.fetch;
  global.fetch = async (_url, _init) => {
    const res = responses[callCount] || responses[responses.length - 1];
    callCount++;
    const payload = res.status === 200 
      ? { candidates: [{ content: { parts: [{ text: JSON.stringify(res.data) }] } }] }
      : { error: { message: "Error" } };

    return new Response(JSON.stringify(payload), {
      status: res.status,
      headers: { "content-type": "application/json" }
    });
  };
  return () => {
    global.fetch = originalFetch;
    return callCount;
  };
}

async function runTests() {
  process.env.GEMINI_API_KEY = "dummy_key";
  process.env.GEMINI_MODEL = "gemini-3.5-flash";
  process.env.GEMINI_FALLBACK_MODEL = "gemini-3.5-flash-lite";

  let failCount = 0;
  let passCount = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passCount++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failCount++;
    }
  }

  // A. successful primary generation
  {
    const getCalls = mockFetch([{ status: 200, data: dummySuccessPayload }]);
    const provider = createGeminiGenerationProvider();
    const result = await provider.generate(dummyInput);
    assert(result.status === "success" && getCalls() === 1, "A. successful primary generation");
  }

  // B. primary 503 -> retry -> success
  {
    const getCalls = mockFetch([
      { status: 503 },
      { status: 200, data: dummySuccessPayload }
    ]);
    const provider = createGeminiGenerationProvider();
    const result = await provider.generate(dummyInput);
    assert(result.status === "success" && getCalls() === 2, "B. primary 503 -> retry -> success");
  }

  // C. primary 429 -> retry -> success
  {
    const getCalls = mockFetch([
      { status: 429 },
      { status: 200, data: dummySuccessPayload }
    ]);
    const provider = createGeminiGenerationProvider();
    const result = await provider.generate(dummyInput);
    assert(result.status === "success" && getCalls() === 2, "C. primary 429 -> retry -> success");
  }

  // D. primary 503 -> all retries fail -> fallback succeeds (I. provenance records fallback model correctly)
  {
    const getCalls = mockFetch([
      { status: 503 }, // try 1
      { status: 503 }, // try 2
      { status: 503 }, // try 3
      { status: 200, data: dummySuccessPayload } // fallback try 1
    ]);
    const provider = createGeminiGenerationProvider();
    const result = await provider.generate(dummyInput);
    assert(result.status === "success" && getCalls() === 4, "D. primary 503 -> all retries fail -> fallback succeeds");
    assert(provider.providerLabel === "gemini-3.5-flash-lite", "I. provenance records fallback model correctly");
  }

  // E. primary 503 -> fallback also fails -> typed generation failure
  {
    const getCalls = mockFetch([
      { status: 503 }, // try 1
      { status: 503 }, // try 2
      { status: 503 }, // try 3
      { status: 503 }  // fallback try 1
    ]);
    const provider = createGeminiGenerationProvider();
    const result = await provider.generate(dummyInput);
    assert(result.status === "failure" && getCalls() === 4, "E. primary 503 -> fallback also fails -> typed generation failure");
  }

  // F. invalid API key (403) -> no unnecessary retries
  {
    const getCalls = mockFetch([
      { status: 403 }
    ]);
    const provider = createGeminiGenerationProvider();
    const result = await provider.generate(dummyInput);
    assert(result.status === "failure" && getCalls() === 1, "F. invalid API key -> no unnecessary retries");
  }

  // G. malformed request (400) -> no retry
  {
    const getCalls = mockFetch([
      { status: 400 }
    ]);
    const provider = createGeminiGenerationProvider();
    const result = await provider.generate(dummyInput);
    assert(result.status === "failure" && getCalls() === 1, "G. malformed request -> no retry");
  }

  // H. stub provider still works
  {
    const result = await stubProvider.generate(dummyInput);
    assert(result.status === "success" && stubProvider.providerLabel === "stub/deterministic-generator", "H. stub provider still works");
  }

  if (failCount > 0) {
    console.error(`\nTests finished with ${failCount} failures.`);
    process.exit(1);
  } else {
    console.log(`\nAll ${passCount} tests passed!`);
  }
}

runTests().catch(console.error);
