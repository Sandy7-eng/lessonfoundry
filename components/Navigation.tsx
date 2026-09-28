"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

interface NavItem {
  label: string;
  href: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "#overview" },
  { label: "Architecture", href: "#architecture" },
  { label: "System Standards", href: "#standards" },
  { label: "Documentation", href: "#docs" },
];

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close mobile menu on escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        triggerRef.current?.focus();
      }
    },
    [isMobileMenuOpen]
  );

  // Lock background scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isMobileMenuOpen, handleKeyDown]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 text-zinc-950 backdrop-blur-none transition-colors dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-sm tracking-widest uppercase transition-opacity hover:opacity-80"
          >
            <span className="flex h-6 w-6 items-center justify-center bg-zinc-950 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
              LF
            </span>
            <span className="font-semibold tracking-tight text-base font-sans normal-case text-zinc-950 dark:text-zinc-100">
              LessonFoundry
            </span>
          </Link>
          <span className="hidden font-mono text-xs text-zinc-400 dark:text-zinc-600 sm:inline-block">
            / v0.1.0-alpha
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav
          className="hidden md:flex md:items-center md:gap-8"
          aria-label="Main Navigation"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Action Controls & Mobile Trigger */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex sm:items-center sm:gap-2">
            <span className="inline-flex items-center gap-1.5 border border-zinc-200 px-2.5 py-1 font-mono text-xs text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
              <span className="h-1.5 w-1.5 bg-emerald-500" />
              Ready
            </span>
          </div>

          {/* Mobile Menu Button */}
          <button
            ref={triggerRef}
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center border border-zinc-200 text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:focus-visible:ring-zinc-100 md:hidden"
            aria-controls="mobile-navigation"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="square" strokeLinejoin="miter" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 top-16 z-30 bg-zinc-950/40 backdrop-blur-none transition-opacity md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Menu */}
      <div
        id="mobile-navigation"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
        className={`fixed top-16 right-0 left-0 z-40 border-b border-zinc-200 bg-white p-6 shadow-sm transition-all duration-200 ease-in-out dark:border-zinc-800 dark:bg-zinc-950 md:hidden ${
          isMobileMenuOpen
            ? "visible opacity-100 translate-y-0"
            : "invisible opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="flex flex-col gap-4">
          <div className="border-b border-zinc-100 pb-2 text-xs font-mono uppercase tracking-wider text-zinc-400 dark:border-zinc-900 dark:text-zinc-600">
            Navigation Index
          </div>
          <nav className="flex flex-col space-y-3" aria-label="Mobile menu items">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={closeMobileMenu}
                className="flex items-center justify-between py-2 text-base font-medium text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
              >
                <span>{item.label}</span>
                <span className="font-mono text-xs text-zinc-400">→</span>
              </Link>
            ))}
          </nav>

          <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-900">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400">
              <span>Status</span>
              <span className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                <span className="h-1.5 w-1.5 bg-emerald-500" />
                Initialized
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
