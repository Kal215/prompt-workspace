import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PromptChange } from "@/types/prompt";
import { GitCommit, ArrowRight, ShieldAlert, Cpu, Layers, SlidersHorizontal } from "lucide-react";

interface ChangesTrackerProps {
  changes: (PromptChange | string)[];
}

export function ChangesTracker({ changes }: ChangesTrackerProps) {
  const getChangeIcon = (type: string) => {
    switch (type) {
      case "role_anchoring":
        return <Cpu className="h-3.5 w-3.5 text-primary" />;
      case "added_constraint":
        return <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />;
      case "structured_output":
        return <Layers className="h-3.5 w-3.5 text-sky-500" />;
      default:
        return <SlidersHorizontal className="h-3.5 w-3.5 text-primary/80" />;
    }
  };

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
            <GitCommit className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Rincian Perubahan ({changes.length})
            </CardTitle>
            <span className="sr-only">Log Intervensi Rekayasa</span>
            <CardDescription className="text-xs">
              Transparansi setiap intervensi dan batasan yang ditambahkan oleh engine
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Promptfoo-style High-Density Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-[11px] font-mono text-muted-foreground">
                <th className="py-2 px-3.5 w-28">Tipe Intervensi</th>
                <th className="py-2 px-3.5">Deskripsi Modifikasi</th>
                <th className="py-2 px-3.5 w-1/3">Alasan / Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {changes.map((change, index) => {
                const isString = typeof change === "string";
                const description = isString ? change : change.description;
                const reason = isString ? "Peningkatan presisi instruksi & pencegahan halusinasi" : change.reason;
                const type = isString ? "optimization" : change.type || "optimization";

                return (
                  <tr
                    key={index}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="flex items-center gap-1.5">
                        {getChangeIcon(type)}
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] text-muted-foreground uppercase px-1.5 py-0"
                        >
                          {type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 align-top text-foreground font-medium leading-relaxed">
                      {description}
                    </td>

                    <td className="py-2.5 px-3.5 align-top text-xs text-muted-foreground leading-relaxed">
                      {reason ? (
                        <div className="flex items-start gap-1">
                          <ArrowRight className="h-3 w-3 shrink-0 mt-0.5 text-primary/70" />
                          <span>{reason}</span>
                        </div>
                      ) : (
                        <span className="italic text-[11px]">Standar penguatan prompt</span>
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
