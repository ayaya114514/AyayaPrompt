"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Folder, Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";

export type SidebarItem = {
  id: string;
  title: string;
  favorite: boolean;
  folder: string | null;
  tags: string[];
};

export function SidebarList({
  items,
  activeId,
  onNavigate,
}: {
  items: SidebarItem[];
  activeId?: string;
  onNavigate?: () => void;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          (target as HTMLElement).isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "/" && !isEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      if (it.title.toLowerCase().includes(q)) return true;
      if (it.tags.some((tag) => tag.toLowerCase().includes(q))) return true;
      if (it.folder && it.folder.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [items, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, SidebarItem[]>();
    for (const it of filtered) {
      const key = it.folder ?? "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    }
    const entries = Array.from(groups.entries());
    entries.sort(([a], [b]) => {
      if (a === b) return 0;
      if (a === "") return 1;
      if (b === "") return -1;
      return a.localeCompare(b);
    });
    return entries;
  }, [filtered]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("sidebar.search")}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <nav className="mt-3 flex-1 overflow-y-auto px-2 pb-4">
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {t("sidebar.empty")}
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {t("sidebar.noResults")}
          </p>
        ) : (
          <div className="space-y-1">
            {grouped.map(([folder, list]) => {
              const key = folder || "__none__";
              const label = folder || t("sidebar.uncategorized");
              const isCollapsed = collapsed[key];
              return (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((c) => ({ ...c, [key]: !c[key] }))
                    }
                    className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:bg-accent/50"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    <Folder className="h-3 w-3" />
                    <span className="truncate">{label}</span>
                    <span className="ml-auto text-[10px] opacity-60">
                      {list.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <ul className="space-y-0.5 pb-1 pl-2">
                      {list.map((p) => (
                        <li key={p.id}>
                          <Link
                            to={"/p/" + p.id}
                            onClick={onNavigate}
                            className={cn(
                              "block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                              activeId === p.id && "bg-accent",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {p.favorite && (
                                <Star className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" />
                              )}
                              <span className="truncate font-medium">
                                {p.title}
                              </span>
                            </div>
                            {p.tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {p.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>
    </div>
  );
}
