import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n-client";
import { extractVariables, fillVariables } from "@/lib/variables";

export function VariableRunner({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  const t = useT();
  const variables = useMemo(() => extractVariables(content), [content]);
  const [values, setValues] = useState<Record<string, string>>({});

  const rendered = useMemo(
    () => fillVariables(content, values),
    [content, values],
  );

  if (variables.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <Play className="h-3.5 w-3.5" />
          {t("runner.fillN", { n: variables.length })}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl" closeLabel={t("shortcuts.close")}>
        <DialogHeader>
          <DialogTitle>{t("runner.dialogTitle", { title })}</DialogTitle>
          <DialogDescription>{t("runner.dialogDesc")}</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[70vh] gap-4 overflow-y-auto md:grid-cols-2">
          <div className="space-y-3">
            {variables.map((name) => (
                <div key={name} className="space-y-1.5">
                  <Label htmlFor={`var-${name}`} className="font-mono text-xs">
                    {`{{${name}}}`}
                  </Label>
                  <Textarea
                    id={`var-${name}`}
                    value={values[name] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [name]: e.target.value }))
                    }
                    placeholder={t("runner.enterValue", { name })}
                    className="min-h-[60px] text-sm"
                  />
                </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("runner.preview")}
            </Label>
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-mono text-xs">
              {rendered || (
                <span className="text-muted-foreground">
                  {t("runner.empty")}
                </span>
              )}
            </pre>
          </div>
        </div>

        <div className="flex justify-end border-t pt-3">
          <CopyButton text={rendered} label={t("runner.copy")} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
