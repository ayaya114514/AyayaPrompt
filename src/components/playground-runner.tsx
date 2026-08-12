import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Play,
  RotateCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocale, useT } from "@/lib/i18n-client";
import type { Key } from "@/lib/i18n";
import {
  callModel,
  ProviderError,
  providerNeedsApiKey,
} from "@/lib/providers";
import { extractVariables, fillVariables } from "@/lib/variables";
import { useVault } from "@/lib/vault-context";

type RunResult = {
  output: string;
  error: string | null;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  model: string;
  renderedPrompt: string;
};

type Translator = (
  key: Key,
  params?: Record<string, string | number>,
) => string;

function providerErrorMessage(cause: unknown, t: Translator): string {
  if (!(cause instanceof ProviderError)) {
    return cause instanceof Error ? cause.message : String(cause);
  }

  switch (cause.code) {
    case "apiKeyMissing":
      return t("provider.error.apiKeyMissing");
    case "baseUrlMissing":
      return t("provider.error.baseUrlMissing");
    case "invalidBaseUrl":
      return t("provider.error.invalidBaseUrl");
    case "invalidProtocol":
      return t("provider.error.invalidProtocol");
    case "insecureTransport":
      return t("provider.error.insecureTransport");
    case "invalidResponse":
      return t("provider.error.invalidResponse");
    case "modelMissing":
      return t("provider.error.modelMissing");
    case "network":
      return t("provider.error.network");
    case "responseTooLarge":
      return t("provider.error.responseTooLarge");
    case "timeout":
      return t("provider.error.timeout");
    case "httpError":
      return t("provider.error.http", {
        provider: cause.provider ?? t("settings.provider"),
        status: cause.status ?? "?",
        detail: cause.detail ?? "",
      });
    case "aborted":
      return t("provider.error.aborted");
  }
}

