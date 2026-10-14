import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalysisFinding, FindingSeverity } from "@/types/prompt";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lightbulb,
  Search,
  SlidersHorizontal,
} from "lucide-react";

interface FindingsPanelProps {
  findings: AnalysisFinding[];
  score: number;
  status: string;
}

export function FindingsPanel({ findings, score, status }: FindingsPanelProps) {
  const getSeverityBadge = (severity: FindingSeverity | string) => {
    const s = String(severity).toLowerCase();
    switch (s) {
      case "critical":
        return (
          <Badge
            variant="outline"
            className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 text-[11px] font-semibold uppercase tracking-wider"
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Critical
          </Badge>
        );
      case "major":
      case "warning":
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold uppercase tracking-wider"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            {s === "major" ? "Major" : "Warning"}
          </Badge>
        );
      case "minor":
      case "info":
        return (
          <Badge
            variant="outline"
            className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 text-[11px] font-semibold uppercase tracking-wider"
          >
            <Info className="h-3 w-3 mr-1" />
            {s === "minor" ? "Minor" : "Info"}
          </Badge>
        );
      case "pass":
      case "success":
      default:
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-semibold uppercase tracking-wider"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Pass
          </Badge>
        );
    }
  };

  const getScoreColor = (val: number) => {
    if (val >= 80) return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (val >= 60) return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20";
  };

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Temuan Analisis Engine ({findings.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Audit semantik terhadap batas eksekusi, ambiguitas, dan kelengkapan konteks
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Kesehatan Prompt:</span>
            {status && (
              <Badge variant="outline" className="text-[10px] uppercase font-mono px-2 py-0.5">
                {status}
              </Badge>
            )}
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getScoreColor(
                score
              )}`}
            >
              Skor: {score}/100
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3.5">
        {findings.map((finding, idx) => {
          const typeLabel = finding.type || finding.category || "analisis";
          const messageText =
            finding.message ||
            finding.recommendation ||
            finding.evidence ||
            `Temuan pada aspek ${finding.category || "prompt"}`;

          return (
            <div
              key={finding.id || `finding-${idx}`}
              className="rounded-lg border border-border/60 bg-card p-3.5 space-y-2.5 transition-colors hover:border-border"
            >
              {/* Finding Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  Kategori: {typeLabel.replace(/_/g, " ")}
                </span>
                {getSeverityBadge(finding.severity)}
              </div>

              {/* Message */}
              <p className="text-sm text-foreground font-medium leading-relaxed">
                {messageText}
              </p>

              {/* Evidence if present */}
              {finding.evidence && (
                <div className="flex items-start gap-2 rounded bg-muted/30 border border-border/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                  <Search className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground text-[11px] block">
                      Bukti / Trigger Terdeteksi:
                    </span>
                    <span className="font-mono text-xs text-foreground/80 break-all">
                      {finding.evidence}
                    </span>
                  </div>
                </div>
              )}

              {/* Recommendation if present */}
              {finding.recommendation && (
                <div className="flex items-start gap-2 rounded bg-primary/[0.03] border border-primary/20 px-2.5 py-1.5 text-xs text-foreground">
                  <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-primary text-[11px] block">
                      Rekomendasi Perbaikan:
                    </span>
                    <span className="text-xs leading-relaxed text-foreground/90">
                      {finding.recommendation}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
