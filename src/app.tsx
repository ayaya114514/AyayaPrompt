import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { AlertCircle, LoaderCircle, Menu, Vault, X } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { HomePage } from "@/pages/home-page";
import { NewPromptPage, PromptPage } from "@/pages/prompt-page";
import { PlaygroundPage } from "@/pages/playground-page";
import { SettingsPage } from "@/pages/settings-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { useT } from "@/lib/i18n-client";
import { useVault } from "@/lib/vault-context";
import { cn } from "@/lib/utils";

function AppShell() {
  const t = useT();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="flex h-dvh overflow-hidden">
      {mobileOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r bg-background transition-transform md:static md:z-auto md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          type="button"
          aria-label={t("app.closeMenu")}
          onClick={() => setMobileOpen(false)}
          className="absolute right-2 top-3 rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 md:hidden">
          <Button type="button" size="icon" variant="ghost" onClick={() => setMobileOpen(true)} aria-label={t("app.menu")}>
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Vault className="h-4 w-4" /> PromptVault
          </Link>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/new" element={<NewPromptPage />} />
            <Route path="/p/:id" element={<PromptPage />} />
            <Route path="/playground" element={<PlaygroundPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export function App() {
  const t = useT();
  const { ready, error, refresh } = useVault();

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-3 text-sm text-muted-foreground">
        <LoaderCircle className="h-5 w-5 animate-spin" /> {t("app.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md space-y-4 rounded-lg border p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <div>
            <h1 className="font-semibold">{t("app.storageError")}</h1>
            <p className="mt-2 break-words text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => void refresh().catch(() => undefined)}>{t("app.retry")}</Button>
        </div>
      </div>
    );
  }

  return <AppShell />;
}
