import { access, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.PORT ?? 4173);
const basePath = "/AyayaPrompt/";
const distRoot = path.resolve(process.cwd(), "dist");
const parentPid = process.ppid;

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

await access(path.join(distRoot, "index.html"));

function respond(response, status, body, headers = {}) {
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    ...headers,
  });
  response.end(body);
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    respond(response, 405, "Method not allowed", { allow: "GET, HEAD" });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? "/", `http://${host}`).pathname);
  } catch {
    respond(response, 400, "Bad request");
    return;
  }

  if (!pathname.startsWith(basePath)) {
    respond(response, 404, "Not found");
    return;
  }

  const relativePath = pathname.slice(basePath.length) || "index.html";
  const filePath = path.resolve(distRoot, relativePath);
  if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${path.sep}`)) {
    respond(response, 404, "Not found");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");
    const body = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "content-type": contentTypes.get(extension) ?? "application/octet-stream",
      "content-length": body.byteLength,
      "cache-control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    respond(response, 404, "Not found");
  }
});

server.listen(port, host, () => {
  console.log(`Serving dist at http://${host}:${port}${basePath}`);
});

// Playwright terminates the webServer command's shell. Stop as soon as this
// child is re-parented so repeated local test runs never inherit a stale port.
const parentMonitor = setInterval(() => {
  if (process.ppid === parentPid) return;
  clearInterval(parentMonitor);
  server.close(() => process.exit(0));
}, 250);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    clearInterval(parentMonitor);
    server.close(() => process.exit(0));
  });
}
