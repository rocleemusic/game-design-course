/**
 * Review state: the sidecar, hydrated on load and written through on every
 * decision. Holds the current `{ entryId -> ReviewEntry }` map and a builder for
 * the per-row note + Approve/Reject/Clear controls every tab reuses.
 *
 * The content JSON is never touched — a decision POSTs to `/api/review`, which
 * writes only `review.json`. See `server/reviewStore.mjs`.
 */
import type { ReviewEntry } from "./types";

export class ReviewState {
  private byId = new Map<string, ReviewEntry>();

  async load(): Promise<void> {
    const res = await fetch("/api/review");
    const list: ReviewEntry[] = res.ok ? await res.json() : [];
    this.byId = new Map(list.map((e) => [e.entryId, e]));
  }

  get(entryId: string): ReviewEntry | undefined {
    return this.byId.get(entryId);
  }

  private async save(entryId: string, status: ReviewEntry["status"] | "cleared", note: string) {
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, status, note }),
    });
    if (!res.ok) throw new Error(`save failed: ${res.status}`);
    const list: ReviewEntry[] = await res.json();
    this.byId = new Map(list.map((e) => [e.entryId, e]));
  }

  /**
   * Build the review control block for one row. Re-renders its own status pill
   * on save, and calls `onChange` so the row can restyle (e.g. a decided row
   * dims).
   */
  controls(entryId: string, onChange?: () => void): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "review";

    const pill = document.createElement("span");
    pill.className = "pill";

    const note = document.createElement("textarea");
    note.className = "note";
    note.placeholder = "notes…";
    note.rows = 2;

    const render = () => {
      const entry = this.byId.get(entryId);
      const status = entry?.status ?? null;
      pill.textContent = status ? status : "undecided";
      pill.dataset.status = status ?? "undecided";
      wrap.dataset.status = status ?? "undecided";
      if (entry && document.activeElement !== note) note.value = entry.note ?? "";
    };

    const btnRow = document.createElement("div");
    btnRow.className = "btn-row";
    const mkBtn = (label: string, status: ReviewEntry["status"] | "cleared", cls: string) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.className = `btn ${cls}`;
      b.addEventListener("click", async () => {
        b.disabled = true;
        try {
          await this.save(entryId, status, note.value);
          render();
          onChange?.();
        } finally {
          b.disabled = false;
        }
      });
      return b;
    };
    btnRow.append(
      mkBtn("Approve", "approved", "approve"),
      mkBtn("Reject", "rejected", "reject"),
      mkBtn("Clear", "cleared", "clear"),
    );

    // Persist a note edit without changing the decision when focus leaves.
    note.addEventListener("blur", async () => {
      const entry = this.byId.get(entryId);
      const status = entry?.status ?? "cleared";
      if ((entry?.note ?? "") === note.value) return;
      await this.save(entryId, status, note.value);
      render();
      onChange?.();
    });

    render();
    wrap.append(pill, note, btnRow);
    return wrap;
  }
}
