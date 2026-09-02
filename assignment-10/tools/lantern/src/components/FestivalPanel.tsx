import type { Graph } from "../types";
import type { PlayView } from "../lib/play";
import { soulName, soulNames } from "../lib/souls";
import { allRoleGoalStatuses, festivalTier } from "../lib/roleGoals";

const TIER_LABEL: Record<string, string> = { quiet: "Quiet", warm: "Warm", grand: "Grand" };

/**
 * Festival tier (D7) — the readout the blocker note in PAUSED.md said had
 * nothing to read: `role_goals_advanced` compiled to nothing but stamped
 * prose in the Arch's promote condition, and no soul carried a dealt
 * role_tag. Both are now real data (resolver's role-workplace.json +
 * scene-graph.json souls); this panel is the live read of it.
 *
 * GUARDRAIL (gdd/03-core-loop.md:37,41), enforced by lib/roleGoals.ts, not by
 * this component: sourced ONLY from which soul's EXTERNAL role-goal thread
 * has moved this session. Never bond (CastPanel's own hard constraint —
 * persona-card-schema.md:31-35 — applies here too, doubly), never a tally of
 * which dialogue option the player picked (the niceness-meter failure D7's
 * own guardrail names explicitly).
 */
export function FestivalPanel(props: { graph: Graph; playView: PlayView | null }) {
  const names = soulNames(props.graph);
  const threadMoves = props.playView?.threadMoves ?? {};
  const statuses = allRoleGoalStatuses(props.graph, names, threadMoves);
  const reading = festivalTier(statuses);

  return (
    <section className="panel festival-panel" aria-label="festival tier">
      <h2>Festival tier</h2>
      <p className="header-note">
        Sourced ONLY from each soul&apos;s dealt role&apos;s EXTERNAL goal
        (gdd/03-core-loop.md:37,41) — never bond, never which dialogue option
        was picked.
      </p>

      {!props.playView && (
        <p className="notes-hint">
          Start playing (a Stage or Play pane) to see live goal-thread moves —
          this panel reads the running session&apos;s own event log.
        </p>
      )}

      <p className="notes-item-body">
        Reads as: <strong>{TIER_LABEL[reading.tier]}</strong>
        <br />
        <span className="notes-hint">
          {reading.advanced}/{reading.authored} authored role goal
          {reading.authored === 1 ? "" : "s"} advanced this session
          {reading.dealt > reading.authored && (
            <>
              {" "}
              · {reading.dealt - reading.authored} more dealt role
              {reading.dealt - reading.authored === 1 ? " has" : "s have"} no
              goal content authored yet (a real gap, not a zero score)
            </>
          )}
        </span>
      </p>
      <p className="notes-hint">
        PROVISIONAL threshold shape — Roc has not ruled the Quiet/Warm/Grand
        cut points (lib/roleGoals.ts). This reads 0 authored-and-advanced =
        Quiet, every authored role goal advanced = Grand, any partial = Warm.
      </p>

      {statuses.length === 0 ? (
        <p className="notes-hint">
          No soul in this graph carries a dealt role_tag yet.
        </p>
      ) : (
        <ul className="notes-list">
          {statuses.map((s) => (
            <li key={s.soul_id} className="notes-item">
              <strong>{soulName(names, s.soul_id) || s.name}</strong>
              {" — "}
              {s.role_tag}
              {s.goal && <> ({s.goal})</>}
              <p className="notes-item-body">
                {!s.goalAuthored
                  ? "no goal_threads authored for this role yet — content gap, not a zero score"
                  : s.advanced
                    ? `advanced — moved via ${s.movedVia.join(", ")}`
                    : props.playView
                      ? "not advanced this session"
                      : "not playing"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
