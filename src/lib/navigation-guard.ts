import { useCallback, useLayoutEffect, useRef } from "react";

type DirtyEntry = {
  message: string;
  href: string;
  historyIndex: number | null;
  historyState: unknown;
};

const dirtyEntries = new Map<symbol, DirtyEntry>();
let listenersInstalled = false;
let restoringHistory = false;

function currentMessage(): string | undefined {
  return dirtyEntries.values().next().value?.message;
}

export function confirmDiscardChanges(): boolean {
  const message = currentMessage();
  return !message || window.confirm(message);
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.matches("input, textarea, select") ||
    target.isContentEditable ||
    Boolean(target.closest("[contenteditable='true']"))
  );
}

export function isPrimaryModifier(event: KeyboardEvent): boolean {
  const applePlatform = /Mac|iPhone|iPad|iPod/i.test(
    navigator.platform || navigator.userAgent,
  );
  return applePlatform ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}

function installGlobalListeners() {
  if (
    listenersInstalled ||
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) return;
  listenersInstalled = true;

  window.addEventListener("beforeunload", (event) => {
    if (dirtyEntries.size === 0) return;
    event.preventDefault();
    event.returnValue = "";
  });

  window.addEventListener(
    "popstate",
    (event) => {
      if (restoringHistory) {
        restoringHistory = false;
        event.stopImmediatePropagation();
        return;
      }

      const entry = dirtyEntries.values().next().value as DirtyEntry | undefined;
      if (!entry || confirmDiscardChanges()) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const nextIndex = typeof event.state?.idx === "number" ? event.state.idx : null;
      if (entry.historyIndex !== null && nextIndex !== null && entry.historyIndex !== nextIndex) {
        restoringHistory = true;
        window.history.go(entry.historyIndex - nextIndex);
      } else {
        window.history.replaceState(entry.historyState, "", entry.href);
      }
    },
    true,
  );

  document.addEventListener(
    "click",
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      const anchor = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
      if (
        !anchor ||
        anchor.dataset.skipNavigation !== undefined ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const isInternalNavigation = destination.origin === window.location.origin;
      if (
        isInternalNavigation &&
        destination.href !== window.location.href &&
        !confirmDiscardChanges()
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );
}

// This module is evaluated before HashRouter mounts, so the capture listener can
// veto browser back/forward before the router consumes the history event.
installGlobalListeners();

export function useDirtyNavigationGuard(isDirty: boolean, message: string) {
  const tokenRef = useRef(Symbol("dirty-form"));

  useLayoutEffect(() => {
    const token = tokenRef.current;
    if (isDirty) {
      dirtyEntries.set(token, {
        message,
        href: window.location.href,
        historyIndex: typeof window.history.state?.idx === "number"
          ? window.history.state.idx
          : null,
        historyState: window.history.state,
      });
    }
    else dirtyEntries.delete(token);
    return () => {
      dirtyEntries.delete(token);
    };
  }, [isDirty, message]);

  const markClean = useCallback(() => {
    dirtyEntries.delete(tokenRef.current);
  }, []);

  return { markClean };
}
