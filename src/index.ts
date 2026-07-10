/**
 * @particle-academy/fancy-doc-commons — the shared, pure, zero-dependency core
 * for the Fancy document/surface packages (the sibling of `fancy-file-commons`,
 * scoped to node/tree/op concerns rather than file/diff). It owns the substrate
 * every "agent emits + edits a surface" model needs so they stop diverging:
 *
 *  - {@link fractionalKey} — collab-safe sibling ordering (from cms Stages).
 *  - {@link DocTree} / {@link DocNode} + tree walks — the flat node-map document.
 *  - {@link DocReducer} + {@link treeReducer} — the typed op-spine (reduce + invert).
 *  - {@link Viewport} / {@link PositionedItem} / {@link Connector} — canvas primitives.
 *  - {@link AcceptanceState} / {@link StagePolicy} / {@link Proposal} — staged writes.
 *
 * Design doc: `.ai/plans/fancy-doc-commons.md`. No React, no DOM; JSON-friendly
 * and MCP-safe by construction.
 */

export { fractionalKey, keyBetween } from "./ordering";

export {
  type DocId,
  type DocNode,
  type DocTree,
  childrenOf,
  roots,
  descendantsOf,
  ancestorsOf,
  isAncestorOrSelf,
  appendOrder,
} from "./tree";

export {
  type DocReducer,
  type TreeOp,
  reduceAll,
  treeReducer,
} from "./ops";

export {
  type Viewport,
  type PositionedItem,
  type ConnectorEnd,
  type Connector,
  IDENTITY_VIEWPORT,
  byZ,
  topZ,
  screenToWorld,
  worldToScreen,
} from "./canvas";

export {
  type AcceptanceStatus,
  type AcceptanceState,
  type Actor,
  type Proposal,
  type StagePolicy,
  autoApply,
  alwaysConfirm,
  statusOf,
  setStatus,
  setAll,
  partition,
  isResolved,
} from "./staged";

export {
  type Breakpoint,
  type LengthUnit,
  type Length,
  type SizeMode,
  type Constraints,
  type LayoutMode,
  type StyleProps,
  type PerBreakpoint,
  type StyledNode,
  DEFAULT_BREAKPOINTS,
} from "./style";

export { type EmitCssOptions, emitTreeCss } from "./css";
