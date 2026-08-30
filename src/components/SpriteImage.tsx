// src/components/SpriteImage.tsx
// SpriteImage: renders the best-available image for one Collected_Record in the
// "My Collected Animals" gallery, following the sprite-generation (Phase 6)
// display fallback chain. A broken <img> is never shown.
//
// Display precedence (Req 4.2, 4.3, 5.2, 5.3):
//   1. spriteDataUrl present -> show the Composited_Sprite.
//   2. else bodyAssetUrl present and loads -> show the Body_Only_Fallback
//      (the exhibit's body art alone). Its onError flips `bodyErrored`.
//   3. else (no sprite AND (no bodyAssetUrl OR body errored)) -> a neutral
//      Placeholder_Fallback (a styled inline box), never a broken <img>.
//
// Styling uses inline styles per the project convention (Tailwind is not
// installed).

import { useEffect, useState, type CSSProperties } from 'react';

import { colors, radius } from '../theme';

export interface SpriteImageProps {
  /** The composited sprite, if generated (Req 5.2). */
  spriteDataUrl?: string;
  /** The exhibit's body art path, used for the Body_Only_Fallback (Req 5.3). */
  bodyAssetUrl?: string;
  /** Accessible label (e.g. the exhibit name). */
  alt: string;
  /** Square edge length in pixels; defaults to a gallery thumbnail size. */
  size?: number;
}

const DEFAULT_SIZE = 120;

/**
 * A small color-coded tag showing an exhibit's IUCN conservation status.
 * Renders the best available image for one record and never a broken image.
 */
export function SpriteImage({
  spriteDataUrl,
  bodyAssetUrl,
  alt,
  size = DEFAULT_SIZE,
}: SpriteImageProps) {
  // Tracks whether the Body_Only_Fallback <img> failed to load. When true we
  // render the Placeholder_Fallback instead of a broken image (Req 4.3).
  const [bodyErrored, setBodyErrored] = useState(false);

  // Reset the error flag when the source props change, so switching to a
  // different record re-attempts loading its body art.
  useEffect(() => {
    setBodyErrored(false);
  }, [spriteDataUrl, bodyAssetUrl]);

  const boxStyle: CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    objectFit: 'contain',
    display: 'block',
  };

  // Tier 1: composited sprite (Req 5.2).
  if (spriteDataUrl) {
    return (
      <img
        className="sprite-image sprite-image--sprite"
        src={spriteDataUrl}
        alt={alt}
        style={boxStyle}
      />
    );
  }

  // Tier 2: body-only fallback (Req 4.2, 5.3). Only attempted when a body
  // asset is provided and it has not previously errored.
  if (bodyAssetUrl && !bodyErrored) {
    return (
      <img
        className="sprite-image sprite-image--body"
        src={bodyAssetUrl}
        alt={alt}
        style={boxStyle}
        onError={() => setBodyErrored(true)}
      />
    );
  }

  // Tier 3: placeholder fallback (Req 4.3, 5.3). A neutral styled box — never a
  // broken <img>. Exposes the alt text to assistive technology.
  const placeholderStyle: CSSProperties = {
    ...boxStyle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.leafTint,
    color: colors.leaf,
    border: `1px dashed ${colors.lime}`,
    borderRadius: radius.sm,
    fontSize: '1.5rem',
    textAlign: 'center',
    boxSizing: 'border-box',
    padding: '4px',
  };

  return (
    <div
      className="sprite-image sprite-image--placeholder"
      data-testid="sprite-placeholder"
      role="img"
      aria-label={alt}
      style={placeholderStyle}
    >
      <span aria-hidden="true">🐾</span>
    </div>
  );
}

export default SpriteImage;
