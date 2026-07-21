import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale, useSetLocale, useT } from "@/lib/i18n-client";

export function LanguageToggle() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useT();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
      className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
    >
      <Languages className="h-4 w-4" />
      {t("sidebar.toggleLang")}
    </Button>
  );
}
