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
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Hasil Evaluasi &amp; Titik Perbaikan ({findings.length})
              </CardTitle>
              <span className="sr-only">Audit &amp; Analisis Celah Temuan Analisis Engine</span>
              <CardDescription className="text-xs">
                Evaluasi semantik batas eksekusi, ambiguitas, dan kelengkapan konteks
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">Status:</span>
            {status && (
              <Badge variant="outline" className="text-[10px] uppercase font-mono px-2 py-0.5">
                {status}
              </Badge>
            )}
            <span
              className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${getScoreColor(
                score
              )}`}
            >
              Skor: {score}/100
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Promptfoo-style High-Density Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-[11px] font-mono text-muted-foreground">
                <th className="py-2 px-3.5 w-24">Tingkat</th>
                <th className="py-2 px-3.5 w-32">Kategori</th>
                <th className="py-2 px-3.5">Rincian Temuan &amp; Bukti</th>
                <th className="py-2 px-3.5 w-1/3">Tindakan / Solusi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {findings.map((finding, idx) => {
                const typeLabel = finding.type || finding.category || "analisis";
                const messageText =
                  finding.message ||
                  finding.recommendation ||
                  finding.evidence ||
                  `Temuan pada aspek ${finding.category || "prompt"}`;

                return (
                  <tr
                    key={finding.id || `finding-${idx}`}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    {/* Kolom 1: Status / Severity Badge */}
                    <td className="py-2.5 px-3.5 align-top">
                      {getSeverityBadge(finding.severity)}
                    </td>

                    {/* Kolom 2: Kategori */}
                    <td className="py-2.5 px-3.5 align-top">
                      <span className="font-mono text-[11px] text-foreground/80 font-medium uppercase tracking-wide">
                        {typeLabel.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* Kolom 3: Rincian & Bukti */}
                    <td className="py-2.5 px-3.5 align-top space-y-1.5">
                      <div className="text-foreground leading-relaxed font-medium">
                        {messageText}
                      </div>
                      {finding.evidence && (
                        <div className="font-mono text-[11px] p-1.5 rounded bg-muted/40 border border-border/40 text-muted-foreground break-all">
                          <span className="text-[10px] text-foreground/70 font-semibold uppercase block">
                            Bukti / Pemicu:
                          </span>
                          {finding.evidence}
                        </div>
                      )}
                    </td>

                    {/* Kolom 4: Solusi & Rekomendasi */}
                    <td className="py-2.5 px-3.5 align-top">
                      {finding.recommendation ? (
                        <div className="text-foreground/90 text-xs leading-relaxed bg-primary/[0.03] border border-primary/20 p-2 rounded">
                          <div className="flex items-center gap-1 text-primary font-semibold text-[10px] mb-0.5">
                            <Lightbulb className="h-3 w-3" />
                            <span>Rekomendasi:</span>
                          </div>
                          <span>{finding.recommendation}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">
                          Tercakup otomatis dalam rekonstruksi
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
