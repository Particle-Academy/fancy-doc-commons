/**
 * The canonical tree every document surface must agree on.
 *
 * `fancy-cms-ui` and `fancy-screens` both declare their node type as
 * `extends DocNode`, which the type system checks — inside each package. It
 * cannot check that the two agree at RUNTIME on the thing that actually matters:
 * that the same tree, walked by the same functions, produces the same answer
 * whichever surface owns it.
 *
 * That gap is the reason this exists. The polyglot conformance work states the
 * rule generally — *N implementations of one contract are acceptable if and only
 * if a shared fixture table is asserted by every implementation, in that
 * implementation's own CI* — and a substrate with two consumers is exactly that
 * shape, one language early.
 *
 * So the fixture ships **in the package**, not in a test folder: a consumer
 * cannot assert against a file it cannot install. Each surface imports
 * `CANONICAL_TREE`, types it as its own node, and asserts `CANONICAL_WALKS`.
 * A divergence then fails in the consumer's CI rather than being discovered when
 * a bridge hands a CMS page to a screen and gets a different shape back.
 *
 * The tree is deliberately awkward, because the easy cases never drift:
 *
 * - two roots, so root ordering is exercised rather than assumed
 * - a sibling group whose `order` keys sort differently from insertion order
 * - a three-level chain, so `descendantsOf` has to recurse
 * - an orphan pointing at a parent that does not exist, which a document loaded
 *   from a database really can contain
 */
import type { DocNode, DocTree } from "./tree";

/** Node ids, exported so a consumer asserts against names rather than literals. */
export const CANONICAL_IDS = {
  rootA: "root-a",
  rootB: "root-b",
  childB1: "child-b1",
  childB2: "child-b2",
  grandchild: "grandchild",
  orphan: "orphan",
} as const;

/**
 * The fixture. Plain data — no class, no branded type — so a consumer can widen
 * it to its own node shape without a cast that would defeat the point.
 */
export const CANONICAL_TREE: DocTree<DocNode> = {
  nodes: {
    // Roots are ordered by their own keys, like any other sibling group.
    [CANONICAL_IDS.rootB]: { id: CANONICAL_IDS.rootB, parent: null, order: "a1", type: "node", props: {} },
    [CANONICAL_IDS.rootA]: { id: CANONICAL_IDS.rootA, parent: null, order: "a0", type: "node", props: {} },

    // Declared b2-before-b1 on purpose: insertion order must not decide output.
    [CANONICAL_IDS.childB2]: {
      id: CANONICAL_IDS.childB2,
      parent: CANONICAL_IDS.rootB,
      order: "a1",
      type: "node",
      props: {},
    },
    [CANONICAL_IDS.childB1]: {
      id: CANONICAL_IDS.childB1,
      parent: CANONICAL_IDS.rootB,
      order: "a0",
      type: "node",
      props: {},
    },

    [CANONICAL_IDS.grandchild]: {
      id: CANONICAL_IDS.grandchild,
      parent: CANONICAL_IDS.childB1,
      order: "a0",
      type: "node",
      props: {},
    },

    // Parent does not exist. A document out of a database can look like this,
    // and every surface must treat it the same way rather than each inventing a
    // recovery.
    [CANONICAL_IDS.orphan]: { id: CANONICAL_IDS.orphan, parent: "missing", order: "a0", type: "node", props: {} },
  },
};

/**
 * The answers. A surface asserting these is asserting it shares the substrate.
 *
 * Stated as ids rather than nodes so a consumer's extra domain fields — the
 * CMS's `style`, a screen's `type` — cannot make the comparison fail for a
 * reason that has nothing to do with the tree.
 */
export const CANONICAL_WALKS = {
  /** Roots, in order. The orphan is NOT a root: its parent is set, just absent. */
  roots: [CANONICAL_IDS.rootA, CANONICAL_IDS.rootB],
  childrenOfRootB: [CANONICAL_IDS.childB1, CANONICAL_IDS.childB2],
  /**
   * Breadth-first: both children before the grandchild. Pinned because it is a
   * real choice a second implementation would otherwise make differently, and
   * because I assumed depth-first when writing this fixture and the code
   * corrected me.
   */
  descendantsOfRootB: [CANONICAL_IDS.childB1, CANONICAL_IDS.childB2, CANONICAL_IDS.grandchild],
  ancestorsOfGrandchild: [CANONICAL_IDS.childB1, CANONICAL_IDS.rootB],
  /**
   * An orphan has NO ancestors. Its `parent` points at an id not in the tree,
   * and reporting that dangling id — which this did until 0.2.1 — hands the
   * caller something `tree.nodes[…]` cannot resolve.
   */
  ancestorsOfOrphan: [] as string[],
} as const;
