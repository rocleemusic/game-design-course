import { defineConfig, type Plugin, type Connect } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ServerResponse } from "node:http";

const toolRoot = path.dirname(fileURLToPath(import.meta.url));
// The sibling resolver package's source (D2). Dynamically imported at
// request time by the /reroll route rather than declared as a dependency:
// Node's own ESM loader strips these files' types at runtime (no build step,
// no workspace wiring needed) — see resolver/src/day.ts, week.ts, data.ts,
// tuning.ts. This is dev-only, same as the rest of this bridge.
const RESOLVER_SRC = path.resolve(toolRoot, "../resolver/src");
const resolverModule = (file: string) => pathToFileURL(path.join(RESOLVER_SRC, file)).href;

/**
 * Validate a POST /edit body. Returns an error message, or null when valid.
 *
 * `old_text` is required (a string) because the resolver replays each patch
 * against the current source text and rejects it on mismatch — a patch
 * without `old_text` can never apply (see resolver/src/edits.ts). It may be
 * the empty string ONLY when the target field's current value really is ""
 * in the spec; the UI never offers an edit on a field that doesn't exist
 * (SceneView blocks those), so "" here is always a real empty value, not a
 * "create this field" request — the resolver would orphan that.
 */
export function validateEditBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return "body must be a JSON object";
  const b = body as Record<string, unknown>;
  if (typeof b.dir !== "string" || b.dir === "") return "dir (non-empty string) required";
  if (typeof b.target !== "string" || b.target === "")
    return "target (non-empty string) required";
  if (typeof b.old_text !== "string")
    return "old_text (string) required — the resolver verifies each patch against the current text and rejects it without a matching old_text";
  if (typeof b.new_text !== "string") return "new_text (string) required";
  return null;
}

/** The statuses the approve route accepts on the wire. */
const APPROVE_STATUSES = ["approved", "flagged", "edited", "pending"] as const;

/**
 * The image formats Lantern serves and accepts. One map, used by BOTH the read
 * and the write route, so a format can never be uploadable but unservable.
 *
 * `.avif` was missing here, which is why an avif screen looked like "assets
 * don't load": it was served as application/octet-stream, the <img> failed, and
 * the pane fell back with no message explaining why.
 */
export const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

/** 20MB. A greybox screen far exceeding this is a mistake, not a big asset. */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

/**
 * Validate an uploaded image's filename against its declared content type.
 * Returns an error message, or null when valid.
 *
 * This route WRITES, so it is checked harder than the read path:
 *   - the name must survive `path.basename` unchanged, so a traversal attempt
 *     is an error rather than something silently corrected into a valid write
 *   - the character set is whitelisted, not blacklisted
 *   - the extension must match the declared content type, so a script cannot
 *     arrive labelled as an image
 */
export function validateImageName(name: unknown, contentType: unknown): string | null {
  if (typeof name !== "string" || name === "") return "name (non-empty string) required";
  if (name !== path.basename(name)) return "name must not contain a path";
  if (!/^[A-Za-z0-9._-]+$/.test(name))
    return "name may use letters, digits, dot, dash and underscore only";
  if (name.startsWith(".")) return "name must not start with a dot";
  const ext = path.extname(name).toLowerCase();
  const expected = IMAGE_TYPES[ext];
  if (!expected) return `unsupported image type "${ext}" — allowed: ${Object.keys(IMAGE_TYPES).join(", ")}`;
  if (typeof contentType !== "string" || contentType.split(";")[0].trim() !== expected)
    return `content-type must be ${expected} for a ${ext} file`;
  return null;
}

/**
 * Validate a POST /approve body. Returns an error message, or null when valid.
 *
 * The old check was `if (!dir || !artifact_id || !status)`, which accepted any
 * truthy string as a status and wrote it straight to disk — a typo became a
 * status no reader understands. The allow-list is the fix.
 *
 * `"pending"` is accepted but never stored: it means *delete this record*.
 * `store.ts` already reads an absent key as pending, so writing
 * `{status:"pending"}` would be a second way to say one thing, and the two
 * would drift.
 */
export function validateApproveBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return "body must be a JSON object";
  const b = body as Record<string, unknown>;
  if (typeof b.dir !== "string" || b.dir === "") return "dir (non-empty string) required";
  if (typeof b.artifact_id !== "string" || b.artifact_id === "")
    return "artifact_id (non-empty string) required";
  if (typeof b.status !== "string" || !APPROVE_STATUSES.includes(b.status as never))
    return `status must be one of: ${APPROVE_STATUSES.join(", ")}`;
  if (b.note !== undefined && typeof b.note !== "string")
    return "note, when present, must be a string";
  return null;
}

