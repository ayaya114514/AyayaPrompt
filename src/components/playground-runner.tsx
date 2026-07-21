import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Play, AlertCircle, Trash2, RotateCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";
import { callModel } from "@/lib/providers";
import { extractVariables, fillVariables } from "@/lib/variables";
import { useVault } from "@/lib/vault-context";

type RunResult = {
  output: string;
  error: string | null;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  model: string;
};

export function PlaygroundRunner() {
  const t = useT();
  const { prompts, runs, settings, createRun, deleteRun } = useVault();
  const [selectedId, setSelectedId] = useState(prompts[0]?.id ?? "");
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!prompts.some((prompt) => prompt.id === selectedId)) {
      setSelectedId(prompts[0]?.id ?? "");
    }
  }, [prompts, selectedId]);

  const selected = prompts.find((prompt) => prompt.id === selectedId);
  const variables = useMemo(() => selected ? extractVariables(selected.content) : [], [selected]);
  const rendered = useMemo(() => selected ? fillVariables(selected.content, values) : "", [selected, values]);

  async function onRun() {
    if (!selected || busy) return;
    setBusy(true);
    setResult(null);
    const started = Date.now();
    let output = "";
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    let error: string | null = null;

    try {
      const response = await callModel({
        provider: settings.provider,
        baseURL: settings.baseURL,
        apiKey: settings.apiKey,
        model: settings.model,
        prompt: rendered,
      });
      output = response.text;
      inputTokens = response.inputTokens ?? null;
      outputTokens = response.outputTokens ?? null;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }

    const durationMs = Date.now() - started;
    const nextResult = { output, error, durationMs, inputTokens, outputTokens, model: settings.model };
    setResult(nextResult);
    try {
      await createRun({
        promptId: selected.id,
        promptTitle: selected.title,
        renderedPrompt: rendered,
        variables: values,
        provider: settings.provider,
        model: settings.model,
        output,
        inputTokens,
        outputTokens,
        durationMs,
        error,
      });
    } catch (cause) {
      setResult({ ...nextResult, error: error ?? "The response completed, but its run record could not be saved: " + (cause instanceof Error ? cause.message : String(cause)) });
    } finally {
      setBusy(false);
    }
  }

  function loadFromRun(run: (typeof runs)[number]) {
    if (run.promptId && prompts.some((prompt) => prompt.id === run.promptId)) setSelectedId(run.promptId);
    setValues(run.variables);
    setResult(null);
  }

  async function onDelete(id: string) {
    if (!confirm(t("playground.confirmDeleteRun"))) return;
    setBusy(true);
    try {
      await deleteRun(id);
    } finally {
      setBusy(false);
    }
  }

  if (prompts.length === 0) {
    return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{t("playground.noPrompts")}</div>;
  }

  return (
    <div className="space-y-6">
      {!settings.apiKey && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/5 p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          <Link to="/settings" className="font-medium text-yellow-700 underline dark:text-yellow-400">
            {t("playground.settingsMissing")}
          </Link>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        {t("settings.browserWarning")}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt-select">{t("playground.selectPrompt")}</Label>
            <select
              id="prompt-select"
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setValues({});
                setResult(null);
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {prompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{prompt.title}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>{t("playground.variables")}</Label>
            {variables.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("playground.noVariables")}</p>
            ) : (
              <div className="space-y-2">
                {variables.map((name) => (
                  <div key={name} className="space-y-1">
                    <Label htmlFor={"pv-" + name} className="font-mono text-xs">{"{{" + name + "}}"}</Label>
                    <Textarea
                      id={"pv-" + name}
                      value={values[name] ?? ""}
                      onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}
                      className="min-h-[56px] text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button onClick={onRun} disabled={busy || !selected || !settings.apiKey} className="w-full">
            <Play className="h-4 w-4" /> {busy ? t("playground.running") : t("playground.run")}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("playground.rendered")}</Label>
            <pre className="max-h-[180px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs">{rendered || " "}</pre>
          </div>
          <div className="space-y-2">
            <Label>{t("playground.output")}</Label>
            {!result ? (
              <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">{t("playground.noRunYet")}</p>
            ) : result.error ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-destructive"><AlertCircle className="h-4 w-4" /> {t("playground.error")}</div>
                <pre className="overflow-auto whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/5 p-3 font-mono text-xs text-destructive">{result.error}</pre>
              </div>
            ) : (
              <div className="space-y-2">
                <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap rounded-md border bg-background p-3 font-mono text-xs">{result.output || " "}</pre>
                <p className="text-xs text-muted-foreground">
                  {result.inputTokens !== null && result.outputTokens !== null
                    ? t("playground.stats", { model: result.model, input: result.inputTokens, output: result.outputTokens, ms: result.durationMs })
                    : t("playground.statsNoTokens", { model: result.model, ms: result.durationMs })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="space-y-2 border-t pt-6">
        <h2 className="text-sm font-semibold">{t("playground.history")}</h2>
        {runs.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">{t("playground.historyEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {runs.slice(0, 20).map((run) => (
              <li key={run.id} className="rounded-md border bg-card p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{run.promptTitle}</span>
                      {run.error && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">error</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString()} · {run.inputTokens !== null && run.outputTokens !== null
                        ? t("playground.stats", { model: run.model, input: run.inputTokens, output: run.outputTokens, ms: run.durationMs })
                        : t("playground.statsNoTokens", { model: run.model, ms: run.durationMs })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => loadFromRun(run)} title={t("playground.loadInto")}>
                      <RotateCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => void onDelete(run.id)} disabled={busy} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {(run.output || run.error) && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-2 font-mono text-[11px]">{run.error || run.output}</pre>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
