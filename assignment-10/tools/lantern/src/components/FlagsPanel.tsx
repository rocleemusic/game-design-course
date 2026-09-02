import type { Approvals, Graph } from "../types";
import { flaggedList } from "../store";
import type { ReviewApi } from "./reviewApi";

/**
 * All flags, in one place (D4). Nothing listed them before: SweepPanel mixes
 * flags in with every pending node and never shows the flag's own note
 * (store.ts's old sweepList). The data was already in memory as
 * `run.approvals` — this just reads it with a flags-only filter.
 *
 * Edit reuses `api.flag`, which already prompts for a (possibly revised) note
 * and writes it under the existing flag Command — re-flagging an
 * already-flagged id IS the edit path, so no new write route was needed.
 * Clear reuses `api.clearStatus`, the existing back-to-pending path.
 */
export function FlagsPanel(props: { graph: Graph; approvals: Approvals; api: ReviewApi }) {
  const items = flaggedList(props.graph, props.approvals);

  return (
    <section className="panel flags-panel" aria-label="flags">
      <h2>Flags</h2>
      <p className="header-note">
        {items.length} flag{items.length === 1 ? "" : "s"}
      </p>
      {items.length === 0 ? (
        <p className="notes-hint">No flags.</p>
      ) : (
        <ul className="notes-list">
          {items.map((a) => (
            <li key={a.id} className="notes-item">
              <span className="notes-kind notes-kind-structure">{a.kind}</span>
              <code className="notes-item-target">{a.id}</code>
              <p className="notes-item-body">
                {props.api.noteOf(a.id) ?? <em>(no note)</em>}
              </p>
              <div className="card-actions">
                <button
                  type="button"
                  className="pill-quiet"
                  onClick={() => props.api.flag(a.id)}
                  aria-label={`edit flag note on ${a.id}`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="pill-quiet"
                  onClick={() => props.api.clearStatus(a.id)}
                  aria-label={`clear flag on ${a.id}`}
                >
                  Clear
                </button>
                {props.api.jump && (
                  <button
                    type="button"
                    className="pill-ghost"
                    onClick={() => props.api.jump!(a.id)}
                    aria-label={`jump to ${a.id}`}
                  >
                    Jump
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
