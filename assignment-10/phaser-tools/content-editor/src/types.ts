/** Shapes of the `/api/content` payload — mirrors `server/content-data.mjs`. */

export interface Finding {
  rule: string;
  subject: string;
  detail: string;
}

export interface TeacherInfo {
  role: string;
  npcs: string[];
  matched: boolean;
  reason: string;
}

export interface SpellRow {
  entryId: string;
  spell_id: string;
  phrase: string;
  role: string;
  components: { id: string; label: string | null }[];
  produces: string[];
  learn_source: string;
  teacher: TeacherInfo;
  cue: { effect: boolean; noEffect: boolean };
  findings: Finding[];
}

export interface ScreenRow {
  entryId: string;
  screen_id: string;
  name: string;
  status: string;
  gates: string[];
  blockingGates: string[];
  reachable: boolean;
  sceneCount: number;
  strandedScenes: string[];
  reason: string;
}

export interface ItemRow {
  entryId: string;
  kind: "item" | "key-item";
  id: string;
  description: string;
  category: string;
  usedBy?: string[];
  role?: string;
  obtainable?: boolean;
  used?: boolean;
  categorised?: boolean;
  findings: Finding[];
}

export interface ReceiverRow {
  entryId: string;
  spell_id: string;
  receiver_id: string;
  receiver_class: string;
  physical_outcome: string;
  reaction_kind: string | null;
  stateful: boolean;
  noEffect: boolean;
  noEffectForm: string | null;
  mismatch: boolean;
}

export interface AuditSummary {
  findings: Finding[];
  unchecked: string[];
  ran: string[];
}

export interface ContentPayload {
  generatedAt: string;
  source: { runDir: string; days: number; approvedSpells: number; rejectedSpells: number };
  noEffectForms: Record<string, number>;
  canonicalNoEffect: string;
  spells: SpellRow[];
  screens: ScreenRow[];
  items: ItemRow[];
  keyItems: ItemRow[];
  receivers: ReceiverRow[];
  audit: AuditSummary;
}

/** One entry in the review sidecar. */
export interface ReviewEntry {
  entryId: string;
  status: "approved" | "rejected" | null;
  note: string;
  ts: string;
}
