import { test } from "node:test";
import assert from "node:assert/strict";
import { childrenOf, ancestorsOf, type DocNode, type DocTree } from "../src/tree";
import { treeReducer } from "../src/ops";

function n(id: string, parent: string | null, order: string): DocNode {
  return { id, parent, order, props: {} };
}

function tree(...nodes: DocNode[]): DocTree<DocNode> {
  return { nodes: Object.fromEntries(nodes.map((x) => [x.id, x])) };
}

/* ── byOrder tie-break ──────────────────────────────────────────────────── */

test("siblings sharing an order key sort deterministically by id", () => {
  // Without a tie-break these compare equal and their order comes from
  // `for...in` over the nodes object — so two documents with identical CONTENT
  // could render differently, and one document could reorder itself after a
  // JSON round-trip.
  const a = tree(n("zeta", null, "a0"), n("alpha", null, "a0"), n("mid", null, "a0"));
  const b = tree(n("mid", null, "a0"), n("alpha", null, "a0"), n("zeta", null, "a0"));

  assert.deepEqual(childrenOf(a, null).map((x) => x.id), ["alpha", "mid", "zeta"]);
  assert.deepEqual(
    childrenOf(a, null).map((x) => x.id),
    childrenOf(b, null).map((x) => x.id),
    "insertion order must not affect the result",
  );
});

test("the order key still wins over the id", () => {
  // The tie-break must only apply on an actual tie.
  const t = tree(n("aaa", null, "a2"), n("zzz", null, "a1"));

  assert.deepEqual(childrenOf(t, null).map((x) => x.id), ["zzz", "aaa"]);
});

/* ── move cycle guard ───────────────────────────────────────────────────── */

test("move REFUSES to parent a node under its own descendant", () => {
  // The root cause of the hangs fixed in 0.2.1: the reducer could CREATE the
  // cycle every walk then had to survive.
  const r = treeReducer<DocNode>();
  const t = tree(n("root", null, "a0"), n("child", "root", "a0"), n("grand", "child", "a0"));

  const after = r.reduce(t, { t: "move", id: "root", parent: "grand", order: "a0" });

  assert.equal(after, t, "an invalid move is a no-op, like every other invalid op");
  assert.equal(after.nodes.root!.parent, null);
});

test("move REFUSES to parent a node under itself", () => {
  const r = treeReducer<DocNode>();
  const t = tree(n("solo", null, "a0"));

  assert.equal(r.reduce(t, { t: "move", id: "solo", parent: "solo", order: "a0" }), t);
});

test("a legitimate move still works, including to the root", () => {
  const r = treeReducer<DocNode>();
  const t = tree(n("a", null, "a0"), n("b", null, "a1"), n("c", "a", "a0"));

  const moved = r.reduce(t, { t: "move", id: "c", parent: "b", order: "a5" });
  assert.equal(moved.nodes.c!.parent, "b");
  assert.equal(moved.nodes.c!.order, "a5");

  const toRoot = r.reduce(moved, { t: "move", id: "c", parent: null, order: "a9" });
  assert.equal(toRoot.nodes.c!.parent, null);
});

test("a tree that survives arbitrary moves stays walkable", () => {
  // The property the guard buys: no sequence of moves through the reducer can
  // produce a document whose ancestor walk does not terminate.
  const r = treeReducer<DocNode>();
  let t = tree(n("a", null, "a0"), n("b", "a", "a0"), n("c", "b", "a0"), n("d", "c", "a0"));

  for (const [id, parent] of [["a", "d"], ["b", "d"], ["a", "c"], ["c", "d"], ["d", "b"]] as const) {
    t = r.reduce(t, { t: "move", id, parent, order: "a0" });
  }

  for (const id of Object.keys(t.nodes)) {
    const chain = ancestorsOf(t, id);
    assert.equal(chain.length, new Set(chain).size, `ancestor chain of ${id} repeats — a cycle got through`);
  }
});
