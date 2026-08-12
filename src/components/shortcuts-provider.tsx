"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n-client";
import {
  confirmDiscardChanges,
  isEditableTarget,
  isPrimaryModifier,
} from "@/lib/navigation-guard";

const isMac =
  typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] shadow-sm">
      {children}
    </kbd>
  );
}

export function ShortcutsButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const shortcutButtons = Array.from(
        document.querySelectorAll<HTMLElement>("[data-shortcuts-owner]"),
      );
      const owner = shortcutButtons.find((button) => button.offsetParent !== null)
        ?? shortcutButtons[0];
      if (owner !== buttonRef.current) return;

      const isEditable = isEditableTarget(e.target);

      if (
        isPrimaryModifier(e) &&
        !e.altKey &&
        !e.shiftKey &&
        e.key.toLowerCase() === "n" &&
        !isEditable
      ) {
        e.preventDefault();
        if (confirmDiscardChanges()) navigate("/new");
      } else if (e.key === "?" && !isEditable) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const rows: Array<{ keys: React.ReactNode; label: string }> = [
    {
      keys: (
        <>
          <Kbd>{MOD}</Kbd> <Kbd>N</Kbd>
        </>
      ),
      label: t("shortcuts.newPrompt"),
    },
    {
      keys: (
        <>
          <Kbd>{MOD}</Kbd> <Kbd>K</Kbd>
          <span className="mx-1 text-muted-foreground">·</span>
          <Kbd>/</Kbd>
        </>
      ),
      label: t("shortcuts.search"),
    },
    {
      keys: <Kbd>?</Kbd>,
      label: t("shortcuts.help"),
    },
    {
      keys: <Kbd>Esc</Kbd>,
      label: t("shortcuts.close"),
    },
  ];

  return (
    <>
      <Button
        ref={buttonRef}
        data-shortcuts-owner
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
      >
        <Keyboard className="h-4 w-4" />
        {t("shortcuts.title")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={t("shortcuts.close")} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("shortcuts.title")}</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="text-muted-foreground">{r.label}</span>
                <span className="flex items-center gap-1">{r.keys}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
