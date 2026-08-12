import { useEffect, useRef, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { AlertCircle, LoaderCircle, Menu } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HomePage } from "@/pages/home-page";
import { NewPromptPage, PromptPage } from "@/pages/prompt-page";
import { PlaygroundPage } from "@/pages/playground-page";
import { SettingsPage } from "@/pages/settings-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { useT } from "@/lib/i18n-client";
import { isPrimaryModifier } from "@/lib/navigation-guard";
import { useVault } from "@/lib/vault-context";

function AppShell() {
  const t = useT();
  const location = useLocation();
  const { prompts } = useVault();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [routeAnnouncement, setRouteAnnouncement] = useState("");
  const [mobileSearchRequest, setMobileSearchRequest] = useState(0);
  const mainRef = useRef<HTMLElement>(null);
  const mobileNavigationRef = useRef(false);
  const previousPathRef = useRef(location.pathname);

  const prompt = location.pathname.startsWith("/p/")
    ? prompts.find((item) => `/p/${encodeURIComponent(item.id)}` === location.pathname)
    : undefined;
  const routeTitle = location.pathname === "/"
    ? "AyayaPrompt"
    : location.pathname === "/new"
      ? t("new.title")
      : location.pathname === "/playground"
        ? t("playground.title")
        : location.pathname === "/settings"
          ? t("settings.title")
          : prompt?.title ?? t("notFound.title");

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    function openMobileSearch(event: KeyboardEvent) {
      if (
        window.matchMedia("(min-width: 768px)").matches ||
        mobileOpen ||
        !isPrimaryModifier(event) ||
        event.altKey ||
        event.key.toLowerCase() !== "k"
      ) {
        return;
      }
      event.preventDefault();
      setMobileOpen(true);
      setMobileSearchRequest((request) => request + 1);
    }
    window.addEventListener("keydown", openMobileSearch);
    return () => window.removeEventListener("keydown", openMobileSearch);
  }, [mobileOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        mobileNavigationRef.current = true;
        setMobileOpen(false);
      }
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    document.title = routeTitle === "AyayaPrompt" ? routeTitle : `${routeTitle} · AyayaPrompt`;
  }, [routeTitle]);

  useEffect(() => {
    if (previousPathRef.current === location.pathname) return;
    previousPathRef.current = location.pathname;
    setRouteAnnouncement(routeTitle);
    const frame = window.requestAnimationFrame(() => mainRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, routeTitle]);

  function skipToContent(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    mainRef.current?.focus();
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <a
        href="#main-content"
        data-skip-navigation
        onClick={skipToContent}
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-md bg-background px-4 py-2 text-sm font-medium shadow-lg ring-2 ring-ring transition-transform focus:translate-y-0"
      >
        {t("app.skipToContent")}
      </a>

      <aside className="hidden w-72 shrink-0 border-r bg-background md:block">
        <Sidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 md:hidden">
          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="icon" variant="ghost" aria-label={t("app.menu")}>
                <Menu className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent
              closeLabel={t("app.closeMenu")}
              aria-describedby={undefined}
              onCloseAutoFocus={(event) => {
                if (!mobileNavigationRef.current) return;
                event.preventDefault();
                mobileNavigationRef.current = false;
                window.requestAnimationFrame(() => mainRef.current?.focus());
              }}
              className="inset-y-0 left-0 top-0 h-dvh max-h-none w-[min(18rem,85vw)] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-y-0 border-l-0 p-0 md:hidden"
            >
              <DialogTitle className="sr-only">{t("app.menu")}</DialogTitle>
              <Sidebar
                onNavigate={() => {
                  mobileNavigationRef.current = true;
                  setMobileOpen(false);
                }}
                searchRequest={mobileSearchRequest}
              />
            </DialogContent>
          </Dialog>
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <BrandMark className="h-5 w-5" /> AyayaPrompt
          </Link>
        </header>
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="min-w-0 flex-1 overflow-y-auto outline-none"
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/new" element={<NewPromptPage />} />
            <Route path="/p/:id" element={<PromptPage />} />
            <Route path="/playground" element={<PlaygroundPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {routeAnnouncement}
        </div>
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
          <AlertCircle className="mx-auto h-8 w-8 text-destructive-text" />
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
