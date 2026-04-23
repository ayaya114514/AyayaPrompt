import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import { LocaleProvider } from "@/lib/i18n-client";
import { getLocale } from "@/lib/i18n-server";
import { getTheme } from "@/lib/theme-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromptVault",
  description: "Your personal vault for crafted prompts.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale();
  const theme = getTheme();
  return (
    <html lang={locale} className={theme === "dark" ? "dark" : ""}>
      <body className="h-screen overflow-hidden">
        <LocaleProvider locale={locale}>
          <div className="flex h-full">
            <Sidebar theme={theme} />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
