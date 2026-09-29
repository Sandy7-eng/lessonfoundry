"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  
  // Close mobile menu on route change
  const prevPathnameRef = useRef(pathname);
  if (pathname !== prevPathnameRef.current) {
    prevPathnameRef.current = pathname;
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }

  // Lock background scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    { label: "Dashboard", href: "/" },
    { label: "Projects", href: "/projects" },
    { label: "Sources", href: "/sources" },
    { label: "Settings", href: "/settings" },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fbfbfb] dark:bg-zinc-950">
      {/* ─── DESKTOP/TABLET SIDEBAR ────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 w-20 lg:w-64 transition-all duration-300 z-10 shrink-0">
        <div className="flex h-16 items-center justify-center lg:justify-start lg:px-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <span className="flex h-8 w-8 items-center justify-center bg-zinc-950 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
              LF
            </span>
            <span className="hidden lg:block font-semibold tracking-tight text-base text-zinc-950 dark:text-zinc-100">
              LessonFoundry
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-none px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-200/50 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                }`}
              >
                {/* Icon placeholder based on label */}
                <div className="h-5 w-5 shrink-0 flex items-center justify-center border border-current opacity-70">
                  {item.label[0]}
                </div>
                <span className="hidden lg:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <Link
            href="/project/new"
            className="flex items-center justify-center gap-2 w-full border border-zinc-950 bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-700 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <span>+</span>
            <span className="hidden lg:block">New Project</span>
          </Link>
        </div>
      </aside>

      {/* ─── MOBILE DRAWER BACKDROP ────────────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── MOBILE SIDEBAR ────────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-zinc-200 bg-zinc-50 transition-transform duration-300 ease-in-out dark:border-zinc-800 dark:bg-zinc-900 md:hidden flex flex-col ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <span className="flex h-8 w-8 items-center justify-center bg-zinc-950 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
              LF
            </span>
            <span className="font-semibold tracking-tight text-base text-zinc-950 dark:text-zinc-100">
              LessonFoundry
            </span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 -mr-2 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-200/50 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                }`}
              >
                <div className="h-5 w-5 shrink-0 flex items-center justify-center border border-current opacity-70">
                  {item.label[0]}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ─── MAIN CONTENT AREA ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* HEADER */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 md:hidden"
              aria-label="Open menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="font-mono text-xs text-zinc-400 dark:text-zinc-500 hidden sm:block">
              {pathname === "/" ? "Workspace / Dashboard" : `Workspace ${pathname}`}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-8 w-64 items-center border border-zinc-200 px-3 dark:border-zinc-800">
              <span className="text-xs text-zinc-400 dark:text-zinc-600">Search...</span>
            </div>
            <div className="h-8 w-8 shrink-0 rounded-none bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
              <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">T</span>
            </div>
          </div>
        </header>

        {/* MAIN SCROLLABLE AREA */}
        <main className="flex-1 overflow-auto bg-[#fbfbfb] dark:bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}
