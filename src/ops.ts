/**
 * The op-spine: a pure reducer contract plus a reference implementation over the
 * plain {@link DocTree}. Generalized from fancy-cms-ui's `PageOp` / `reduce` /
 * `invert` and fancy-slides' `DeckOp` / `reduceDeck` — the two mature op-spines in
 * the kit. Modelling every mutation as a typed op with a pure `reduce` + a
 * computable `invert` is what lets undo, redo, staged writes, presence, and collab
 * all derive from ONE code path instead of five bespoke ones.
 */
import { descendantsOf, type DocId, type DocNode, type DocTree } from "./tree";

/**
 * A pure reducer contract for a document `TDoc` and its op union `TOp`.
 *
 * - `reduce` MUST be total: an op that can't apply (missing target, etc.) is a
 *   no-op that returns the document unchanged — never throw, never partially apply.
 * - `invert` returns the op(s) that undo `op`, computed against the **pre-op**
 *   document (so it can read the state the op is about to change).
 */
export interface DocReducer<TDoc, TOp> {
  reduce(doc: TDoc, op: TOp): TDoc;
  invert(doc: TDoc, op: TOp): TOp[];
}

/** Apply a sequence of ops left-to-right through a reducer. */
export function reduceAll<TDoc, TOp>(reducer: DocReducer<TDoc, TOp>, doc: TDoc, ops: readonly TOp[]): TDoc {
  return ops.reduce((d, op) => reducer.reduce(d, op), doc);
}

/**
 * The canonical op union over a {@link DocTree}. A surface with richer needs
 * (per-breakpoint style, bindings, actions) adds its own op variants + reducer;
 * this is the reference an op-based bridge can target for a plain node tree.
 */
export type TreeOp<N extends DocNode = DocNode> =
  | { t: "insert"; node: N }
  | { t: "remove"; id: DocId }
  | { t: "move"; id: DocId; parent: DocId | null; order: string }
  | { t: "set_props"; id: DocId; patch: Partial<N["props"]> };

/**
 * A reference {@link DocReducer} for the plain node-tree — pure + total, with
 * exact inverses: `remove` restores the whole removed subtree, `set_props`
 * restores the prior values of exactly the patched keys.
 *
 * (Caveat: `set_props`'s inverse restores prior values; a key that was absent
 * before is restored as `undefined` rather than deleted — fine for JSON-shaped
 * props. Surfaces needing true key-deletion carry a dedicated op.)
 */
export function treeReducer<N extends DocNode>(): DocReducer<DocTree<N>, TreeOp<N>> {
  return { reduce, invert };

  function reduce(doc: DocTree<N>, op: TreeOp<N>): DocTree<N> {
    switch (op.t) {
      case "insert":
        return { nodes: { ...doc.nodes, [op.node.id]: op.node } };
      case "remove": {
        if (!doc.nodes[op.id]) return doc;
        const drop = new Set<DocId>([op.id, ...descendantsOf(doc, op.id)]);
        const nodes: Record<DocId, N> = {};
        for (const id in doc.nodes) if (!drop.has(id)) nodes[id] = doc.nodes[id]!;
        return { nodes };
      }
      case "move": {
        const node = doc.nodes[op.id];
        if (!node) return doc;
        return { nodes: { ...doc.nodes, [op.id]: { ...node, parent: op.parent, order: op.order } } };
      }
      case "set_props": {
        const node = doc.nodes[op.id];
        if (!node) return doc;
        return { nodes: { ...doc.nodes, [op.id]: { ...node, props: { ...node.props, ...op.patch } } } };
      }
    }
  }

  function invert(doc: DocTree<N>, op: TreeOp<N>): TreeOp<N>[] {
    switch (op.t) {
      case "insert":
        return [{ t: "remove", id: op.node.id }];
      case "remove": {
        if (!doc.nodes[op.id]) return [];
        // Snapshot the node + its subtree from the pre-op doc and re-insert them.
        const ids = [op.id, ...descendantsOf(doc, op.id)];
        return ids.map((id) => ({ t: "insert", node: doc.nodes[id]! }) as TreeOp<N>);
      }
      case "move": {
        const node = doc.nodes[op.id];
        if (!node) return [];
        return [{ t: "move", id: op.id, parent: node.parent, order: node.order }];
      }
      case "set_props": {
        const node = doc.nodes[op.id];
        if (!node) return [];
        const prev: Partial<N["props"]> = {};
        for (const k in op.patch) {
          (prev as Record<string, unknown>)[k] = (node.props as Record<string, unknown>)[k];
        }
        return [{ t: "set_props", id: op.id, patch: prev }];
      }
    }
  }
}
