// Hand-written declaration for the .mjs generator (NodeNext needs a sibling
// .d.mts to type-check a plain-JS import from a .ts test file).

export interface IndexEntry {
  id: string;
  kind: "item" | "key-item";
  label: string;
  category: string;
  source_locations: unknown;
  status?: string;
}

export interface ContentIndex {
  generated: string;
  entries: IndexEntry[];
}

export interface DiffChange {
  id: string;
  from: Record<string, unknown>;
  to: Record<string, unknown>;
}

export interface DiffResult {
  added: IndexEntry[];
  removed: IndexEntry[];
  changed: DiffChange[];
  clean: boolean;
  next: ContentIndex;
}

export function buildIndex(rootDir: string): ContentIndex;
export function diffIndex(committed: ContentIndex, rebuilt: ContentIndex): DiffResult;
export const CONTENT_DIR: string;
export const OUT_FILE: string;
