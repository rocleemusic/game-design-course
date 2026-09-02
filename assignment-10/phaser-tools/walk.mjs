/**
 * Headless walker. Drives the running probe through many paths and asserts on
 * live game state, not on the build succeeding.
 *
 * Written after a leak shipped that nothing caught: the scrim was re-added on
 * every screen change and never destroyed, so the alphas compounded and the
 * backdrops faded to black after ~10 moves. A unit test could not see it — it
 * only exists on the rendered canvas across a long walk. Hence: sample real
 * pixels, every move, for the whole week.
 *
 * Usage: node tools/walk.mjs [--url http://localhost:5188] [--shots]
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const CHROME = [
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));

const args = process.argv.slice(2);
const BASE = args.includes("--url") ? args[args.indexOf("--url") + 1] : "http://localhost:5188/";
const URL = BASE + (BASE.includes("?") ? "&" : "?") + "walk=1";
const SHOTS = args.includes("--shots");
const SHOT_DIR = "C:/Users/rocle/AppData/Local/Temp/claude/walk";

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.log(`  FAIL  ${msg}`);
};

/**
 * Mean luminance of the backdrop area, sampled off the canvas.
 * The compounding-scrim bug shows up here and nowhere else.
 */
async function brightness(page) {
  return page.evaluate(() => {
    const c = document.querySelector("canvas");
    if (!c) return null;
    const g = document.createElement("canvas");
    g.width = 160;
    g.height = 90;
    const ctx = g.getContext("2d");
    ctx.drawImage(c, 0, 0, 160, 90);
    const d = ctx.getImageData(0, 0, 160, 90).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
    return sum / (d.length / 4);
  });
}

/** Read the probe's own state off the page rather than guessing from pixels. */
async function state(page) {
  return page.evaluate(() => (window.__probe ? window.__probe.snapshot() : null));
}

