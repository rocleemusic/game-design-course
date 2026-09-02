import { useEffect, useMemo, useRef, useState } from "react";
import type { ContentEntry } from "../lib/bridge";
import { rectFromClick } from "../lib/markers";
import type { Placement, PlacementKind } from "../lib/placeNote";

/**
 * Placement dialog (D8) — what you fill in after clicking a spot that has no
 * region yet.
 *
 * The output is a NOTE to the pipeline, never a region edit: sign-off #5 says
 * a new examinable needs a clue tier and maybe a gate, so the tool describes
 * the placement and a human decides what it means. Nothing here can write
 * geometry into a spec.
 *
 * The five categories are not five equal choices. `general` is the deliberate
 * fast path — click, name nothing, keep placing — because most of a marking
 * pass is "something goes here" and forcing a taxonomy call on every click is
 * what stops people marking things at all. Item / key item read the generated
 * content index; NPC reads the graph's own souls; examinable is free text,
 * since a new examinable is a new id by definition.
 *
 * The index list is NOT filtered by screen. An item legitimately appears on
 * several screens, so filtering to "what this screen already declares" would
 * hide the valid placements. A duplicate id is likewise not an error — the
 * same thing can sit in two places.
 */

const CATEGORIES: { id: PlacementKind; label: string; hint: string }[] = [
  { id: "item", label: "Item", hint: "an authored item, from the content index" },
  { id: "key-item", label: "Key item", hint: "an authored key item, from the content index" },
  { id: "npc", label: "NPC", hint: "someone from the cast" },
  { id: "examinable", label: "Examinable", hint: "a new id — type it; the pipeline decides its clue tier" },
  { id: "general", label: "General", hint: "something goes here — no id needed" },
];

export interface PlacementDialogProps {
  /** normalized click point on the image; the rect is synthesized from it */
  point: { x: number; y: number };
  screenId: string;
  contentIndex: ContentEntry[] | null;
  npcIds: string[];
  onConfirm: (placement: Placement) => void;
  onCancel: () => void;
}

export function PlacementDialog(props: PlacementDialogProps) {
  const [kind, setKind] = useState<PlacementKind>("general");
  const [id, setId] = useState("");
  const [filter, setFilter] = useState("");
  const [prose, setProse] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLSelectElement>(null);

  // Focus lands in the dialog on open, so a keyboard user is not left tabbing
  // from wherever the click happened to be.
  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const rect = useMemo(() => rectFromClick(props.point), [props.point]);

  const entries = useMemo(() => {
    if (kind !== "item" && kind !== "key-item") return [];
    const q = filter.trim().toLowerCase();
    return (props.contentIndex ?? [])
      .filter((e) => e.kind === kind)
      .filter(
        (e) =>
          q === "" ||
          e.id.toLowerCase().includes(q) ||
          e.label.toLowerCase().includes(q)
      );
  }, [kind, filter, props.contentIndex]);

  // General needs no id at all; every other kind does.
  const ready = rect !== null && (kind === "general" || id.trim() !== "");

  const confirm = () => {
    if (!rect || !ready) return;
    props.onConfirm({
      id: kind === "general" ? null : id.trim(),
      kind,
      screen: props.screenId,
      rect,
      prose: prose.trim(),
    });
  };

  return (
    <div
      className="place-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="new placement"
      ref={rootRef}
      onKeyDown={(e) => {
        // Escape cancels and leaves no trace — same contract as never having
        // clicked. Stopped here so it does not also reach the marker surface.
        if (e.key === "Escape") {
          e.stopPropagation();
          e.preventDefault();
          props.onCancel();
        }
      }}
    >
      <h3 className="place-dialog-title">New placement</h3>
      <p className="place-dialog-note">
        Writes a <strong>note</strong> to the pipeline — it never edits a
        region. On <code>{props.screenId}</code>
        {rect && (
          <>
            {" "}
            at <code>{rect.x.toFixed(4)} {rect.y.toFixed(4)}</code>
          </>
        )}
        .
      </p>

      <label className="place-dialog-row">
        <span className="place-dialog-label">Category</span>
        <select
          ref={firstRef}
          value={kind}
          aria-label="placement category"
          onChange={(e) => {
            setKind(e.target.value as PlacementKind);
            setId("");
            setFilter("");
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <p className="place-dialog-hint">{CATEGORIES.find((c) => c.id === kind)?.hint}</p>

      {(kind === "item" || kind === "key-item") && (
        <div className="place-dialog-row place-dialog-pick">
          <label className="place-dialog-label" htmlFor="place-filter">
            Find
          </label>
          <input
            id="place-filter"
            type="text"
            value={filter}
            aria-label="filter by id or label"
            placeholder="ash, sealed letter…"
            onChange={(e) => setFilter(e.target.value)}
          />
          {props.contentIndex === null ? (
            <>
              {/* No generated index in this run folder. The dialog still has
                  to work — falling back to a typed id is better than a dead
                  category with no way through it. */}
              <p className="place-dialog-hint">
                No <code>content-index.json</code> in this run folder — type the
                id by hand.
              </p>
              <input
                type="text"
                className="place-dialog-id"
                value={id}
                aria-label="placement id"
                placeholder="item_ash"
                onChange={(e) => setId(e.target.value)}
              />
            </>
          ) : entries.length === 0 ? (
            <p className="place-dialog-hint">nothing matches</p>
          ) : (
            <ul className="place-dialog-list" aria-label="matching content ids">
              {entries.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className={`place-dialog-option${e.id === id ? " active" : ""}`}
                    aria-pressed={e.id === id}
                    onClick={() => setId(e.id)}
                  >
                    <code>{e.id}</code> <span className="place-dialog-optlabel">{e.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {id !== "" && (
            <p className="place-dialog-hint">
              placing <code>{id}</code>
            </p>
          )}
        </div>
      )}

      {kind === "npc" && (
        <label className="place-dialog-row">
          <span className="place-dialog-label">Who</span>
          <select
            value={id}
            aria-label="placement id"
            onChange={(e) => setId(e.target.value)}
          >
            <option value="">— pick someone —</option>
            {props.npcIds.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}

      {kind === "examinable" && (
        <label className="place-dialog-row">
          <span className="place-dialog-label">New id</span>
          <input
            type="text"
            value={id}
            aria-label="placement id"
            placeholder="bench_carving"
            onChange={(e) => setId(e.target.value)}
          />
        </label>
      )}

      <label className="place-dialog-row">
        <span className="place-dialog-label">Note</span>
        <textarea
          value={prose}
          rows={2}
          aria-label="placement note"
          placeholder="on the bench, near the forge end"
          onChange={(e) => setProse(e.target.value)}
        />
      </label>

      <div className="place-dialog-actions">
        <button type="button" className="pill-quiet" onClick={props.onCancel}>
          Cancel
        </button>
        <button type="button" className="pill-primary" disabled={!ready} onClick={confirm}>
          Add placement note
        </button>
      </div>
    </div>
  );
}
