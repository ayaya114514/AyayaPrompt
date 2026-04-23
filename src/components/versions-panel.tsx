"use client";

import { useState, useTransition } from "react";
import { History, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiffView } from "@/components/diff-view";
import { restoreVersion } from "@/app/actions";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";

export type VersionItem = {
  id: string;
  title: string;
  content: string;
  tags: string;
  createdAt: string;
};

export function VersionsPanel({
  current,
  versions,
}: {
  current: { title: string; content: string };
  versions: VersionItem[];
}) {
  const t = useT();
  const [openId, setOpenId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (versions.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
        {t("versions.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {versions.map((v, i) => {
        const isOpen = openId === v.id;
        const versionNumber = versions.length - i;
        return (
          <div
            key={v.id}
            className={cn(
              "rounded-md border bg-card transition-colors",
              isOpen && "border-primary/40",
            )}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : v.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/50"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="font-mono text-xs text-muted-foreground">
                v{versionNumber}
              </span>
              <span className="truncate font-medium">{v.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(v.createdAt).toLocaleString()}
              </span>
            </button>
            {isOpen && (
              <div className="space-y-3 border-t p-3">
                <DiffView
                  oldText={v.content}
                  newText={current.content}
                  oldLabel={t("versions.versionContent", { n: versionNumber })}
                  newLabel={t("versions.currentContent")}
                />
                {v.title !== current.title && (
                  <div className="text-xs text-muted-foreground">
                    {t("versions.oldTitle", { title: v.title })}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => {
                      if (
                        !confirm(
                          t("versions.confirmRestore", { n: versionNumber }),
                        )
                      )
                        return;
                      startTransition(() => restoreVersion(v.id));
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("versions.restore")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
