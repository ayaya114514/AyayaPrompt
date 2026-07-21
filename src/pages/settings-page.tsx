import { SettingsForm } from "@/components/settings-form";
import { DataManagement } from "@/components/data-management";
import { useT } from "@/lib/i18n-client";

export function SettingsPage() {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-5 sm:p-8">
      <header>
        <h1 className="text-xl font-semibold">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </header>
      <SettingsForm />
      <DataManagement />
    </div>
  );
}
