import { cookies } from "next/headers";

export type Theme = "light" | "dark";

export function getTheme(): Theme {
  return cookies().get("theme")?.value === "dark" ? "dark" : "light";
}
