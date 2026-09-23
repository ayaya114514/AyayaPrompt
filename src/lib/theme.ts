import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "promptvault-theme-v1";
const THEME_COLORS: Record<Theme, string> = {
  dark: "#090e1a",
  light: "#ffffff",
};

const listeners = new Set<() => void>();

function readStoredTheme(): Theme {
  try {
    // Dark is the default; only an explicit light choice opts out.
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

let currentTheme: Theme = readStoredTheme();

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[theme]);
}

/** Applies the stored theme before React renders to avoid a flash. */
export function initTheme() {
  applyTheme(currentTheme);
}

export function setTheme(theme: Theme) {
  currentTheme = theme;
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Keep the current session theme when persistence is restricted.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Every toggle instance (desktop sidebar and mobile drawer) shares one state. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, () => currentTheme, () => currentTheme);
}
