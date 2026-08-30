// src/engine/spriteGeometry.ts
//
// Pure, deterministic geometry for sprite compositing (Phase 6).
// No I/O and no canvas: this module only computes source/destination
// rectangles so it can be fully property-tested and shared by the effectful
// compositor. See design.md "spriteGeometry.ts — head/crop math (pure)".

/**
 * Head_Position expressed as fractions of the Sprite_Body_Asset dimensions.
 * cx/cy are the head-circle center as a fraction of body width/height;
 * diameter is the head-circle diameter as a fraction of body WIDTH.
 * A single fixed instance (HEAD_POSITION) is used for every generation so
 * identical inputs produce a byte-identical sprite (Req 2.5).
 */
export interface HeadPosition {
  cx: number; // 0..1 fraction of body width  (head-circle center X)
  cy: number; // 0..1 fraction of body height (head-circle center Y)
  diameter: number; // 0..1 fraction of body width  (head-circle diameter)
}

/**
 * The one fixed Head_Position used for all sprites (Req 2.5).
 * The exact values are a visual tuning choice; only their fixedness is a
 * correctness requirement.
 */
export const HEAD_POSITION: HeadPosition = { cx: 0.5, cy: 0.28, diameter: 0.42 };

/** A rectangle in device pixels. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The centered square source region of the photo used for the circular head:
 * side = min(width, height), centered, so the crop never leaves the photo
 * bounds (Req 2.1). When either dimension is 0 the side is 0, and the offset on
 * a zero-length axis is 0 (Req 2.2 edge case).
 */
export function cropRegion(photoWidth: number, photoHeight: number): Rect {
  const side = Math.min(photoWidth, photoHeight);
  const safeSide = side > 0 ? side : 0;
  return {
    x: (photoWidth - safeSide) / 2,
    y: (photoHeight - safeSide) / 2,
    width: safeSide,
    height: safeSide,
  };
}

/**
 * The destination rectangle (in body pixels) where the circular head is drawn,
 * derived from HEAD_POSITION and the body dimensions. The circle of diameter
 * `head.diameter * bodyWidth` is centered at
 * (head.cx * bodyWidth, head.cy * bodyHeight); the returned Rect is the
 * bounding box of that circle (Req 2.3, 2.5). Deterministic: identical inputs
 * always produce an identical Rect.
 */
export function headRect(
  bodyWidth: number,
  bodyHeight: number,
  head: HeadPosition = HEAD_POSITION,
): Rect {
  const size = head.diameter * bodyWidth;
  return {
    x: head.cx * bodyWidth - size / 2,
    y: head.cy * bodyHeight - size / 2,
    width: size,
    height: size,
  };
}
