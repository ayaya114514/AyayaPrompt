import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALES,
  Key,
  Locale,
  translate,
} from "./i18n";

export function getLocale(): Locale {
  const raw = cookies().get("locale")?.value;
  return LOCALES.includes(raw as Locale) ? (raw as Locale) : DEFAULT_LOCALE;
}

export function t(key: Key, params?: Record<string, string | number>): string {
  return translate(getLocale(), key, params);
}
