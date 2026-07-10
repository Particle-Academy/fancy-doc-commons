/**
 * The per-breakpoint style/layout model — extracted from fancy-cms-ui's Stages
 * `StyleProps` / `Constraints` / `PerBreakpoint`. It compiles deterministically to
 * CSS (see ./css), and cms's PHP `CssEmitter` mirrors that output byte-for-byte —
 * so this is the single style vocabulary a doc surface uses to get responsive
 * styling + a server-rendered first byte instead of ad-hoc component props.
 */
import type { DocNode } from "./tree";

/** Ordered, mobile-first. Convention: `"base" | "md" | "lg"`. */
export type Breakpoint = string;

export type LengthUnit = "px" | "%" | "vw" | "vh" | "rem" | "fr";

export interface Length {
  value: number;
  unit: LengthUnit;
}

/** A dimension: an explicit length, `"fill"` (100%), or `"hug"` (auto). */
export type SizeMode = Length | "fill" | "hug";

/** Self-positioning within a `free` parent + explicit sizing. */
export interface Constraints {
  /** Pinned offsets within a `free` parent (null = unpinned). */
  left?: Length | null;
  right?: Length | null;
  top?: Length | null;
  bottom?: Length | null;
  centerX?: boolean;
  centerY?: boolean;
  width: SizeMode;
  height: SizeMode;
}

/** How a container lays out its children. */
export type LayoutMode = "free" | "stack" | "grid";

/** The style vocabulary. Every field compiles to one deterministic CSS declaration. */
export interface StyleProps {
  // box
  padding?: Length;
  margin?: Length;
  radius?: Length;
  // color / surface
  background?: string; // color | gradient | url(...)
  color?: string;
  opacity?: number;
  // typography
  fontFamily?: string;
  fontSize?: Length;
  fontWeight?: number;
  lineHeight?: number;
  textAlign?: "left" | "center" | "right" | "justify";
  letterSpacing?: Length;
  // border / shadow / effects (static)
  border?: string;
  boxShadow?: string;
  transform?: string;
  filter?: string;
  // container knobs (when layout = stack | grid)
  gap?: Length;
  direction?: "row" | "column";
  columns?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
}

/** Per-breakpoint overrides; `base` is required, others cascade mobile-first. */
export type PerBreakpoint<T> = { base: T } & Partial<Record<Breakpoint, Partial<T>>>;

/** Default breakpoint → min-width(px) map (`base`/`md`/`lg`). */
export const DEFAULT_BREAKPOINTS: Record<Breakpoint, number> = {
  base: 0,
  md: 768,
  lg: 1024,
};

/**
 * A {@link DocNode} that carries the style/layout model — the node shape the CSS
 * emitter (./css) consumes. A cms `Node` is structurally a `StyledNode`; other
 * surfaces opt in by adding `style`/`constraints`/`layout` to their nodes.
 */
export interface StyledNode<TProps = Record<string, unknown>> extends DocNode<TProps> {
  layout?: LayoutMode;
  style: PerBreakpoint<StyleProps>;
  constraints?: PerBreakpoint<Constraints>;
}
