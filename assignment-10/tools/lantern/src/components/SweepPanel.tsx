import type { Approvals, Graph } from "../types";
import { statusOf, sweepList, type Artifact } from "../store";
import { ListRow } from "./ListRow";

/**
 * Review sweep: only unreviewed and flagged artifacts — a short list, not a
 * hunt. Clicking an item jumps the views to it.
 */
export function SweepPanel(props: {
  graph: Graph;
  approvals: Approvals;
  enabled: boolean;
  onToggle: (on: boolean) => void;
  onJump: (a: Artifact) => void;
}) {
  const items = sweepList(props.graph, props.approvals);
  return (
    <section className="panel" aria-label="review sweep">
      <h2>Review sweep</h2>
      <label>
        <input
          type="checkbox"
          checked={props.enabled}
          onChange={(e) => props.onToggle(e.target.checked)}
        />
        Dim reviewed nodes in the canvas
      </label>
      <p className="header-note">
        {items.length} unreviewed or flagged
      </p>
      {items.map((a) => (
        <ListRow
          key={a.id}
          kind={a.kind}
          label={a.label}
          status={statusOf(props.approvals, a.id)}
          onClick={() => props.onJump(a)}
        />
      ))}
    </section>
  );
}
