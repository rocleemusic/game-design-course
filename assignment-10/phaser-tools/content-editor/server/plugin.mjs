/**
 * The editor's dev-only API, as a Vite plugin.
 *
 * Three routes, all served from the running dev server so persistence needs no
 * separate process:
 *
 *   GET  /api/content  — the whole editor payload (content + reused audit)
 *   GET  /api/review   — the review sidecar as it stands
 *   POST /api/review   — upsert one { entryId, status, note } into the sidecar
 *
 * `/api/content` is recomputed on every request rather than cached, so editing a
 * content record on disk and refreshing the browser shows the new state — the
 * editor is a live view of the files, not a snapshot.
 */
import { collect } from "./content-data.mjs";
import { readReview, upsertReview } from "./reviewStore.mjs";

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error("body too large"));
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

export function contentEditorApi() {
  return {
    name: "content-editor-api",
    configureServer(server) {
      server.middlewares.use("/api/content", async (req, res, next) => {
        if (req.method !== "GET") return next();
        try {
          sendJson(res, 200, await collect());
        } catch (err) {
          sendJson(res, 500, { error: String(err?.stack ?? err) });
        }
      });

      server.middlewares.use("/api/review", async (req, res, next) => {
        try {
          if (req.method === "GET") {
            return sendJson(res, 200, await readReview());
          }
          if (req.method === "POST") {
            const body = JSON.parse((await readBody(req)) || "{}");
            const next = await upsertReview(body);
            return sendJson(res, 200, next);
          }
          return next();
        } catch (err) {
          sendJson(res, 400, { error: String(err?.message ?? err) });
        }
      });
    },
  };
}
