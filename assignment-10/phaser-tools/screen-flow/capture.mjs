#!/usr/bin/env node
/**
 * capture.mjs — screen-by-screen screenshotter for the mode5 build.
 *
 * A SEPARATE tool from tools/playtest.mjs (which verifies runtime health). This
 * one only drives the live build to each screen in tools/screen-flow/screens.mjs
 * and writes a clean 1920x1080 PNG per screen into tools/screen-flow/shots/, so
 * build-flow.mjs can assemble a review page. It reuses playtest.mjs's approach
 * for launching the dev server and finding ?mode=mode5, but shares no code with
 * it and never edits it.
 *
 * Each screen is captured from a FRESH page load (the screen's own `url` +
 * `steps`), so screens are independent and one failure never poisons the next.
 * A screen whose steps can't complete (a probe missing, a click landing on
 * nothing) is recorded as a miss and left without a shot — build-flow.mjs turns
 * every miss into a placeholder card. We never write a fake screenshot.
 *
 * Usage:
 *   node tools/screen-flow/capture.mjs [options]
 *   npm run screens                       # via package.json
 *
 * Options:
 *   --url URL        Base URL of an already-running server (skips launching one).
 *                    e.g. http://localhost:5188
 *   --project DIR    Project root (default: two levels up from this file).
 *   --timeout MS     Dev-server startup timeout (default: 90000).
 *   --settle MS      Extra wait after each screen's steps before the shot (default: 250).
 *   --dry-run        Print the plan (screens, urls, steps) and exit. Launches nothing.
 *   --headed         Run with a visible browser.
 *
 * Exit codes: 0 = ran (some screens may be misses), 2 = harness error.
 */

import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";

import { SCREENS } from "./screens.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOT_DIR = path.join(HERE, "shots");
const VIEWPORT = { width: 1920, height: 1080 };

// ── CLI ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = {
    url: null,
    project: path.resolve(HERE, "..", ".."), // tools/screen-flow → phaser root
    timeout: 90000,
    settle: 250,
    dryRun: false,
    headed: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--headed") opts.headed = true;
    else if (a === "--url") opts.url = argv[++i];
    else if (a === "--project") opts.project = path.resolve(argv[++i]);
    else if (a === "--timeout") opts.timeout = Number(argv[++i]);
    else if (a === "--settle") opts.settle = Number(argv[++i]);
    else if (a === "--help" || a === "-h") {
      console.log("capture.mjs — see header for options.");
      process.exit(0);
    } else throw new Error(`Unknown option: ${a}`);
  }
  return opts;
}

// ── Playwright / Chromium resolution ─────────────────────────────────────────
// Prefer a locally-installed Chrome/Edge (playwright-core ships no browser),
// falling back to whatever executable playwright itself can find.
const LOCAL_CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));

async function loadChromium(projectDir) {
  const candidates = ["playwright", "@playwright/test", "playwright-core"];
  const requireFrom = createRequire(path.join(projectDir, "package.json"));
  for (const name of candidates) {
    for (const resolve of [
      () => requireFrom.resolve(name),
      () => createRequire(import.meta.url).resolve(name),
    ]) {
      try {
        const mod = await import(pathToFileURL(resolve()).href);
        const chromium = mod.chromium || mod.default?.chromium;
        if (chromium) return chromium;
      } catch {
        /* try next */
      }
    }
  }
  throw new Error(
    "Playwright not found. Install it in the project:\n" +
      "  npm install -D playwright-core   (already a devDependency)\n" +
      "and make sure Chrome or Edge is installed, or run `npx playwright install chromium`.",
  );
}

// ── Dev server ───────────────────────────────────────────────────────────────
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

const URL_RE = /(https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(\d+)\/?\S*)/i;
// Vite colorizes its "Local:" line, and when it falls off the default port the
// ANSI codes land *between* "localhost:" and the port digits, which defeats a
// naive regex. Strip escape sequences before matching.
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");

