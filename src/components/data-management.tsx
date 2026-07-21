import { useRef, useState } from "react";
import { Download, Upload, Check, AlertCircle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import { useVault } from "@/lib/vault-context";

type ImportState =
  | null
  | { ok: true; added: number; skipped: number }
  | { ok: false; msg: string };

export function DataManagement() {
  const t = useT();
  const { exportData, importData } = useVault();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>(null);
  const [busy, setBusy] = useState(false);

  async function onExport() {
    setBusy(true);
    try {
      const json = await exportData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "ayaya-prompt-" + new Date().toISOString().split("T")[0] + ".json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  async function onImportFile(file: File) {
    setImportState(null);
    setBusy(true);
    try {
      const result = await importData(await file.text());
      setImportState({ ok: true, ...result });
    } catch (cause) {
      setImportState({ ok: false, msg: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 border-t pt-6">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Database className="h-4 w-4" /> {t("settings.storageTitle")}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("settings.storageDesc")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-md border p-4">
          <h3 className="text-sm font-medium">{t("settings.export")}</h3>
          <p className="text-xs text-muted-foreground">{t("settings.exportDesc")}</p>
          <Button size="sm" variant="outline" onClick={onExport} disabled={busy}>
            <Download className="h-4 w-4" /> {t("settings.export")}
          </Button>
        </div>

        <div className="space-y-2 rounded-md border p-4">
          <h3 className="text-sm font-medium">{t("settings.import")}</h3>
          <p className="text-xs text-muted-foreground">{t("settings.importDesc")}</p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onImportFile(file);
              event.target.value = "";
            }}
          />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="h-4 w-4" /> {t("settings.import")}
          </Button>
        </div>
      </div>

      {importState && (importState.ok ? (
        <div className="flex items-center gap-2 rounded-md border border-green-500/40 bg-green-500/5 p-3 text-xs text-green-700 dark:text-green-400">
          <Check className="h-4 w-4" />
          {t("settings.importResult", { added: importState.added, skipped: importState.skipped })}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4" />
          {t("settings.importError", { msg: importState.msg })}
        </div>
      ))}
    </section>
  );
}
