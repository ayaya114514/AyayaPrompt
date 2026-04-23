"use client";

import { useState, useTransition } from "react";
import { Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROVIDER_PRESETS, Provider } from "@/lib/providers";
import { useT } from "@/lib/i18n-client";
import { saveSettings } from "@/app/actions";

export function SettingsForm({
  initial,
}: {
  initial: {
    provider: Provider;
    baseURL: string;
    apiKey: string;
    model: string;
  };
}) {
  const t = useT();
  const [provider, setProvider] = useState<Provider>(initial.provider);
  const [baseURL, setBaseURL] = useState(initial.baseURL);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [model, setModel] = useState(initial.model);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function applyPreset(p: (typeof PROVIDER_PRESETS)[number]) {
    setProvider(p.provider);
    setBaseURL(p.baseURL);
    setModel(p.modelHint);
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      await saveSettings(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>{t("settings.presets")}</Label>
        <div className="flex flex-wrap gap-2">
          {PROVIDER_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="rounded-md border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-accent"
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {PROVIDER_PRESETS.find(
            (p) => p.provider === provider && p.baseURL === baseURL,
          )?.note ?? " "}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="provider">{t("settings.provider")}</Label>
        <select
          id="provider"
          name="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as Provider)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="anthropic">{t("settings.providerAnthropic")}</option>
          <option value="openai-compatible">
            {t("settings.providerOpenAI")}
          </option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="baseURL">{t("settings.baseURL")}</Label>
        <Input
          id="baseURL"
          name="baseURL"
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
          placeholder="https://..."
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">{t("settings.baseURLHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="apiKey">{t("settings.apiKey")}</Label>
        <Input
          id="apiKey"
          name="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">{t("settings.apiKeyHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">{t("settings.model")}</Label>
        <Input
          id="model"
          name="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="claude-sonnet-4-5"
          className="font-mono text-xs"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {saved ? (
            <>
              <Check className="h-4 w-4" /> {t("settings.saved")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> {t("settings.save")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
