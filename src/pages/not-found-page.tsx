import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";

export function NotFoundPage() {
  const t = useT();
  return (
    <div className="flex min-h-full items-center justify-center p-8 text-center">
      <div>
        <h1 className="text-xl font-semibold">{t("notFound.title")}</h1>
        <Button asChild variant="outline" className="mt-4"><Link to="/">{t("notFound.home")}</Link></Button>
      </div>
    </div>
  );
}
