import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_LOCALE, Key, Locale, translate } from "@/lib/i18n";

const LOCALE_KEY = "promptvault-locale-v1";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readLocale(): Locale {
  try {
    return localStorage.getItem(LOCALE_KEY) === "en" ? "en" : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      // The current session can still switch language if storage is restricted.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("Locale hooks must be used inside LocaleProvider");
  return value;
}

export function useLocale(): Locale {
  return useLocaleContext().locale;
}

export function useSetLocale(): (locale: Locale) => void {
  return useLocaleContext().setLocale;
}

export function useT() {
  const locale = useLocale();
  return useCallback(
    (key: Key, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale],
  );
}
