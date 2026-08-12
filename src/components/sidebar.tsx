import { NavLink, useLocation } from "react-router-dom";
import { Plus, Play, Settings } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarList } from "@/components/sidebar-list";
import { ShortcutsButton } from "@/components/shortcuts-provider";
import { useT } from "@/lib/i18n-client";
import { useVault } from "@/lib/vault-context";
import { cn } from "@/lib/utils";

export function Sidebar({
  onNavigate,
  searchRequest,
}: {
  onNavigate?: () => void;
  searchRequest?: number;
}) {
  const t = useT();
  const { prompts } = useVault();
  const location = useLocation();
  const activeId = location.pathname.startsWith("/p/") ? location.pathname.slice(3) : undefined;

  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <BrandMark className="h-6 w-6" />
        <NavLink
          to="/"
          end
          onClick={onNavigate}
          className={({ isActive }) => cn(
            "rounded-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isActive && "underline decoration-2 underline-offset-4",
          )}
        >
          AyayaPrompt
        </NavLink>
      </div>

      <div className="space-y-1 px-3 pt-3">
        <NavLink
          to="/new"
          onClick={onNavigate}
          className={({ isActive }) => cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "w-full justify-start gap-2",
            isActive && "ring-2 ring-ring ring-offset-2",
          )}
        >
          <Plus className="h-4 w-4" /> {t("sidebar.new")}
        </NavLink>
        <NavLink
          to="/playground"
          onClick={onNavigate}
          className={({ isActive }) => cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-full justify-start gap-2",
            isActive && "bg-accent text-accent-foreground",
          )}
        >
          <Play className="h-4 w-4" /> {t("nav.playground")}
        </NavLink>
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) => cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-full justify-start gap-2",
            isActive && "bg-accent text-accent-foreground",
          )}
        >
          <Settings className="h-4 w-4" /> {t("nav.settings")}
        </NavLink>
      </div>

      <SidebarList
        items={prompts.map((prompt) => ({
          id: prompt.id,
          title: prompt.title,
          favorite: prompt.favorite,
          folder: prompt.folder,
          tags: prompt.tags,
          content: prompt.content,
        }))}
        activeId={activeId}
        onNavigate={onNavigate}
        searchRequest={searchRequest}
      />

      <div className="space-y-1 border-t p-2">
        <p className="px-3 py-1 text-[10px] text-muted-foreground">{t("app.localOnly")}</p>
        <ThemeToggle />
        <LanguageToggle />
        <ShortcutsButton />
      </div>
    </div>
  );
}
