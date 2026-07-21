import type {
  AppSettings,
  PlaygroundRunRecord,
  PromptInput,
  PromptRecord,
  PromptVersionRecord,
  Provider,
  VaultSnapshot,
} from "@/lib/types";

const DB_NAME = "promptvault-browser";
const DB_VERSION = 1;
const SESSION_API_KEY = "promptvault-session-api-key";

const STORES = {
  prompts: "prompts",
  versions: "versions",
  runs: "runs",
  settings: "settings",
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  id: "singleton",
  provider: "anthropic",
  baseURL: "https://api.anthropic.com",
  apiKey: "",
  model: "claude-sonnet-4-5",
  rememberApiKey: false,
};

let databasePromise: Promise<IDBDatabase> | null = null;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORES.prompts)) {
        const prompts = database.createObjectStore(STORES.prompts, { keyPath: "id" });
        prompts.createIndex("updatedAt", "updatedAt");
      }

      if (!database.objectStoreNames.contains(STORES.versions)) {
        const versions = database.createObjectStore(STORES.versions, { keyPath: "id" });
        versions.createIndex("promptId", "promptId");
        versions.createIndex("createdAt", "createdAt");
      }

      if (!database.objectStoreNames.contains(STORES.runs)) {
        const runs = database.createObjectStore(STORES.runs, { keyPath: "id" });
        runs.createIndex("promptId", "promptId");
        runs.createIndex("createdAt", "createdAt");
      }

      if (!database.objectStoreNames.contains(STORES.settings)) {
        database.createObjectStore(STORES.settings, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error("Unable to open browser storage"));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error("Browser storage upgrade is blocked by another AyayaPrompt tab"));
    };
  });

  return databasePromise;
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

function safeSessionGet(): string {
  try {
    return sessionStorage.getItem(SESSION_API_KEY) ?? "";
  } catch {
    return "";
  }
}

function safeSessionSet(value: string): void {
  try {
    if (value) sessionStorage.setItem(SESSION_API_KEY, value);
    else sessionStorage.removeItem(SESSION_API_KEY);
  } catch {
    // Session-only key persistence is best effort in restricted browser modes.
  }
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      return normalizeTags(JSON.parse(value));
    } catch {
      return value.split(",").map((tag) => tag.trim()).filter(Boolean);
    }
  }
  return [];
}

function normalizeDate(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

export async function readVaultSnapshot(): Promise<VaultSnapshot> {
  const database = await openDatabase();
  const transaction = database.transaction(Object.values(STORES), "readonly");
  const done = transactionDone(transaction);

  const [prompts, versions, runs, storedSettings] = await Promise.all([
    requestResult(transaction.objectStore(STORES.prompts).getAll()) as Promise<PromptRecord[]>,
    requestResult(transaction.objectStore(STORES.versions).getAll()) as Promise<PromptVersionRecord[]>,
    requestResult(transaction.objectStore(STORES.runs).getAll()) as Promise<PlaygroundRunRecord[]>,
    requestResult(transaction.objectStore(STORES.settings).get("singleton")) as Promise<AppSettings | undefined>,
  ]);
  await done;

  prompts.sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt.localeCompare(a.updatedAt));
  versions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const baseSettings = storedSettings ?? DEFAULT_SETTINGS;
  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...baseSettings,
    apiKey: baseSettings.rememberApiKey ? baseSettings.apiKey : safeSessionGet(),
  };

  return { prompts, versions, runs, settings };
}

export async function createPrompt(input: PromptInput): Promise<PromptRecord> {
  const now = new Date().toISOString();
  const prompt: PromptRecord = { id: createId(), ...input, createdAt: now, updatedAt: now };
  const database = await openDatabase();
  const transaction = database.transaction(STORES.prompts, "readwrite");
  const done = transactionDone(transaction);
  transaction.objectStore(STORES.prompts).add(prompt);
  await done;
  return prompt;
}

export async function updatePrompt(id: string, input: PromptInput): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.prompts, STORES.versions], "readwrite");
  const done = transactionDone(transaction);
  const prompts = transaction.objectStore(STORES.prompts);
  const current = (await requestResult(prompts.get(id))) as PromptRecord | undefined;
  if (!current) {
    transaction.abort();
    await done.catch(() => undefined);
    throw new Error("Prompt not found");
  }

  const changed = current.title !== input.title || current.content !== input.content || JSON.stringify(current.tags) !== JSON.stringify(input.tags);
  if (changed) {
    const version: PromptVersionRecord = {
      id: createId(),
      promptId: id,
      title: current.title,
      content: current.content,
      tags: current.tags,
      createdAt: new Date().toISOString(),
    };
    transaction.objectStore(STORES.versions).add(version);
  }

  prompts.put({ ...current, ...input, updatedAt: new Date().toISOString() });
  await done;
}

export async function deletePrompt(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.prompts, STORES.versions, STORES.runs], "readwrite");
  const done = transactionDone(transaction);
  transaction.objectStore(STORES.prompts).delete(id);

  const versions = transaction.objectStore(STORES.versions);
  const versionKeys = await requestResult(versions.index("promptId").getAllKeys(id));
  versionKeys.forEach((key) => versions.delete(key));

  const runs = transaction.objectStore(STORES.runs);
  const linkedRuns = (await requestResult(runs.index("promptId").getAll(id))) as PlaygroundRunRecord[];
  linkedRuns.forEach((run) => runs.put({ ...run, promptId: null }));
  await done;
}

