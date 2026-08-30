// src/engine/spriteCompositor.ts
//
// Effectful Canvas adapter for sprite compositing (Phase 6).
//
// Loads the visitor's captured photo and the exhibit's placeholder body art,
// crops the photo to a circular head, composites the head over the body via the
// Canvas API, and exports the result as a PNG data URL.
//
// This module NEVER throws and NEVER rejects: every failure mode (photo/body
// load error, load timeout, zero-dimension photo, missing 2D context, draw
// error, toDataURL error/empty) is normalized to a `null` return so the
// orchestration layer can route to the fallback tiers without special-casing
// exceptions (Req 2.2, 2.6, 4.2).

import { cropRegion, headRect, HEAD_POSITION } from './spriteGeometry';
import type { HeadPosition } from './spriteGeometry';

/** Max time to wait for either image to load before aborting (Req 2.6, 4.3). */
export const IMAGE_LOAD_TIMEOUT_MS = 5000;

/**
 * Load an image from a URL, bounded by `timeoutMs`.
 *
 * Resolves to the loaded HTMLImageElement, or `null` on error or timeout.
 * Never rejects. The timer is cleared on load/error so a resolved image does
 * not later fire the timeout, and a timed-out load does not later resolve the
 * element.
 */
function loadImage(
  url: string,
  timeoutMs: number,
): Promise<HTMLImageElement | null> {
  return new Promise<HTMLImageElement | null>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (result: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      resolve(result);
    };

    try {
      const img = new Image();
      img.onload = () => finish(img);
      img.onerror = () => finish(null);
      timer = setTimeout(() => finish(null), timeoutMs);
      img.src = url;
    } catch {
      // Constructing Image or assigning src threw (extremely unlikely in a
      // browser, but keep the never-throw contract).
      finish(null);
    }
  });
}

/**
 * Produce a Composited_Sprite as a PNG data URL, or `null` on any
 * Compositing_Failure.
 *
 * Steps:
 *  1. Load the photo and body art via Image, each bounded by
 *     IMAGE_LOAD_TIMEOUT_MS. A timeout or load error -> null (Req 2.6, 4.2).
 *  2. If the photo has zero width or height -> null (Req 2.2).
 *  3. Compute the centered-square cropRegion of the photo (source, Req 2.1)
 *     and the headRect on the body (destination, Req 2.3/2.5).
 *  4. Draw the body onto a canvas sized to the body, then clip to the head
 *     circle and draw the cropped photo at headRect (body first, head over
 *     it) (Req 2.3).
 *  5. Export via canvas.toDataURL('image/png') (Req 2.4).
 *
 * Because canvas state and Head_Position are fixed, identical
 * `(photoDataUrl, bodyAssetUrl)` inputs yield a byte-identical export (Req 2.5).
 *
 * @param photoDataUrl  the Collected_Record's existing `photo` data URL
 * @param bodyAssetUrl  the exhibit's `spriteBodyAsset` path
 * @param headPosition  fractional Head_Position (defaults to HEAD_POSITION)
 */
export async function generateSprite(
  photoDataUrl: string,
  bodyAssetUrl: string,
  headPosition: HeadPosition = HEAD_POSITION,
): Promise<string | null> {
  try {
    // 1. Load both images (bounded by the timeout). Either failing -> null.
    const [photo, body] = await Promise.all([
      loadImage(photoDataUrl, IMAGE_LOAD_TIMEOUT_MS),
      loadImage(bodyAssetUrl, IMAGE_LOAD_TIMEOUT_MS),
    ]);
    if (photo === null || body === null) return null;

    // 2. Reject a zero-dimension photo (Req 2.2).
    if (!photo.naturalWidth || !photo.naturalHeight) return null;

    const bodyWidth = body.naturalWidth;
    const bodyHeight = body.naturalHeight;

    // 3. Pure geometry: source crop + destination head rectangle.
    const src = cropRegion(photo.naturalWidth, photo.naturalHeight);
    const dest = headRect(bodyWidth, bodyHeight, headPosition);
    const destCenterX = dest.x + dest.width / 2;
    const destCenterY = dest.y + dest.height / 2;
    const destRadius = dest.width / 2;

    // 4. Composite on a canvas sized to the body.
    const canvas = document.createElement('canvas');
    canvas.width = bodyWidth;
    canvas.height = bodyHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Body first...
    ctx.drawImage(body, 0, 0);

    // ...then the circular head clipped over it (Req 2.3).
    ctx.save();
    ctx.beginPath();
    ctx.arc(destCenterX, destCenterY, destRadius, 0, 2 * Math.PI);
    ctx.clip();
    ctx.drawImage(
      photo,
      src.x,
      src.y,
      src.width,
      src.height,
      dest.x,
      dest.y,
      dest.width,
      dest.height,
    );
    ctx.restore();

    // 5. Export (Req 2.4). Empty/falsy result is treated as a failure.
    const dataUrl = canvas.toDataURL('image/png');
    if (!dataUrl) return null;
    return dataUrl;
  } catch {
    // Any unexpected throw (getContext, drawImage, clip, toDataURL, etc.)
    // is normalized to null (Req 4.2).
    return null;
  }
}