async function main() {
  if (!CHROME) {
    console.error("No Chrome/Edge found.");
    process.exit(2);
  }
  if (SHOTS) fs.mkdirSync(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const pageErrors = [];
  const badResponses = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") pageErrors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
  });

  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(() => window.__probe, { timeout: 30000 });

  console.log("\nwalking the week\n");

  let step = 0;
  let minBrightness = Infinity;
  let brightnessAtStart = null;
  const screensSeen = new Set();
  const daysSeen = new Set();
  const blocksSeen = new Set();
  const taken = new Set();
  let foraged = 0;

  // Walk until the story ends or the budget runs out. Always take the first
  // choice that is not "End the day" so the week plays out naturally, falling
  // back to ending the day when that is all there is.
  for (; step < 220; step++) {
    const s = await state(page);
    if (!s) {
      fail("probe state vanished");
      break;
    }

    if (s.screen) screensSeen.add(s.screen);
    daysSeen.add(s.day);
    blocksSeen.add(s.timeBlock);

    if (s.errors.length) fail(`ink errors: ${s.errors.join(" | ")}`);

    if (s.screen) {
      const b = await brightness(page);
      brightnessAtStart ??= b;
      minBrightness = Math.min(minBrightness, b);
      // A real backdrop under a single scrim sits well above this. The
      // compounding-scrim bug drove it to ~1.
      if (b < 8) {
        fail(
          `screen went dark at step ${step} (day ${s.day} ${s.timeBlock}, ` +
            `screen ${s.screen}, brightness ${b.toFixed(1)})`,
        );
        if (SHOTS) await page.screenshot({ path: path.join(SHOT_DIR, `dark-${step}.png`) });
        break;
      }
      if (!s.hasBackdrop) fail(`no backdrop for screen ${s.screen}`);
    }

    // Object-count guard: the per-screen layer must not grow without bound.
    if (s.displayCount > 400) {
      fail(`display list grew to ${s.displayCount} objects at step ${step} — a leak`);
      break;
    }

    // Forage everything on offer, so the carry model gets exercised across the
    // whole week rather than only in a targeted test.
    const picked = await page.evaluate(() => {
      const slots = window.__probe.forage();
      let n = 0;
      for (const s of slots) if (window.__probe.pickup(s.slotId, s.item)) n++;
      return n;
    });
    if (picked) foraged += picked;

    if (SHOTS && step % 10 === 0) {
      await page.screenshot({ path: path.join(SHOT_DIR, `step-${String(step).padStart(3, "0")}.png`) });
    }

    if (s.ended) {
      console.log(`  story ended at step ${step}`);
      break;
    }
    if (!s.choices.length) {
      if (s.canContinue) {
        await page.evaluate(() => window.__probe.advance());
        await page.waitForTimeout(60);
        continue;
      }
      fail(`dead end at step ${step}: no choices, cannot continue`);
      break;
    }

    // Coverage-seeking, not first-available. Examinables are sticky (`+`), so
    // "take the first choice that isn't End the day" loops forever on
    // [Look at arch] and never leaves the opening screen.
    //
    // Order of preference:
    //   1. a non-move choice never taken on this screen — exhaust the content
    //   2. a move to a screen not yet seen — spread across the world
    //   3. any move — keep the clock running
    //   4. whatever is left, including End the day
    const key = (c) => `${s.screen ?? "-"}::${c.display}`;
    const fresh = s.choices.filter((c) => c.kind !== "move" && !taken.has(key(c)));
    const newScreenMove = s.choices.filter(
      (c) =>
        c.kind === "move" &&
        !/End the day/i.test(c.display) &&
        ![...screensSeen].some((seen) => c.display.includes(seen)) &&
        !taken.has(key(c)),
    );
    const anyMove = s.choices.filter((c) => c.kind === "move" && !/End the day/i.test(c.display));

    const chosen =
      fresh[0] ?? newScreenMove[0] ?? anyMove[0] ?? s.choices[0];
    taken.add(key(chosen));

    await page.evaluate((i) => window.__probe.choose(i), chosen.index);
    await page.waitForTimeout(60);
  }

  const final = await state(page);

  console.log("\nresults");
  console.log(`  steps        ${step}`);
  console.log(`  days         ${[...daysSeen].sort().join(", ")}`);
  console.log(`  time blocks  ${[...blocksSeen].join(", ")}`);
  console.log(`  screens      ${screensSeen.size} — ${[...screensSeen].sort().join(" ")}`);

  // Screens the manifest knows about that this walk never reached. Reported,
  // never asserted on: the forest unlocks are knowledge-gated behind casting,
  // which is not built yet, so their absence is the expected state and the
  // list is the measure of what casting will open up.
  const manifest = await (await fetch(`${BASE.replace(/\/$/, "")}/story/manifest.json`)).json();
  const unreached = Object.keys(manifest).filter((id) => !screensSeen.has(id));
  console.log(`  unreached    ${unreached.length ? unreached.sort().join(" ") : "none"}`);
  console.log(
    `  brightness   first ${brightnessAtStart?.toFixed(1) ?? "—"} · min ${
      minBrightness === Infinity ? "—" : minBrightness.toFixed(1)
    }`,
  );
  console.log(`  display objs ${final?.displayCount ?? "—"}`);
  console.log(`  foraged      ${foraged} picked up · ${final?.banked?.length ?? 0} banked at home`);
  if (foraged === 0) fail("walked the whole week and never picked anything up");
  if (!final?.banked?.length) fail("nothing ever reached the home collection");

  if (pageErrors.length) {
    console.log("\npage errors");
    [...new Set(pageErrors)].slice(0, 10).forEach((e) => console.log(`  ${e}`));
    fail(`${pageErrors.length} page error(s)`);
  }
  if (badResponses.length) {
    console.log("\nbad responses");
    [...new Set(badResponses)].slice(0, 10).forEach((r) => console.log(`  ${r}`));
    fail(`${badResponses.length} bad response(s)`);
  }

  await browser.close();

  console.log(failures.length ? `\n${failures.length} failure(s)\n` : "\nclean walk\n");
  process.exit(failures.length ? 1 : 0);
}

main();
