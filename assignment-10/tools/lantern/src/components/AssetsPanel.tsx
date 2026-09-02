import { useEffect, useMemo, useState } from "react";
import { imageUrl, loadImages, postImage, postManifest } from "../lib/bridge";
import type { Graph } from "../types";

/**
 * Assets: one row per screen, plus the library of everything uploaded.
 *
 * Roc corrected the original premise — don't generate placeholders, build the
 * surface he defines assets in. Two things followed from using it:
 *
 *   - a file uploaded but assigned to nothing was invisible, so it looked lost
 *   - reusing one picture on a second screen went through the upload route,
 *     hit the name clash, and asked about overwriting when the honest answer
 *     was "yes, use that same picture here too"
 *
 * So assignment and upload are now separate: picking from the library writes
 * the manifest directly and never touches a file.
 *
 * The manifest stays geometry-free — this only ever sets
 * `manifest[screen_id] = "images/<name>"`. Regions live in graph.json.
 */
export function AssetsPanel(props: {
  graph: Graph;
  manifest: Record<string, string> | null;
  dir: string;
  onManifest: (manifest: Record<string, string>) => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, File>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  /** the screen whose library picker is open, if any */
  const [picking, setPicking] = useState<string | null>(null);
  /** the row a file is currently being dragged over — drop-target feedback only */
  const [dragOver, setDragOver] = useState<string | null>(null);
  /** the row that just finished an assign — a brief confirmation flash, then clears itself */
  const [justUpdated, setJustUpdated] = useState<string | null>(null);

  const refreshImages = () => {
    loadImages(props.dir)
      .then(setImages)
      .catch(() => setImages([]));
  };
  useEffect(refreshImages, [props.dir]);

  /** image path -> the screens using it; drives both "unassigned" and "shared" */
  const usedBy = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [screenId, rel] of Object.entries(props.manifest ?? {})) {
      m.set(rel, [...(m.get(rel) ?? []), screenId]);
    }
    return m;
  }, [props.manifest]);

  const unassigned = images.filter((p) => !usedBy.has(p));

  const setError = (screenId: string, message: string) =>
    setErrors((e) => ({ ...e, [screenId]: message }));
  const clearError = (screenId: string) =>
    setErrors((e) => ({ ...e, [screenId]: "" }));

  const assign = async (screenId: string, file: File, overwrite = false) => {
    setBusy(screenId);
    try {
      const manifest = await postImage(props.dir, screenId, file, { overwrite });
      props.onManifest(manifest);
      clearError(screenId);
      setPending((p) => {
        const next = { ...p };
        delete next[screenId];
        return next;
      });
      refreshImages();
      setJustUpdated(screenId);
      setTimeout(() => setJustUpdated((cur) => (cur === screenId ? null : cur)), 900);
    } catch (e) {
      const message = String(e instanceof Error ? e.message : e);
      setError(screenId, message);
      if (/already exists/.test(message)) {
        // Recoverable, and usually the wrong question: offer reuse first.
        setPending((p) => ({ ...p, [screenId]: file }));
      }
    } finally {
      setBusy(null);
    }
  };

  /** Assignment only — no upload, so no name clash and nothing to overwrite. */
  const point = async (screenId: string, imagePath: string | null) => {
    setBusy(screenId);
    try {
      props.onManifest(await postManifest(props.dir, screenId, imagePath));
      clearError(screenId);
      setPicking(null);
    } catch (e) {
      setError(screenId, String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  };

  const counted = props.graph.screens.filter((s) => props.manifest?.[s.screen_id]).length;

  return (
    <section className="panel assets-panel" aria-label="assets">
      <h2 className="pane-title">
        Assets{" "}
        <span className="hint">
          {counted} of {props.graph.screens.length} screens have art
          {unassigned.length > 0 && ` · ${unassigned.length} unused`}
        </span>
      </h2>

      {unassigned.length > 0 && (
        <div className="asset-unused" aria-label="unassigned images">
          <span className="asset-unused-label">
            Uploaded, not on any screen:
          </span>
          {unassigned.map((p) => (
            <span key={p} className="asset-chip" title={p}>
              <img src={imageUrl(props.dir, p)} alt="" />
              {p.replace(/^images\//, "")}
            </span>
          ))}
        </div>
      )}

      <ul className="asset-rows">
        {props.graph.screens.map((s) => {
          const rel = props.manifest?.[s.screen_id] ?? null;
          const err = errors[s.screen_id];
          const retry = pending[s.screen_id];
          const shared = rel ? (usedBy.get(rel) ?? []).filter((x) => x !== s.screen_id) : [];
          const isBusy = busy === s.screen_id;
          const rowClass = [
            "asset-row",
            dragOver === s.screen_id && "is-drag-over",
            isBusy && "is-busy",
            justUpdated === s.screen_id && "is-updated",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <li
              key={s.screen_id}
              className={rowClass}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOver(s.screen_id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOver !== s.screen_id) setDragOver(s.screen_id);
              }}
              onDragLeave={(e) => {
                // dragleave fires when the pointer crosses into a child (the
                // thumb, the controls...) too — ignore those, only clear the
                // highlight once the pointer actually leaves the row.
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragOver((cur) => (cur === s.screen_id ? null : cur));
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const file = e.dataTransfer.files[0];
                if (file) void assign(s.screen_id, file);
              }}
            >
              <span className="asset-thumb">
                {isBusy ? (
                  <span className="asset-busy" role="status">
                    uploading…
                  </span>
                ) : rel ? (
                  <img src={imageUrl(props.dir, rel)} alt="" />
                ) : (
                  <span className="asset-empty">no image</span>
                )}
              </span>

              <span className="asset-id">
                <span className="card-id">{s.screen_id}</span>
                <span className="asset-name">{s.name}</span>
                {rel && <span className="asset-path">{rel}</span>}
                {shared.length > 0 && (
                  <span className="asset-shared">
                    also on {shared.join(", ")}
                  </span>
                )}
              </span>

              <span className="asset-controls">
                <label className="pill-quiet asset-pick">
                  Upload…
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                    aria-label={`upload an image for ${s.screen_id}`}
                    disabled={busy === s.screen_id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void assign(s.screen_id, file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {images.length > 0 && (
                  <button
                    className="pill-quiet"
                    aria-label={`choose an existing image for ${s.screen_id}`}
                    onClick={() =>
                      setPicking(picking === s.screen_id ? null : s.screen_id)
                    }
                  >
                    Use existing…
                  </button>
                )}
                {rel && (
                  <button
                    className="pill-quiet"
                    aria-label={`clear the image for ${s.screen_id}`}
                    onClick={() => void point(s.screen_id, null)}
                  >
                    Clear
                  </button>
                )}
              </span>

              {picking === s.screen_id && (
                <div className="asset-library" aria-label={`images for ${s.screen_id}`}>
                  {images.map((p) => (
                    <button
                      key={p}
                      className={`asset-chip${p === rel ? " is-current" : ""}`}
                      aria-label={`use ${p.replace(/^images\//, "")} for ${s.screen_id}`}
                      onClick={() => void point(s.screen_id, p)}
                    >
                      <img src={imageUrl(props.dir, p)} alt="" />
                      {p.replace(/^images\//, "")}
                    </button>
                  ))}
                </div>
              )}

              {err && (
                <span className="asset-error" role="status">
                  {err}
                  {retry && (
                    <button
                      className="pill-quiet"
                      onClick={() => void assign(s.screen_id, retry, true)}
                      aria-label={`replace the existing file for ${s.screen_id}`}
                    >
                      Replace the file
                    </button>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
