import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DetectedIntent } from "@/types/prompt";
import { ShieldCheck, HelpCircle, Target, FileText, CheckCircle2 } from "lucide-react";

interface IntentGuardCardProps {
  intent: DetectedIntent | string;
}

export function IntentGuardCard({ intent }: IntentGuardCardProps) {
  const isString = typeof intent === "string";
  const summary = isString ? intent : intent.summary;
  const confidence = !isString && typeof intent.confidence === "number" ? intent.confidence : 0.95;
  const confidencePercent = Math.round(confidence * 100);
  const targetAudience = !isString ? intent.targetAudience : "Model LLM Produksi";
  const outputFormat = !isString ? intent.outputFormat : "Prompt Terstruktur (Role, Objective, Instructions, Placeholders)";
  const uncertainties = !isString && intent.uncertainties ? intent.uncertainties : [];

  return (
    <Card className="border-border/80 shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Intent Guard
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-medium"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Preserved Intent
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Verifikasi pemahaman engine terhadap tujuan prompt asli Anda
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Confidence:</span>
            <Badge
              variant="secondary"
              className="font-mono text-xs font-semibold px-2 py-0.5"
            >
              {confidencePercent}%
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 text-sm">
        {/* Intent Summary */}
        <div className="rounded-lg bg-background border border-border/60 p-3.5 space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span>Ringkasan Maksud Terdeteksi</span>
          </div>
          <p className="text-foreground leading-relaxed font-medium">
            &ldquo;{summary}&rdquo;
          </p>
        </div>

        {/* Metadata Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {targetAudience && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/30 border border-border/40">
              <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Target Model / Persona
                </span>
                <span className="font-medium text-foreground">
                  {targetAudience}
                </span>
              </div>
            </div>
          )}

          {outputFormat && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/30 border border-border/40">
              <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Ekspektasi Output Format
                </span>
                <span className="font-medium text-foreground">
                  {outputFormat}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Uncertainties / Ambiguities Identified */}
        {uncertainties && uncertainties.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-border/40">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <HelpCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Celah Asumsi / Ketidakpastian yang Perlu Diperhatikan:</span>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground pl-1">
              {uncertainties.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
