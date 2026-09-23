import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import { setTheme, useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const t = useT();
  const theme = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {theme === "dark" ? t("theme.light") : t("theme.dark")}
    </Button>
  );
}