/**
 * Validate a POST /manifest body. Returns an error message, or null when valid.
 *
 * `path: null` is the explicit "unassign this screen" form, distinct from a
 * missing field, so clearing a screen cannot happen by accident.
 */
export function validateManifestBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return "body must be a JSON object";
  const b = body as Record<string, unknown>;
  if (typeof b.dir !== "string" || b.dir === "") return "dir (non-empty string) required";
  if (typeof b.screen_id !== "string" || b.screen_id === "")
    return "screen_id (non-empty string) required";
  if (b.path === null) return null; // unassign
  if (typeof b.path !== "string" || b.path === "")
    return "path (non-empty string, or null to unassign) required";
  if (!b.path.startsWith("images/")) return 'path must start with "images/"';
  if (b.path.includes("..")) return "path must not traverse";
  return null;
}

/**
 * Validate one `{ screen_id, region_id, rect }` entry inside a POST /regions
 * body. `rect: null` is LEGAL — it means "delete this key", how undo restores
 * a region that had no shape. Returns an error message, or null when valid.
 */
function validateRegionsEntry(entry: unknown): string | null {
  if (typeof entry !== "object" || entry === null) return "each entry must be a JSON object";
  const e = entry as Record<string, unknown>;
  if (typeof e.screen_id !== "string" || e.screen_id === "")
    return "screen_id (non-empty string) required";
  if (typeof e.region_id !== "string" || e.region_id === "")
    return "region_id (non-empty string) required";
  if (e.rect === null) return null; // delete
  if (typeof e.rect !== "object") return "rect must be { x, y, w, h } or null";
  const { x, y, w, h } = e.rect as Record<string, unknown>;
  if (![x, y, w, h].every((n) => typeof n === "number" && Number.isFinite(n)))
    return "rect needs numeric x, y, w, h";
  const nx = x as number, ny = y as number, nw = w as number, nh = h as number;
  if (nx < 0 || ny < 0 || nw <= 0 || nh <= 0) return "rect must be positive and inside the image";
  if (nx + nw > 1 || ny + nh > 1) return "rect must stay within the normalized 0-1 image";
  return null;
}

/**
 * Validate a POST /regions body: `{ dir, entries: [{ screen_id, region_id,
 * rect }] }`. Replaces the old append-only region-edit journal — the run
 * folder now owns one compact map (regions.json), last write wins, and this
 * route merges every entry from one Apply in a single request.
 */
export function validateRegionsBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return "body must be a JSON object";
  const b = body as Record<string, unknown>;
  if (typeof b.dir !== "string" || b.dir === "") return "dir (non-empty string) required";
  if (!Array.isArray(b.entries)) return "entries (array) required";
  for (const entry of b.entries) {
    const invalid = validateRegionsEntry(entry);
    if (invalid) return invalid;
  }
  return null;
}

/**
 * Validate a POST /reroll body. Returns an error message, or null when valid.
 *
 * `movedThreads` and `pickedLocation` are both optional: a reroll with no
 * player session yet (nothing played, no calendar pick read back) still needs
 * to resolve SOME day, and falls back to the run folder's own remembered
 * state (see resolveRerollDay).
 */
export function validateRerollBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return "body must be a JSON object";
  const b = body as Record<string, unknown>;
  if (typeof b.dir !== "string" || b.dir === "") return "dir (non-empty string) required";
  for (const key of ["slot", "life", "day"] as const) {
    const v = b[key];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1) {
      return `${key} (positive integer) required`;
    }
  }
  if (
    b.movedThreads !== undefined &&
    (!Array.isArray(b.movedThreads) || !b.movedThreads.every((t) => typeof t === "string"))
  ) {
    return "movedThreads, when present, must be an array of strings";
  }
  if (b.pickedLocation !== undefined && typeof b.pickedLocation !== "string") {
    return "pickedLocation, when present, must be a string";
  }
  return null;
}

/** A note is a message to the pipeline, not a verdict — hence its own kinds. */
const NOTE_KINDS = ["structure", "question", "todo"] as const;

/**
 * Validate a POST /note body. Returns an error message, or null when valid.
 *
 * Notes live in their own file, separate from approvals.json, because a note is
 * NOT a review verdict: "this beat needs to do X" is a request addressed to the
 * pipeline, and merging it into the approve record would make it look like one.
 *
 * D4: `target` is now OPTIONAL — a general note, addressed to nothing in
 * particular, is a real thing NotesPanel can now write. Absent or `null` is
 * "no target"; PRESENT-but-empty ("") is still rejected, same as before, so a
 * blank field can never silently become "no target" by accident.
 */
