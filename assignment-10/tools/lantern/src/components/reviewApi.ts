import type { PlayState, ReviewStatus } from "../types";

/** Everything a node card needs from the app, bundled once. */
export interface ReviewApi {
  statusOf: (id: string) => ReviewStatus | "pending";
  /** the note stored with a review — rendered on the card (bug 1) */
  noteOf: (id: string) => string | undefined;
  /** a soul's display name: "Toby", not "toby" */
  soulName: (soulId: string | undefined) => string;
  textOf: (target: string, original: string) => string;
  playState: (id: string) => PlayState;
  sweepDim: (id: string) => boolean;
  varHit: (id: string) => boolean;
  approve: (id: string) => void;
  flag: (id: string) => void;
  /** back to unreviewed — the only way out of a flag (bug 3) */
  clearStatus: (id: string) => void;
  saveEdit: (target: string, oldText: string, newText: string) => void;
  /** play mode only: jump the running story to this node (ChoosePathString) */
  jump?: (id: string) => void;
}
