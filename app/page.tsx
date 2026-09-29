import Link from "next/link";

// MOCK DATA: For UI demonstration only. No database backend yet.
const MOCK_PROJECTS = [
  {
    id: "p_1",
    name: "Newton's Laws",
    description: "Introductory physics module covering the three laws of motion.",
    sourceCount: 1,
    objectiveCount: 3,
    status: "Draft",
    lastUpdated: "2 hours ago",
  },
  {
    id: "p_2",
    name: "Cell Biology",
    description: "High school biology unit on cell structures and functions.",
    sourceCount: 2,
    objectiveCount: 5,
    status: "Published",
    lastUpdated: "1 day ago",
  },
  {
    id: "p_3",
    name: "Introduction to Python",
    description: "Beginner programming concepts, variables, and loops.",
    sourceCount: 1,
    objectiveCount: 4,
    status: "Review",
    lastUpdated: "3 days ago",
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
            Your Learning Projects
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Create and manage source-grounded learning packs.
          </p>
        </div>
        <Link
          href="/project/new"
          className="flex shrink-0 items-center gap-2 border border-zinc-950 bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-700 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          <span>+</span>
          New Project
        </Link>
      </div>

      <div className="mb-6 font-mono text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Recent Projects (Mock Data)
      </div>

      {MOCK_PROJECTS.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-zinc-200 py-24 text-center dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            No learning projects yet.
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create your first project from a trusted teaching source.
          </p>
          <Link
            href="/project/new"
            className="mt-6 border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900/50"
          >
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_PROJECTS.map((project) => (
            <div
              key={project.id}
              className="group relative flex flex-col justify-between border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${
                      project.status === "Published"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400"
                        : project.status === "Review"
                        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400"
                        : "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    {project.status}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {project.lastUpdated}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                  <Link href={`/project/${project.id}`} className="focus:outline-none">
                    <span className="absolute inset-0" aria-hidden="true" />
                    {project.name}
                  </Link>
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {project.description}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-800/50">
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {project.sourceCount} {project.sourceCount === 1 ? 'Source' : 'Sources'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {project.objectiveCount} {project.objectiveCount === 1 ? 'Objective' : 'Objectives'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
