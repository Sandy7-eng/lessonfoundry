import type { StudentAsset } from "@/lib/student";

export function StudentAssetView({ asset }: { asset: StudentAsset }) {
  if (asset.type === "concept-explanation") {
    return (
      <section className="mb-10 last:mb-0">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">{asset.title}</h2>
        <div className="prose prose-zinc max-w-none text-zinc-800">
          {asset.body.split("\n\n").map((para, i) => (
            <p key={i} className="mb-4 last:mb-0 leading-relaxed">{para}</p>
          ))}
        </div>
      </section>
    );
  }

  if (asset.type === "worked-example") {
    return (
      <section className="mb-10 last:mb-0">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">{asset.title}</h2>
        <div className="space-y-6">
          {asset.steps.map((step, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-4 border-l-2 border-zinc-200 pl-4">
              <div className="flex-1">
                <span className="text-sm font-mono text-zinc-500 block mb-1">Step {index + 1}</span>
                <p className="text-zinc-900">{step.instruction}</p>
              </div>
              {step.explanation && (
                <div className="flex-1 text-sm text-zinc-600 sm:pt-6">
                  {step.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (asset.type === "formative-quiz" || asset.type === "differentiated-practice") {
    return (
      <section className="mb-10 last:mb-0">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">
          {asset.title}
          {asset.type === "differentiated-practice" && (
            <span className="ml-3 text-sm font-normal text-zinc-500 uppercase tracking-wider">
              ({asset.practiceDifficulty} practice)
            </span>
          )}
        </h2>
        <div className="space-y-8">
          {asset.questions.map((q, index) => (
            <div key={index} className="border border-zinc-200 p-5 bg-white">
              <p className="text-zinc-900 font-medium mb-4">
                <span className="mr-2 text-zinc-400 font-mono">{index + 1}.</span>
                {q.type === "multiple-choice" ? q.stem : q.prompt}
              </p>
              {q.type === "multiple-choice" && (
                <div className="flex flex-col gap-2">
                  {q.options.map((opt) => (
                    <label key={opt.key} className="flex items-start gap-3 p-3 border border-zinc-100 hover:bg-zinc-50 cursor-pointer">
                      <input type="radio" name={`q-${index}`} value={opt.key} className="mt-1" />
                      <span className="text-zinc-800">
                        <span className="font-mono text-zinc-400 mr-2">{opt.key}.</span>
                        {opt.text}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === "short-answer" && (
                <textarea 
                  className="w-full border border-zinc-200 p-3 text-zinc-800 focus:outline-none focus:border-zinc-400"
                  rows={4}
                  placeholder={`Write your answer here... ${q.maxWords ? `(Max ${q.maxWords} words)` : ""}`}
                />
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (asset.type === "revision-sheet") {
    return (
      <section className="mb-10 last:mb-0">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">{asset.title}</h2>
        <ul className="list-disc pl-5 space-y-2 text-zinc-800">
          {asset.points.map((pt, i) => (
            <li key={i} className="leading-relaxed">{pt}</li>
          ))}
        </ul>
      </section>
    );
  }

  if (asset.type === "answer-key") {
    return (
      <section className="mb-10 last:mb-0 border-t border-zinc-200 pt-8 mt-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">Answer Key</h2>
        <div className="space-y-6">
          {asset.entries.map((entry, index) => (
            <div key={index} className="bg-zinc-50 p-4 border border-zinc-200">
              <p className="font-medium text-zinc-900 mb-2">
                <span className="text-zinc-500 font-mono mr-2">Q{index + 1}.</span>
                {entry.answer}
              </p>
              <p className="text-sm text-zinc-600">{entry.explanation}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return null;
}
