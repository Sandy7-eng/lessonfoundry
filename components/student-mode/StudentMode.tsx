"use client";

import React from "react";
import type { LearningPack } from "@/lib/contracts";
import { getStudentView } from "@/lib/student";
import { StudentAssetView } from "./StudentAssetView";

interface StudentModeProps {
  pack: LearningPack;
  onExit?: () => void;
}

export function StudentMode({ pack, onExit }: StudentModeProps) {
  const studentView = getStudentView(pack);

  return (
    <div className="min-h-screen bg-zinc-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Lesson Materials</h1>
          {onExit && (
            <button
              onClick={onExit}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors border px-3 py-1.5 border-zinc-300 bg-white"
            >
              Exit Student Mode
            </button>
          )}
        </header>

        {!studentView.isStudentReady ? (
          <div className="bg-white border border-zinc-200 p-8 text-center">
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">Learning pack is not ready for students.</h2>
            <p className="text-zinc-600">
              Required learning assets still need teacher approval before they can be viewed here.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {studentView.assets.map((asset, idx) => (
              <StudentAssetView key={`${asset.type}-${idx}`} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
