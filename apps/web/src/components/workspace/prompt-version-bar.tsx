"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  History,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Globe,
  Edit3,
  ChevronRight,
} from "lucide-react";
import {
  PromptVersionRecord,
  PromptVersionSource,
} from "@/types/v2-workspace";

export interface PromptVersionBarProps {
  versions: PromptVersionRecord[];
  activeVersionId: string;
  onSelectVersion: (versionId: string) => void;
  className?: string;
}

function getSourceBadge(source?: PromptVersionSource) {
  switch (source) {
    case "spider-refinement":
      return (
        <Badge
          variant="outline"
          className="text-[9px] font-mono border-primary/40 text-primary bg-primary/5 gap-1 py-0 px-1.5"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          spider-refinement
        </Badge>
      );
    case "crawler-grounded":
      return (
        <Badge
          variant="outline"
          className="text-[9px] font-mono border-blue-500/40 text-blue-500 bg-blue-500/5 gap-1 py-0 px-1.5"
        >
          <Globe className="h-2.5 w-2.5" />
          crawler-grounded
        </Badge>
      );
    case "manual-edit":
      return (
        <Badge
          variant="outline"
          className="text-[9px] font-mono border-amber-500/40 text-amber-500 bg-amber-500/5 gap-1 py-0 px-1.5"
        >
          <Edit3 className="h-2.5 w-2.5" />
          manual-edit
        </Badge>
      );
    case "initial":
    default:
      return (
        <Badge
          variant="outline"
          className="text-[9px] font-mono border-muted-foreground/30 text-muted-foreground py-0 px-1.5"
        >
          initial
        </Badge>
      );
  }
}

export function PromptVersionBar({
  versions,
  activeVersionId,
  onSelectVersion,
  className = "",
}: PromptVersionBarProps) {
  if (!versions || versions.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="prompt-version-bar"
      className={`w-full rounded-lg border border-border/70 bg-card/60 backdrop-blur-xs p-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${className}`}
    >
      <div className="flex items-center gap-2 shrink-0">
        <div className="p-1.5 rounded-md bg-muted text-foreground">
          <History className="h-4 w-4" />
        </div>
        <div>
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            Silsilah Versi Prompt (v2.0)
          </span>
          <span className="text-[10px] text-muted-foreground block">
            {versions.length} versi terekam dalam siklus iterasi tertutup
          </span>
        </div>
      </div>

      {/* Daftar Versi Horizontal */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
        {versions.map((ver, idx) => {
          const isActive = ver.versionId === activeVersionId;
          const label = ver.versionId.toUpperCase();

          return (
            <React.Fragment key={ver.versionId}>
              {idx > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              )}
              <button
                type="button"
                onClick={() => onSelectVersion(ver.versionId)}
                data-testid={`version-tab-${ver.versionId}`}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 border ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/40 text-foreground hover:bg-muted border-border/60 hover:border-border"
                }`}
              >
                <span className="font-mono font-bold">{label}</span>

                {/* Source Badge */}
                {ver.source && (
                  <span className={isActive ? "opacity-90" : ""}>
                    {getSourceBadge(ver.source)}
                  </span>
                )}

                {/* Gate Status Badge */}
                {ver.criticalGatePassed === true && (
                  <span title="Gerbang Kritis Lulus">
                    <ShieldCheck
                      className={`h-3.5 w-3.5 ${
                        isActive ? "text-primary-foreground" : "text-emerald-500"
                      }`}
                    />
                  </span>
                )}
                {ver.criticalGatePassed === false && (
                  <span title="Gerbang Kritis Belum Lulus">
                    <ShieldAlert
                      className={`h-3.5 w-3.5 ${
                        isActive ? "text-primary-foreground" : "text-destructive"
                      }`}
                    />
                  </span>
                )}

                {typeof ver.qualityScore === "number" && (
                  <span
                    className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {Math.round(ver.qualityScore)}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
