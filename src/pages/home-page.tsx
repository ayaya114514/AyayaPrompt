import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Star } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/lib/i18n-client";
import { useVault } from "@/lib/vault-context";

const RECENT_LIMIT = 12;

export function HomePage() {
  const t = useT();
  const locale = useLocale();
  const { prompts } = useVault();
  const recent = useMemo(
    () =>
      [...prompts]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, RECENT_LIMIT),
    [prompts],
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", { dateStyle: "medium" }),
    [locale],
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-5 sm:p-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">AyayaPrompt</h1>
            <p className="text-sm text-muted-foreground">{t("home.tagline")}</p>
          </div>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/new"><Plus className="h-4 w-4" /> {t("sidebar.new")}</Link>
        </Button>
      </header>

      {recent.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          {t("home.empty")}
        </p>
      ) : (
        <section aria-labelledby="recent-heading" className="space-y-2">
          <h2 id="recent-heading" className="text-sm font-semibold">
            {t("home.recent", { count: prompts.length })}
          </h2>
          <ul className="divide-y rounded-md border bg-card">
            {recent.map((prompt) => (
              <li key={prompt.id}>
                <Link
                  to={"/p/" + encodeURIComponent(prompt.id)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  {prompt.favorite && (
                    <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium">{prompt.title}</span>
                  {prompt.folder && (
                    <span className="hidden max-w-[10rem] truncate text-xs text-muted-foreground sm:inline">
                      {prompt.folder}
                    </span>
                  )}
                  <time dateTime={prompt.updatedAt} className="shrink-0 text-xs text-muted-foreground">
                    {dateFormatter.format(new Date(prompt.updatedAt))}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
