import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "@/app";
import { VaultProvider } from "@/lib/vault-context";
import { LocaleProvider } from "@/lib/i18n-client";
import "@/styles.css";

try {
  if (localStorage.getItem("promptvault-theme-v1") === "dark") {
    document.documentElement.classList.add("dark");
  }
} catch {
  // Default to the light theme when browser storage is restricted.
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <LocaleProvider>
        <VaultProvider>
          <App />
        </VaultProvider>
      </LocaleProvider>
    </HashRouter>
  </React.StrictMode>,
);
