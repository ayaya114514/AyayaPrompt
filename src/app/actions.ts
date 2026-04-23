"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { callModel, Provider } from "@/lib/providers";
import { fillVariables } from "@/lib/variables";

function parseTags(raw: FormDataEntryValue | null): string {
  const text = typeof raw === "string" ? raw : "";
  const arr = text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return JSON.stringify(arr);
}

export async function createPrompt(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  if (!title) throw new Error("Title is required");

  const prompt = await prisma.prompt.create({
    data: {
      title,
      content,
      tags: parseTags(formData.get("tags")),
      favorite: formData.get("favorite") === "on",
      folder: parseFolder(formData.get("folder")),
    },
  });

  revalidatePath("/", "layout");
  redirect(`/p/${prompt.id}`);
}

function parseFolder(raw: FormDataEntryValue | null): string | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  return v === "" ? null : v;
}

export async function updatePrompt(id: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  if (!title) throw new Error("Title is required");

  const tags = parseTags(formData.get("tags"));
  const favorite = formData.get("favorite") === "on";
  const folder = parseFolder(formData.get("folder"));

  const current = await prisma.prompt.findUnique({ where: { id } });
  if (!current) throw new Error("Prompt not found");

  const changed =
    current.title !== title ||
    current.content !== content ||
    current.tags !== tags;

  await prisma.$transaction(async (tx) => {
    if (changed) {
      await tx.promptVersion.create({
        data: {
          promptId: id,
          title: current.title,
          content: current.content,
          tags: current.tags,
        },
      });
    }
    await tx.prompt.update({
      where: { id },
      data: { title, content, tags, favorite, folder },
    });
  });

  revalidatePath("/", "layout");
  revalidatePath(`/p/${id}`);
}

export async function deletePrompt(id: string) {
  await prisma.prompt.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/");
}

export async function toggleFavorite(id: string) {
  const p = await prisma.prompt.findUnique({ where: { id } });
  if (!p) return;
  await prisma.prompt.update({
    where: { id },
    data: { favorite: !p.favorite },
  });
  revalidatePath("/", "layout");
}

export async function saveSettings(formData: FormData) {
  const provider = String(formData.get("provider") ?? "anthropic") as Provider;
  const baseURL = String(formData.get("baseURL") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", provider, baseURL, apiKey, model },
    update: { provider, baseURL, apiKey, model },
  });

  revalidatePath("/settings");
  revalidatePath("/playground");
}

export type RunResult = {
  runId: string;
  output: string;
  error: string | null;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  model: string;
};

export async function runPlayground(
  promptId: string,
  values: Record<string, string>,
): Promise<RunResult> {
  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt) throw new Error("Prompt not found");

  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!settings || !settings.apiKey) {
    throw new Error("API settings not configured. Go to Settings first.");
  }

  const rendered = fillVariables(prompt.content, values);
  const started = Date.now();

  let output = "";
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let errorMsg: string | null = null;

  try {
    const result = await callModel({
      provider: settings.provider as Provider,
      baseURL: settings.baseURL,
      apiKey: settings.apiKey,
      model: settings.model,
      prompt: rendered,
    });
    output = result.text;
    inputTokens = result.inputTokens;
    outputTokens = result.outputTokens;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : String(e);
  }

  const durationMs = Date.now() - started;

  const run = await prisma.playgroundRun.create({
    data: {
      promptId: prompt.id,
      promptTitle: prompt.title,
      renderedPrompt: rendered,
      variables: JSON.stringify(values),
      provider: settings.provider,
      model: settings.model,
      output,
      inputTokens,
      outputTokens,
      durationMs,
      error: errorMsg,
    },
  });

  revalidatePath("/playground");
  return {
    runId: run.id,
    output,
    error: errorMsg,
    durationMs,
    inputTokens: inputTokens ?? null,
    outputTokens: outputTokens ?? null,
    model: settings.model,
  };
}

export async function deleteRun(id: string) {
  await prisma.playgroundRun.delete({ where: { id } });
  revalidatePath("/playground");
}

export async function exportAllData(): Promise<string> {
  const prompts = await prisma.prompt.findMany({
    include: { versions: true },
    orderBy: { createdAt: "asc" },
  });
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      prompts,
    },
    null,
    2,
  );
}

type ImportedPrompt = {
  id?: string;
  title: string;
  content: string;
  tags?: string;
  favorite?: boolean;
  folder?: string | null;
  createdAt?: string;
  updatedAt?: string;
  versions?: Array<{
    id?: string;
    title: string;
    content: string;
    tags: string;
    createdAt?: string;
  }>;
};

export async function importData(
  jsonText: string,
): Promise<{ added: number; skipped: number }> {
  let parsed: { prompts?: ImportedPrompt[] };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!parsed || !Array.isArray(parsed.prompts)) {
    throw new Error("Expected { prompts: [...] }");
  }

  let added = 0;
  let skipped = 0;
  for (const p of parsed.prompts) {
    if (!p.title || typeof p.content !== "string") {
      skipped++;
      continue;
    }
    if (p.id) {
      const existing = await prisma.prompt.findUnique({ where: { id: p.id } });
      if (existing) {
        skipped++;
        continue;
      }
    }
    await prisma.prompt.create({
      data: {
        ...(p.id ? { id: p.id } : {}),
        title: p.title,
        content: p.content,
        tags: p.tags ?? "[]",
        favorite: p.favorite ?? false,
        folder: p.folder ?? null,
        ...(p.createdAt ? { createdAt: new Date(p.createdAt) } : {}),
        ...(p.updatedAt ? { updatedAt: new Date(p.updatedAt) } : {}),
        ...(p.versions && p.versions.length
          ? {
              versions: {
                create: p.versions.map((v) => ({
                  ...(v.id ? { id: v.id } : {}),
                  title: v.title,
                  content: v.content,
                  tags: v.tags,
                  ...(v.createdAt
                    ? { createdAt: new Date(v.createdAt) }
                    : {}),
                })),
              },
            }
          : {}),
      },
    });
    added++;
  }

  revalidatePath("/", "layout");
  return { added, skipped };
}

export async function restoreVersion(versionId: string) {
  const version = await prisma.promptVersion.findUnique({
    where: { id: versionId },
  });
  if (!version) throw new Error("Version not found");

  const current = await prisma.prompt.findUnique({
    where: { id: version.promptId },
  });
  if (!current) throw new Error("Prompt not found");

  await prisma.$transaction(async (tx) => {
    await tx.promptVersion.create({
      data: {
        promptId: current.id,
        title: current.title,
        content: current.content,
        tags: current.tags,
      },
    });
    await tx.prompt.update({
      where: { id: current.id },
      data: {
        title: version.title,
        content: version.content,
        tags: version.tags,
      },
    });
  });

  revalidatePath("/", "layout");
  revalidatePath(`/p/${version.promptId}`);
}
