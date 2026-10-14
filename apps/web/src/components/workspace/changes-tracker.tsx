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
import { GitCommit, ArrowRight, ShieldAlert, Cpu, Layers } from "lucide-react";

interface ChangesTrackerProps {
  changes: PromptChange[];
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
        return <GitCommit className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
            <GitCommit className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Log Intervensi Rekayasa ({changes.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Transparansi modifikasi yang dilakukan engine terhadap prompt asli
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {changes.map((change, index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-lg border border-border/50 p-3 bg-muted/20 text-xs"
          >
            <div className="mt-0.5 p-1 rounded bg-background border border-border/60">
              {getChangeIcon(change.type)}
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="font-semibold text-foreground text-xs">
                  {change.description}
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-muted-foreground uppercase px-1.5 py-0"
                >
                  {change.type.replace(/_/g, " ")}
                </Badge>
              </div>

              <div className="text-muted-foreground leading-relaxed flex items-start gap-1 pt-0.5">
                <ArrowRight className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground/70" />
                <span>
                  <strong className="text-foreground/80 font-medium">Alasan:</strong>{" "}
                  {change.reason}
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
