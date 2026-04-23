"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/lib/i18n-client";

export function LanguageToggle() {
  const locale = useLocale();
  const t = useT();

  function onToggle() {
    const next = locale === "zh" ? "en" : "zh";
    document.cookie = `locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
    >
      <Languages className="h-4 w-4" />
      {t("sidebar.toggleLang")}
    </Button>
  );
}
