/**
 * Browser and dev-server lifecycle. Borrowed wholesale from `tools/playtest.mjs`
 * (the vendored phaser4-gamedev harness), because that file already solved the
 * three things that go wrong here: finding Playwright wherever it is installed,
 * waiting for Vite's URL line AND for the socket to actually accept, and the
 * swiftshader flags a headless WebGL canvas needs.
 *
 * DELIBERATELY NOT AN IMPORT of playtest.mjs. That file is vendored unmodified
 * from an upstream skill and its `main()` runs on import order that assumes it
 * owns the process. Copying ~90 lines is cheaper than forking a vendored file
 * this project has a standing rule not to modify.
 *
 * One difference that matters: a FRESH BROWSER CONTEXT per run. `localStorage`
 * carries the save, and `dev-notes/playwright-shared-context-leaks-save-state.md`
 * records the session where a shared context leaked autosave state between
 * screenshots. The save probe deliberately writes garbage into that key, so a
 * leaked context would poison the next run.
 */

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import net from "node:net";

const URL_RE = /(https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(\d+)\/?[^\s\x1b]*)/i;

async function loadChromium(projectDir) {
  const requireFrom = createRequire(path.join(projectDir, "package.json"));
  for (const name of ["playwright", "@playwright/test", "playwright-core"]) {
    for (const resolve of [() => requireFrom.resolve(name), () => createRequire(import.meta.url).resolve(name)]) {
      try {
        const mod = await import(pathToFileURL(resolve()).href);
        const chromium = mod.chromium || mod.default?.chromium;
        if (chromium) return chromium;
      } catch {
        /* try the next candidate */
      }
    }
  }
  throw new Error("Playwright not found. Run: npm install -D playwright && npx playwright install chromium");
}

function portOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host });
    const done = (v) => {
      sock.destroy();
      resolve(v);
    };
    sock.setTimeout(500);
    sock.on("connect", () => done(true));
    sock.on("error", () => done(false));
    sock.on("timeout", () => done(false));
  });
}

async function startServer(projectDir, timeoutMs) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const proc = spawn(npm, ["run", "dev"], {
    cwd: projectDir,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
    shell: process.platform === "win32",
  });

  let buffer = "";
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`dev server printed no URL within ${timeoutMs}ms:\n${buffer.slice(-2000)}`)),
      timeoutMs,
    );
    const scan = (d) => {
      buffer += d.toString();
      // Vite colorizes the port (localhost:\x1b[1m5173\x1b[22m/), which splits the
      // digits away from the colon and defeats URL_RE. Match against a stripped copy.
      const m = buffer.replace(/\x1b\[[0-9;]*m/g, "").match(URL_RE);
      if (m) {
        clearTimeout(timer);
        resolve(m[1].replace(/\/$/, ""));
      }
    };
    proc.stdout.on("data", scan);
    proc.stderr.on("data", scan);
    proc.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`dev server exited early (${code}):\n${buffer.slice(-2000)}`));
    });
    proc.on("error", reject);
  });

  const port = Number(new URL(url).port);
  for (let i = 0; i < 60 && !(await portOpen(port)); i++) await new Promise((r) => setTimeout(r, 250));

  return {
    url,
    stop: () => {
      if (proc.exitCode !== null) return;
      try {
        if (process.platform !== "win32" && proc.pid) process.kill(-proc.pid, "SIGTERM");
        else proc.kill("SIGTERM");
      } catch {
        /* already gone */
      }
    },
  };
}

/**
 * Boots everything and returns the handles the loop needs.
 *
 * `consoleErrors` and `pageErrors` are LIVE arrays — the loop reads their length
 * before and after each step to attribute a new error to the probe that caused
 * it, rather than dumping them all at the end with no context.
 */
export async function boot({ projectDir, url, mode, viewport, headed, settle, timeout }) {
  const chromium = await loadChromium(projectDir);

  let server = null;
  let base = url;
  if (!base) {
    server = await startServer(projectDir, timeout);
    base = server.url;
  }
  const target = `${base.replace(/\/$/, "")}/?mode=${encodeURIComponent(mode)}`;

  const browser = await chromium.launch({
    headless: !headed,
    args: [
      "--use-gl=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-dev-shm-usage",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });

  const [vw, vh] = viewport.split("x").map(Number);
  const context = await browser.newContext({ viewport: { width: vw, height: vh } });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  // Headless swiftshader chatters about the GPU. None of it is the game.
  const isRendererNoise = (t) =>
    /GL Driver Message|GPU stall due to ReadPixels|Automatic fallback to software WebGL|SwiftShader/i.test(t);

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isRendererNoise(text)) return;
    consoleErrors.push({ text, location: msg.location() });
  });
  page.on("pageerror", (err) => {
    pageErrors.push({ message: err.message, stack: (err.stack || "").split("\n").slice(0, 6).join("\n") });
  });

  await page.goto(target, { waitUntil: "domcontentloaded", timeout });
  await page.waitForTimeout(settle);

  const canvas = await page.$("canvas");
  if (!canvas) throw new Error("no <canvas> after boot — the game did not start");

  return {
    page,
    canvas,
    url: target,
    consoleErrors,
    pageErrors,
    async close() {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
      server?.stop();
    },
  };
}
