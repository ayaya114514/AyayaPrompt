import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  updatePrompt: (id: string, input: PromptInput, expectedUpdatedAt: string) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  createRun: (run: Omit<PlaygroundRunRecord, "id" | "createdAt">) => Promise<PlaygroundRunRecord>;
  deleteRun: (id: string) => Promise<void>;
  clearRuns: () => Promise<void>;
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
  const channelRef = useRef<BroadcastChannel | null>(null);
  const sourceIdRef = useRef(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  );

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

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel("ayaya-prompt-vault");
    } catch {
      return;
    }
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const message = event.data;
      if (!message || typeof message !== "object") return;
      const candidate = message as { type?: unknown; source?: unknown };
      if (candidate.type !== "changed" || candidate.source === sourceIdRef.current) return;
      refresh().catch(() => undefined);
    };
    return () => {
      if (channelRef.current === channel) channelRef.current = null;
      channel.close();
    };
  }, [refresh]);

  const broadcastChange = useCallback(() => {
    try {
      channelRef.current?.postMessage({ type: "changed", source: sourceIdRef.current });
    } catch {
      // Cross-tab refresh is best effort where BroadcastChannel is restricted.
    }
  }, []);

  const mutate = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T> => {
      const result = await operation();
      broadcastChange();
      await refresh();
      return result;
    },
    [broadcastChange, refresh],
  );

  const value = useMemo<VaultContextValue>(
    () => ({
      ...snapshot,
      ready,
      error,
      refresh,
      createPrompt: (input) => mutate(() => storage.createPrompt(input)),
      updatePrompt: (id, input, expectedUpdatedAt) => mutate(
        () => storage.updatePrompt(id, input, expectedUpdatedAt),
      ),
      deletePrompt: (id) => mutate(() => storage.deletePrompt(id)),
      toggleFavorite: (id) => mutate(() => storage.togglePromptFavorite(id)),
      restoreVersion: (id) => mutate(() => storage.restorePromptVersion(id)),
      saveSettings: (settings) => mutate(() => storage.saveSettings(settings)),
      createRun: (run) => mutate(() => storage.createRun(run)),
      deleteRun: (id) => mutate(() => storage.deleteRun(id)),
      clearRuns: () => mutate(() => storage.clearRuns()),
      importData: (jsonText) => mutate(() => storage.importVault(jsonText)),
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
