import "fake-indexeddb/auto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRuns,
  createPrompt,
  createRun,
  DEFAULT_SETTINGS,
  deletePrompt,
  exportVault,
  importVault,
  PromptConflictError,
  readVaultSnapshot,
  resetVaultStorageForTests,
  restorePromptVersion,
  RUN_RETENTION_LIMIT,
  saveSettings,
  updatePrompt,
} from "@/lib/storage";
import type { AppSettings, PlaygroundRunRecord } from "@/lib/types";

const DB_NAME = "promptvault-browser";
const SESSION_API_KEY = "promptvault-session-api-key";

class MemorySessionStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return this.values.keys().toArray()[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

const testSessionStorage = new MemorySessionStorage();
vi.stubGlobal("sessionStorage", testSessionStorage);

const firstInput = {
  title: "First prompt",
  content: "Hello {{name}}",
  tags: ["demo"],
  favorite: false,
  folder: "Examples",
};

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function createLegacyStores(database: IDBDatabase): void {
  const prompts = database.createObjectStore("prompts", { keyPath: "id" });
  prompts.createIndex("updatedAt", "updatedAt");
  const versions = database.createObjectStore("versions", { keyPath: "id" });
  versions.createIndex("promptId", "promptId");
  versions.createIndex("createdAt", "createdAt");
  const runs = database.createObjectStore("runs", { keyPath: "id" });
  runs.createIndex("promptId", "promptId");
  runs.createIndex("createdAt", "createdAt");
  database.createObjectStore("settings", { keyPath: "id" });
}

async function seedLegacyDatabase(
  settings: Record<string, unknown>,
  runs: PlaygroundRunRecord[] = [],
): Promise<void> {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => createLegacyStores(request.result);
  const database = await idbRequest(request);
  const transaction = database.transaction(["settings", "runs"], "readwrite");
  transaction.objectStore("settings").put(settings);
  for (const run of runs) transaction.objectStore("runs").put(run);
  await idbTransaction(transaction);
  database.close();
}

async function readRawSettings(): Promise<Record<string, unknown>> {
  const database = await idbRequest(indexedDB.open(DB_NAME, 2));
  const transaction = database.transaction("settings", "readonly");
  const value = await idbRequest(transaction.objectStore("settings").get("singleton"));
  await idbTransaction(transaction);
  database.close();
  return value as Record<string, unknown>;
}

function runInput(promptId: string | null, sequence = 0) {
  return {
    promptId,
    promptTitle: `Prompt ${sequence}`,
    renderedPrompt: `Rendered ${sequence}`,
    variables: { value: String(sequence) },
    provider: "anthropic" as const,
    model: "test-model",
    output: `Output ${sequence}`,
    inputTokens: null,
    outputTokens: null,
    durationMs: sequence,
    error: null,
  };
}

beforeEach(async () => {
  testSessionStorage.clear();
  await resetVaultStorageForTests();
});

afterAll(async () => {
  await resetVaultStorageForTests();
  vi.unstubAllGlobals();
});

describe("IndexedDB vault", () => {
  it("snapshots and restores every editable prompt field", async () => {
    const prompt = await createPrompt(firstInput);
    await updatePrompt(prompt.id, {
      ...firstInput,
      title: "Edited",
      content: "Updated",
      favorite: true,
      folder: "Archive",
    }, prompt.updatedAt);

    let snapshot = await readVaultSnapshot();
    expect(snapshot.prompts[0]).toMatchObject({
      title: "Edited",
      content: "Updated",
      favorite: true,
      folder: "Archive",
    });
    expect(snapshot.versions).toHaveLength(1);
    expect(snapshot.versions[0]).toMatchObject({
      promptId: prompt.id,
      title: "First prompt",
      favorite: false,
      folder: "Examples",
    });

    await restorePromptVersion(snapshot.versions[0].id);
    snapshot = await readVaultSnapshot();
    expect(snapshot.prompts[0]).toMatchObject({
      title: "First prompt",
      content: "Hello {{name}}",
      favorite: false,
      folder: "Examples",
    });
    expect(snapshot.versions).toHaveLength(2);
  });

  it("rejects stale prompt updates instead of overwriting newer data", async () => {
    const prompt = await createPrompt(firstInput);
    await updatePrompt(prompt.id, { ...firstInput, content: "Newer" }, prompt.updatedAt);

    await expect(updatePrompt(
      prompt.id,
      { ...firstInput, content: "Stale overwrite" },
      prompt.updatedAt,
    )).rejects.toBeInstanceOf(PromptConflictError);

    const snapshot = await readVaultSnapshot();
    expect(snapshot.prompts[0].content).toBe("Newer");
    expect(snapshot.versions).toHaveLength(1);
  });

  it("keeps folder and favorite when restoring a legacy version without those fields", async () => {
    await importVault(JSON.stringify({
      prompts: [{
        id: "legacy-prompt",
        title: "Current",
        content: "Current content",
        tags: [],
        favorite: true,
        folder: "Archive",
        versions: [{ id: "legacy-version", title: "Older", content: "Before", tags: [] }],
      }],
    }));
    const version = (await readVaultSnapshot()).versions[0];
    await restorePromptVersion(version.id);

    expect((await readVaultSnapshot()).prompts[0]).toMatchObject({
      title: "Older",
      favorite: true,
      folder: "Archive",
    });
  });

  it("cascades prompt deletion to versions and linked runs", async () => {
    const prompt = await createPrompt(firstInput);
    await updatePrompt(prompt.id, { ...firstInput, content: "Second" }, prompt.updatedAt);
    await createRun(runInput(prompt.id));
    const unrelatedRun = await createRun(runInput(null, 1));

    await deletePrompt(prompt.id);

    const snapshot = await readVaultSnapshot();
    expect(snapshot.prompts).toHaveLength(0);
    expect(snapshot.versions).toHaveLength(0);
    expect(snapshot.runs.map((run) => run.id)).toEqual([unrelatedRun.id]);
  });

  it("atomically bounds run retention and can clear all retained runs", async () => {
    for (let index = 0; index < RUN_RETENTION_LIMIT + 7; index += 1) {
      await createRun(runInput(null, index));
    }

    expect((await readVaultSnapshot()).runs).toHaveLength(RUN_RETENTION_LIMIT);
    await clearRuns();
    expect((await readVaultSnapshot()).runs).toHaveLength(0);
  });

  it("imports legacy JSON, skips duplicate safe ids, and preserves safe nested ids", async () => {
    const legacy = JSON.stringify({
      version: 1,
      prompts: [{
        id: "legacy-1",
        title: "Legacy",
        content: "Old data",
        tags: "[\"one\",\"two\"]",
        favorite: true,
        folder: "Archive",
        versions: [{ id: "version-1", title: "Older", content: "Before", tags: "[]" }],
      }],
    });

    await expect(importVault(legacy)).resolves.toEqual({ added: 1, skipped: 0 });
    await expect(importVault(legacy)).resolves.toEqual({ added: 0, skipped: 1 });
    const snapshot = await readVaultSnapshot();
    expect(snapshot.prompts[0]).toMatchObject({ id: "legacy-1", tags: ["one", "two"] });
    expect(snapshot.versions[0]).toMatchObject({ id: "version-1", promptId: "legacy-1" });
  });

  it("replaces unsafe imported prompt and nested version ids", async () => {
    await importVault(JSON.stringify({
      prompts: [{
        id: "folder/item?secret=yes",
        title: "Imported",
        content: "Content",
        versions: [{ id: "version/one", title: "Old", content: "Old content" }],
      }],
    }));

    const snapshot = await readVaultSnapshot();
    expect(snapshot.prompts[0].id).not.toBe("folder/item?secret=yes");
    expect(snapshot.versions[0].id).not.toBe("version/one");
    expect(snapshot.prompts[0].id).toMatch(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/);
    expect(snapshot.versions[0].id).toMatch(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/);
    expect(snapshot.versions[0].promptId).toBe(snapshot.prompts[0].id);
  });

  it("stores API keys only in a provider-and-endpoint-scoped session envelope", async () => {
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      baseURL: "https://api.anthropic.com/",
      apiKey: "sk-session-only",
    };
    await saveSettings(settings);

    const envelope = JSON.parse(testSessionStorage.getItem(SESSION_API_KEY) ?? "null") as {
      provider: string;
      baseURL: string;
      apiKey: string;
    };
    expect(envelope).toEqual(expect.objectContaining({
      provider: "anthropic",
      baseURL: "https://api.anthropic.com",
      apiKey: "sk-session-only",
    }));
    expect((await readVaultSnapshot()).settings.apiKey).toBe("sk-session-only");
    expect(await readRawSettings()).toEqual({
      id: "singleton",
      provider: "anthropic",
      baseURL: "https://api.anthropic.com/",
      model: DEFAULT_SETTINGS.model,
    });

    const oldEnvelope = testSessionStorage.getItem(SESSION_API_KEY) ?? "";
    await saveSettings({
      ...settings,
      baseURL: "https://api.anthropic.com/v1",
      apiKey: "",
    });
    testSessionStorage.setItem(SESSION_API_KEY, oldEnvelope);
    expect((await readVaultSnapshot()).settings.apiKey).toBe("");
    expect(testSessionStorage.getItem(SESSION_API_KEY)).toBeNull();

    await saveSettings({
      ...settings,
      provider: "openai-compatible",
      apiKey: "",
    });
    testSessionStorage.setItem(SESSION_API_KEY, oldEnvelope);
    expect((await readVaultSnapshot()).settings.apiKey).toBe("");
    expect(testSessionStorage.getItem(SESSION_API_KEY)).toBeNull();
  });

  it("scrubs raw legacy session keys and persistent v1 credentials during migration", async () => {
    const legacyRuns = Array.from({ length: RUN_RETENTION_LIMIT + 3 }, (_, index) => ({
      id: `run-${String(index).padStart(3, "0")}`,
      ...runInput(null, index),
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    }));
    await seedLegacyDatabase({
      ...DEFAULT_SETTINGS,
      apiKey: "sk-persisted-legacy",
      rememberApiKey: true,
    }, legacyRuns);
    testSessionStorage.setItem(SESSION_API_KEY, "sk-raw-legacy");

    const snapshot = await readVaultSnapshot();
    expect(snapshot.settings.apiKey).toBe("");
    expect(snapshot.runs).toHaveLength(RUN_RETENTION_LIMIT);
    expect(snapshot.runs.some((run) => run.id === "run-000")).toBe(false);
    expect(testSessionStorage.getItem(SESSION_API_KEY)).toBeNull();
    expect(await readRawSettings()).toEqual({
      id: "singleton",
      provider: DEFAULT_SETTINGS.provider,
      baseURL: DEFAULT_SETTINGS.baseURL,
      model: DEFAULT_SETTINGS.model,
    });
  });

  it("exports prompts with nested version history and no settings secrets", async () => {
    const prompt = await createPrompt(firstInput);
    await updatePrompt(prompt.id, { ...firstInput, content: "Second" }, prompt.updatedAt);
    await saveSettings({ ...DEFAULT_SETTINGS, apiKey: "sk-not-exported" });
    const exportedText = await exportVault();
    const exported = JSON.parse(exportedText) as {
      version: number;
      storage: string;
      prompts: Array<{ versions: unknown[] }>;
    };
    expect(exported.version).toBe(2);
    expect(exported.storage).toBe("indexeddb");
    expect(exported.prompts[0].versions).toHaveLength(1);
    expect(exportedText).not.toContain("sk-not-exported");
  });
});
