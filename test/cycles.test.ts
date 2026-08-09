import { test } from "node:test";
import assert from "node:assert/strict";
import { ancestorsOf, descendantsOf, isAncestorOrSelf, type DocNode, type DocTree } from "../src/tree";

function n(id: string, parent: string | null, order = "a"): DocNode {
  return { id, parent, order, props: {} };
}

function tree(...nodes: DocNode[]): DocTree<DocNode> {
  return { nodes: Object.fromEntries(nodes.map((x) => [x.id, x])) };
}

/**
 * A `DocTree` arrives as JSON — from a file, a network payload, or a reducer
 * bug — so it is not guaranteed acyclic. Every walk has to terminate on one
 * anyway.
 *
 * These were HANGS rather than crashes, which is strictly worse to diagnose:
 * the process spins at 100% and never returns. Each of these ran forever
 * against the previous implementation.
 */

test("ancestorsOf stops on a two-node cycle", () => {
  const t = tree(n("a", "b"), n("b", "a"));

  // `b` only: walking up from `a` reaches `b`, whose parent is `a` again —
  // already seen, so the walk stops. `a` is the node itself, not an ancestor.
  assert.deepEqual(ancestorsOf(t, "a"), ["b"]);
});

test("ancestorsOf stops on a self-parented node", () => {
  assert.deepEqual(ancestorsOf(tree(n("solo", "solo")), "solo"), []);
});

test("ancestorsOf stops on a longer cycle", () => {
  const t = tree(n("a", "c"), n("b", "a"), n("c", "b"));

  assert.ok(ancestorsOf(t, "a").length <= 3);
});

test("isAncestorOrSelf — the guard that PREVENTS cycles — survives one", () => {
  // The sharpest version of the bug: the function whose whole job is to stop a
  // node being reparented into its own subtree was itself what hung on a
  // document that already had a cycle.
  const t = tree(n("a", "b"), n("b", "a"));

  assert.equal(isAncestorOrSelf(t, "a", "b"), true);
  assert.equal(isAncestorOrSelf(t, "a", "elsewhere"), false);
});

test("descendantsOf stops on a cycle instead of overflowing the stack", () => {
  const t = tree(n("a", null), n("b", "a"), n("c", "b"));
  t.nodes.a!.parent = "c"; // close the loop

  const out = descendantsOf(t, "a");

  assert.ok(out.includes("b"));
  assert.ok(out.includes("c"));
  assert.equal(out.length, new Set(out).size, "each node appears once");
  assert.ok(!out.includes("a"));
});

test("descendantsOf walks past the recursion limit", () => {
  // The recursive version recursed once per LEVEL, so document depth was
  // bounded by the JS stack (~11k frames) rather than by anything the document
  // model says. 12,000 clears that — verified: the old implementation throws
  // RangeError here. The iterative version does not care.
  //
  // Deliberately not larger: `childrenOf` scans every node to find one parent's
  // children, so a chain walk is O(n^2). That is a real characteristic of this
  // package — worth an index, and worth measuring before adding one — but it is
  // a separate change from removing the recursion, and inflating this test
  // would only hide it.
  const nodes: DocNode[] = [n("n0", null)];
  for (let i = 1; i < 12_000; i++) nodes.push(n(`n${i}`, `n${i - 1}`));

  assert.equal(descendantsOf(tree(...nodes), "n0").length, 11_999);
});

test("acyclic behaviour is unchanged", () => {
  const t = tree(n("root", null), n("mid", "root"), n("leaf", "mid"), n("other", "root"));

  assert.deepEqual(descendantsOf(t, "root").sort(), ["leaf", "mid", "other"]);
  assert.deepEqual(ancestorsOf(t, "leaf"), ["mid", "root"]);
  assert.equal(isAncestorOrSelf(t, "leaf", "root"), true);
  assert.equal(isAncestorOrSelf(t, "root", "leaf"), false);
});
