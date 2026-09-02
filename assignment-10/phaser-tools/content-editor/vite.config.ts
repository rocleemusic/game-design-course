import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contentEditorApi } from "./server/plugin.mjs";

/**
 * The Content Approval Editor is its own tiny Vite app, rooted in this folder.
 *
 * It runs with the game stopped and imports no game scene — but it DOES import
 * the shipped VFX modules (`src/render/vfx/*`) and the theme so the preview
 * fires the real cue, so the dev server must be allowed to read files up in the
 * phaser package root. `server/plugin.mjs` adds the `/api/*` routes that serve
 * the assembled content and persist the review sidecar.
 *
 * Run:  npm run editor   (from ProjectOS/game-project/phaser)
 */
const editorRoot = path.dirname(fileURLToPath(import.meta.url));
const phaserRoot = path.resolve(editorRoot, "..", ".."); // tools/content-editor -> phaser

export default defineConfig({
  root: editorRoot,
  // Serve the SAME public/ the real game reads from, not this app's own —
  // there is no separate content-editor copy of art assets. Without this,
  // Vite defaults to `<root>/public` (empty), and any `/art/...` reference
  // that happens to exist under that empty dir 404s into the SPA fallback
  // (an `index.html` served with a 200, not a real 404 — a request for a PNG
  // silently getting HTML back is the actual failure mode this caused).
  publicDir: path.resolve(phaserRoot, "public"),
  server: {
    port: 5177,
    fs: {
      // The app imports src/render/vfx/*, src/ui/theme and Phaser from the
      // package root, which sits above this app's root.
      allow: [phaserRoot],
    },
  },
  resolve: {
    // Keep a single Phaser copy — the one in the package's node_modules.
    dedupe: ["phaser"],
  },
  plugins: [contentEditorApi()],
});
