import { useEffect, useRef, useState } from "react";
import type { PlayChoice, PlayView } from "../lib/play";

/**
 * Mode B play pane: continue-to-next-line transcript, the choice list
 * (quoted player_line vs [bracketed deed], straight from the weave), the
 * snapshot timeline strip, and the seed control stub.
 */

/**
 * One choice button, shared by ChoiceList and MoveRow. A "move" choice's
 * lock (D3) reuses the level graph's own `.gate-badge` look (LevelView.tsx)
 * so a status lock reads the same wherever it shows up in the tool — this is
 * the RAW status string (e.g. "locked(G-T5-trust)"), not the archetype-
 * resolved label LevelView builds from the target's own `gates` array;
 * play.ts's choice classification only has the screen's name and status to
 * go on (see playMap.ts's lockForScreenName). Only "locked(...)" ever shows
 * here — "reachable(...)" is explicitly not a lock (screen-spec-schema.md)
 * and playMap.ts filters it out before c.lock is ever set. The lock is
 * advisory only — ink.ts emits it and nothing enforces it.
 */
function ChoiceButton(props: { c: PlayChoice; onChoose: (index: number) => void }) {
  const { c } = props;
  return (
    <button
      className={`choice-btn choice-${c.kind}`}
      onClick={() => props.onChoose(c.index)}
    >
      {c.display}
      {c.lock && (
        <span
          className="gate-badge choice-lock"
          title={`status lock, advisory only (ink does not enforce it): ${c.lock}`}
        >
          LOCK · {c.lock}
        </span>
      )}
    </button>
  );
}

export function ChoiceList(props: {
  choices: PlayChoice[];
  onChoose: (index: number) => void;
}) {
  if (props.choices.length === 0) return null;
  return (
    <div className="choice-list" role="list" aria-label="choices">
      {props.choices.map((c) => (
        <ChoiceButton key={c.index} c={c} onChoose={props.onChoose} />
      ))}
    </div>
  );
}

/**
 * Location and day-end choices (D3, RULED 2026-08-01) — a screen hub's
 * "[Go to X]"/"[Begin at X]"/"[End the day]", split out of the dialogue
 * choice list so a move never reads as a conversation pick. Rendered as its
 * own horizontal row ABOVE Continue/Restart: it is the day's own navigation,
 * not a response to whatever line is on screen.
 */
export function MoveRow(props: {
  choices: PlayChoice[];
  onChoose: (index: number) => void;
}) {
  if (props.choices.length === 0) return null;
  return (
    <div className="move-row" role="list" aria-label="location and day-end choices">
      {props.choices.map((c) => (
        <ChoiceButton key={c.index} c={c} onChoose={props.onChoose} />
      ))}
    </div>
  );
}

export function PlayPane(props: {
  view: PlayView | null;
  hasStory: boolean;
  hasDay: boolean;
  rerollNote: string | null;
  onContinue: () => void;
  onChoose: (index: number) => void;
  onRestore: (index: number) => void;
  onRestart: () => void;
  onReroll: (slot: number, life: number, day: number) => void;
  /** soul_id -> display name; the transcript shows people by name */
  nameOf: (soulId: string | undefined) => string;
}) {
  const [slot, setSlot] = useState(1);
  const [life, setLife] = useState(1);
  const [day, setDay] = useState(1);
  const logRef = useRef<HTMLDivElement>(null);

  const lineCount = props.view?.lines.length ?? 0;
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lineCount]);

  if (!props.hasStory) {
    return (
      <section className="pane play-pane" aria-label="play pane">
        <h2 className="pane-title">Play</h2>
        <p className="play-note">
          No story.json in this run folder. Compile the resolver&apos;s ink
          output (inklecate / inkjs) and drop story.json beside graph.json.
        </p>
      </section>
    );
  }

  const v = props.view;
  return (
    <section className="pane play-pane" aria-label="play pane">
      <h2 className="pane-title">
        Play
        <span className="hint">continue line by line · click a node to jump</span>
      </h2>

      {v && v.errors.length > 0 && (
        <div className="play-errors" role="alert">
          {v.errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      <div className="play-log" ref={logRef} aria-label="transcript">
        {v?.lines.map((line, i) => (
          <p
            key={i}
            className={`play-line${line.player ? " player" : ""}${
              line.marker ? " marker" : ""
            }`}
          >
            {line.tags.speaker && (
              <span className="play-speaker">{props.nameOf(line.tags.speaker)}</span>
            )}
            {line.text}
          </p>
        ))}
        {v?.ended && (
          <p className="play-line marker">
            flow ended (-&gt; DONE) — jump to any node to keep playing
          </p>
        )}
      </div>

      {v && (
        <MoveRow
          choices={v.choices.filter((c) => c.kind === "move")}
          onChoose={props.onChoose}
        />
      )}

      <div className="play-controls">
        <button
          onClick={props.onContinue}
          disabled={!v?.canContinue}
          aria-label="continue"
        >
          Continue ▸
        </button>
        <button onClick={props.onRestart} aria-label="restart play">
          Restart
        </button>
      </div>

      {v && <ChoiceList choices={v.choices.filter((c) => c.kind !== "move")} onChoose={props.onChoose} />}

      <div className="timeline" aria-label="snapshot timeline">
        <span className="hint">snapshots</span>
        {v?.timeline.length === 0 && (
          <span className="hint">— none yet; each choice takes one</span>
        )}
        {v?.timeline.map((snap, i) => (
          <button
            key={i}
            className="timeline-chip"
            title={`restore to ${snap.label}`}
            onClick={() => props.onRestore(i)}
          >
            {i + 1} · {snap.label}
          </button>
        ))}
      </div>

      <div className="seed-control" aria-label="seed control">
        <label>
          slot
          <input
            type="number"
            value={slot}
            onChange={(e) => setSlot(Number(e.target.value))}
          />
        </label>
        <label>
          life
          <input
            type="number"
            value={life}
            onChange={(e) => setLife(Number(e.target.value))}
          />
        </label>
        <label>
          day
          <input
            type="number"
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
          />
        </label>
        <button onClick={() => props.onReroll(slot, life, day)}>
          Re-roll day
        </button>
        {props.rerollNote && <p className="play-note">{props.rerollNote}</p>}
      </div>
    </section>
  );
}