export function validateNoteBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return "body must be a JSON object";
  const b = body as Record<string, unknown>;
  if (typeof b.dir !== "string" || b.dir === "") return "dir (non-empty string) required";
  if (
    b.target !== undefined &&
    b.target !== null &&
    (typeof b.target !== "string" || b.target === "")
  ) {
    return "target, when present, must be a non-empty string (omit or use null for no target)";
  }
  if (typeof b.kind !== "string" || !NOTE_KINDS.includes(b.kind as never))
    return `kind must be one of: ${NOTE_KINDS.join(", ")}`;
  if (typeof b.body !== "string" || b.body.trim() === "")
    return "body (non-empty string) required";
  if (b.resolved !== undefined && typeof b.resolved !== "boolean")
    return "resolved, when present, must be a boolean";
  return null;
}

/**
 * Validate a POST /note-resolve body (D4). Matches an existing note by
 * (target, timestamp) — notes have no other stable id — and flips its
 * `resolved` flag. `target` follows the same optional-but-not-empty rule as
 * validateNoteBody, since a general note's target is legitimately null.
 */
export function validateNoteResolveBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return "body must be a JSON object";
  const b = body as Record<string, unknown>;
  if (typeof b.dir !== "string" || b.dir === "") return "dir (non-empty string) required";
  if (
    b.target !== undefined &&
    b.target !== null &&
    (typeof b.target !== "string" || b.target === "")
  ) {
    return "target, when present, must be a non-empty string (omit or use null for no target)";
  }
  if (typeof b.timestamp !== "string" || b.timestamp === "")
    return "timestamp (non-empty string) required";
  if (typeof b.resolved !== "boolean") return "resolved (boolean) required";
  return null;
}

/**
 * Validate a POST /note-update body. Rewrites a note's `body` IN PLACE,
 * matched on (target, timestamp) same as validateNoteResolveBody — a
 * pending placement's rect lives only inside its @place note body, so
 * adjusting a placed ghost means rewriting that note in place rather than
 * resolving it and reposting a new one (which would mint a new timestamp
 * on every adjustment and chase a moving key).
 */
export function validateNoteUpdateBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return "body must be a JSON object";
  const b = body as Record<string, unknown>;
  if (typeof b.dir !== "string" || b.dir === "") return "dir (non-empty string) required";
  if (
    b.target !== undefined &&
    b.target !== null &&
    (typeof b.target !== "string" || b.target === "")
  ) {
    return "target, when present, must be a non-empty string (omit or use null for no target)";
  }
  if (typeof b.timestamp !== "string" || b.timestamp === "")
    return "timestamp (non-empty string) required";
  if (typeof b.body !== "string" || b.body.trim() === "")
    return "body (non-empty string) required";
  return null;
}

/**
 * Lantern file bridge (dev only).
 *
 * The app never touches the filesystem itself. This middleware:
 *   GET  /__bridge/run?dir=<folder>   -> { graph, day, days, approvals, edits }
 *   POST /__bridge/approve            -> merge one record into <dir>/out/approvals.json
 *   POST /__bridge/edit               -> append one patch to <dir>/out/edits.json
 *   POST /__bridge/note               -> append one note to <dir>/out/notes.json
 *   POST /__bridge/note-resolve       -> flip one note's resolved flag
 *   POST /__bridge/note-update        -> rewrite one note's body in place
 *   POST /__bridge/regions            -> merge geometry entries into <dir>/regions.json
 *   POST /__bridge/reroll             -> resolveDay for real (D2); writes <dir>/day.json
 *                                         + <dir>/out/reroll-state.json
 *   GET  /__bridge/watch?dir=         -> SSE; one "changed" event per input write
 *
 * <dir> is the open run folder. Relative paths resolve against this tool's
 * root, so the default "fixtures" reads fixtures/graph.json + day.json and
 * writes to fixtures/out/. The tool only ever writes its two record files.
 */
