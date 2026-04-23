"use client";

import { diffLines } from "diff";
import { cn } from "@/lib/utils";

export function DiffView({
  oldText,
  newText,
  oldLabel = "Previous",
  newLabel = "Current",
}: {
  oldText: string;
  newText: string;
  oldLabel?: string;
  newLabel?: string;
}) {
  const parts = diffLines(oldText, newText);

  return (
    <div className="overflow-hidden rounded-md border text-xs">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>− {oldLabel}</span>
        <span>+ {newLabel}</span>
      </div>
      <pre className="max-h-[400px] overflow-auto bg-background font-mono leading-5">
        {parts.map((part, i) => {
          const lines = part.value.split("\n");
          if (lines[lines.length - 1] === "") lines.pop();
          const cls = part.added
            ? "bg-green-500/10 text-green-700 dark:text-green-400"
            : part.removed
              ? "bg-red-500/10 text-red-700 dark:text-red-400"
              : "text-muted-foreground";
          const prefix = part.added ? "+" : part.removed ? "−" : " ";
          return (
            <div key={i} className={cn("whitespace-pre", cls)}>
              {lines.map((line, j) => (
                <div key={j} className="px-3">
                  <span className="mr-2 select-none opacity-60">{prefix}</span>
                  {line || " "}
                </div>
              ))}
            </div>
          );
        })}
      </pre>
    </div>
  );
}
