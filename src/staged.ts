/**
 * Trust-but-verify — a surface-agnostic staged-write model, generalized from
 * fancy-diff's per-hunk accept/reject (`AcceptanceState` / `DiffProposal` /
 * `pendingMode`). An agent proposes a mutation and a human confirms or declines
 * it, or a change is applied pending acceptance. Today the bridges implement this
 * FOUR incompatible ways (navigation confirm-callback, catalog/features
 * confirm-arg, terminal staging queue, artboard data flag); owning it once here
 * lets every op-based surface share one `StagePolicy` + one accept/reject store.
 */

/** The state of a proposed change relative to a human's review. */
export type AcceptanceStatus = "accepted" | "rejected" | "pending";

/**
 * A map from a stable handle (a hunk id, a node id, an op id) to its acceptance
 * status. Unlisted handles are treated as {@link AcceptanceStatus} "pending".
 */
export type AcceptanceState = Record<string, AcceptanceStatus>;

/** Who authored a proposal. */
export interface Actor {
  kind: "human" | "agent";
  id?: string;
  name?: string;
}

/** A staged mutation an agent proposes and a human confirms/declines. */
export interface Proposal<TOp> {
  /** Stable id — for dedup, addressing, and the {@link AcceptanceState} key. */
  id: string;
  op: TOp;
  actor?: Actor;
  /** Human-facing description of what the op does. */
  label?: string;
  /** Author timestamp (ms). Stamp it at the call site — the substrate is time-free. */
  ts?: number;
}

/**
 * Decides whether an op applies immediately or must be confirmed. A bridge builder
 * consults this once per op instead of each surface inventing its own gate.
 */
export type StagePolicy<TOp> = (op: TOp) => "auto" | "confirm";

/** A policy where everything auto-applies (no staging). */
export const autoApply: StagePolicy<unknown> = () => "auto";

/** A policy where everything must be confirmed. */
export const alwaysConfirm: StagePolicy<unknown> = () => "confirm";

/** The status of a handle, defaulting to "pending" when unseen. */
export function statusOf(state: AcceptanceState, id: string): AcceptanceStatus {
  return state[id] ?? "pending";
}

/** Set one handle's status immutably. */
export function setStatus(state: AcceptanceState, id: string, status: AcceptanceStatus): AcceptanceState {
  return { ...state, [id]: status };
}

/** A fresh state with every listed handle at `status`. */
export function setAll(ids: readonly string[], status: AcceptanceStatus): AcceptanceState {
  const out: AcceptanceState = {};
  for (const id of ids) out[id] = status;
  return out;
}

/** Split the handles in `state` by status. */
export function partition(state: AcceptanceState): { accepted: string[]; rejected: string[]; pending: string[] } {
  const accepted: string[] = [];
  const rejected: string[] = [];
  const pending: string[] = [];
  for (const id in state) {
    const s = state[id];
    if (s === "accepted") accepted.push(id);
    else if (s === "rejected") rejected.push(id);
    else pending.push(id);
  }
  return { accepted, rejected, pending };
}

/** True when none of `ids` is still pending (every proposal resolved). */
export function isResolved(state: AcceptanceState, ids: readonly string[]): boolean {
  return ids.every((id) => statusOf(state, id) !== "pending");
}
