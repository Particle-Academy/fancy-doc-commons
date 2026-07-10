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

/** Compare two fractional order keys (lexicographic). */
function byOrder<N extends DocNode>(a: N, b: N): number {
  return a.order < b.order ? -1 : a.order > b.order ? 1 : 0;
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
  const walk = (pid: DocId): void => {
    for (const child of childrenOf(tree, pid)) {
      out.push(child.id);
      walk(child.id);
    }
  };
  walk(id);
  return out;
}

/** Ancestor ids of `id`, nearest first (excludes `id`). */
export function ancestorsOf<N extends DocNode>(tree: DocTree<N>, id: DocId): DocId[] {
  const out: DocId[] = [];
  let cur = tree.nodes[id]?.parent ?? null;
  while (cur !== null) {
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
