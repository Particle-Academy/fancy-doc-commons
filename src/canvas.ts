/**
 * Infinite-canvas primitives — the shape triplicated today, verbatim, in
 * fancy-whiteboard, fancy-artboard, and fancy-flow (`Viewport {x,y,zoom}`), plus
 * the "positioned item" every canvas surface re-invents (`id,x,y,w?,h?,z?`) and
 * a connector between items. Owning these once is the clearest immediate de-dup.
 */

/** A pan/zoom viewport over an infinite canvas. `x`/`y` are the world-space pan
 *  offset (screen px); `zoom` is a scale factor (1 = 100%). */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/** The identity viewport (no pan, 100% zoom). */
export const IDENTITY_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

/** An item placed on a canvas by absolute world coords, with optional explicit
 *  size and paint order. */
export interface PositionedItem {
  id: string;
  x: number;
  y: number;
  /** Explicit width (world px). Absent = intrinsic/auto. */
  w?: number;
  /** Explicit height (world px). Absent = intrinsic/auto. */
  h?: number;
  /** Paint order — higher sits on top. Ties fall back to input order. */
  z?: number;
}

/** An endpoint: another item (by id) or a free world point. */
export type ConnectorEnd = string | { x: number; y: number };

/** A directed connection between two canvas items (or free points). */
export interface Connector {
  id: string;
  from: ConnectorEnd;
  to: ConnectorEnd;
  label?: string;
}

/** Order items back-to-front by `z` (missing = 0), stable on input order. */
export function byZ<T extends { z?: number }>(items: readonly T[]): T[] {
  return items
    .map((item, i) => [item, i] as const)
    .sort((a, b) => (a[0].z ?? 0) - (b[0].z ?? 0) || a[1] - b[1])
    .map(([item]) => item);
}

/** The highest `z` among items (0 when none), so a new item can go on top with `topZ + 1`. */
export function topZ(items: readonly { z?: number }[]): number {
  return items.reduce((max, it) => Math.max(max, it.z ?? 0), 0);
}

/** Screen-space point → world/canvas coords under a viewport. */
export function screenToWorld(p: { x: number; y: number }, v: Viewport): { x: number; y: number } {
  return { x: (p.x - v.x) / v.zoom, y: (p.y - v.y) / v.zoom };
}

/** World/canvas point → screen coords under a viewport. */
export function worldToScreen(p: { x: number; y: number }, v: Viewport): { x: number; y: number } {
  return { x: p.x * v.zoom + v.x, y: p.y * v.zoom + v.y };
}
