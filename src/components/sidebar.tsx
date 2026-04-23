import Link from "next/link";
import { Plus, Vault, Play, Settings } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarList } from "@/components/sidebar-list";
import { ShortcutsButton } from "@/components/shortcuts-provider";
import { t } from "@/lib/i18n-server";

function parseTags(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function Sidebar({
  theme,
  activeId,
}: {
  theme: "light" | "dark";
  activeId?: string;
}) {
  const prompts = await prisma.prompt.findMany({
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      tags: true,
      favorite: true,
      folder: true,
    },
  });

  const items = prompts.map((p) => ({
    id: p.id,
    title: p.title,
    favorite: p.favorite,
    folder: p.folder,
    tags: parseTags(p.tags),
  }));

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r bg-muted/30">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <Vault className="h-5 w-5" />
        <Link href="/" className="font-semibold">
          PromptVault
        </Link>
      </div>

      <div className="space-y-1 px-3 pt-3">
        <Button asChild size="sm" className="w-full justify-start gap-2">
          <Link href="/new">
            <Plus className="h-4 w-4" /> {t("sidebar.new")}
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="w-full justify-start gap-2"
        >
          <Link href="/playground">
            <Play className="h-4 w-4" /> {t("nav.playground")}
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="w-full justify-start gap-2"
        >
          <Link href="/settings">
            <Settings className="h-4 w-4" /> {t("nav.settings")}
          </Link>
        </Button>
      </div>

      <SidebarList items={items} activeId={activeId} />

      <div className="space-y-1 border-t p-2">
        <ThemeToggle theme={theme} />
        <LanguageToggle />
        <ShortcutsButton />
      </div>
    </aside>
  );
}
