"use client";

import React, { useMemo } from "react";
import { marked } from "marked";

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export function MarkdownView({ content, className = "" }: MarkdownViewProps) {
  const html = useMemo(() => {
    try {
      return marked.parse(content, { breaks: true, gfm: true }) as string;
    } catch {
      return content;
    }
  }, [content]);

  return (
    <div
      className={`markdown-rendered text-xs leading-relaxed text-stone-800 space-y-2.5 
        [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-stone-950 [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:border-b [&_h1]:border-stone-200 [&_h1]:pb-1
        [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-stone-900 [&_h2]:mt-3.5 [&_h2]:mb-1.5
        [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-stone-800 [&_h3]:mt-2.5 [&_h3]:mb-1
        [&_p]:my-1.5 [&_p]:leading-relaxed
        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:space-y-0.5
        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:space-y-0.5
        [&_li]:leading-relaxed
        [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:rounded-xl [&_table]:overflow-hidden [&_table]:border [&_table]:border-stone-200
        [&_th]:border [&_th]:border-stone-200 [&_th]:bg-stone-100/80 [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-stone-900
        [&_td]:border [&_td]:border-stone-200 [&_td]:p-2 [&_td]:text-stone-800
        [&_tr:nth-child(even)]:bg-[#faf9f6]
        [&_code]:font-mono [&_code]:text-[11px] [&_code]:bg-stone-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:border [&_code]:border-stone-200/60
        [&_pre]:bg-stone-900 [&_pre]:text-stone-100 [&_pre]:p-3.5 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-2.5
        [&_pre_code]:bg-transparent [&_pre_code]:text-stone-100 [&_pre_code]:border-0 [&_pre_code]:p-0
        [&_blockquote]:border-l-3 [&_blockquote]:border-lime-500 [&_blockquote]:pl-3.5 [&_blockquote]:italic [&_blockquote]:text-stone-600 [&_blockquote]:bg-lime-50/30 [&_blockquote]:py-1 [&_blockquote]:rounded-r-lg
        ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
