import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";

export function CopyButton({
  text,
  label,
  size = "sm",
  variant = "outline",
  disabled,
  className,
}: {
  text: string;
  label?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  disabled?: boolean;
  className?: string;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch (cause) {
      setCopied(false);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={() => void copy()}
        disabled={disabled}
        className={className}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? t("runner.copied") : label ?? t("common.copy")}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? t("runner.copied") : ""}
      </span>
      {error && (
        <span role="alert" className="text-xs text-destructive-text">
          {t("runner.copyError", { msg: error })}
        </span>
      )}
    </span>
  );
}
