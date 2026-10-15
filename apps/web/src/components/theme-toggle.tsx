"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 border-border/70 bg-card/60"
        aria-label="Toggle tema"
        disabled
      >
        <span className="h-3.5 w-3.5" />
      </Button>
    );
  }

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="h-8 w-8 p-0 cursor-pointer border-border/70 bg-card/60 hover:bg-muted/80 text-foreground transition-transform active:scale-95"
      aria-label="Ganti mode gelap/terang"
      title={`Mode saat ini: ${theme === "dark" ? "Gelap (Obsidian)" : "Terang (Alabaster)"}. Klik untuk beralih.`}
    >
      {theme === "dark" ? (
        <Sun className="h-3.5 w-3.5 text-amber-400 animate-in spin-in-180 duration-300" />
      ) : (
        <Moon className="h-3.5 w-3.5 text-slate-700 animate-in spin-in-180 duration-300" />
      )}
    </Button>
  );
}
