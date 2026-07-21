import { PlaygroundRunner } from "@/components/playground-runner";
import { useT } from "@/lib/i18n-client";

export function PlaygroundPage() {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-5 sm:p-8">
      <header>
        <h1 className="text-xl font-semibold">{t("playground.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("playground.subtitle")}</p>
      </header>
      <PlaygroundRunner />
    </div>
  );
}
