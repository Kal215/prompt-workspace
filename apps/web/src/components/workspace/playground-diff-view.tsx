"use client";

import { useMemo } from "react";
import { diffWords, type Change } from "diff";

interface PlaygroundDiffViewProps {
  textA: string;
  textB: string;
  modelAName?: string;
  modelBName?: string;
  lang?: "en" | "id";
}

export function PlaygroundDiffView({
  textA,
  textB,
  modelAName = "Model A",
  modelBName = "Model B",
  lang = "id",
}: PlaygroundDiffViewProps) {
  const diffResult = useMemo(() => {
    if (!textA && !textB) return [];
    return diffWords(textA, textB);
  }, [textA, textB]);

  if (!textA && !textB) {
    return (
      <div className="p-8 text-center text-xs font-mono text-stone-400">
        {lang === "en" ? "No outputs to compare yet." : "Belum ada output untuk dibandingkan."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs font-mono p-3 bg-white rounded-xl border border-stone-200 text-stone-600">
        <span className="font-semibold text-stone-900">
          {lang === "en" ? "Diff Legend:" : "Keterangan Diff:"}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" />
          <span className="text-red-700">
            {lang === "en" ? `Only in ${modelAName}` : `Hanya di ${modelAName}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
          <span className="text-emerald-700">
            {lang === "en" ? `Only in ${modelBName}` : `Hanya di ${modelBName}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-stone-100 border border-stone-200" />
          <span className="text-stone-500">
            {lang === "en" ? "Common in Both" : "Sama di Keduanya"}
          </span>
        </div>
      </div>

      {/* Rendered Diff */}
      <div className="p-5 rounded-2xl bg-[#faf9f6] border border-stone-200/80 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto shadow-inner">
        {diffResult.map((part: Change, i: number) => {
          if (part.added) {
            return (
              <span
                key={i}
                className="bg-emerald-100 text-emerald-900 border-b border-emerald-300 px-0.5 rounded font-medium"
                title={`${modelBName} addition`}
              >
                {part.value}
              </span>
            );
          }
          if (part.removed) {
            return (
              <span
                key={i}
                className="bg-red-100 text-red-900 line-through border-b border-red-300 px-0.5 rounded opacity-80"
                title={`${modelAName} only`}
              >
                {part.value}
              </span>
            );
          }
          return (
            <span key={i} className="text-stone-800">
              {part.value}
            </span>
          );
        })}
      </div>
    </div>
  );
}
