import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Trash2, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";
import { useVault } from "@/lib/vault-context";
import type { PromptInput } from "@/lib/types";

type PromptFormProps =
  | { mode: "create" }
  | { mode: "edit"; id: string; defaults: PromptInput };

export function PromptForm(props: PromptFormProps) {
  const navigate = useNavigate();
  const t = useT();
  const { createPrompt, updatePrompt, deletePrompt } = useVault();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaults: PromptInput = props.mode === "edit"
    ? props.defaults
    : { title: "", content: "", tags: [], favorite: false, folder: null };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;
    const input: PromptInput = {
      title,
      content: String(form.get("content") ?? ""),
      tags: String(form.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
      favorite: form.get("favorite") === "on",
      folder: String(form.get("folder") ?? "").trim() || null,
    };

    setBusy(true);
    setError(null);
    try {
      if (props.mode === "edit") {
        await updatePrompt(props.id, input);
      } else {
        const prompt = await createPrompt(input);
        navigate("/p/" + prompt.id, { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (props.mode !== "edit" || !confirm(t("form.confirmDelete"))) return;
    setBusy(true);
    setError(null);
    try {
      await deletePrompt(props.id);
      navigate("/", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4">
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4" /> {t("form.error", { msg: error })}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          name="title"
          defaultValue={defaults.title}
          placeholder={t("form.titlePlaceholder")}
          required
          className="h-11 flex-1 text-base font-medium"
        />
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm has-[:checked]:border-yellow-400 has-[:checked]:text-yellow-500">
          <input type="checkbox" name="favorite" defaultChecked={defaults.favorite} className="peer sr-only" />
          <Star className="h-4 w-4 peer-checked:fill-yellow-400" />
          {t("form.favorite")}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="folder">{t("form.folder")}</Label>
          <Input id="folder" name="folder" defaultValue={defaults.folder ?? ""} placeholder={t("form.folderPlaceholder")} />
          <p className="text-xs text-muted-foreground">{t("form.folderHint")}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">{t("form.tags")}</Label>
          <Input id="tags" name="tags" defaultValue={defaults.tags.join(", ")} placeholder={t("form.tagsPlaceholder")} />
          <p className="text-xs text-muted-foreground">{t("form.tagsHint")}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="content">{t("form.content")}</Label>
        <Textarea
          id="content"
          name="content"
          defaultValue={defaults.content}
          placeholder={t("form.contentPlaceholder")}
          className="min-h-[300px] flex-1 font-mono text-sm"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          {props.mode === "edit" && (
            <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={busy} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-4 w-4" /> {t("form.delete")}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => props.mode === "create" ? navigate("/") : navigate(-1)} disabled={busy}>
            {t("form.cancel")}
          </Button>
          <Button type="submit" size="sm" disabled={busy}>
            <Save className="h-4 w-4" /> {busy ? t("form.saving") : t("form.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
