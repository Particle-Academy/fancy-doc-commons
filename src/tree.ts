/**
 * The flat node-map document — a Figma-style tree stored as `Record<id, node>`
 * with `parent` pointers and a fractional sibling `order`, generalized from
 * fancy-cms-ui's Stages `PageDoc`. A flat map (not nested children) keeps every
 * node addressable by a stable id — the "stable handle" an agent targets — and
 * makes moves/reorders O(1) id rewrites instead of deep-tree splices.
 *
 * Unlike cms (which keeps a separate ordered `sections[]` for roots), roots here
 * are simply the nodes with `parent === null`, ordered by their own fractional
 * `order` — uniform ordering at every level. A cms adapter maps `sections[]` to
 * root-node order keys.
 */
import { fractionalKey } from "./ordering";

export type DocId = string;

/**
 * A node in a flat document tree. `type` is the surface's discriminant (e.g.
 * "section" / "text" / a custom island); `props` is the JSON prop bag. Domain
 * fields (style, constraints, bindings, geometry) are added by intersecting a
 * richer node type — the substrate only requires identity + placement + props.
 */
export interface DocNode<TProps = Record<string, unknown>> {
  id: DocId;
  type: string;
  /** Parent id, or `null` for a root/top-level node. */
  parent: DocId | null;
  /** Collab-safe fractional sibling order (see {@link fractionalKey}). */
  order: string;
  props: TProps;
}

/** A document: a flat map of nodes keyed by id. */
export interface DocTree<N extends DocNode = DocNode> {
  nodes: Record<DocId, N>;
}

/**
 * Compare two fractional order keys, falling back to `id` on a tie.
 *
 * Without the tie-break, two siblings sharing an order key compare equal and
 * their relative order comes from `for...in` over the nodes object — i.e. from
 * insertion order. Two documents with identical CONTENT could then render in
 * different orders, and the same document could reorder itself after a
 * round-trip through JSON. Duplicate keys are not supposed to happen, but
 * "not supposed to" is how they arrive: a bad merge, a hand-edit, a port that
 * mints keys differently.
 *
 * `id` is the tie-break because it is the only other field guaranteed present
 * and unique, which makes the order TOTAL and therefore reproducible.
 */
function byOrder<N extends DocNode>(a: N, b: N): number {
  if (a.order !== b.order) return a.order < b.order ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Direct children of `parent` (pass `null` for the roots), sorted by fractional order. */
export function childrenOf<N extends DocNode>(tree: DocTree<N>, parent: DocId | null): N[] {
  const out: N[] = [];
  for (const id in tree.nodes) {
    const n = tree.nodes[id]!;
    if (n.parent === parent) out.push(n);
  }
  return out.sort(byOrder);
}

/** The top-level nodes (parent === null), in order. */
export function roots<N extends DocNode>(tree: DocTree<N>): N[] {
  return childrenOf(tree, null);
}

/** All descendant ids of `id`, depth-first, excluding `id` itself. */
export function descendantsOf<N extends DocNode>(tree: DocTree<N>, id: DocId): DocId[] {
  const out: DocId[] = [];
  // Iterative, and guarded by `seen`, for two separate reasons:
  //
  //   1. A CYCLE (a parented under b, b parented under a) made the recursive
  //      version recurse forever — a stack overflow that takes the process with
  //      it. A tree is not guaranteed acyclic: it arrives as JSON, from a file,
  //      a network payload, or a reducer bug.
  //   2. Even acyclic, a deep document recursed once per level, so depth was
  //      bounded by the JS stack rather than by anything the document model
  //      says.
  const stack: DocId[] = [id];
  const seen = new Set<DocId>([id]);

  while (stack.length) {
    for (const child of childrenOf(tree, stack.pop()!)) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      out.push(child.id);
      stack.push(child.id);
    }
  }
  return out;
}

/** Ancestor ids of `id`, nearest first (excludes `id`). */
export function ancestorsOf<N extends DocNode>(tree: DocTree<N>, id: DocId): DocId[] {
  const out: DocId[] = [];
  // `seen` stops a cyclic parent chain looping forever. Without it this is a
  // hang, not a crash — the process spins at 100% and never returns, which is
  // strictly worse to diagnose than a stack overflow.
  //
  // It matters most because `isAncestorOrSelf` is the guard that PREVENTS
  // cycles: on a document that already has one, the guard itself was the thing
  // that hung.
  const seen = new Set<DocId>([id]);
  let cur = tree.nodes[id]?.parent ?? null;

  while (cur !== null && !seen.has(cur)) {
    seen.add(cur);
    out.push(cur);
    cur = tree.nodes[cur]?.parent ?? null;
  }
  return out;
}

/** True when `maybeAncestor` is `id` itself or one of its ancestors — the guard
 *  that stops a node being reparented into its own subtree. */
export function isAncestorOrSelf<N extends DocNode>(tree: DocTree<N>, id: DocId, maybeAncestor: DocId): boolean {
  if (id === maybeAncestor) return true;
  return ancestorsOf(tree, id).includes(maybeAncestor);
}

/** An order key that appends a new node after the last child of `parent`. */
export function appendOrder<N extends DocNode>(tree: DocTree<N>, parent: DocId | null): string {
  const sibs = childrenOf(tree, parent);
  return fractionalKey(sibs.length ? sibs[sibs.length - 1]!.order : null, null);
}
