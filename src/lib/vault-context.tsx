import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as storage from "@/lib/storage";
import type {
  AppSettings,
  PlaygroundRunRecord,
  PromptInput,
  PromptRecord,
  PromptVersionRecord,
  VaultSnapshot,
} from "@/lib/types";

type VaultContextValue = VaultSnapshot & {
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createPrompt: (input: PromptInput) => Promise<PromptRecord>;
  updatePrompt: (id: string, input: PromptInput) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  createRun: (run: Omit<PlaygroundRunRecord, "id" | "createdAt">) => Promise<PlaygroundRunRecord>;
  deleteRun: (id: string) => Promise<void>;
  importData: (jsonText: string) => Promise<{ added: number; skipped: number }>;
  exportData: () => Promise<string>;
  versionsFor: (promptId: string) => PromptVersionRecord[];
};

const EMPTY_SNAPSHOT: VaultSnapshot = {
  prompts: [],
  versions: [],
  runs: [],
  settings: storage.DEFAULT_SETTINGS,
};

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<VaultSnapshot>(EMPTY_SNAPSHOT);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSnapshot(await storage.readVaultSnapshot());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const mutate = useCallback(
    async (operation: () => Promise<void>) => {
      await operation();
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<VaultContextValue>(
    () => ({
      ...snapshot,
      ready,
      error,
      refresh,
      async createPrompt(input) {
        const prompt = await storage.createPrompt(input);
        await refresh();
        return prompt;
      },
      updatePrompt: (id, input) => mutate(() => storage.updatePrompt(id, input)),
      deletePrompt: (id) => mutate(() => storage.deletePrompt(id)),
      toggleFavorite: (id) => mutate(() => storage.togglePromptFavorite(id)),
      restoreVersion: (id) => mutate(() => storage.restorePromptVersion(id)),
      saveSettings: (settings) => mutate(() => storage.saveSettings(settings)),
      async createRun(run) {
        const record = await storage.createRun(run);
        await refresh();
        return record;
      },
      deleteRun: (id) => mutate(() => storage.deleteRun(id)),
      async importData(jsonText) {
        const result = await storage.importVault(jsonText);
        await refresh();
        return result;
      },
      exportData: storage.exportVault,
      versionsFor: (promptId) => snapshot.versions.filter((version) => version.promptId === promptId),
    }),
    [error, mutate, ready, refresh, snapshot],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const value = useContext(VaultContext);
  if (!value) throw new Error("useVault must be used inside VaultProvider");
  return value;
}
