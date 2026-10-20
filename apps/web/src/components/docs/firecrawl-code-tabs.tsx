"use client"

import React, { useState } from "react"
import { SyntaxCodeCard } from "@/components/docs/syntax-code-card"

interface FirecrawlCodeTabsProps {
  lang?: "id" | "en"
}

export function FirecrawlCodeTabs({ lang = "en" }: FirecrawlCodeTabsProps) {
  const [activeLang, setActiveLang] = useState<"cli" | "typescript" | "python" | "curl">("cli")

  const promptText =
    lang === "en"
      ? "Design a restaurant reservation system with WhatsApp webhook"
      : "Rancang sistem manajemen reservasi restoran dengan webhook WhatsApp"

  const shortPrompt =
    lang === "en"
      ? "Design a restaurant reservation system"
      : "Rancang sistem manajemen reservasi restoran"

  const cliCode = `piew "${promptText}" --framework next16`
  const tsCode = `import { PiewEngine } from "@piew/agent";

const piew = new PiewEngine();
const result = await piew.synthesize({
  prompt: "${shortPrompt}",
  framework: "nextjs-16",
  database: "sqlite",
});
console.log(result.routes);`

  const pyCode = `from piew import PiewEngine

piew = PiewEngine()
result = piew.synthesize(
  prompt="${shortPrompt}",
  framework="nextjs-16",
  database="sqlite"
)
print(result.routes)`

  const curlCode = `curl -s -X POST "https://api.piew.dev/v1/synthesize" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "${shortPrompt}",
    "framework": "nextjs-16",
    "database": "sqlite"
  }'`

  return (
    <div className="my-6">
      {/* Language Switcher Tabs */}
      <div className="flex items-center gap-1.5 mb-2">
        {(
          [
            { id: "cli", label: "CLI" },
            { id: "typescript", label: "TypeScript" },
            { id: "python", label: "Python" },
            { id: "curl", label: "cURL" },
          ] as const
        ).map((t) => {
          const isActive = activeLang === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveLang(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-white/10 text-white border border-white/10 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {activeLang === "cli" && (
        <SyntaxCodeCard filename="piew_cli.sh" copyContent={cliCode} lang={lang}>
          <span className="text-[#22c55e]">
            {lang === "en"
              ? "# Directly synthesize prompt into full-stack web app"
              : "# Eksekusi langsung sintesis prompt ke web stack"}
          </span>
          {"\n"}
          <span className="text-[#f43f5e]">piew</span>{" "}
          <span className="text-[#fde047]">&quot;{promptText}&quot;</span>{" "}
          <span className="text-[#fb923c]">--framework</span> <span className="text-[#38bdf8]">next16</span>
        </SyntaxCodeCard>
      )}

      {activeLang === "typescript" && (
        <SyntaxCodeCard filename="piew_client.ts" copyContent={tsCode} lang={lang}>
          <span className="text-[#f43f5e]">import</span> &#123; <span className="text-[#38bdf8]">PiewEngine</span> &#125; <span className="text-[#f43f5e]">from</span> <span className="text-[#fde047]">&quot;@piew/agent&quot;</span>;
          {"\n\n"}
          <span className="text-[#f43f5e]">const</span> <span className="text-[#38bdf8]">piew</span> = <span className="text-[#f43f5e]">new</span> <span className="text-[#38bdf8]">PiewEngine</span>();
          {"\n"}
          <span className="text-[#f43f5e]">const</span> <span className="text-[#f1f5f9]">result</span> = <span className="text-[#f43f5e]">await</span> <span className="text-[#38bdf8]">piew</span>.<span className="text-[#38bdf8]">synthesize</span>(&#123;
          {"\n"}  <span className="text-[#f1f5f9]">prompt</span>: <span className="text-[#fde047]">&quot;{shortPrompt}&quot;</span>,
          {"\n"}  <span className="text-[#f1f5f9]">framework</span>: <span className="text-[#fde047]">&quot;nextjs-16&quot;</span>,
          {"\n"}  <span className="text-[#f1f5f9]">database</span>: <span className="text-[#fde047]">&quot;sqlite&quot;</span>,
          {"\n"}&#125;);
          {"\n"}
          <span className="text-[#38bdf8]">console</span>.<span className="text-[#38bdf8]">log</span>(<span className="text-[#f1f5f9]">result</span>.<span className="text-[#38bdf8]">routes</span>);
        </SyntaxCodeCard>
      )}

      {activeLang === "python" && (
        <SyntaxCodeCard filename="piew_client.py" copyContent={pyCode} lang={lang}>
          <span className="text-[#f43f5e]">from</span> <span className="text-[#f1f5f9]">piew</span> <span className="text-[#f43f5e]">import</span> <span className="text-[#38bdf8]">PiewEngine</span>
          {"\n\n"}
          <span className="text-[#f1f5f9]">piew</span> = <span className="text-[#38bdf8]">PiewEngine</span>()
          {"\n"}
          <span className="text-[#f1f5f9]">result</span> = <span className="text-[#f1f5f9]">piew</span>.<span className="text-[#38bdf8]">synthesize</span>(
          {"\n"}    <span className="text-[#f1f5f9]">prompt</span>=<span className="text-[#fde047]">&quot;{shortPrompt}&quot;</span>,
          {"\n"}    <span className="text-[#f1f5f9]">framework</span>=<span className="text-[#fde047]">&quot;nextjs-16&quot;</span>,
          {"\n"}    <span className="text-[#f1f5f9]">database</span>=<span className="text-[#fde047]">&quot;sqlite&quot;</span>
          {"\n"})
          {"\n"}
          <span className="text-[#38bdf8]">print</span>(<span className="text-[#f1f5f9]">result</span>.<span className="text-[#38bdf8]">routes</span>)
        </SyntaxCodeCard>
      )}

      {activeLang === "curl" && (
        <SyntaxCodeCard filename="piew_request.sh" copyContent={curlCode} lang={lang}>
          <span className="text-[#38bdf8]">curl</span> <span className="text-[#fb923c]">-s</span> <span className="text-[#fb923c]">-X</span> <span className="text-[#f1f5f9]">POST</span> <span className="text-[#fde047]">&quot;https://api.piew.dev/v1/synthesize&quot;</span> \
          {"\n"}  <span className="text-[#fb923c]">-H</span> <span className="text-[#fde047]">&quot;Content-Type: application/json&quot;</span> \
          {"\n"}  <span className="text-[#fb923c]">-d</span> <span className="text-[#fde047]">&#39;&#123;
            &quot;prompt&quot;: &quot;{shortPrompt}&quot;,
            &quot;framework&quot;: &quot;nextjs-16&quot;,
            &quot;database&quot;: &quot;sqlite&quot;
          &#125;&#39;</span>
        </SyntaxCodeCard>
      )}
    </div>
  )
}