export function lanternBridge(): Plugin {
  const root = toolRoot;

  const resolveDir = (dir: string) =>
    path.isAbsolute(dir) ? dir : path.resolve(root, dir);

  const readJson = (file: string) => {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  };

  const send = (res: ServerResponse, status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  };

  /**
   * Raw bytes, kept as a Buffer.
   *
   * Deliberately separate from `readBody`, which accumulates into a string:
   * that would decode image bytes as UTF-8 and silently corrupt every upload.
   * Rejects past the cap rather than buffering an unbounded body.
   */
  const readRawBody = (req: Connect.IncomingMessage): Promise<Buffer> =>
    new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      req.on("data", (c: Buffer) => {
        size += c.length;
        if (size > MAX_IMAGE_BYTES) {
          reject(new Error(`image exceeds ${MAX_IMAGE_BYTES} bytes`));
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });

  const readBody = (req: Connect.IncomingMessage): Promise<any> =>
    new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (e) {
          reject(e);
        }
      });
      req.on("error", reject);
    });

  const outPaths = (dir: string) => {
    const out = path.join(resolveDir(dir), "out");
    fs.mkdirSync(out, { recursive: true });
    return {
      approvals: path.join(out, "approvals.json"),
      edits: path.join(out, "edits.json"),
      notes: path.join(out, "notes.json"),
      // The reroll route's own memory (D2): the thread record `resolveWeek`
      // would otherwise thread through App state, plus the last resolved
      // picked_location, so a second reroll in the same run folder keeps
      // building on the first instead of starting the week over from scratch.
      rerollState: path.join(out, "reroll-state.json"),
    };
  };

  /**
   * Re-roll one day for real (D2): the resolver's own resolveDay/applyOutcome,
   * not a re-read of the stale day.json this route replaced.
   *
   * `movedThreads` is the host's day-end record of thread_move events
   * (WorldState.movedThreads() — App.tsx reads it off the live player) folded
   * into the thread record through `applyOutcome`, exactly the contract
   * week.ts documents. `pickedLocation` is the Home Hub calendar's pick, read
   * back off the story's own `pickedLocation` VAR — the resolver's
   * DayInput.picked_location contract (types.ts): "the location the player
   * picked the prior evening". Both are optional so a reroll with no session
   * yet (nothing played) still resolves a day, off remembered state.
   *
   * Always resolves against the resolver's OWN default data set
   * (loadData()/loadTuning() with no dataDir — resolver/fixtures/), the same
   * data the bundled "fixtures" run folder was built from. A run folder built
   * from resolver/data/ (the full 16-screen world) would need that data
   * directory threaded through here too — not needed for the bundled run
   * folder this tool ships with, and left for a later pass rather than
   * guessed at.
   */
  const resolveRerollDay = async (
    dir: string,
    input: { slot: number; life: number; day: number; movedThreads: string[]; pickedLocation?: string },
  ): Promise<unknown> => {
    const [{ loadData }, { loadTuning }, { resolveDay }, { applyOutcome, seedThreadsFromContent }] =
      await Promise.all([
        import(/* @vite-ignore */ resolverModule("data.ts")),
        import(/* @vite-ignore */ resolverModule("tuning.ts")),
        import(/* @vite-ignore */ resolverModule("day.ts")),
        import(/* @vite-ignore */ resolverModule("week.ts")),
      ]);

    const warnings: string[] = [];
    const data = loadData(undefined, warnings);
    const tuning = loadTuning(undefined, warnings);

    const out = outPaths(dir);
    const prior = readJson(out.rerollState) as
      | { threads: { thread_id: string; soul: string; status: string }[]; picked_location: string }
      | null;
    const threads = prior?.threads ?? seedThreadsFromContent(data);
    const nextThreads = input.movedThreads.length ? applyOutcome(threads, input.movedThreads) : threads;
    const picked_location =
      input.pickedLocation && input.pickedLocation !== "none"
        ? input.pickedLocation
        : (prior?.picked_location ?? "town");

    const day = resolveDay(
      data,
      {
        slot: input.slot,
        life: input.life,
        day: input.day,
        picked_location,
        threads: nextThreads,
        // Same defaults resolve-week's CLI fallback uses (cli.ts) when no
        // authored lead pool / aliveness band is threaded through.
        lead_pool: ["LEAD-01", "LEAD-02", "LEAD-03"],
        aliveness_band: "quiet",
      },
      tuning,
    );

    fs.writeFileSync(
      out.rerollState,
      JSON.stringify({ threads: nextThreads, picked_location }, null, 2),
    );
    // day.json stays the file `loadRun` reads, matching the old reroll's
    // contract (a reload of the run folder shows the freshly resolved day).
    fs.writeFileSync(path.join(resolveDir(dir), "day.json"), JSON.stringify(day, null, 2) + "\n");
    return day;
  };

  return {
    name: "lantern-bridge",
    configureServer(server) {
      server.middlewares.use("/__bridge", async (req, res) => {
        try {
          const url = new URL(req.url ?? "/", "http://local");
          const route = url.pathname;

          if (req.method === "GET" && route === "/run") {
            const dir = resolveDir(url.searchParams.get("dir") || "fixtures");
            const graph = readJson(path.join(dir, "graph.json"));
            const day = readJson(path.join(dir, "day.json"));
            if (!graph) {
              return send(res, 404, {
                error: `No graph.json found in ${dir}`,
              });
            }
            const storyFile = path.join(dir, "story.json");
            const story = fs.existsSync(storyFile)
              ? fs.readFileSync(storyFile, "utf-8")
              : null;
            const out = outPaths(url.searchParams.get("dir") || "fixtures");
            // The whole life, when `resolver resolve-week` has written it.
            // day.json stays the day-1 file so every existing reader keeps
            // working; `days` is additive and empty for an older run folder.
            const week = readJson(path.join(dir, "week.json")) as
              | { files?: string[] }
              | null;
            const days = (week?.files ?? [])
              .map((f) => readJson(path.join(dir, path.basename(f))))
              .filter(Boolean);
            return send(res, 200, {
              dir,
              graph,
              day,
              days,
              week,
              story,
              // manifest.json contract: { screen_id: "images/t1.png" } —
              // image path only. Region SHAPES no longer come from graph.json
              // alone: bridge.ts's loadRun overlays regions.json (below) on
              // top of it, so a region's shape can come from either place
              // depending on whether it has been Applied since graph.json
              // was last built.
              manifest: readJson(path.join(dir, "manifest.json")),
              approvals: readJson(out.approvals) ?? {},
              edits: readJson(out.edits) ?? [],
              notes: readJson(out.notes) ?? [],
              // personas.json (D5): hand-authored, soul_id -> persona card.
              // Lives in the run folder itself, same as manifest.json — not
              // written by the resolver build, so a rebuild never clobbers it.
              personas: readJson(path.join(dir, "personas.json")) ?? {},
              // content-index.json (D8): the GENERATED index of authored
              // items and key items. Lantern reads only this file, never the
              // content directory — the index is the contract, and it feeds a
              // picker, never a write. Absent in older run folders.
              contentIndex: readJson(path.join(dir, "content-index.json")) ?? null,
              // regions.json (L9): the run folder's own compact geometry map,
              // TOP LEVEL of the run dir (an input, like manifest.json — not
              // under out/, which holds this tool's own record files).
              //
              // D3: `?? { screens: {} }` only covers a MISSING file; a hand-
              // edited or truncated one can be present but `{}` (truthy, no
              // `screens` key). The client (bridge.ts loadRun) guards that
              // shape defensively too, but the server should never hand out
              // a regions object its own POST /regions would choke on.
              regions: (() => {
                const raw = readJson(path.join(dir, "regions.json")) as
                  | { screens?: Record<string, Record<string, unknown>> }
                  | null;
                return { screens: raw?.screens ?? {} };
              })(),
            });
          }

          // GET /__bridge/image?dir=<run folder>&path=<manifest image path>
          // Streams a screen image from the open run folder (read-only; the
          // path must stay inside the run folder).
          if (req.method === "GET" && route === "/image") {
            const dir = resolveDir(url.searchParams.get("dir") || "fixtures");
            const rel = url.searchParams.get("path") ?? "";
            const file = path.resolve(dir, rel);
            if (!file.startsWith(path.resolve(dir) + path.sep)) {
              return send(res, 400, { error: "image path escapes the run folder" });
            }
            if (!fs.existsSync(file)) {
              return send(res, 404, { error: `no image at ${rel}` });
            }
            res.statusCode = 200;
            res.setHeader(
              "Content-Type",
              IMAGE_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream"
            );
            return res.end(fs.readFileSync(file));
          }

          // POST /__bridge/image?dir=&screen_id=&name=[&overwrite=1]
          // Body is the raw file bytes (the client already holds a File, so
          // multipart would only add a parser). Writes <dir>/images/<name> and
          // points manifest[screen_id] at it.
          //
          // Sign-off 1 (Roc, 2026-07-30) permits Lantern to write outside out/
          // for exactly this. The geometry-free manifest rule still holds: this
          // route only ever sets manifest[screen_id] = "images/<name>".
          if (req.method === "POST" && route === "/image") {
            const dirParam = url.searchParams.get("dir") || "fixtures";
            const screenId = url.searchParams.get("screen_id") ?? "";
            const name = url.searchParams.get("name") ?? "";
            const overwrite = url.searchParams.get("overwrite") === "1";

            if (!screenId) return send(res, 400, { error: "screen_id required" });
            const invalid = validateImageName(name, req.headers["content-type"]);
            if (invalid) return send(res, 400, { error: invalid });

            const dir = resolveDir(dirParam);
            const imagesDir = path.join(dir, "images");
            const file = path.resolve(imagesDir, name);
            // Re-verify after resolution: the name checks above should make
            // this impossible, so reaching it means one of them regressed.
            if (!file.startsWith(path.resolve(imagesDir) + path.sep)) {
              return send(res, 400, { error: "resolved path escapes the images folder" });
            }
            if (fs.existsSync(file) && !overwrite) {
              return send(res, 409, {
                error: `${name} already exists — pass overwrite=1 to replace it`,
              });
            }

            let bytes: Buffer;
            try {
              bytes = await readRawBody(req);
            } catch (e) {
              return send(res, 413, {
                error: String(e instanceof Error ? e.message : e),
              });
            }
            if (bytes.length === 0) return send(res, 400, { error: "empty body" });

            fs.mkdirSync(imagesDir, { recursive: true });
            fs.writeFileSync(file, bytes);

            const manifestFile = path.join(dir, "manifest.json");
            const manifest = readJson(manifestFile) ?? {};
            manifest[screenId] = `images/${name}`;
            fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
            return send(res, 200, { manifest });
          }

          // GET /__bridge/images?dir= — every file in <dir>/images/.
          // The panel needs this to show what has been uploaded but assigned
          // to nothing, and to let one picture serve several screens without
          // uploading it twice.
          if (req.method === "GET" && route === "/images") {
            const dir = resolveDir(url.searchParams.get("dir") || "fixtures");
            const imagesDir = path.join(dir, "images");
            if (!fs.existsSync(imagesDir)) return send(res, 200, { images: [] });
            const images = fs
              .readdirSync(imagesDir, { withFileTypes: true })
              .filter((e) => e.isFile() && IMAGE_TYPES[path.extname(e.name).toLowerCase()])
              .map((e) => `images/${e.name}`)
              .sort();
            return send(res, 200, { images });
          }

          // POST /__bridge/manifest — point a screen at an image that is
          // ALREADY in the folder. Reuse is not an upload: routing it through
          // the upload path is what produced the "already exists, overwrite?"
          // prompt when the honest answer was "yes, use that same picture".
          if (req.method === "POST" && route === "/manifest") {
            const body = await readBody(req);
            const invalid = validateManifestBody(body);
            if (invalid) return send(res, 400, { error: invalid });
            const { dir: dirParam, screen_id, path: rel } = body;
            const dir = resolveDir(dirParam);
            const manifestFile = path.join(dir, "manifest.json");
            const manifest = readJson(manifestFile) ?? {};
            if (rel === null) {
              delete manifest[screen_id];
            } else {
              // must name a file that is really there — a manifest pointing at
              // nothing renders as a broken image with no explanation
              const file = path.resolve(dir, rel);
              if (!file.startsWith(path.resolve(dir, "images") + path.sep)) {
                return send(res, 400, { error: "path must sit inside images/" });
              }
              if (!fs.existsSync(file)) {
                return send(res, 404, { error: `no image at ${rel}` });
              }
              manifest[screen_id] = rel;
            }
            fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
            return send(res, 200, { manifest });
          }

          if (req.method === "POST" && route === "/approve") {
            const body = await readBody(req);
            const invalid = validateApproveBody(body);
            if (invalid) {
              return send(res, 400, { error: invalid });
            }
            const { dir, artifact_id, status, note } = body;
            const out = outPaths(dir);
            const approvals = readJson(out.approvals) ?? {};
            if (status === "pending") {
              // Back to unreviewed. Delete rather than store a "pending"
              // record — absence already means pending everywhere else.
              delete approvals[artifact_id];
            } else {
              const record: Record<string, unknown> = {
                status,
                timestamp: new Date().toISOString(),
              };
              if (note) record.note = note;
              approvals[artifact_id] = record;
            }
            fs.writeFileSync(out.approvals, JSON.stringify(approvals, null, 2));
            return send(res, 200, { approvals });
          }

          if (req.method === "POST" && route === "/edit") {
            const body = await readBody(req);
            const invalid = validateEditBody(body);
            if (invalid) {
              return send(res, 400, { error: invalid });
            }
            const { dir, target, old_text, new_text } = body;
            const out = outPaths(dir);
            const edits: unknown[] = readJson(out.edits) ?? [];
            edits.push({
              target,
              old_text,
              new_text,
              timestamp: new Date().toISOString(),
            });
            fs.writeFileSync(out.edits, JSON.stringify(edits, null, 2));
            return send(res, 200, { edits });
          }

          // POST /__bridge/note — a structural note addressed to the pipeline.
          // Kept out of approvals.json on purpose: a note is not a verdict.
          if (req.method === "POST" && route === "/note") {
            const body = await readBody(req);
            const invalid = validateNoteBody(body);
            if (invalid) return send(res, 400, { error: invalid });
            const { dir, target, kind, body: text, resolved } = body;
            const out = outPaths(dir);
            const notes: unknown[] = readJson(out.notes) ?? [];
            notes.push({
              // D4: no target at all is a real, storable choice — `null`,
              // not an absent field left to guess at on read-back.
              target: target ?? null,
              kind,
              body: text,
              resolved: resolved ?? false,
              timestamp: new Date().toISOString(),
            });
            fs.writeFileSync(out.notes, JSON.stringify(notes, null, 2));
            return send(res, 200, { notes });
          }

          // POST /__bridge/note-resolve — flip one note's `resolved` flag
          // (D4). The field existed on Note since L7 with no UI writer at
          // all; matched on (target, timestamp), the pair /note already
          // stamps uniquely per note (notes carry no other id).
          if (req.method === "POST" && route === "/note-resolve") {
            const body = await readBody(req);
            const invalid = validateNoteResolveBody(body);
            if (invalid) return send(res, 400, { error: invalid });
            const { dir, target, timestamp, resolved } = body;
            const out = outPaths(dir);
            const notes: Array<Record<string, unknown>> = readJson(out.notes) ?? [];
            const match = notes.find(
              (n) => (n.target ?? null) === (target ?? null) && n.timestamp === timestamp
            );
            if (!match) return send(res, 404, { error: "no note at that target/timestamp" });
            match.resolved = resolved;
            fs.writeFileSync(out.notes, JSON.stringify(notes, null, 2));
            return send(res, 200, { notes });
          }

          // POST /__bridge/note-update — rewrite one note's `body` in place,
          // matched on (target, timestamp) exactly like /note-resolve. This
          // is the route a rect adjustment goes through: a pending
          // placement's rect lives only inside its @place note body, so
          // moving the ghost means rewriting that note, not resolving it
          // and posting a fresh one under a new timestamp.
          if (req.method === "POST" && route === "/note-update") {
            const body = await readBody(req);
            const invalid = validateNoteUpdateBody(body);
            if (invalid) return send(res, 400, { error: invalid });
            const { dir, target, timestamp, body: text } = body;
            const out = outPaths(dir);
            const notes: Array<Record<string, unknown>> = readJson(out.notes) ?? [];
            const match = notes.find(
              (n) => (n.target ?? null) === (target ?? null) && n.timestamp === timestamp
            );
            if (!match) return send(res, 404, { error: "no note at that target/timestamp" });
            match.body = text;
            fs.writeFileSync(out.notes, JSON.stringify(notes, null, 2));
            return send(res, 200, { notes });
          }

          // POST /__bridge/regions — merge geometry entries into
          // <dir>/regions.json (L9). Replaces the append-only region-edit
          // journal: last write wins, one compact map per run folder, keyed
          // on (screen_id, region_id) since region ids repeat across screens.
          // `rect: null` deletes that key — how undo restores a region that
          // had no shape.
          //
          // regions.json is a TOP-LEVEL run-dir file, same tier as
          // manifest.json — an input this tool owns, not a derived record
          // under out/.
          if (req.method === "POST" && route === "/regions") {
            const body = await readBody(req);
            const invalid = validateRegionsBody(body);
            if (invalid) return send(res, 400, { error: invalid });
            const { dir: dirParam, entries } = body as {
              dir: string;
              entries: { screen_id: string; region_id: string; rect: Record<string, number> | null }[];
            };
            const dir = resolveDir(dirParam);
            fs.mkdirSync(dir, { recursive: true });
            const regionsFile = path.join(dir, "regions.json");
            const regionsRaw: { screens?: Record<string, Record<string, unknown>> } =
              readJson(regionsFile) ?? { screens: {} };
            // D3: a hand-edited or truncated regions.json can be `{}` — valid
            // JSON with no `screens` key. `?? { screens: {} }` above only
            // guards a MISSING file; `{}` is truthy, so without this second
            // guard `regions.screens[...]` below throws on every entry.
            const regions: { screens: Record<string, Record<string, unknown>> } = {
              screens: regionsRaw.screens ?? {},
            };
            for (const { screen_id, region_id, rect } of entries) {
              const screenEntry = regions.screens[screen_id] ?? {};
              if (rect === null) {
                delete screenEntry[region_id];
                if (Object.keys(screenEntry).length === 0) {
                  delete regions.screens[screen_id];
                } else {
                  regions.screens[screen_id] = screenEntry;
                }
              } else {
                regions.screens[screen_id] = { ...screenEntry, [region_id]: rect };
              }
            }
            fs.writeFileSync(regionsFile, JSON.stringify(regions, null, 2));
            return send(res, 200, { regions });
          }

          // POST /__bridge/reroll — resolve one real day off the resolver
          // (D2), replacing the old "re-read whatever day.json already says".
          if (req.method === "POST" && route === "/reroll") {
            const body = await readBody(req);
            const invalid = validateRerollBody(body);
            if (invalid) return send(res, 400, { error: invalid });
            const { dir, slot, life, day, movedThreads, pickedLocation } = body;
            try {
              const resolved = await resolveRerollDay(dir, {
                slot,
                life,
                day,
                movedThreads: movedThreads ?? [],
                pickedLocation,
              });
              return send(res, 200, { day: resolved });
            } catch (e) {
              return send(res, 500, { error: String(e instanceof Error ? e.message : e) });
            }
          }

          // GET /__bridge/watch?dir= — SSE, one event per settled input write.
          //
          // SSE over a WebSocket for four reasons: the need runs one way
          // (writes already return new state over HTTP); it is ~15 lines of
          // res.write rather than a new dependency or a collision with Vite's
          // own HMR socket; EventSource reconnects by itself, which matters
          // because editing vite.config.ts restarts the dev server; and no new
          // dependency.
          //
          // INPUTS ONLY. Watching out/ would echo: the tool's own approval and
          // note writes would trigger a reload, which the tool would then have
          // to suppress with origin tagging. Not watching it removes the
          // problem rather than solving it.
          if (req.method === "GET" && route === "/watch") {
            const dirParam = url.searchParams.get("dir") || "fixtures";
            const dir = resolveDir(dirParam);
            res.writeHead(200, {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            });
            res.write(`event: ready\ndata: ${JSON.stringify({ dir })}\n\n`);

            let timer: NodeJS.Timeout | null = null;
            const fire = (file: string) => {
              // Debounced: `resolver build` rewrites graph.json, story.json and
              // the day files in quick succession, and the middle of that burst
              // is a half-written folder.
              if (timer) clearTimeout(timer);
              timer = setTimeout(() => {
                timer = null;
                res.write(
                  `event: changed\ndata: ${JSON.stringify({ file, at: Date.now() })}\n\n`,
                );
              }, 150);
            };

            const watchers: fs.FSWatcher[] = [];
            try {
              // fs.watch on the folder, filtered to the input files — one
              // watcher per file would miss an atomic replace (write-then-rename
              // swaps the inode, and the old watch follows the old file).
              watchers.push(
                fs.watch(dir, (_event, filename) => {
                  if (!filename) return;
                  const name = path.basename(String(filename));
                  const watched =
                    name === "graph.json" ||
                    name === "day.json" ||
                    name === "story.json" ||
                    name === "manifest.json" ||
                    name === "week.json" ||
                    // regions.json is deliberately NOT watched, even though it
                    // is a top-level input like manifest.json: Lantern is its
                    // own writer for it (POST /__bridge/regions), and every
                    // other watched name is written by something ELSE
                    // (resolver build, hand edits). Watching your own writes
                    // is exactly the echo-reload the "INPUTS ONLY" note above
                    // exists to prevent — don't "fix" this by adding it back.
                    /^day-\d+\.json$/.test(name);
                  if (watched) fire(name);
                }),
              );
            } catch (e) {
              res.write(`event: error\ndata: ${JSON.stringify({ error: String(e) })}\n\n`);
            }

            // A 25s comment keeps proxies from reaping an idle stream.
            const ping = setInterval(() => res.write(": ping\n\n"), 25_000);
            req.on("close", () => {
              clearInterval(ping);
              if (timer) clearTimeout(timer);
              for (const w of watchers) w.close();
            });
            return;
          }

          send(res, 404, { error: `unknown bridge route ${route}` });
        } catch (e) {
          send(res, 500, { error: String(e) });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), lanternBridge()],
  // Vitest config lives here so one file owns tooling.
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    globals: true,
    // One jsdom environment per worker is expensive, and several suites mount
    // the whole app including its React Flow canvases. At the default (one
    // worker per core) that reliably dies with "AlignedAlloc Allocation failed
    // - process out of memory" on a busy machine, with physical RAM to spare —
    // it is address space per worker, not the box running out. Four is quick
    // and has headroom.
    maxWorkers: 4,
    minWorkers: 1,
  },
} as any);
