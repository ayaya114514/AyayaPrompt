import { PromptForm } from "@/components/prompt-form";
import { t } from "@/lib/i18n-server";

export default function NewPromptPage() {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col p-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">{t("new.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("new.subtitle")}</p>
      </header>
      <PromptForm mode="create" />
    </div>
  );
}
