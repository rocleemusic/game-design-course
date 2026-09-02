import { useMemo } from "react";
import type { Graph } from "../types";
import { buildWeek, type WeekScene } from "../lib/week";
import { soulName, soulNames } from "../lib/souls";
import type { ReviewApi } from "./reviewApi";

/**
 * The week view (W3) — a whole life's arc in one surface: scenes by day,
 * threads running between them.
 *
 * This is the structural-review surface. It answers the questions the dialogue
 * graph cannot, because the dialogue graph only ever shows one scene: does the
 * arc reach festival night, does a day sit empty, does a thread stop moving
 * halfway through the week, and can a scene open at all.
 */

export interface WeekViewProps {
  graph: Graph;
  selected: string | null;
  onOpenScene: (screenId: string, sceneId: string) => void;
  /**
   * D4: WeekView never received `api` at all, so a whole-scene jump only
   * ever existed on the scene picker card (SceneView) — and there only via
   * the `j` keyboard shortcut, hideActions suppressing the button. Optional:
   * a caller with nothing to jump into (no api, or review mode) just gets no
   * Jump button, same as before this existed.
   */
  api?: ReviewApi;
}

function SceneCard(props: {
  scene: WeekScene;
  names: Map<string, string>;
  active: boolean;
  onOpen: () => void;
  onJump?: () => void;
}) {
  const { scene } = props;
  return (
    <div className={`week-scene-wrap${props.active ? " active" : ""}`}>
      <button
        className={`week-scene${props.active ? " active" : ""}`}
        onClick={props.onOpen}
        aria-pressed={props.active}
        title={`${scene.scene_id} · ${scene.beats} beats on ${scene.screen_id}`}
      >
        <span className="week-scene-soul">{soulName(props.names, scene.soul)}</span>
        <span className="week-scene-id">{scene.scene_id}</span>
        <span className="week-scene-meta">
          {scene.screen_id} · {scene.beats} beat{scene.beats === 1 ? "" : "s"}
          {scene.bondBeats > 0 && ` · ${scene.bondBeats} bond`}
        </span>
        {scene.bands.length > 0 && (
          <span className="week-badge week-badge-turn">
            arc turn · {scene.bands.join(" / ")}
          </span>
        )}
        {scene.lastDay !== null && (
          <span className="week-badge">closes day {scene.lastDay}</span>
        )}
        {scene.threads.map((t) => (
          <span key={t} className="week-thread-chip">
            {t}
          </span>
        ))}
      </button>
      {/* Whole-scene jump (D4): the scene picker card already had this via
          `j`, but WeekView had no `api` to reach it with at all. */}
      {props.onJump && (
        <button
          type="button"
          className="pill-ghost week-scene-jump"
          onClick={props.onJump}
          aria-label={`jump to ${scene.scene_id}`}
          title="Jump the running story here"
        >
          Jump
        </button>
      )}
    </div>
  );
}

export function WeekView(props: WeekViewProps) {
  const week = useMemo(() => buildWeek(props.graph), [props.graph]);
  const names = useMemo(() => soulNames(props.graph), [props.graph]);
  const screenOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of props.graph.scenes) m.set(s.scene_id, s.screen_id);
    return m;
  }, [props.graph]);

  return (
    <section className="panel week-view" aria-label="week view">
      <h2>The week</h2>

      {week.unreachable.length > 0 && (
        <p className="week-unreachable" role="status">
          Never opens: {week.unreachable.join(", ")} — a day floor past the end of
          the life, or a window that closes before it starts.
        </p>
      )}

      <div className="week-days">
        {week.days.map((d) => (
          <div key={d.day} className="week-day">
            <h3 className="week-day-head">
              Day {d.day}
              {d.day === week.days.length && " · festival night"}
            </h3>
            {d.scenes.length === 0 ? (
              // An empty day is a finding, not a gap to hide — it is exactly
              // what a structural review is looking for.
              <p className="week-day-empty">no scene opens</p>
            ) : (
              d.scenes.map((s) => (
                <SceneCard
                  key={s.scene_id}
                  scene={s}
                  names={names}
                  active={props.selected === s.scene_id}
                  onOpen={() =>
                    props.onOpenScene(screenOf.get(s.scene_id) ?? s.screen_id, s.scene_id)
                  }
                  onJump={props.api?.jump ? () => props.api!.jump!(s.scene_id) : undefined}
                />
              ))
            )}
          </div>
        ))}
      </div>

      <h3 className="week-threads-head">Threads</h3>
      {week.threads.length === 0 ? (
        <p className="week-day-empty">no thread moves anywhere in this week</p>
      ) : (
        <ul className="week-threads">
          {week.threads.map((t) => (
            <li key={t.thread_id}>
              <span className="week-thread-chip">{t.thread_id}</span>{" "}
              <span className="week-thread-run">{t.scenes.join(" → ")}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
