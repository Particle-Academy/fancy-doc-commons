import { test } from "node:test";
import assert from "node:assert/strict";
import {
  IDENTITY_VIEWPORT,
  byZ,
  topZ,
  screenToWorld,
  worldToScreen,
  type Viewport,
  statusOf,
  setStatus,
  setAll,
  partition,
  isResolved,
  autoApply,
  alwaysConfirm,
} from "../src/index.ts";

// ── canvas ──────────────────────────────────────────────────────────────────
test("byZ orders back-to-front, stable on ties", () => {
  const items = [{ id: "a", z: 2 }, { id: "b" }, { id: "c", z: 2 }, { id: "d", z: 1 }];
  assert.deepEqual(byZ(items).map((i) => i.id), ["b", "d", "a", "c"]);
  assert.equal(topZ(items), 2);
  assert.equal(topZ([]), 0);
});

test("screenToWorld / worldToScreen round-trip under a viewport", () => {
  const v: Viewport = { x: 40, y: -12, zoom: 2 };
  const p = { x: 123, y: 456 };
  const back = worldToScreen(screenToWorld(p, v), v);
  assert.ok(Math.abs(back.x - p.x) < 1e-9 && Math.abs(back.y - p.y) < 1e-9);
  // identity viewport is a no-op
  assert.deepEqual(screenToWorld(p, IDENTITY_VIEWPORT), p);
});

// ── staged writes ────────────────────────────────────────────────────────────
test("acceptance state: default pending + immutable updates", () => {
  let s = {};
  assert.equal(statusOf(s, "n1"), "pending");
  s = setStatus(s, "n1", "accepted");
  assert.equal(statusOf(s, "n1"), "accepted");
  const s2 = setAll(["a", "b", "c"], "rejected");
  assert.deepEqual(partition(s2), { accepted: [], rejected: ["a", "b", "c"], pending: [] });
});

test("isResolved is true only when no listed handle is pending", () => {
  const s = setStatus(setStatus({}, "a", "accepted"), "b", "rejected");
  assert.equal(isResolved(s, ["a", "b"]), true);
  assert.equal(isResolved(s, ["a", "b", "c"]), false); // c never seen → pending
});

test("stage policies", () => {
  assert.equal(autoApply({}), "auto");
  assert.equal(alwaysConfirm({}), "confirm");
});