async function startServer(opts) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  console.log(`  $ npm run dev  (cwd ${opts.project})`);
  const proc = spawn(npm, ["run", "dev"], {
    cwd: opts.project,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
    shell: process.platform === "win32",
  });

  let buffer = "";
  const url = await new Promise((resolve, reject) => {
    const fail = (err) => {
      clearTimeout(timer);
      stopServer(proc); // never leave an orphaned vite behind on a failed start
      reject(err);
    };
    const timer = setTimeout(
      () => fail(new Error(`Dev server did not report a URL within ${opts.timeout}ms.\n${stripAnsi(buffer).slice(-2000)}`)),
      opts.timeout,
    );
    const scan = (d) => {
      buffer += d.toString();
      const m = stripAnsi(buffer).match(URL_RE);
      if (m) {
        clearTimeout(timer);
        resolve(m[1].replace(/\/$/, ""));
      }
    };
    proc.stdout.on("data", scan);
    proc.stderr.on("data", scan);
    proc.on("exit", (code) => fail(new Error(`Dev server exited early (code ${code}):\n${stripAnsi(buffer).slice(-2000)}`)));
    proc.on("error", fail);
  });

  const port = Number(new URL(url).port);
  for (let i = 0; i < 60 && !(await portOpen(port)); i++) {
    await new Promise((r) => setTimeout(r, 250));
  }
  return { url, stop: () => stopServer(proc) };
}

function stopServer(proc) {
  if (!proc || proc.exitCode !== null || !proc.pid) return;
  try {
    if (process.platform === "win32") {
      // `proc` is `npm.cmd` under a shell; `proc.kill()` reaps only that wrapper
      // and leaves the vite NODE child alive and orphaned — the whole reason
      // `npm run screens` used to hang until someone killed the stray server by
      // hand. `taskkill /T` kills the entire process tree, `/F` forces it.
      spawnSync("taskkill", ["/F", "/T", "/PID", String(proc.pid)], { stdio: "ignore" });
    } else {
      process.kill(-proc.pid, "SIGTERM"); // detached: kill the whole process group
    }
  } catch {
    /* already gone */
  }
}

// ── Step interpreter ─────────────────────────────────────────────────────────
// The canvas is Scale.FIT-centered, so step coordinates are given in the fixed
// 1920x1080 game space and mapped onto the real canvas box before clicking.
async function runSteps(page, canvas, steps) {
  for (const step of steps) {
    switch (step.action) {
      case "wait":
        await page.waitForTimeout(step.ms ?? 250);
        break;
      case "press":
        await page.keyboard.press(step.key);
        break;
      case "key":
        await page.keyboard.down(step.key);
        await page.waitForTimeout(step.duration ?? 200);
        await page.keyboard.up(step.key);
        break;
      case "click": {
        // Re-query the canvas each click: a scene swap (open notebook/calendar)
        // replaces the element, so the handle captured at load goes stale and
        // its boundingBox reads null. One short retry covers a mid-transition
        // frame before giving up.
        let box = null;
        for (let tries = 0; tries < 3 && !box; tries++) {
          const cv = (await page.$("canvas")) ?? canvas;
          box = await cv.boundingBox();
          if (!box) await page.waitForTimeout(200);
        }
        if (!box) throw new Error("canvas has no bounding box after retries");
        const sx = box.width / VIEWPORT.width;
        const sy = box.height / VIEWPORT.height;
        await page.mouse.click(box.x + (step.x ?? VIEWPORT.width / 2) * sx, box.y + (step.y ?? VIEWPORT.height / 2) * sy);
        break;
      }
      case "hover": {
        // Same 1920x1080-game-space → real-canvas-box mapping as `click`, but a
        // move rather than a press: for the examine card, a region tooltip, or a
        // gated-move hint, all of which reveal on `pointerover` and read the
        // live pointer position. Re-query the canvas for the same stale-handle
        // reason `click` documents.
        let box = null;
        for (let tries = 0; tries < 3 && !box; tries++) {
          const cv = (await page.$("canvas")) ?? canvas;
          box = await cv.boundingBox();
          if (!box) await page.waitForTimeout(200);
        }
        if (!box) throw new Error("canvas has no bounding box after retries");
        const sx = box.width / VIEWPORT.width;
        const sy = box.height / VIEWPORT.height;
        await page.mouse.move(box.x + (step.x ?? VIEWPORT.width / 2) * sx, box.y + (step.y ?? VIEWPORT.height / 2) * sy);
        break;
      }
      case "evalTrue": {
        const ok = await page.evaluate(`(() => { const game = window.__PHASER_GAME__; return (${step.expression}); })()`);
        if (!ok) throw new Error(`evalTrue was falsy: ${step.expression.slice(0, 60)}…`);
        break;
      }
      default:
        throw new Error(`Unknown capture step action: ${step.action}`);
    }
  }
}

