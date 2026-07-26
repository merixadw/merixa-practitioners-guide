/**
 * Local Device Lab server — design preview frames for iOS layouts on Windows.
 *
 * Usage:
 *   node device-lab/server.mjs
 *   node device-lab/server.mjs --port=3920 --open
 *
 * If the preferred port is busy, the next free port is used automatically.
 * Point the lab at `npm run dev` (default http://localhost:3000).
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const PREFERRED_PORT = Number(
  process.argv.find((a) => a.startsWith("--port="))?.slice(7) || 3920,
);
const SHOULD_OPEN = process.argv.includes("--open");
const MAX_PORT_TRIES = 20;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
};

function safePath(urlPath) {
  const clean = decodeURIComponent((urlPath || "/").split("?")[0]);
  const rel = clean === "/" ? "index.html" : clean.replace(/^\//, "");
  const full = normalize(join(ROOT, rel));
  if (!full.startsWith(ROOT)) return null;
  return full;
}

function openBrowser(url) {
  const platform = process.platform;
  const cmd =
    platform === "win32"
      ? `start "" "${url}"`
      : platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

async function pingApp(target) {
  try {
    const url = new URL(target);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, error: "URL must be http(s)" };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    // Prefer a cheap HEAD when supported; fall back to GET for Next HTML.
    let res;
    try {
      res = await fetch(url.href, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });
      if (res.status === 405 || res.status === 501) {
        res = await fetch(url.href, {
          method: "GET",
          signal: controller.signal,
          redirect: "follow",
        });
      }
    } catch {
      res = await fetch(url.href, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
      });
    }
    clearTimeout(timer);
    return { ok: res.ok || res.status < 500, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unreachable",
    };
  }
}

function createLabServer() {
  return createServer((req, res) => {
    const hostPort = Number(req.socket.localPort) || PREFERRED_PORT;
    const reqUrl = new URL(req.url || "/", `http://127.0.0.1:${hostPort}`);

    if (reqUrl.pathname === "/api/ping") {
      const target = reqUrl.searchParams.get("url") || "http://127.0.0.1:3000";
      void pingApp(target).then((result) => {
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        });
        res.end(JSON.stringify(result));
      });
      return;
    }

    const filePath = safePath(reqUrl.pathname);
    if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const type = TYPES[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store",
    });
    res.end(readFileSync(filePath));
  });
}

function listenWithFallback(port, attempt = 0) {
  const server = createLabServer();

  server.once("error", (err) => {
    if (err && err.code === "EADDRINUSE" && attempt < MAX_PORT_TRIES) {
      const next = port + 1;
      console.warn(`  Port ${port} busy — trying ${next}…`);
      listenWithFallback(next, attempt + 1);
      return;
    }
    console.error(err);
    process.exit(1);
  });

  server.listen(port, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${port}/`;
    console.log("");
    console.log("  Merixa Device Lab");
    console.log(`  ${url}`);
    if (port !== PREFERRED_PORT) {
      console.log(`  (preferred ${PREFERRED_PORT} was busy)`);
    }
    console.log("");
    console.log("  1. In another terminal: npm run dev");
    console.log("  2. Lab App URL: http://127.0.0.1:3000/ask/");
    console.log("  3. Real iOS Simulator needs a Mac — see device-lab/README.md");
    console.log("");
    if (SHOULD_OPEN) openBrowser(url);
  });
}

listenWithFallback(PREFERRED_PORT);
