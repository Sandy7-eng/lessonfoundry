import { SourceWorkspace } from "@/components/source-workspace/SourceWorkspace";

export default function ProjectWorkspacePage() {
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* ─── LEFT: SOURCES PANEL ───────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/30 overflow-y-auto">
        <div className="flex h-12 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-950 dark:text-zinc-50">
            Sources
          </h2>
          <button className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <div className="flex-1 p-4">
          {/* Mock Source Item */}
          <div className="group flex cursor-pointer items-start gap-3 border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-zinc-200 bg-zinc-50 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              TXT
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-950 dark:text-zinc-50 line-clamp-1">
                Main Teaching Source
              </div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Pasted Text • 1.2k words
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-center border border-dashed border-zinc-200 py-6 dark:border-zinc-800">
            <button className="text-xs font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50">
              + Add another source
            </button>
          </div>
        </div>
      </aside>

      {/* ─── CENTER: LEARNING PACK WORKSPACE ───────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-white dark:bg-zinc-950">
        <SourceWorkspace />
      </main>

      {/* ─── RIGHT: INSPECTOR / DETAILS ────────────────────────────────────── */}
      <aside className="hidden xl:flex w-72 shrink-0 flex-col border-l border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/30 overflow-y-auto">
        <div className="flex h-12 items-center px-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-950 dark:text-zinc-50">
            Project Details
          </h2>
        </div>
        <div className="flex-1 p-4">
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Status</h3>
              <div className="mt-2 inline-flex items-center gap-1.5 border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                <span className="h-1.5 w-1.5 bg-zinc-400 dark:bg-zinc-500" />
                Draft Mode
              </div>
            </div>
            
            <div>
              <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Generation Model</h3>
              <p className="mt-1 text-sm text-zinc-950 dark:text-zinc-50">Gemini 2.5 Flash</p>
            </div>
            
            <div>
              <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Activity</h3>
              <div className="mt-3 flex flex-col gap-3 relative before:absolute before:inset-y-0 before:left-2 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800">
                <div className="relative flex gap-3">
                  <div className="h-4 w-4 shrink-0 rounded-none border border-zinc-200 bg-white z-10 dark:border-zinc-800 dark:bg-zinc-950" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-zinc-950 dark:text-zinc-50">Project Created</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Just now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
