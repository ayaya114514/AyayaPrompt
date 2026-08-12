"use client";

import { useMemo, useState, useRef, useEffect, useId } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, ChevronRight, Folder, Search, Star, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n-client";
import { isEditableTarget, isPrimaryModifier } from "@/lib/navigation-guard";
import { cn } from "@/lib/utils";

export type SidebarItem = {
  id: string;
  title: string;
  favorite: boolean;
  folder: string | null;
  tags: string[];
  content: string;
};

export function SidebarList({
  items,
  activeId,
  onNavigate,
  searchRequest = 0,
}: {
  items: SidebarItem[];
  activeId?: string;
  onNavigate?: () => void;
  searchRequest?: number;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const searchId = useId();
  const groupIdPrefix = useId();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!searchRef.current || searchRef.current.offsetParent === null) return;
      if (isPrimaryModifier(e) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "/" && !isEditableTarget(e.target)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (searchRequest === 0 || !searchRef.current) return;
    searchRef.current.focus();
    searchRef.current.select();
  }, [searchRequest]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      if (it.title.toLowerCase().includes(q)) return true;
      if (it.tags.some((tag) => tag.toLowerCase().includes(q))) return true;
      if (it.folder && it.folder.toLowerCase().includes(q)) return true;
      if (it.content.toLowerCase().includes(q)) return true;
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
          <label htmlFor={searchId} className="sr-only">
            {t("sidebar.search")}
          </label>
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={searchId}
            ref={searchRef}
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              if (!query && nextQuery.trim()) setCollapsed({});
              setQuery(nextQuery);
            }}
            placeholder={t("sidebar.search")}
            type="search"
            className="h-8 pl-8 pr-8 text-xs [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              aria-label={t("sidebar.clearSearch")}
              className="absolute right-0 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <nav className="mt-3 flex-1 overflow-y-auto px-2 pb-4">
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {t("sidebar.empty")}
          </p>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground" role="status">
            <p>{t("sidebar.noResults")}</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className="mt-2 rounded-md px-2 py-1 font-medium text-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("sidebar.clearSearch")}
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {grouped.map(([folder, list], index) => {
              const key = folder || "__none__";
              const label = folder || t("sidebar.uncategorized");
              const isCollapsed = Boolean(collapsed[key]);
              const groupId = `${groupIdPrefix}-${index}`;
              return (
                <div key={key}>
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    aria-controls={groupId}
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
                  <ul
                    id={groupId}
                    hidden={isCollapsed}
                    className="space-y-0.5 pb-1 pl-2"
                  >
                      {list.map((p) => (
                        <li key={p.id}>
                          <NavLink
                            to={"/p/" + encodeURIComponent(p.id)}
                            onClick={onNavigate}
                            className={({ isActive }) => cn(
                              "block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              (isActive || activeId === p.id) && "bg-accent",
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
                          </NavLink>
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </nav>
    </div>
  );
}
