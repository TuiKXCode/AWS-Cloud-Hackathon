import { useId } from 'react';
import { useImage } from '../../hooks/useImage.js';
import { FaceBehind, FaceFront } from './AnimalFace.jsx';

/**
 * A circular animal head, centred on (0, 0) in the parent SVG's coordinate space.
 *
 * This is the slot the PRD cares about: if the player has photographed this animal, the
 * capture (Phase 4) or composited sprite (Phase 6) is clipped into the circle and that
 * picture becomes the customer's face — the species silhouette (ears, mane, horns) stays
 * drawn around it so you can still tell who it is. With no photo, the whole face is drawn.
 */
export function AnimalAvatarGroup({ exhibit, photoSrc = null, radius = 30 }) {
  // useId() contains colons; strip them so the id is safe inside url(#...).
  const clipId = `avatar-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { ready: photoReady } = useImage(photoSrc);
  const palette = exhibit?.palette ?? { fur: '#D8A263', dark: '#8C4A0C' };
  const scale = radius / 30;

  return (
    <g transform={scale === 1 ? undefined : `scale(${scale})`}>
      <FaceBehind exhibit={exhibit} />
      <circle cx="0" cy="0" r="30" fill={palette.fur} stroke={palette.dark} strokeWidth="2.5" />

      {photoReady ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <circle cx="0" cy="0" r="28" />
            </clipPath>
          </defs>
          <image
            href={photoSrc}
            x="-28"
            y="-28"
            width="56"
            height="56"
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
          <circle cx="0" cy="0" r="29" fill="none" stroke={palette.dark} strokeWidth="2.5" />
        </>
      ) : (
        <FaceFront exhibit={exhibit} />
      )}
    </g>
  );
}

/**
 * Standalone version for UI chrome (order tickets, day briefing, summaries).
 * The viewBox is generous so ears, manes and ossicones are not clipped.
 */
export default function AnimalAvatar({ exhibit, photoSrc = null, className = 'h-8 w-8' }) {
  return (
    <svg viewBox="-42 -44 84 88" className={className} aria-hidden="true">
      <AnimalAvatarGroup exhibit={exhibit} photoSrc={photoSrc} radius={30} />
    </svg>
  );
}
