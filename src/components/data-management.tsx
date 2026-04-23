"use client";

import { useRef, useState, useTransition } from "react";
import { Download, Upload, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import { exportAllData, importData } from "@/app/actions";

type ImportState =
  | null
  | { ok: true; added: number; skipped: number }
  | { ok: false; msg: string };

export function DataManagement() {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>(null);
  const [isPending, startTransition] = useTransition();

  async function onExport() {
    const json = await exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `promptvault-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function onImportFile(file: File) {
    setImportState(null);
    try {
      const text = await file.text();
      startTransition(async () => {
        try {
          const r = await importData(text);
          setImportState({ ok: true, added: r.added, skipped: r.skipped });
        } catch (e) {
          setImportState({
            ok: false,
            msg: e instanceof Error ? e.message : String(e),
          });
        }
      });
    } catch (e) {
      setImportState({
        ok: false,
        msg: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <div className="space-y-4 border-t pt-6">
      <h2 className="text-base font-semibold">{t("settings.dataTitle")}</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-md border p-4">
          <h3 className="text-sm font-medium">{t("settings.export")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("settings.exportDesc")}
          </p>
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="h-4 w-4" /> {t("settings.export")}
          </Button>
        </div>

        <div className="space-y-2 rounded-md border p-4">
          <h3 className="text-sm font-medium">{t("settings.import")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("settings.importDesc")}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = "";
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
          >
            <Upload className="h-4 w-4" /> {t("settings.import")}
          </Button>
        </div>
      </div>

      {importState &&
        (importState.ok ? (
          <div className="flex items-center gap-2 rounded-md border border-green-500/40 bg-green-500/5 p-3 text-xs text-green-700 dark:text-green-400">
            <Check className="h-4 w-4" />
            {t("settings.importResult", {
              added: importState.added,
              skipped: importState.skipped,
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4" />
            {t("settings.importError", { msg: importState.msg })}
          </div>
        ))}
    </div>
  );
}
