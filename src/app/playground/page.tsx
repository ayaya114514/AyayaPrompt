import { prisma } from "@/lib/prisma";
import { PlaygroundRunner } from "@/components/playground-runner";
import { t } from "@/lib/i18n-server";

export default async function PlaygroundPage() {
  const [prompts, runs, settings] = await Promise.all([
    prisma.prompt.findMany({
      orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
      select: { id: true, title: true, content: true },
    }),
    prisma.playgroundRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.appSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-xl font-semibold">{t("playground.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("playground.subtitle")}
        </p>
      </header>

      <PlaygroundRunner
        prompts={prompts}
        runs={runs.map((r) => ({
          id: r.id,
          promptId: r.promptId,
          promptTitle: r.promptTitle,
          renderedPrompt: r.renderedPrompt,
          variables: r.variables,
          provider: r.provider,
          model: r.model,
          output: r.output,
          inputTokens: r.inputTokens,
          outputTokens: r.outputTokens,
          durationMs: r.durationMs,
          error: r.error,
          createdAt: r.createdAt.toISOString(),
        }))}
        settingsConfigured={Boolean(settings?.apiKey)}
      />
    </div>
  );
}
