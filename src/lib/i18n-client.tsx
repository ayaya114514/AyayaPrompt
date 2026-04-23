"use client";

import { createContext, useContext, useCallback } from "react";
import { DEFAULT_LOCALE, Key, Locale, translate } from "./i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return useCallback(
    (key: Key, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    [locale],
  );
}
