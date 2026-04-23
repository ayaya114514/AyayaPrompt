"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";

export function ThemeToggle({ theme }: { theme: "light" | "dark" }) {
  const t = useT();

  function onToggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.cookie = `theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
      title={t(theme === "dark" ? "theme.light" : "theme.dark")}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      {t(theme === "dark" ? "theme.light" : "theme.dark")}
    </Button>
  );
}
