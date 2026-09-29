"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetLevel, setTargetLevel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate network delay and project creation (mock frontend-only)
    setTimeout(() => {
      // Create a mock ID based on the timestamp to feel like a real resource
      const mockId = `p_${Date.now()}`;
      router.push(`/project/${mockId}`);
    }, 600);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <Link 
          href="/" 
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
          Create New Project
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Set up a new workspace for generating source-grounded learning materials.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <label htmlFor="projectName" className="block text-sm font-medium text-zinc-950 dark:text-zinc-50">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            id="projectName"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Cellular Respiration Unit"
            className="mt-2 block w-full border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-zinc-950 dark:text-zinc-50">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe what this project is about."
            className="mt-2 block w-full resize-none border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
          />
        </div>

        <div>
          <label htmlFor="targetLevel" className="block text-sm font-medium text-zinc-950 dark:text-zinc-50">
            Target Learner Level (Optional)
          </label>
          <input
            id="targetLevel"
            type="text"
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
            placeholder="e.g., High School, Beginner, Grade 8"
            className="mt-2 block w-full border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
          />
        </div>

        <div className="mt-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <div className="flex justify-end gap-3">
            <Link
              href="/"
              className="flex items-center justify-center border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900/50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !description.trim()}
              className="flex items-center justify-center gap-2 min-w-[120px] border border-zinc-950 bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {isSubmitting ? (
                <>
                  <span
                    aria-hidden="true"
                    className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-zinc-900 dark:border-t-transparent"
                  />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
