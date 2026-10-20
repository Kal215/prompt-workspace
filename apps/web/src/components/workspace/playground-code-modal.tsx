"use client";

import { useState } from "react";
import { X, Copy, Check, Terminal, Code2, FileCode } from "lucide-react";
import { toast } from "sonner";

interface PlaygroundCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  systemPrompt?: string;
  model: string;
  provider: string;
  parameters: {
    temperature: number;
    topP: number;
    maxTokens: number;
  };
  lang?: "en" | "id";
}

export function PlaygroundCodeModal({
  isOpen,
  onClose,
  prompt,
  systemPrompt,
  model,
  provider,
  parameters,
  lang = "id",
}: PlaygroundCodeModalProps) {
  const [tab, setTab] = useState<"curl" | "python" | "typescript">("curl");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getCurlCode = () => {
    return `curl -X POST https://api.groq.com/openai/v1/chat/completions \\
  -H "Authorization: Bearer $GROQ_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [
      ${systemPrompt ? `{"role": "system", "content": ${JSON.stringify(systemPrompt)}},` : ""}
      {"role": "user", "content": ${JSON.stringify(prompt)}}
    ],
    "temperature": ${parameters.temperature},
    "top_p": ${parameters.topP},
    "max_tokens": ${parameters.maxTokens}
  }'`;
  };

  const getPythonCode = () => {
    return `import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

response = client.chat.completions.create(
    model="${model}",
    messages=[
        ${systemPrompt ? `{"role": "system", "content": ${JSON.stringify(systemPrompt)}},` : ""}
        {"role": "user", "content": ${JSON.stringify(prompt)}}
    ],
    temperature=${parameters.temperature},
    top_p=${parameters.topP},
    max_tokens=${parameters.maxTokens},
)

print(response.choices[0].message.content)`;
  };

  const getTsCode = () => {
    return `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

async function main() {
  const completion = await client.chat.completions.create({
    model: "${model}",
    messages: [
      ${systemPrompt ? `{ role: "system", content: ${JSON.stringify(systemPrompt)} },` : ""}
      { role: "user", content: ${JSON.stringify(prompt)} },
    ],
    temperature: ${parameters.temperature},
    top_p: ${parameters.topP},
    max_tokens: ${parameters.maxTokens},
  });

  console.log(completion.choices[0].message.content);
}

main().catch(console.error);`;
  };

  const currentCode =
    tab === "curl" ? getCurlCode() : tab === "python" ? getPythonCode() : getTsCode();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentCode);
    setCopied(true);
    toast.success(lang === "en" ? "Code copied to clipboard!" : "Kode berhasil disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                {lang === "en" ? "Export to Code" : "Ekspor ke Kode"}
              </h3>
              <p className="text-[11px] font-mono text-stone-500">
                {provider} · {model}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-4 pt-3 border-b border-stone-100 bg-stone-50/20">
          <button
            type="button"
            onClick={() => setTab("curl")}
            className={`px-3 py-1.5 text-xs font-mono rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === "curl"
                ? "bg-white border-t border-x border-stone-200 text-stone-900 font-bold -mb-px"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>cURL</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("python")}
            className={`px-3 py-1.5 text-xs font-mono rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === "python"
                ? "bg-white border-t border-x border-stone-200 text-stone-900 font-bold -mb-px"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Python</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("typescript")}
            className={`px-3 py-1.5 text-xs font-mono rounded-t-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === "typescript"
                ? "bg-white border-t border-x border-stone-200 text-stone-900 font-bold -mb-px"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>TypeScript</span>
          </button>
        </div>

        {/* Code Content */}
        <div className="p-4 flex-1 overflow-y-auto bg-stone-950 text-stone-100 font-mono text-xs rounded-b-2xl m-3 relative shadow-inner">
          <pre className="whitespace-pre-wrap break-all leading-relaxed">{currentCode}</pre>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
          <span className="text-[11px] font-mono text-stone-400">
            {lang === "en" ? "Ready to run in your terminal or app" : "Siap dijalankan di terminal atau app"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (lang === "en" ? "Copied!" : "Tersalin!") : (lang === "en" ? "Copy Code" : "Salin Kode")}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-medium transition-colors cursor-pointer"
            >
              {lang === "en" ? "Done" : "Selesai"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
