import { Link, useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { PromptForm } from "@/components/prompt-form";
import { VariableRunner } from "@/components/variable-runner";
import { VersionsPanel } from "@/components/versions-panel";
import { Button } from "@/components/ui/button";
import { extractVariables } from "@/lib/variables";
import { useT } from "@/lib/i18n-client";
import { useVault } from "@/lib/vault-context";

export function NewPromptPage() {
  const t = useT();
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col p-5 sm:p-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">{t("new.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("new.subtitle")}</p>
      </header>
      <PromptForm mode="create" />
    </div>
  );
}

export function PromptPage() {
  const t = useT();
  const { id = "" } = useParams();
  const { prompts, versionsFor } = useVault();
  const prompt = prompts.find((item) => item.id === id);

  if (!prompt) {
    return (
      <div className="flex min-h-full items-center justify-center p-8 text-center">
        <div>
          <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-3 font-semibold">{t("notFound.title")}</h1>
          <Button asChild variant="outline" className="mt-4"><Link to="/">{t("notFound.home")}</Link></Button>
        </div>
      </div>
    );
  }

  const variables = extractVariables(prompt.content);
  const versions = versionsFor(prompt.id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-5 sm:p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xs uppercase tracking-wide text-muted-foreground">{t("detail.editPrompt")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{t("detail.lastUpdated", { date: new Date(prompt.updatedAt).toLocaleString() })}</p>
        </div>
        <VariableRunner title={prompt.title} content={prompt.content} />
      </header>

      {variables.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <span className="text-muted-foreground">{t("detail.variables")}</span>
          {variables.map((name) => <code key={name} className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">{"{{" + name + "}}"}</code>)}
        </div>
      )}

      <PromptForm
        key={prompt.updatedAt + ":" + versions.length}
        mode="edit"
        id={prompt.id}
        defaults={{
          title: prompt.title,
          content: prompt.content,
          tags: prompt.tags,
          favorite: prompt.favorite,
          folder: prompt.folder,
        }}
      />

      <section className="space-y-3 border-t pt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">{t("detail.history")}</h2>
          <span className="text-xs text-muted-foreground">{t("detail.versionCount", { n: versions.length, s: versions.length === 1 ? "" : "s" })}</span>
        </div>
        <VersionsPanel current={{ title: prompt.title, content: prompt.content }} versions={versions} />
      </section>
    </div>
  );
}