// ── Capture one screen from a fresh load ─────────────────────────────────────
async function captureScreen(browser, baseUrl, screen, settle) {
  // A FRESH context per screen. mode5 autosaves on entering the collect screen,
  // and a shared context's localStorage carries that save into the next page
  // load, which then shows the "welcome back / Resume" gate instead of the game.
  // Isolated storage per screen means every screen starts from a clean slate.
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  try {
    const rel = screen.capture.url ?? "?mode=mode5";
    const url = baseUrl + (rel.startsWith("?") ? "/" + rel : rel);
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector("canvas", { timeout: 15000, state: "attached" });
    const canvas = await page.$("canvas");
    // Focus the canvas so keyboard steps land.
    try {
      await canvas.click({ position: { x: 5, y: 5 } });
    } catch {
      /* non-fatal */
    }
    await runSteps(page, canvas, screen.capture.steps);
    await page.waitForTimeout(settle);
    const file = path.join(SHOT_DIR, `${screen.id}.png`);
    // Full viewport (not just the canvas element) → always exactly 1920x1080.
    await page.screenshot({ path: file, clip: { x: 0, y: 0, ...VIEWPORT } });
    return { id: screen.id, ok: true, file, pageErrors };
  } catch (err) {
    return { id: screen.id, ok: false, reason: String(err.message || err), pageErrors };
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv);
  const capturable = SCREENS.filter((s) => s.capture);

  if (opts.dryRun) {
    console.log("capture.mjs — DRY RUN (nothing launched)\n");
    console.log(`shots dir: ${SHOT_DIR}`);
    console.log(`viewport:  ${VIEWPORT.width}x${VIEWPORT.height}\n`);
    for (const s of SCREENS) {
      if (!s.capture) {
        console.log(`  [skip] ${s.id.padEnd(16)} design-only (no capture) → placeholder`);
        continue;
      }
      const steps = s.capture.steps.map((st) => st.action).join(" → ");
      console.log(`  [shot] ${s.id.padEnd(16)} ${s.capture.url ?? "?mode=mode5"}   ${steps}`);
    }
    console.log(`\n${capturable.length} screen(s) would be captured, ${SCREENS.length - capturable.length} left as placeholders.`);
    return;
  }

  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const chromium = await loadChromium(opts.project);

  let server = null;
  let baseUrl = opts.url ? opts.url.replace(/\/$/, "") : null;
  if (!baseUrl) {
    server = await startServer(opts);
    baseUrl = server.url;
  }
  console.log(`\n=== Screen-flow capture ===\nbase URL: ${baseUrl}\nshots:    ${SHOT_DIR}\n`);

  const launchOpts = { headless: !opts.headed, args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"] };
  if (LOCAL_CHROME) launchOpts.executablePath = LOCAL_CHROME;
  const browser = await chromium.launch(launchOpts);

  const results = [];
  try {
    for (const screen of capturable) {
      process.stdout.write(`  ${screen.id} … `);
      const r = await captureScreen(browser, baseUrl, screen, opts.settle);
      results.push(r);
      console.log(r.ok ? "captured" : `MISS (${r.reason})`);
    }
  } finally {
    await browser.close().catch(() => {});
    if (server) server.stop();
  }

  // Record which screens were design-only so build-flow can distinguish
  // "expected placeholder" from "capture attempted but missed".
  const manifest = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    viewport: VIEWPORT,
    results: results.map((r) => ({ id: r.id, ok: r.ok, reason: r.reason ?? null })),
    designOnly: SCREENS.filter((s) => !s.capture).map((s) => s.id),
  };
  fs.writeFileSync(path.join(SHOT_DIR, "capture-manifest.json"), JSON.stringify(manifest, null, 2));

  const captured = results.filter((r) => r.ok).length;
  const missed = results.length - captured;
  console.log(`\n${captured} captured, ${missed} missed, ${manifest.designOnly.length} design-only placeholder(s).`);
  console.log(`Next: node tools/screen-flow/build-flow.mjs  →  open tools/screen-flow/flow.html`);
}

main().catch((err) => {
  console.error(`\n[HARNESS ERROR] ${err.message}`);
  process.exit(2);
});
