import { test } from "node:test";
import assert from "node:assert/strict";
import { emitTreeCss, fractionalKey, type DocTree, type StyledNode } from "../src/index.ts";

test("emitTreeCss is deterministic: sorted ids, sorted decls, fixed media format", () => {
  const o = fractionalKey(null, null);
  const s: StyledNode = {
    id: "s",
    type: "stack",
    parent: null,
    order: o,
    props: {},
    layout: "stack",
    style: { base: { gap: { value: 12, unit: "px" }, background: "#fff" } },
  };
  const a: StyledNode = {
    id: "a",
    type: "text",
    parent: "s",
    order: o,
    props: {},
    style: {
      base: { color: "#000", fontSize: { value: 16, unit: "px" } },
      md: { color: "#111" },
    },
  };
  const tree: DocTree<StyledNode> = { nodes: { s, a } };

  // Use cms's own selector to demonstrate byte-parity with what cms emits today.
  const css = emitTreeCss(tree, { selectorFor: (id) => `[data-cms="${id}"]`, breakpoints: ["base", "md", "lg"] });

  const expected =
    `[data-cms="a"] {\n` +
    `  color: #000;\n` +
    `  font-size: 16px;\n` +
    `}\n` +
    `\n` +
    `@media (min-width: 768px) {\n` +
    `  [data-cms="a"] {\n` +
    `    color: #111;\n` +
    `  }\n` +
    `}\n` +
    `\n` +
    `[data-cms="s"] {\n` +
    `  background: #fff;\n` +
    `  display: flex;\n` +
    `  flex-direction: column;\n` +
    `  gap: 12px;\n` +
    `}\n`;

  assert.equal(css, expected);
});

test("emitTreeCss: empty tree → empty string; default selector is [data-node]", () => {
  assert.equal(emitTreeCss({ nodes: {} }), "");
  const n: StyledNode = { id: "n1", type: "box", parent: null, order: "a", props: {}, style: { base: { color: "red" } } };
  assert.equal(emitTreeCss({ nodes: { n1: n } }), `[data-node="n1"] {\n  color: red;\n}\n`);
});
