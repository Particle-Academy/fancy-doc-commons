import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fractionalKey,
  childrenOf,
  roots,
  descendantsOf,
  ancestorsOf,
  isAncestorOrSelf,
  appendOrder,
  treeReducer,
  reduceAll,
  type DocTree,
  type DocNode,
  type TreeOp,
} from "../src/index.ts";

type N = DocNode;

function mk(id: string, parent: string | null, order: string, props: Record<string, unknown> = {}): N {
  return { id, type: "box", parent, order, props };
}
function tree(...nodes: N[]): DocTree {
  const nmap: Record<string, N> = {};
  for (const n of nodes) nmap[n.id] = n;
  return { nodes: nmap };
}

// ── ordering ──────────────────────────────────────────────────────────────
test("fractionalKey sorts strictly between its bounds", () => {
  const a = fractionalKey(null, null);
  const b = fractionalKey(a, null); // append after a
  assert.ok(a < b, "append is greater");
  const mid = fractionalKey(a, b);
  assert.ok(a < mid && mid < b, "midpoint sorts strictly between");
  const pre = fractionalKey(null, a);
  assert.ok(pre < a, "prepend is less");
});

test("fractionalKey throws when the lower bound is not below the upper", () => {
  assert.throws(() => fractionalKey("Z", "A"));
  assert.throws(() => fractionalKey("m", "m"));
});

// ── tree walks ────────────────────────────────────────────────────────────
test("childrenOf and roots return siblings in fractional order", () => {
  const rootOrder = fractionalKey(null, null);
  const k1 = fractionalKey(null, null);
  const k2 = fractionalKey(k1, null);
  const k3 = fractionalKey(k2, null);
  // Insert children out of order; childrenOf must sort them.
  const t = tree(mk("s", null, rootOrder), mk("b", "s", k2), mk("a", "s", k1), mk("c", "s", k3));
  assert.deepEqual(childrenOf(t, "s").map((n) => n.id), ["a", "b", "c"]);
  assert.deepEqual(roots(t).map((n) => n.id), ["s"]);
});

test("descendantsOf / ancestorsOf / isAncestorOrSelf", () => {
  const o = fractionalKey(null, null);
  const t = tree(mk("s", null, o), mk("a", "s", o), mk("a1", "a", o), mk("a2", "a", fractionalKey(o, null)));
  assert.deepEqual(descendantsOf(t, "s").sort(), ["a", "a1", "a2"]);
  assert.deepEqual(ancestorsOf(t, "a1"), ["a", "s"]);
  assert.equal(isAncestorOrSelf(t, "a1", "s"), true);
  assert.equal(isAncestorOrSelf(t, "a1", "a1"), true);
  assert.equal(isAncestorOrSelf(t, "s", "a1"), false);
});

// ── op-spine: every op round-trips through its inverse ──────────────────────
test("treeReducer: reduce is total (invalid ops are no-ops)", () => {
  const r = treeReducer<N>();
  const base = tree(mk("s", null, fractionalKey(null, null)));
  assert.equal(r.reduce(base, { t: "remove", id: "missing" }), base);
  assert.equal(r.reduce(base, { t: "move", id: "missing", parent: null, order: "x" }), base);
  assert.equal(r.reduce(base, { t: "set_props", id: "missing", patch: { a: 1 } }), base);
  assert.deepEqual(r.invert(base, { t: "remove", id: "missing" }), []);
});

test("treeReducer: apply(op) + apply(invert(op)) restores the original doc", () => {
  const r = treeReducer<N>();
  const k1 = fractionalKey(null, null);
  const k2 = fractionalKey(k1, null);
  const base = tree(
    mk("s", null, k1),
    mk("a", "s", k1, { x: 0 }), // pre-existing prop so set_props inverts exactly
    mk("b", "s", k2),
    mk("b1", "b", k1), // b has a child, to exercise subtree removal
  );

  const cases: TreeOp<N>[] = [
    { t: "insert", node: mk("c", "s", appendOrder(base, "s")) },
    { t: "set_props", id: "a", patch: { x: 42 } },
    { t: "move", id: "a", parent: "b", order: fractionalKey(k1, null) },
    { t: "remove", id: "b" }, // removes b + b1
  ];

  for (const op of cases) {
    const applied = r.reduce(base, op);
    assert.notDeepEqual(applied, base, `${op.t} should change the doc`);
    const restored = reduceAll(r, applied, r.invert(base, op));
    assert.deepEqual(restored, base, `${op.t} should round-trip via its inverse`);
  }
});
