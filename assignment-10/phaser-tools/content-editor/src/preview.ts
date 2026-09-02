/**
 * The VFX preview surface.
 *
 * THE POINT OF THIS FILE: the preview must fire the SHIPPED cue, not a redraw of
 * one. So it imports the real `cues.json` loader and the real `PhaserVfxBackend`
 * from `src/render/vfx`, builds the exact `cast:resolved` event the game would
 * emit for a `(spellId, outcome)` pair, looks the cue up through `cueFor`, and
 * hands it to the backend — the same path a cast takes in the game, minus every
 * game scene. If the table or the backend changes, this preview changes with it,
 * because it holds no copy of either.
 *
 * ONE shared canvas drives every row. Sixteen Phaser games would be sixteen
 * WebGL contexts; instead the two Play buttons on each spell row call
 * `play(spellId, outcome)` on this single surface. The backdrop is a few
 * theme-coloured shapes so a camera filter (tint / glow / blur) has something to
 * composite over, and particle cues emit at its centre.
 */
import Phaser from "phaser";
import { COLOR } from "../../../src/ui/theme";
import { cueFor, loadAuthoredCues, type CueTable } from "../../../src/render/vfx/CueTable";
import { PhaserVfxBackend } from "../../../src/render/vfx/PhaserVfxBackend";
import type { VfxAnchor } from "../../../src/render/vfx/VfxBackend";
import type { LoggedGameEvent } from "../../../src/world/events/GameEvents";

const WIDTH = 320;
const HEIGHT = 200;

/** A cast:resolved event carrying only the fields the cue lookup matches on. */
function castEvent(spellId: string, outcome: "effect" | "no-effect"): LoggedGameEvent {
  return {
    type: "cast:resolved",
    spellId,
    receiverId: "preview",
    screenId: null,
    outcome,
    consumed: [],
    produced: [],
    narration: "",
    seq: 0,
    at: 0,
  } as unknown as LoggedGameEvent;
}

class PreviewScene extends Phaser.Scene {
  private backend!: PhaserVfxBackend;
  private label!: Phaser.GameObjects.Text;
  private table!: CueTable;

  constructor() {
    super("preview");
  }

  init(data: { table: CueTable }) {
    this.table = data.table;
  }

  preload() {
    // `sprite`-kind cues name a texture they expect the scene to have already
    // loaded (see PhaserVfxBackend's `spriteFx`) — same assumption a real game
    // Scene makes for whatever cues it fires. This preview owns exactly the
    // textures the authored table currently references. Every sheet here is
    // 128px wide; `leap` is 192 tall (torch + ring share one frame, so the
    // torch is shifted up inside a taller cell to meet the ring — see the
    // build note in cues.json's leap rows), everything else is 128 square.
    const SHEETS: Record<string, { file: string; frameWidth: number; frameHeight: number }> = {
      vfx_ignite_flame: { file: "ignite-flame", frameWidth: 128, frameHeight: 128 },
      vfx_glimmer_motes: { file: "glimmer-motes", frameWidth: 128, frameHeight: 128 },
      vfx_echo_ripple: { file: "echo-ripple", frameWidth: 128, frameHeight: 128 },
      vfx_furrow_growth: { file: "furrow-growth", frameWidth: 128, frameHeight: 128 },
      vfx_temper_hiss: { file: "temper-hiss", frameWidth: 128, frameHeight: 128 },
      vfx_leap_streak: { file: "leap-streak", frameWidth: 128, frameHeight: 192 },
      vfx_seal_ward_temp: { file: "seal-ward-TEMP", frameWidth: 128, frameHeight: 128 },
      vfx_preserve_bloom: { file: "preserve-bloom", frameWidth: 256, frameHeight: 256 },
      vfx_dry_portal: { file: "dry-portal", frameWidth: 128, frameHeight: 128 },
    };
    for (const [key, { file, frameWidth, frameHeight }] of Object.entries(SHEETS)) {
      this.load.spritesheet(key, `/art/vfx/${file}.png`, { frameWidth, frameHeight });
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(COLOR.nightHex);
    // A backdrop with structure, so a full-frame tint/glow/blur is legible.
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH - 40, HEIGHT - 60, COLOR.goldNum, 0.18);
    this.add.rectangle(70, 70, 60, 60, COLOR.emberNum, 0.9);
    this.add.rectangle(WIDTH - 70, HEIGHT - 70, 60, 60, COLOR.duskNum, 0.9);
    this.add.circle(WIDTH / 2, HEIGHT / 2, 28, COLOR.onAccentNum, 1).setStrokeStyle(2, COLOR.goldNum);
    this.label = this.add
      .text(WIDTH / 2, HEIGHT - 16, "pick a spell", {
        fontFamily: "ui-monospace, monospace",
        fontSize: "12px",
        color: COLOR.gold,
      })
      .setOrigin(0.5);

    this.backend = new PhaserVfxBackend({ scene: this });
    this.game.events.on("preview:play", this.onPlay, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("preview:play", this.onPlay, this);
      this.backend.detach();
    });
  }

  private onPlay(spellId: string, outcome: "effect" | "no-effect") {
    const anchor: VfxAnchor = { x: WIDTH / 2, y: HEIGHT / 2 };
    const cue = cueFor(this.table, castEvent(spellId, outcome));
    this.backend.play(cue, anchor);
    const tag = cue.kind === "none" ? "no cue (kind: none)" : `${cue.kind} · ${cue.colorKey ?? "—"}`;
    this.label.setText(`${spellId} · ${outcome}\n${tag}`);
  }
}

export interface VfxPreview {
  play(spellId: string, outcome: "effect" | "no-effect"): void;
  destroy(): void;
}

/** Mount the preview into `parent` and return a handle the rows drive. */
export function mountPreview(parent: HTMLElement, approvedSpellIds: string[]): VfxPreview {
  const table = loadAuthoredCues(new Set(approvedSpellIds));
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    parent,
    backgroundColor: COLOR.nightHex,
    scale: { mode: Phaser.Scale.NONE },
    scene: PreviewScene,
  });
  game.scene.start("preview", { table });
  return {
    play(spellId, outcome) {
      game.events.emit("preview:play", spellId, outcome);
    },
    destroy() {
      game.destroy(true);
    },
  };
}
