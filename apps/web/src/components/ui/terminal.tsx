"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TokenType =
  | "command"
  | "flag"
  | "string"
  | "number"
  | "operator"
  | "path"
  | "variable"
  | "comment"
  | "default";

interface Token {
  type: TokenType;
  value: string;
}

function tokenizeBash(text: string): Token[] {
  const tokens: Token[] = [];
  const words = text.split(/(\s+)/);
  let isFirstWord = true;

  for (const word of words) {
    if (/^\s+$/.test(word)) {
      tokens.push({ type: "default", value: word });
      continue;
    }

    if (word.startsWith("#")) {
      tokens.push({ type: "comment", value: word });
      continue;
    }

    if (word.startsWith("$")) {
      tokens.push({ type: "variable", value: word });
      isFirstWord = false;
      continue;
    }

    if (word.startsWith("--") || word.startsWith("-")) {
      tokens.push({ type: "flag", value: word });
      isFirstWord = false;
      continue;
    }

    if (/^["'].*["']$/.test(word)) {
      tokens.push({ type: "string", value: word });
      isFirstWord = false;
      continue;
    }

    if (/^\d+$/.test(word)) {
      tokens.push({ type: "number", value: word });
      isFirstWord = false;
      continue;
    }

    if (/^[|>&<]+$/.test(word)) {
      tokens.push({ type: "operator", value: word });
      isFirstWord = true;
      continue;
    }

    if (word.includes("/") || word.startsWith(".") || word.startsWith("~")) {
      tokens.push({ type: "path", value: word });
      isFirstWord = false;
      continue;
    }

    if (isFirstWord) {
      tokens.push({ type: "command", value: word });
      isFirstWord = false;
      continue;
    }

    tokens.push({ type: "default", value: word });
  }

  return tokens;
}

const tokenColors: Record<TokenType, string> = {
  command: "text-emerald-400 font-semibold",
  flag: "text-sky-400",
  string: "text-amber-300",
  number: "text-purple-400",
  operator: "text-red-400",
  path: "text-cyan-300",
  variable: "text-pink-400",
  comment: "text-neutral-500",
  default: "text-neutral-200",
};

function SyntaxHighlightedText({ text }: { text: string }) {
  const tokens = tokenizeBash(text);

  return (
    <>
      {tokens.map((token, i) => (
        <span key={i} className={tokenColors[token.type]}>
          {token.value}
        </span>
      ))}
    </>
  );
}

interface TerminalLine {
  type: "command" | "output";
  content: string;
}

export interface TerminalProps {
  commands?: string[];
  outputs?: Record<number, string[]>;
  username?: string;
  className?: string;
  typingSpeed?: number;
  delayBetweenCommands?: number;
  initialDelay?: number;
}

export function Terminal({
  commands = [
    'piew create "modern coffee roastery website"',
    'piew build --optimize',
    'piew deploy --env production',
  ],
  outputs = {
    0: [
      "✓ Analyzing intent: E-Commerce / Specialty Coffee",
      "✓ Generated design system & responsive layout",
      "✓ Compiled 5 full pages with real components",
    ],
    1: [
      "✓ Turbopack build finished in 1.2s",
      "✓ 0 errors, 100% type-safe",
    ],
    2: [
      "✓ Deployed to edge network",
      "➜ Live: https://fieldnote.piew.studio",
    ],
  },
  username = "piew-macbook",
  className,
  typingSpeed = 40,
  delayBetweenCommands = 900,
  initialDelay = 400,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [commandIdx, setCommandIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [outputIdx, setOutputIdx] = useState(-1);
  const [phase, setPhase] = useState<
    "idle" | "typing" | "executing" | "outputting" | "pausing" | "done"
  >("idle");
  const [cursorVisible, setCursorVisible] = useState(true);

  const currentCommand = commands[commandIdx] || "";
  const currentOutputs = useMemo(
    () => outputs[commandIdx] || [],
    [outputs, commandIdx]
  );
  const isLastCommand = commandIdx === commands.length - 1;

  // Trigger typing once mounted or in view
  useEffect(() => {
    if (phase !== "idle") return;
    const t = setTimeout(() => setPhase("typing"), initialDelay);
    return () => clearTimeout(t);
  }, [phase, initialDelay]);

  // Typing effect character by character
  useEffect(() => {
    if (phase !== "typing") return;

    if (charIdx < currentCommand.length) {
      const t = setTimeout(
        () => {
          setCurrentText(currentCommand.slice(0, charIdx + 1));
          setCharIdx((c) => c + 1);
        },
        typingSpeed + Math.random() * 20
      );
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setPhase("executing");
      }, 100);
      return () => clearTimeout(t);
    }
  }, [phase, charIdx, currentCommand, typingSpeed]);

  // Command finished, push command line and trigger output
  useEffect(() => {
    if (phase !== "executing") return;

    setLines((prev) => [...prev, { type: "command", content: currentCommand }]);
    setCurrentText("");

    if (currentOutputs.length > 0) {
      setOutputIdx(0);
      setPhase("outputting");
    } else if (isLastCommand) {
      setPhase("done");
    } else {
      setPhase("pausing");
    }
  }, [phase, currentCommand, currentOutputs.length, isLastCommand]);

  // Output effect line by line
  useEffect(() => {
    if (phase !== "outputting") return;

    if (outputIdx >= 0 && outputIdx < currentOutputs.length) {
      const t = setTimeout(() => {
        setLines((prev) => [
          ...prev,
          { type: "output", content: currentOutputs[outputIdx] },
        ]);
        setOutputIdx((i) => i + 1);
      }, 180);
      return () => clearTimeout(t);
    } else if (outputIdx >= currentOutputs.length) {
      const t = setTimeout(() => {
        if (isLastCommand) {
          // Loop back after done for continuous showcase
          const loopTimer = setTimeout(() => {
            setLines([]);
            setCharIdx(0);
            setOutputIdx(-1);
            setCommandIdx(0);
            setPhase("typing");
          }, 3500);
          return () => clearTimeout(loopTimer);
        } else {
          setPhase("pausing");
        }
      }, 400);
      return () => clearTimeout(t);
    }
  }, [phase, outputIdx, currentOutputs, isLastCommand]);

  // Pause between commands
  useEffect(() => {
    if (phase !== "pausing") return;
    const t = setTimeout(() => {
      setCharIdx(0);
      setOutputIdx(-1);
      setCommandIdx((c) => c + 1);
      setPhase("typing");
    }, delayBetweenCommands);
    return () => clearTimeout(t);
  }, [phase, delayBetweenCommands]);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(interval);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [lines, phase, currentText]);

  const prompt = (
    <span className="text-neutral-500 font-mono">
      <span className="text-sky-400 font-medium">{username}</span>
      <span className="text-emerald-500">:</span>
      <span className="text-sky-300">~</span>
      <span className="text-neutral-500">$</span>{" "}
    </span>
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full font-mono text-xs overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d10] shadow-2xl",
        className
      )}
    >
      {/* Title Bar (macOS Traffic Lights + Centered Title) */}
      <div className="flex items-center justify-between bg-[#15151a] border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#ff5f56] transition-colors" />
          <div className="h-3 w-3 rounded-full bg-[#ffbd2e] transition-colors" />
          <div className="h-3 w-3 rounded-full bg-[#27c93f] transition-colors" />
        </div>
        <div className="text-center">
          <span className="text-xs text-neutral-400 font-mono">
            {username} — bash
          </span>
        </div>
        <div className="w-12" />
      </div>

      {/* Terminal Content Screen */}
      <div
        ref={contentRef}
        className="h-80 overflow-y-auto p-4 sm:p-5 font-mono text-[12.5px] leading-relaxed scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:none bg-[#09090b]/95"
      >
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap mb-1">
            {line.type === "command" ? (
              <div>
                {prompt}
                <SyntaxHighlightedText text={line.content} />
              </div>
            ) : (
              <div
                className={cn(
                  "pl-2",
                  line.content.startsWith("✓")
                    ? "text-emerald-400"
                    : line.content.startsWith("➜")
                    ? "text-sky-300 font-semibold"
                    : line.content.startsWith("!")
                    ? "text-amber-400"
                    : "text-neutral-400"
                )}
              >
                {line.content}
              </div>
            )}
          </div>
        ))}

        {phase === "typing" && (
          <div className="whitespace-pre-wrap">
            {prompt}
            <SyntaxHighlightedText text={currentText} />
            <span className="ml-0.5 inline-block h-3.5 w-1.5 bg-sky-400 align-middle" />
          </div>
        )}

        {(phase === "done" ||
          phase === "pausing" ||
          phase === "outputting") && (
          <div className="whitespace-pre-wrap">
            {prompt}
            <span
              className={cn(
                "inline-block h-3.5 w-1.5 bg-neutral-300 align-middle transition-opacity duration-100",
                !cursorVisible && "opacity-0"
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
