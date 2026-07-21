import { Link } from "react-router-dom";
import { Plus, Vault } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import { useVault } from "@/lib/vault-context";

export function HomePage() {
  const t = useT();
  const { prompts } = useVault();
  const count = prompts.length;

  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Vault className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold">{t("home.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {count === 0 ? t("home.empty") : t("home.hasPrompts", { count, s: count === 1 ? "" : "s" })}
        </p>
        <Button asChild className="mt-6">
          <Link to="/new"><Plus className="h-4 w-4" /> {t("sidebar.new")}</Link>
        </Button>
      </div>
    </div>
  );
}
