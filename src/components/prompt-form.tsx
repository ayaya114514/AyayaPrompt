"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";
import {
  createPrompt,
  updatePrompt,
  deletePrompt,
} from "@/app/actions";

type Mode =
  | { mode: "create" }
  | {
      mode: "edit";
      id: string;
      defaults: {
        title: string;
        content: string;
        tags: string[];
        favorite: boolean;
        folder: string | null;
      };
    };

export function PromptForm(props: Mode) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const t = useT();

  const defaults =
    props.mode === "edit"
      ? props.defaults
      : {
          title: "",
          content: "",
          tags: [] as string[],
          favorite: false,
          folder: null as string | null,
        };

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      if (props.mode === "edit") {
        await updatePrompt(props.id, formData);
      } else {
        await createPrompt(formData);
      }
    });
  }

  function onDelete() {
    if (props.mode !== "edit") return;
    if (!confirm(t("form.confirmDelete"))) return;
    startTransition(async () => {
      await deletePrompt((props as { id: string }).id);
    });
  }

  return (
    <form action={onSubmit} className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input
          name="title"
          defaultValue={defaults.title}
          placeholder={t("form.titlePlaceholder")}
          required
          className="flex-1 !h-11 !text-base font-medium"
        />
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm has-[:checked]:border-yellow-400 has-[:checked]:text-yellow-500">
          <input
            type="checkbox"
            name="favorite"
            defaultChecked={defaults.favorite}
            className="sr-only peer"
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
            defaultValue={defaults.folder ?? ""}
            placeholder={t("form.folderPlaceholder")}
          />
          <p className="text-xs text-muted-foreground">
            {t("form.folderHint")}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">{t("form.tags")}</Label>
          <Input
            id="tags"
            name="tags"
            defaultValue={defaults.tags.join(", ")}
            placeholder={t("form.tagsPlaceholder")}
          />
          <p className="text-xs text-muted-foreground">
            {t("form.tagsHint")}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="content">{t("form.content")}</Label>
        <Textarea
          id="content"
          name="content"
          defaultValue={defaults.content}
          placeholder={t("form.contentPlaceholder")}
          className="flex-1 min-h-[300px] font-mono text-sm"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          {props.mode === "edit" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isPending}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> {t("form.delete")}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            disabled={isPending}
          >
            {t("form.cancel")}
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            <Save className="h-4 w-4" />
            {isPending ? t("form.saving") : t("form.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
