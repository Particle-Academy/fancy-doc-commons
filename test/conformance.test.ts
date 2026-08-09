import { test } from "node:test";
import assert from "node:assert/strict";

import { CANONICAL_IDS, CANONICAL_TREE, CANONICAL_WALKS } from "../src/conformance";
import { ancestorsOf, childrenOf, descendantsOf, roots } from "../src/tree";

/**
 * The substrate's own half of the shared fixture.
 *
 * `fancy-cms-ui` and `fancy-screens` assert the same constants in their own
 * suites. This file is what makes those assertions mean something: if the walks
 * change here, this fails first, in the package that owns them, rather than
 * surfacing as two consumers disagreeing.
 */

test("roots are ordered by their order key, not insertion order", () => {
  // rootB is declared FIRST in the fixture and must come second.
  assert.deepEqual(
    roots(CANONICAL_TREE).map((n) => n.id),
    CANONICAL_WALKS.roots,
  );
});

test("siblings are ordered by their order key", () => {
  // childB2 is declared before childB1 for exactly this reason.
  assert.deepEqual(
    childrenOf(CANONICAL_TREE, CANONICAL_IDS.rootB).map((n) => n.id),
    CANONICAL_WALKS.childrenOfRootB,
  );
});

test("descendants come back depth-first in sibling order", () => {
  assert.deepEqual(descendantsOf(CANONICAL_TREE, CANONICAL_IDS.rootB), [
    ...CANONICAL_WALKS.descendantsOfRootB,
  ]);
});

test("ancestors walk up and exclude the node itself", () => {
  assert.deepEqual(
    ancestorsOf(CANONICAL_TREE, CANONICAL_IDS.grandchild),
    [...CANONICAL_WALKS.ancestorsOfGrandchild],
  );
});

test("an orphan is not a root, and walking up it terminates", () => {
  // Its parent is SET but absent. Treating it as a root would make it render at
  // the top level of a page it was never part of; throwing would take the page
  // down. Every surface has to agree on which.
  assert.equal(
    roots(CANONICAL_TREE).some((n) => n.id === CANONICAL_IDS.orphan),
    false,
  );
  assert.deepEqual(ancestorsOf(CANONICAL_TREE, CANONICAL_IDS.orphan), [
    ...CANONICAL_WALKS.ancestorsOfOrphan,
  ]);
});

test("the fixture survives JSON, because consumers load documents from a database", () => {
  const round = JSON.parse(JSON.stringify(CANONICAL_TREE)) as typeof CANONICAL_TREE;

  assert.deepEqual(
    roots(round).map((n) => n.id),
    CANONICAL_WALKS.roots,
  );
});
