import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Trash2, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";
import {
  confirmDiscardChanges,
  useDirtyNavigationGuard,
} from "@/lib/navigation-guard";
import { PromptConflictError, PromptNotFoundError } from "@/lib/storage";
import { useVault } from "@/lib/vault-context";
import type { PromptInput } from "@/lib/types";

type PromptFormProps =
  | { mode: "create"; onDirtyChange?: (dirty: boolean) => void }
  | {
      mode: "edit";
      id: string;
      updatedAt: string;
      defaults: PromptInput;
      deletedRemotely?: boolean;
      onDirtyChange?: (dirty: boolean) => void;
    };

type PromptDraft = {
  title: string;
  content: string;
  tags: string;
  favorite: boolean;
  folder: string;
};

function toDraft(input: PromptInput): PromptDraft {
  return {
    title: input.title,
    content: input.content,
    tags: input.tags.join(", "),
    favorite: input.favorite,
    folder: input.folder ?? "",
  };
}

function draftSignature(draft: PromptDraft): string {
  return JSON.stringify(draft);
}

function parseDraftSignature(signature: string): PromptDraft {
  return JSON.parse(signature) as PromptDraft;
}

export function PromptForm(props: PromptFormProps) {
  const navigate = useNavigate();
  const t = useT();
  const { createPrompt, updatePrompt, deletePrompt } = useVault();
  const defaults: PromptInput = props.mode === "edit"
    ? props.defaults
    : { title: "", content: "", tags: [], favorite: false, folder: null };
  const incomingSignature = draftSignature(toDraft(defaults));
  const incomingUpdatedAt = props.mode === "edit" ? props.updatedAt : null;
  const onDirtyChange = props.onDirtyChange;
  const [draft, setDraft] = useState<PromptDraft>(() => toDraft(defaults));
  const [initialSignature, setInitialSignature] = useState(incomingSignature);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expectedUpdatedAtRef = useRef(incomingUpdatedAt);
  const dirty = draftSignature(draft) !== initialSignature;
  const { markClean } = useDirtyNavigationGuard(dirty, t("form.confirmDiscard"));
  const hasRemoteChange = dirty && incomingUpdatedAt !== expectedUpdatedAtRef.current;

  useLayoutEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (dirty || incomingUpdatedAt === null) return;
    expectedUpdatedAtRef.current = incomingUpdatedAt;
    setInitialSignature(incomingSignature);
    setDraft((current) =>
      draftSignature(current) === incomingSignature
        ? current
        : parseDraftSignature(incomingSignature),
    );
  }, [dirty, incomingSignature, incomingUpdatedAt]);

  function patchDraft(next: Partial<PromptDraft>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: PromptInput = {
      title: draft.title.trim(),
      content: draft.content,
      tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      favorite: draft.favorite,
      folder: draft.folder.trim() || null,
    };
    if (!input.title) return;

    setBusy(true);
    setError(null);
    try {
      let recoveredPromptId: string | null = null;
      if (props.mode === "edit" && !props.deletedRemotely) {
        try {
          await updatePrompt(
            props.id,
            input,
            expectedUpdatedAtRef.current ?? props.updatedAt,
          );
        } catch (cause) {
          if (!(cause instanceof PromptNotFoundError)) throw cause;
          recoveredPromptId = (await createPrompt(input)).id;
        }
      } else if (props.mode === "edit") {
        recoveredPromptId = (await createPrompt(input)).id;
      } else {
        recoveredPromptId = (await createPrompt(input)).id;
      }

      const normalizedDraft = toDraft(input);
      setInitialSignature(draftSignature(normalizedDraft));
      setDraft(normalizedDraft);
      markClean();
      if (recoveredPromptId) {
        navigate("/p/" + encodeURIComponent(recoveredPromptId), { replace: true });
      }
    } catch (cause) {
      setError(
        cause instanceof PromptConflictError
          ? t("form.conflictError")
          : cause instanceof Error
            ? cause.message
            : String(cause),
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (
      props.mode !== "edit" ||
      props.deletedRemotely ||
      !confirm(t("form.confirmDelete"))
    ) return;
    setBusy(true);
    setError(null);
    try {
      await deletePrompt(props.id);
      markClean();
      navigate("/", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-1 flex-col gap-4"
      aria-busy={busy}
      data-dirty={dirty ? "true" : "false"}
    >
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive-text">
          <AlertCircle className="h-4 w-4" /> {t("form.error", { msg: error })}
        </div>
      )}
      {props.mode === "edit" && props.deletedRemotely ? (
        <div role="status" className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-800 dark:text-yellow-200">
          {t("form.remoteDeleted")}
        </div>
      ) : hasRemoteChange ? (
        <div role="status" className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-800 dark:text-yellow-200">
          {t("form.remoteChange")}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Label htmlFor="prompt-title" className="sr-only">
          {t("form.titlePlaceholder")}
        </Label>
        <Input
          id="prompt-title"
          name="title"
          value={draft.title}
          onChange={(event) => patchDraft({ title: event.target.value })}
          placeholder={t("form.titlePlaceholder")}
          required
          className="h-11 flex-1 text-base font-medium"
        />
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm has-[:checked]:border-yellow-500 has-[:checked]:text-yellow-700 has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 dark:has-[:checked]:text-yellow-300">
          <input
            type="checkbox"
            name="favorite"
            checked={draft.favorite}
            onChange={(event) => patchDraft({ favorite: event.target.checked })}
            className="peer sr-only"
          />
          <Star className="h-4 w-4 peer-checked:fill-yellow-400" />
          {t("form.favorite")}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="folder">{t("form.folder")}</Label>
          <Input
            id="folder"
            name="folder"
            value={draft.folder}
            onChange={(event) => patchDraft({ folder: event.target.value })}
            placeholder={t("form.folderPlaceholder")}
          />
          <p className="text-xs text-muted-foreground">{t("form.folderHint")}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">{t("form.tags")}</Label>
          <Input
            id="tags"
            name="tags"
            value={draft.tags}
            onChange={(event) => patchDraft({ tags: event.target.value })}
            placeholder={t("form.tagsPlaceholder")}
          />
          <p className="text-xs text-muted-foreground">{t("form.tagsHint")}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="content">{t("form.content")}</Label>
        <Textarea
          id="content"
          name="content"
          value={draft.content}
          onChange={(event) => patchDraft({ content: event.target.value })}
          placeholder={t("form.contentPlaceholder")}
          className="min-h-[300px] flex-1 font-mono text-sm"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          {props.mode === "edit" && !props.deletedRemotely && (
            <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={busy} className="text-destructive-text hover:bg-destructive/10 hover:text-destructive-text">
              <Trash2 className="h-4 w-4" /> {t("form.delete")}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (!confirmDiscardChanges()) return;
              markClean();
              if (props.mode === "create") navigate("/");
              else navigate(-1);
            }}
            disabled={busy}
          >
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
