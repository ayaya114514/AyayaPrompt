import "fake-indexeddb/auto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  createPrompt,
  exportVault,
  importVault,
  readVaultSnapshot,
  resetVaultStorageForTests,
  restorePromptVersion,
  updatePrompt,
} from "@/lib/storage";

const firstInput = {
  title: "First prompt",
  content: "Hello {{name}}",
  tags: ["demo"],
  favorite: false,
  folder: "Examples",
};

beforeEach(() => resetVaultStorageForTests());
afterAll(() => resetVaultStorageForTests());

describe("IndexedDB vault", () => {
  it("creates prompts, snapshots edits, and restores versions", async () => {
    const prompt = await createPrompt(firstInput);
    await updatePrompt(prompt.id, { ...firstInput, title: "Edited", content: "Updated" });

    let snapshot = await readVaultSnapshot();
    expect(snapshot.prompts[0]).toMatchObject({ title: "Edited", content: "Updated" });
    expect(snapshot.versions).toHaveLength(1);
    expect(snapshot.versions[0]).toMatchObject({ promptId: prompt.id, title: "First prompt" });

    await restorePromptVersion(snapshot.versions[0].id);
    snapshot = await readVaultSnapshot();
    expect(snapshot.prompts[0]).toMatchObject({ title: "First prompt", content: "Hello {{name}}" });
    expect(snapshot.versions).toHaveLength(2);
  });

  it("imports legacy Prisma-shaped JSON and skips duplicate ids", async () => {
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
    expect(snapshot.prompts[0].tags).toEqual(["one", "two"]);
    expect(snapshot.versions[0].promptId).toBe("legacy-1");
  });

  it("exports prompts with nested version history", async () => {
    const prompt = await createPrompt(firstInput);
    await updatePrompt(prompt.id, { ...firstInput, content: "Second" });
    const exported = JSON.parse(await exportVault()) as {
      version: number;
      storage: string;
      prompts: Array<{ versions: unknown[] }>;
    };
    expect(exported.version).toBe(2);
    expect(exported.storage).toBe("indexeddb");
    expect(exported.prompts[0].versions).toHaveLength(1);
  });
});