export async function togglePromptFavorite(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORES.prompts, "readwrite");
  const done = transactionDone(transaction);
  const store = transaction.objectStore(STORES.prompts);
  const prompt = (await requestResult(store.get(id))) as PromptRecord | undefined;
  if (prompt) store.put({ ...prompt, favorite: !prompt.favorite, updatedAt: new Date().toISOString() });
  await done;
}

export async function restorePromptVersion(versionId: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([STORES.prompts, STORES.versions], "readwrite");
  const done = transactionDone(transaction);
  const versions = transaction.objectStore(STORES.versions);
  const version = (await requestResult(versions.get(versionId))) as PromptVersionRecord | undefined;
  if (!version) {
    transaction.abort();
    await done.catch(() => undefined);
    throw new Error("Version not found");
  }

  const prompts = transaction.objectStore(STORES.prompts);
  const current = (await requestResult(prompts.get(version.promptId))) as PromptRecord | undefined;
  if (!current) {
    transaction.abort();
    await done.catch(() => undefined);
    throw new Error("Prompt not found");
  }

  versions.add({
    id: createId(),
    promptId: current.id,
    title: current.title,
    content: current.content,
    tags: current.tags,
    createdAt: new Date().toISOString(),
  } satisfies PromptVersionRecord);
  prompts.put({
    ...current,
    title: version.title,
    content: version.content,
    tags: version.tags,
    updatedAt: new Date().toISOString(),
  });
  await done;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const stored: AppSettings = {
    ...settings,
    apiKey: settings.rememberApiKey ? settings.apiKey : "",
  };
  safeSessionSet(settings.rememberApiKey ? "" : settings.apiKey);

  const database = await openDatabase();
  const transaction = database.transaction(STORES.settings, "readwrite");
  const done = transactionDone(transaction);
  transaction.objectStore(STORES.settings).put(stored);
  await done;
}

export async function createRun(run: Omit<PlaygroundRunRecord, "id" | "createdAt">): Promise<PlaygroundRunRecord> {
  const record: PlaygroundRunRecord = { ...run, id: createId(), createdAt: new Date().toISOString() };
  const database = await openDatabase();
  const transaction = database.transaction(STORES.runs, "readwrite");
  const done = transactionDone(transaction);
  transaction.objectStore(STORES.runs).add(record);
  await done;
  return record;
}

export async function deleteRun(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORES.runs, "readwrite");
  const done = transactionDone(transaction);
  transaction.objectStore(STORES.runs).delete(id);
  await done;
}

type UnknownRecord = Record<string, unknown>;

export async function importVault(jsonText: string): Promise<{ added: number; skipped: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as UnknownRecord).prompts)) {
    throw new Error("Expected an object containing a prompts array");
  }

  const database = await openDatabase();
  const transaction = database.transaction([STORES.prompts, STORES.versions], "readwrite");
  const done = transactionDone(transaction);
  const promptStore = transaction.objectStore(STORES.prompts);
  const versionStore = transaction.objectStore(STORES.versions);
  let added = 0;
  let skipped = 0;

  for (const candidate of (parsed as UnknownRecord).prompts as unknown[]) {
    if (!candidate || typeof candidate !== "object") {
      skipped++;
      continue;
    }
    const raw = candidate as UnknownRecord;
    if (typeof raw.title !== "string" || typeof raw.content !== "string" || !raw.title.trim()) {
      skipped++;
      continue;
    }

    const id = typeof raw.id === "string" && raw.id ? raw.id : createId();
    if (await requestResult(promptStore.get(id))) {
      skipped++;
      continue;
    }

    const now = new Date().toISOString();
    const prompt: PromptRecord = {
      id,
      title: raw.title.trim(),
      content: raw.content,
      tags: normalizeTags(raw.tags),
      favorite: raw.favorite === true,
      folder: typeof raw.folder === "string" && raw.folder.trim() ? raw.folder.trim() : null,
      createdAt: normalizeDate(raw.createdAt, now),
      updatedAt: normalizeDate(raw.updatedAt, now),
    };
    promptStore.add(prompt);

    if (Array.isArray(raw.versions)) {
      for (const item of raw.versions) {
        if (!item || typeof item !== "object") continue;
        const source = item as UnknownRecord;
        if (typeof source.title !== "string" || typeof source.content !== "string") continue;
        let versionId = typeof source.id === "string" && source.id ? source.id : createId();
        if (await requestResult(versionStore.get(versionId))) versionId = createId();
        versionStore.add({
          id: versionId,
          promptId: id,
          title: source.title,
          content: source.content,
          tags: normalizeTags(source.tags),
          createdAt: normalizeDate(source.createdAt, now),
        } satisfies PromptVersionRecord);
      }
    }
    added++;
  }

  await done;
  return { added, skipped };
}

export async function exportVault(): Promise<string> {
  const snapshot = await readVaultSnapshot();
  return JSON.stringify(
    {
      version: 2,
      storage: "indexeddb",
      exportedAt: new Date().toISOString(),
      prompts: snapshot.prompts.map((prompt) => ({
        ...prompt,
        versions: snapshot.versions.filter((version) => version.promptId === prompt.id),
      })),
    },
    null,
    2,
  );
}

export async function resetVaultStorageForTests(): Promise<void> {
  if (databasePromise) {
    const database = await databasePromise.catch(() => null);
    database?.close();
    databasePromise = null;
  }
  await requestResult(indexedDB.deleteDatabase(DB_NAME));
  safeSessionSet("");
}

export function isProvider(value: unknown): value is Provider {
  return value === "anthropic" || value === "openai-compatible";
}
