import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROVIDER_PRESETS } from "@/lib/providers";
import { useT } from "@/lib/i18n-client";
import { useDirtyNavigationGuard } from "@/lib/navigation-guard";
import { useVault } from "@/lib/vault-context";
import type { AppSettings, Provider } from "@/lib/types";

export function SettingsForm() {
  const t = useT();
  const { settings, saveSettings } = useVault();
  const [form, setForm] = useState<AppSettings>(settings);
  const [initialSignature, setInitialSignature] = useState(JSON.stringify(settings));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteChange, setRemoteChange] = useState(false);
  const savedTimer = useRef<number | null>(null);
  const dirty = JSON.stringify(form) !== initialSignature;
  const { markClean } = useDirtyNavigationGuard(dirty, t("form.confirmDiscard"));

  useEffect(() => {
    const incomingSignature = JSON.stringify(settings);
    if (dirty) {
      if (incomingSignature !== initialSignature) setRemoteChange(true);
      return;
    }
    setInitialSignature(incomingSignature);
    setForm(settings);
    setRemoteChange(false);
  }, [dirty, initialSignature, settings]);
  useEffect(
    () => () => {
      if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
    },
    [],
  );

  function patch(next: Partial<AppSettings>) {
    setSaved(false);
    setForm((current) => ({ ...current, ...next }));
  }

  function patchConnection(next: Partial<Pick<AppSettings, "provider" | "baseURL" | "model">>) {
    setSaved(false);
    setForm((current) => {
      const provider = next.provider ?? current.provider;
      const baseURL = next.baseURL ?? current.baseURL;
      const connectionChanged =
        provider !== current.provider || baseURL !== current.baseURL;
      return {
        ...current,
        ...next,
        apiKey: connectionChanged ? "" : current.apiKey,
      };
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (remoteChange && !confirm(t("settings.confirmRemoteOverwrite"))) return;
    setBusy(true);
    setError(null);
    try {
      const normalized = {
        ...form,
        baseURL: form.baseURL.trim(),
        apiKey: form.apiKey.trim(),
        model: form.model.trim(),
      };
      await saveSettings(normalized);
      setInitialSignature(JSON.stringify(normalized));
      setForm(normalized);
      setRemoteChange(false);
      markClean();
      setSaved(true);
      if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setSaved(false), 2000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  const activePreset = PROVIDER_PRESETS.find(
    (preset) =>
      preset.provider === form.provider && preset.baseURL === form.baseURL,
  );

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6"
      aria-busy={busy}
      data-dirty={dirty ? "true" : "false"}
    >
      <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/5 p-3 text-xs leading-relaxed text-yellow-800 dark:text-yellow-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        {t("settings.browserWarning")}
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive-text">
          {t("form.error", { msg: error })}
        </p>
      )}

      {remoteChange && (
        <p role="status" className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-800 dark:text-yellow-200">
          {t("settings.remoteChange")}
        </p>
      )}

      <div className="space-y-2">
        <Label>{t("settings.presets")}</Label>
        <div className="flex flex-wrap gap-2">
          {PROVIDER_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-pressed={activePreset?.label === preset.label}
              onClick={() =>
                patchConnection({
                  provider: preset.provider,
                  baseURL: preset.baseURL,
                  model: preset.modelHint,
                })
              }
              className="rounded-md border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-accent aria-pressed:border-primary aria-pressed:bg-accent"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="min-h-4 text-xs text-muted-foreground">
          {activePreset ? t(activePreset.noteKey) : " "}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="provider">{t("settings.provider")}</Label>
        <select
          id="provider"
          value={form.provider}
          onChange={(event) =>
            patchConnection({ provider: event.target.value as Provider })
          }
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="anthropic">{t("settings.providerAnthropic")}</option>
          <option value="openai-compatible">{t("settings.providerOpenAI")}</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="baseURL">{t("settings.baseURL")}</Label>
        <Input
          id="baseURL"
          value={form.baseURL}
          onChange={(event) => patchConnection({ baseURL: event.target.value })}
          placeholder="https://..."
          className="font-mono text-xs"
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground">{t("settings.baseURLHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="apiKey">{t("settings.apiKey")}</Label>
        <Input
          id="apiKey"
          type="password"
          value={form.apiKey}
          onChange={(event) => {
            patch({ apiKey: event.target.value });
          }}
          placeholder={form.provider === "anthropic" ? "sk-ant-..." : "sk-..."}
          className="font-mono text-xs"
          autoComplete="new-password"
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground">{t("settings.apiKeyHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">{t("settings.model")}</Label>
        <Input
          id="model"
          value={form.model}
          onChange={(event) => patch({ model: event.target.value })}
          placeholder="claude-sonnet-4-5"
          className="font-mono text-xs"
          spellCheck={false}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {saved ? <><Check className="h-4 w-4" /> {t("settings.saved")}</> : <><Save className="h-4 w-4" /> {t("settings.save")}</>}
        </Button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {saved ? t("settings.saved") : ""}
      </p>
    </form>
  );
}
