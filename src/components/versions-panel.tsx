import { useState } from "react";
import { History, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiffView } from "@/components/diff-view";
import { useLocale, useT } from "@/lib/i18n-client";
import { useVault } from "@/lib/vault-context";
import { cn } from "@/lib/utils";
import type { PromptVersionRecord } from "@/lib/types";

export function VersionsPanel({
  current,
  versions,
}: {
  current: { title: string; content: string };
  versions: PromptVersionRecord[];
}) {
  const t = useT();
  const locale = useLocale();
  const { restoreVersion } = useVault();
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function restore(id: string, versionNumber: number) {
    if (!confirm(t("versions.confirmRestore", { n: versionNumber }))) return;
    setBusyId(id);
    setError(null);
    try {
      await restoreVersion(id);
      setOpenId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusyId(null);
    }
  }

  if (versions.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
        {t("versions.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="text-xs text-destructive-text">
          {t("form.error", { msg: error })}
        </p>
      )}
      {versions.map((version, index) => {
        const isOpen = openId === version.id;
        const versionNumber = versions.length - index;
        const panelId = `version-panel-${version.id}`;
        return (
          <div
            key={version.id}
            className={cn("rounded-md border bg-card transition-colors", isOpen && "border-primary/40")}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenId(isOpen ? null : version.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/50"
            >
              {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="font-mono text-xs text-muted-foreground">v{versionNumber}</span>
              <span className="truncate font-medium">{version.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(version.createdAt))}
              </span>
            </button>
            {isOpen && (
              <div id={panelId} className="space-y-3 border-t p-3">
                <DiffView
                  oldText={version.content}
                  newText={current.content}
                  oldLabel={t("versions.versionContent", { n: versionNumber })}
                  newLabel={t("versions.currentContent")}
                />
                {version.title !== current.title && (
                  <div className="text-xs text-muted-foreground">
                    {t("versions.oldTitle", { title: version.title })}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId !== null}
                    onClick={() => restore(version.id, versionNumber)}
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
