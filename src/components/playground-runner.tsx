"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Play, AlertCircle, Trash2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";
import { extractVariables, fillVariables } from "@/lib/variables";
import { runPlayground, deleteRun, RunResult } from "@/app/actions";

export type PromptItem = {
  id: string;
  title: string;
  content: string;
};

export type RunItem = {
  id: string;
  promptId: string | null;
  promptTitle: string;
  renderedPrompt: string;
  variables: string;
  provider: string;
  model: string;
  output: string;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number;
  error: string | null;
  createdAt: string;
};

export function PlaygroundRunner({
  prompts,
  runs,
  settingsConfigured,
}: {
  prompts: PromptItem[];
  runs: RunItem[];
  settingsConfigured: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(prompts[0]?.id ?? "");
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RunResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = prompts.find((p) => p.id === selectedId);
  const variables = useMemo(
    () => (selected ? extractVariables(selected.content) : []),
    [selected],
  );
  const rendered = useMemo(
    () => (selected ? fillVariables(selected.content, values) : ""),
    [selected, values],
  );

  function onRun() {
    if (!selected) return;
    setResult(null);
    startTransition(async () => {
      try {
        const r = await runPlayground(selected.id, values);
        setResult(r);
        router.refresh();
      } catch (e) {
        setResult({
          runId: "",
          output: "",
          error: e instanceof Error ? e.message : String(e),
          durationMs: 0,
          inputTokens: null,
          outputTokens: null,
          model: "",
        });
      }
    });
  }

  function loadFromRun(run: RunItem) {
    if (run.promptId && prompts.some((p) => p.id === run.promptId)) {
      setSelectedId(run.promptId);
    }
    try {
      const vars = JSON.parse(run.variables) as Record<string, string>;
      if (vars && typeof vars === "object") setValues(vars);
    } catch {}
    setResult(null);
  }

  function onDelete(id: string) {
    if (!confirm(t("playground.confirmDeleteRun"))) return;
    startTransition(() => deleteRun(id));
  }

  if (prompts.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t("playground.noPrompts")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!settingsConfigured && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/5 p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          <div>
            <Link
              href="/settings"
              className="font-medium text-yellow-700 underline dark:text-yellow-400"
            >
              {t("playground.settingsMissing")}
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt-select">{t("playground.selectPrompt")}</Label>
            <select
              id="prompt-select"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setValues({});
                setResult(null);
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>{t("playground.variables")}</Label>
            {variables.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("playground.noVariables")}
              </p>
            ) : (
              <div className="space-y-2">
                {variables.map((name) => (
                  <div key={name} className="space-y-1">
                    <Label htmlFor={`pv-${name}`} className="font-mono text-xs">
                      {`{{${name}}}`}
                    </Label>
                    <Textarea
                      id={`pv-${name}`}
                      value={values[name] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [name]: e.target.value }))
                      }
                      className="min-h-[56px] text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={onRun}
            disabled={isPending || !selected}
            className="w-full"
          >
            <Play className="h-4 w-4" />
            {isPending ? t("playground.running") : t("playground.run")}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("playground.rendered")}</Label>
            <pre className="max-h-[180px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs">
              {rendered || " "}
            </pre>
          </div>

          <div className="space-y-2">
            <Label>{t("playground.output")}</Label>
            {!result ? (
              <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                {t("playground.noRunYet")}
              </p>
            ) : result.error ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-destructive">
                  <AlertCircle className="h-4 w-4" /> {t("playground.error")}
                </div>
                <pre className="overflow-auto whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/5 p-3 font-mono text-xs text-destructive">
                  {result.error}
                </pre>
              </div>
            ) : (
              <div className="space-y-2">
                <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap rounded-md border bg-background p-3 font-mono text-xs">
                  {result.output || " "}
                </pre>
                <p className="text-xs text-muted-foreground">
                  {result.inputTokens != null && result.outputTokens != null
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
          </div>
        </div>
      </div>

      <section className="space-y-2 border-t pt-6">
        <h2 className="text-sm font-semibold">{t("playground.history")}</h2>
        {runs.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            {t("playground.historyEmpty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {runs.map((r) => (
              <li
                key={r.id}
                className="rounded-md border bg-card p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {r.promptTitle}
                      </span>
                      {r.error && (
                        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                          error
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()} ·{" "}
                      {r.inputTokens != null && r.outputTokens != null
                        ? t("playground.stats", {
                            model: r.model,
                            input: r.inputTokens,
                            output: r.outputTokens,
                            ms: r.durationMs,
                          })
                        : t("playground.statsNoTokens", {
                            model: r.model,
                            ms: r.durationMs,
                          })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => loadFromRun(r)}
                      title={t("playground.loadInto")}
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(r.id)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {(r.output || r.error) && (
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-2 font-mono text-[11px]">
                    {r.error || r.output}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