export function PlaygroundRunner() {
  const t = useT();
  const locale = useLocale();
  const {
    prompts,
    runs,
    settings,
    createRun,
    deleteRun,
    clearRuns,
  } = useVault();
  const [selectedId, setSelectedId] = useState(prompts[0]?.id ?? "");
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [visibleRuns, setVisibleRuns] = useState(20);
  const requestSequence = useRef(0);
  const activeRequest = useRef<{
    controller: AbortController;
    id: number;
  } | null>(null);

  useEffect(
    () => () => {
      activeRequest.current?.controller.abort();
    },
    [],
  );

  useEffect(() => {
    if (!prompts.some((prompt) => prompt.id === selectedId)) {
      activeRequest.current?.controller.abort();
      activeRequest.current = null;
      setBusy(false);
      setSelectedId(prompts[0]?.id ?? "");
      setValues({});
      setResult(null);
    }
  }, [prompts, selectedId]);

  const selected = prompts.find((prompt) => prompt.id === selectedId);
  const variables = useMemo(
    () => (selected ? extractVariables(selected.content) : []),
    [selected],
  );
  const rendered = useMemo(
    () => (selected ? fillVariables(selected.content, values) : ""),
    [selected, values],
  );
  const needsApiKey = providerNeedsApiKey(settings);
  const canRun = Boolean(selected) && (!needsApiKey || Boolean(settings.apiKey));
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", {
        dateStyle: "short",
        timeStyle: "medium",
      }),
    [locale],
  );

  function selectPrompt(nextId: string) {
    activeRequest.current?.controller.abort();
    activeRequest.current = null;
    setBusy(false);
    setSelectedId(nextId);
    setValues({});
    setResult(null);
    setActionError(null);
  }

  async function onRun() {
    if (!selected || busy || !canRun) return;

    const controller = new AbortController();
    const requestId = ++requestSequence.current;
    activeRequest.current = { controller, id: requestId };
    const runContext = {
      promptId: selected.id,
      promptTitle: selected.title,
      renderedPrompt: rendered,
      variables: { ...values },
      provider: settings.provider,
      model: settings.model,
    };

    setBusy(true);
    setResult(null);
    setActionError(null);
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
        prompt: runContext.renderedPrompt,
        signal: controller.signal,
      });
      if (activeRequest.current?.id !== requestId) return;
      output = response.text;
      inputTokens = response.inputTokens ?? null;
      outputTokens = response.outputTokens ?? null;
    } catch (cause) {
      if (controller.signal.aborted || activeRequest.current?.id !== requestId) {
        return;
      }
      error = providerErrorMessage(cause, t);
    }

    const durationMs = Date.now() - started;
    const nextResult: RunResult = {
      output,
      error,
      durationMs,
      inputTokens,
      outputTokens,
      model: runContext.model,
      renderedPrompt: runContext.renderedPrompt,
    };
    setResult(nextResult);

    try {
      await createRun({
        ...runContext,
        output,
        inputTokens,
        outputTokens,
        durationMs,
        error,
      });
    } catch (cause) {
      if (activeRequest.current?.id === requestId) {
        setActionError(
          t("playground.saveRunError", {
            msg: cause instanceof Error ? cause.message : String(cause),
          }),
        );
      }
    } finally {
      if (activeRequest.current?.id === requestId) {
        activeRequest.current = null;
        setBusy(false);
      }
    }
  }

  function loadFromRun(run: (typeof runs)[number]) {
    activeRequest.current?.controller.abort();
    activeRequest.current = null;
    setBusy(false);
    if (run.promptId && prompts.some((prompt) => prompt.id === run.promptId)) {
      setSelectedId(run.promptId);
    }
    setValues({ ...run.variables });
    setResult(null);
    setActionError(null);
  }

  async function onDelete(id: string) {
    if (!confirm(t("playground.confirmDeleteRun"))) return;
    setHistoryBusy(true);
    setActionError(null);
    try {
      await deleteRun(id);
    } catch (cause) {
      setActionError(
        t("playground.deleteRunError", {
          msg: cause instanceof Error ? cause.message : String(cause),
        }),
      );
    } finally {
      setHistoryBusy(false);
    }
  }

  async function onClearRuns() {
    if (!confirm(t("playground.confirmClearHistory", { count: runs.length }))) {
      return;
    }
    setHistoryBusy(true);
    setActionError(null);
    try {
      await clearRuns();
      setVisibleRuns(20);
    } catch (cause) {
      setActionError(
        t("playground.clearHistoryError", {
          msg: cause instanceof Error ? cause.message : String(cause),
        }),
      );
    } finally {
      setHistoryBusy(false);
    }
  }

  if (prompts.length === 0) {
    return (
      <div className="space-y-4 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        <p>{t("playground.noPrompts")}</p>
        <Button asChild size="sm">
          <Link to="/new">{t("playground.createPrompt")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" aria-busy={busy || historyBusy}>
      {needsApiKey && !settings.apiKey && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/5 p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700 dark:text-yellow-300" />
          <Link
            to="/settings"
            className="font-medium text-yellow-800 underline dark:text-yellow-200"
          >
            {t("playground.settingsMissing")}
          </Link>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        {t("settings.browserWarning")}
      </div>

      {actionError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive-text"
        >
          {actionError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt-select">{t("playground.selectPrompt")}</Label>
            <select
              id="prompt-select"
              value={selectedId}
              disabled={busy}
              onChange={(event) => selectPrompt(event.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {prompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("playground.variables")}</p>
            {variables.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("playground.noVariables")}
              </p>
            ) : (
              <div className="space-y-2">
                {variables.map((name) => (
                  <div key={name} className="space-y-1">
                    <Label htmlFor={"pv-" + name} className="font-mono text-xs">
                      {"{{" + name + "}}"}
                    </Label>
                    <Textarea
                      id={"pv-" + name}
                      value={values[name] ?? ""}
                      disabled={busy}
                      onChange={(event) => {
                        setValues((current) => ({
                          ...current,
                          [name]: event.target.value,
                        }));
                        setResult(null);
                      }}
                      className="min-h-[56px] text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={() => void onRun()}
            disabled={busy || !canRun}
            className="w-full"
          >
            <Play className="h-4 w-4" />
            {busy ? t("playground.running") : t("playground.run")}
          </Button>
        </div>

        <div className="space-y-4">
          <section className="space-y-2" aria-labelledby="rendered-heading">
            <h2 id="rendered-heading" className="text-sm font-medium">
              {t("playground.rendered")}
            </h2>
            <pre className="max-h-[180px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs">
              {(result?.renderedPrompt ?? rendered) || " "}
            </pre>
          </section>
          <section className="space-y-2" aria-labelledby="output-heading">
            <h2 id="output-heading" className="text-sm font-medium">
              {t("playground.output")}
            </h2>
            {!result ? (
              <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                {busy ? t("playground.running") : t("playground.noRunYet")}
              </p>
            ) : result.error ? (
              <div role="alert" className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-destructive-text">
                  <AlertCircle className="h-4 w-4" />
                  {t("playground.error")}
                </div>
                <pre className="overflow-auto whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/5 p-3 font-mono text-xs text-destructive-text">
                  {result.error}
                </pre>
              </div>
            ) : (
              <div role="status" aria-live="polite" className="space-y-2">
                <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap rounded-md border bg-background p-3 font-mono text-xs">
                  {result.output || " "}
                </pre>
                <p className="text-xs text-muted-foreground">
                  {result.inputTokens !== null && result.outputTokens !== null
                    ? t("playground.stats", {
                        model: result.model,
                        input: result.inputTokens,
                        output: result.outputTokens,
                        ms: result.durationMs,
                      })
                    : t("playground.statsNoTokens", {
                        model: result.model,
                        ms: result.durationMs,
                      })}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="space-y-2 border-t pt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{t("playground.history")}</h2>
          {runs.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void onClearRuns()}
              disabled={historyBusy}
              className="text-destructive-text hover:bg-destructive/10 hover:text-destructive-text"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("playground.clearHistory")}
            </Button>
          )}
        </div>
        {runs.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            {t("playground.historyEmpty")}
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {runs.slice(0, visibleRuns).map((run) => (
                <li key={run.id} className="rounded-md border bg-card p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{run.promptTitle}</span>
                        {run.error && (
                          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive-text">
                            {t("playground.errorBadge")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dateFormatter.format(new Date(run.createdAt))} ·{" "}
                        {run.inputTokens !== null && run.outputTokens !== null
                          ? t("playground.stats", {
                              model: run.model,
                              input: run.inputTokens,
                              output: run.outputTokens,
                              ms: run.durationMs,
                            })
                          : t("playground.statsNoTokens", {
                              model: run.model,
                              ms: run.durationMs,
                            })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => loadFromRun(run)}
                        aria-label={t("playground.loadRunLabel", {
                          title: run.promptTitle,
                        })}
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => void onDelete(run.id)}
                        disabled={historyBusy}
                        aria-label={t("playground.deleteRunLabel", {
                          title: run.promptTitle,
                        })}
                        className="text-destructive-text hover:bg-destructive/10 hover:text-destructive-text"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {(run.output || run.error) && (
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-2 font-mono text-[11px]">
                      {run.error || run.output}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
            {visibleRuns < runs.length && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setVisibleRuns((count) => count + 20)}
              >
                {t("playground.showMore", {
                  count: Math.min(20, runs.length - visibleRuns),
                })}
              </Button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
