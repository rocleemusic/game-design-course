/**
 * The tag contract (narrative-pipeline/build-loop.md): #screen:<screen_id>,
 * #choice:<choice_id>, #opt:<option_id>, plus the per-line #id:<content_id>
 * and #speaker:<speaker_id>. inkjs hands tags over without the leading `#`;
 * compiled tags can carry trailing whitespace — always trim.
 *
 * Pure functions — unit tested.
 */

export interface ParsedTags {
  screen?: string;
  choice?: string;
  opt?: string;
  id?: string;
  speaker?: string;
  /** status lock on a "Go to" exit — "locked(gate_id)" | "reachable(gate_id)".
   *  Rides the exit's own line, same as #opt: inkjs does not carry it on the
   *  Choice object pre-selection (only on the post-choice content line), so
   *  the UI's pre-click lock badge comes from the graph's screen.status via
   *  playMap.ts, not from this parse. Kept here so the tag is captured
   *  wherever it DOES land on a normal content line, instead of silently
   *  discarded. */
  lock?: string;
  /**
   * The line's authored `slot_type` — "dialogue" | "action" | "object" |
   * "player_line" (resolver `types.ts`'s closed enum). Emitted by `ink.ts`'s
   * `lineTags` since 2026-09-01 so a host can tell a spoken beat from stage
   * direction; the VN box styles them differently (`DialogueFeed` maps this to
   * a text role). Consumers that do not care simply ignore it.
   */
  slot?: string;
  /**
   * `#placeholder:1` — this beat is UNAUTHORED filler prose (the emitter's
   * `Placeholder: ...` establishing lines), not something to show a player.
   * Emitted by `ink.ts` on the screen-intro / examinable / time-state beats so
   * the VN feed can drop them without changing the prose (adding a tag does not
   * shorten the line, so the reachability walker is unaffected — see
   * `DialogueFeed.sync`). The `#screen:`/`#id:` tags on the same beat still fire.
   */
  placeholder?: string;
}

const KEYS = new Set(["screen", "choice", "opt", "id", "speaker", "lock", "slot", "placeholder"]);

/** Parse inkjs tag strings ("screen:T1", "#id:L-01") into the contract's keys. */
export function parseTags(tags: readonly string[] | null | undefined): ParsedTags {
  const out: ParsedTags = {};
  for (const raw of tags ?? []) {
    const tag = raw.trim().replace(/^#/, "");
    const colon = tag.indexOf(":");
    if (colon === -1) continue;
    const key = tag.slice(0, colon).trim();
    const value = tag.slice(colon + 1).trim();
    if (KEYS.has(key) && value) (out as Record<string, string>)[key] = value;
  }
  return out;
}

/**
 * Strip any leftover `#key:value` tag text from a display line. inkjs already
 * separates tags from output; this is the defensive pass the spec asks for
 * ("strip tags from display") so a raw tag never reaches the player.
 */
export function stripTags(text: string): string {
  return text.replace(/#[a-z]+:[^\s#]*/gi, "").replace(/\s+/g, " ").trim();
}
