import { Link, useLocation } from "react-router-dom";
import { Plus, Play, Settings } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarList } from "@/components/sidebar-list";
import { ShortcutsButton } from "@/components/shortcuts-provider";
import { useT } from "@/lib/i18n-client";
import { useVault } from "@/lib/vault-context";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  const { prompts } = useVault();
  const location = useLocation();
  const activeId = location.pathname.startsWith("/p/") ? location.pathname.slice(3) : undefined;

  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <BrandMark className="h-6 w-6" />
        <Link to="/" onClick={onNavigate} className="font-semibold">AyayaPrompt</Link>
      </div>

      <div className="space-y-1 px-3 pt-3">
        <Button asChild size="sm" className="w-full justify-start gap-2">
          <Link to="/new" onClick={onNavigate}><Plus className="h-4 w-4" /> {t("sidebar.new")}</Link>
        </Button>
        <Button asChild size="sm" variant="ghost" className="w-full justify-start gap-2">
          <Link to="/playground" onClick={onNavigate}><Play className="h-4 w-4" /> {t("nav.playground")}</Link>
        </Button>
        <Button asChild size="sm" variant="ghost" className="w-full justify-start gap-2">
          <Link to="/settings" onClick={onNavigate}><Settings className="h-4 w-4" /> {t("nav.settings")}</Link>
        </Button>
      </div>

      <SidebarList
        items={prompts.map((prompt) => ({
          id: prompt.id,
          title: prompt.title,
          favorite: prompt.favorite,
          folder: prompt.folder,
          tags: prompt.tags,
        }))}
        activeId={activeId}
        onNavigate={onNavigate}
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
