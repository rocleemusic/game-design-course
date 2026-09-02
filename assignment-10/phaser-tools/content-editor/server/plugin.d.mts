import type { Plugin } from "vite";

/** Dev-only API: /api/content (assembled payload) and /api/review (sidecar). */
export function contentEditorApi(): Plugin;
