import type { PlayView } from "../lib/play";

/**
 * The notebook (D6, GDD 03-core-loop.md:14): "You carry a satchel and a
 * notebook. The notebook can be referenced at any time and holds the
 * knowledge you have collected." Onboarding ("05-collectibles.md" / the
 * onboarding beat) introduces it as a found object; this tool has no
 * onboarding flow to hand it to the player in, so it exists here as a
 * standing tab instead — open it in the other pane while playing in Stage or
 * Play, which is what "referenced at any time" means for a two-pane shell.
 *
 * Backed by `PlayView.notebook` — a straight read of
 * `WorldState.knownPhrases()`, itself a mirror of ink's own KnownPhrases
 * LIST (`recordKnowledge` in play.ts's `bindExternals`). No separate writer:
 * one fact, one owner, same as the bond band.
 */
export function NotebookPanel(props: { playView: PlayView | null }) {
  if (!props.playView) {
    return (
      <section className="panel notebook-panel" aria-label="notebook">
        <h2>Notebook</h2>
        <p className="notes-hint">
          Start playing (a Stage or Play pane) to collect knowledge — this
          panel reads the running session&apos;s own KnownPhrases, not
          authored data.
        </p>
      </section>
    );
  }

  const { notebook } = props.playView;

  return (
    <section className="panel notebook-panel" aria-label="notebook">
      <h2>Notebook</h2>
      <p className="header-note">
        {notebook.length} phrase{notebook.length === 1 ? "" : "s"} collected
        this session
      </p>
      {notebook.length === 0 ? (
        <p className="notes-hint">
          Nothing collected yet — knowledge lands here the moment a scene
          records it (a `~ recordKnowledge(...)` state action).
        </p>
      ) : (
        <ol className="notes-list">
          {notebook.map((phrase, i) => (
            <li key={`${phrase}-${i}`} className="notes-item">
              {i + 1}. {phrase}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
