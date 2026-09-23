import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "@/app";
import { VaultProvider } from "@/lib/vault-context";
import { LocaleProvider } from "@/lib/i18n-client";
import { initTheme } from "@/lib/theme";
import "@/styles.css";

initTheme();

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
