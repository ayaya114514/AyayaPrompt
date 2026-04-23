import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PromptForm } from "@/components/prompt-form";
import { VariableRunner } from "@/components/variable-runner";
import { VersionsPanel } from "@/components/versions-panel";
import { extractVariables } from "@/lib/variables";
import { t } from "@/lib/i18n-server";

function parseTags(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default async function PromptPage({
  params,
}: {
  params: { id: string };
}) {
  const prompt = await prisma.prompt.findUnique({
    where: { id: params.id },
    include: {
      versions: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!prompt) notFound();

  const variables = extractVariables(prompt.content);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("detail.editPrompt")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("detail.lastUpdated", {
              date: new Date(prompt.updatedAt).toLocaleString(),
            })}
          </p>
        </div>
        <VariableRunner title={prompt.title} content={prompt.content} />
      </header>

      {variables.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <span className="text-muted-foreground">{t("detail.variables")}</span>
          {variables.map((v) => (
            <code
              key={v}
              className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]"
            >
              {`{{${v}}}`}
            </code>
          ))}
        </div>
      )}

      <PromptForm
        mode="edit"
        id={prompt.id}
        defaults={{
          title: prompt.title,
          content: prompt.content,
          tags: parseTags(prompt.tags),
          favorite: prompt.favorite,
          folder: prompt.folder,
        }}
      />

      <section className="space-y-3 border-t pt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">{t("detail.history")}</h2>
          <span className="text-xs text-muted-foreground">
            {t("detail.versionCount", {
              n: prompt.versions.length,
              s: prompt.versions.length === 1 ? "" : "s",
            })}
          </span>
        </div>
        <VersionsPanel
          current={{ title: prompt.title, content: prompt.content }}
          versions={prompt.versions.map((v) => ({
            id: v.id,
            title: v.title,
            content: v.content,
            tags: v.tags,
            createdAt: v.createdAt.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}
