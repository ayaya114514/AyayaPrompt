import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings-form";
import { DataManagement } from "@/components/data-management";
import { Provider } from "@/lib/providers";
import { t } from "@/lib/i18n-server";

export default async function SettingsPage() {
  const s = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
  });

  const initial = {
    provider: (s?.provider ?? "anthropic") as Provider,
    baseURL: s?.baseURL ?? "",
    apiKey: s?.apiKey ?? "",
    model: s?.model ?? "claude-sonnet-4-5",
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-xl font-semibold">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </header>
      <SettingsForm initial={initial} />
      <DataManagement />
    </div>
  );
}
