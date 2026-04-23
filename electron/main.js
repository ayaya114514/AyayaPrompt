const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

// In production, Electron launches from /Applications/PromptVault.app/Contents/Resources/app/
// In dev, this file lives at <repo>/electron/main.js
const projectRoot = path.join(__dirname, "..");

// Route SQLite DB to the user-data directory so it survives app updates.
function ensureUserDatabase() {
  const userDataDir = app.getPath("userData");
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });
  const dbPath = path.join(userDataDir, "promptvault.db");
  if (!fs.existsSync(dbPath)) {
    const seedInResources = path.join(process.resourcesPath || "", "seed.db");
    const seedInRepo = path.join(projectRoot, "prisma", "seed.db");
    const seedPath = fs.existsSync(seedInResources) ? seedInResources : seedInRepo;
    if (fs.existsSync(seedPath)) {
      fs.copyFileSync(seedPath, dbPath);
    }
  }
  return dbPath;
}

async function startNextServer() {
  process.chdir(projectRoot);
  // Lazy-require so the module is resolved from the packaged node_modules.
  const next = require(path.join(projectRoot, "node_modules", "next"));
  const nextApp = next({ dev: false, dir: projectRoot });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  const server = http.createServer((req, res) => handle(req, res));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  return `http://127.0.0.1:${port}`;
}

function createWindow(url) {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "PromptVault",
    backgroundColor: "#0b0b0f",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(url);

  // External links open in the default browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (target.startsWith("http://127.0.0.1") || target.startsWith("http://localhost")) {
      return { action: "allow" };
    }
    shell.openExternal(target);
    return { action: "deny" };
  });

  return win;
}

app.whenReady().then(async () => {
  const dbPath = ensureUserDatabase();
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.NODE_ENV = "production";

  // Minimal menu: keep system defaults on macOS, strip dev tools on Windows/Linux.
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
  }

  try {
    const url = await startNextServer();
    createWindow(url);
  } catch (err) {
    console.error("Failed to start embedded server:", err);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      startNextServer().then(createWindow).catch(console.error);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
