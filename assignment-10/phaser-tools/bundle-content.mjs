/**
 * Bundle the game's content records into flat arrays the browser can fetch in
 * one request each.
 *
 * The one rule that matters: `content/magic/` holds rejected spells alongside
 * approved ones, in the same shape and with no filename marker. Selecting by
 * filename would ship content that never passed Roc's gate — so this filters
 * on `status === "approved"` and reports the rejects it dropped.
 *
 * Run: npm run prep:content
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PROJECT = path.resolve(root, "..");
const OUT = path.join(root, "public", "content");
const RUN = path.resolve(PROJECT, "lantern-projects", "v01");
const STORY_OUT = path.join(root, "public", "story");
const IMAGES_OUT = path.join(root, "public", "run-images");

/**
 * Mirror the run's backdrops into `public/run-images/` so a static
 * `vite build` ships them. In dev these are still served live from
 * `lantern-projects/v01/images` by the `run-images` middleware
 * (`vite.config.ts`) — that route wins over the public copy, so this mirror
 * only matters for the build, and re-running this script is still the one
 * re-sync point after a reroll or new backdrop.
 */
async function copyImages() {
  await fs.mkdir(IMAGES_OUT, { recursive: true });
  const dir = path.join(RUN, "images");
  const files = await fs.readdir(dir);
  for (const f of files) {
    await fs.copyFile(path.join(dir, f), path.join(IMAGES_OUT, f));
  }
  return files.length;
}

/** Read every record in a content dir, skipping `_`-prefixed meta files. */
async function readRecords(dir) {
  const files = await fs.readdir(dir);
  const records = [];
  for (const f of files) {
    if (!f.endsWith(".json") || f.startsWith("_")) continue;
    records.push(JSON.parse(await fs.readFile(path.join(dir, f), "utf8")));
  }
  return records;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  await fs.mkdir(STORY_OUT, { recursive: true });

  const allSpells = await readRecords(path.join(PROJECT, "content", "magic"));
  const approved = allSpells.filter((s) => s.status === "approved");
  const rejected = allSpells.filter((s) => s.status !== "approved");

  const items = await readRecords(path.join(PROJECT, "content", "items"));
  const keyItems = await readRecords(path.join(PROJECT, "content", "key-items"));

  await fs.writeFile(path.join(OUT, "magic.json"), JSON.stringify(approved, null, 1));
  await fs.writeFile(path.join(OUT, "items.json"), JSON.stringify(items, null, 1));
  await fs.writeFile(path.join(OUT, "key-items.json"), JSON.stringify(keyItems, null, 1));

  // Run data. Copied rather than aliased because Phaser fetches these over HTTP
  // from /story, and re-running this script is the deliberate re-sync point.
  //
  // `decor-surfaces.json` is deliberately its OWN file, not a key inside
  // `regions.json` (GAPS.md G14): `regions.json`'s per-screen entries are
  // examinable-hotspot geometry, unioned against `graph.json`'s DECLARED
  // `screen.regions` by `ScreenScene`/`CollectScene` — an id present there
  // with no declaration renders as a stray clickable hotspot. `HOME` declares
  // zero regions on purpose (it is hand-authored, not ScreenSpec-driven —
  // `tests/WorldView.test.ts`'s "still has only ONE screen with authored
  // geometry" asserts `regions.json`'s shaped screens stay exactly `["T1"]`).
  // The Home Hub's decoration surfaces are a different concept — where a
  // PLACED ITEM can sit, not an examine target — so they get their own file
  // in the same `{ screens: { [id]: RegionRect } }` shape, read only by
  // `Decor.buildHomeSurfaces()`.
  for (const f of ["story.json", "graph.json", "manifest.json", "regions.json", "decor-surfaces.json"]) {
    await fs.copyFile(path.join(RUN, f), path.join(STORY_OUT, f));
  }
  const days = [];
  for (let d = 1; d <= 5; d++) {
    const src = path.join(RUN, `day-${d}.json`);
    try {
      await fs.copyFile(src, path.join(STORY_OUT, `day-${d}.json`));
      days.push(d);
    } catch {
      /* a day the resolver has not emitted yet is not an error here */
    }
  }

  const imageCount = await copyImages();

  const castOutcomes = approved.reduce((n, s) => n + (s.receivers?.length ?? 0), 0);
  console.log(`spells   : ${approved.length} approved, ${rejected.length} rejected and dropped`);
  console.log(`           (${rejected.map((s) => s.spell_id).join(", ")})`);
  console.log(`outcomes : ${castOutcomes} authored cast outcomes now loadable`);
  console.log(`items    : ${items.length} items, ${keyItems.length} key items`);
  console.log(`days     : ${days.length} emitted (${days.join(", ")})`);
  console.log(`images   : ${imageCount} backdrops mirrored to public/run-images`);
}

main();
