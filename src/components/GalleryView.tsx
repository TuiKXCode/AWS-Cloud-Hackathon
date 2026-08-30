// src/components/GalleryView.tsx
// GalleryView: the "My Collected Animals" screen for the sprite-generation
// feature (Phase 6). Renders one sprite entry per Collected_Record and drives
// lazy sprite generation while the gallery is open.
//
// Responsibilities:
//  - Consume useCapture() for the persisted `collection` (Req 5.1).
//  - Mount useSpriteGeneration() so records lacking a spriteDataUrl are
//    generated one at a time in the background; as sprites arrive the matching
//    entry re-renders to show the Composited_Sprite (Req 6.3).
//  - For each record, resolve its exhibit by exhibitId to obtain the body art
//    path and a display name, and render a SpriteImage that follows the
//    fallback chain (sprite -> body -> placeholder; Req 5.2, 5.3).
//  - Show an empty-state indication when nothing has been collected (Req 5.4).
//
// Styling uses inline styles per the project convention (Tailwind is not
// installed).

import type { CSSProperties } from 'react';

import { useCapture } from '../context/CaptureContext';
import { useSpriteGeneration } from '../hooks/useSpriteGeneration';
import { SpriteImage } from './SpriteImage';
import { IUCNBadge } from './IUCNBadge';

import { exhibits as rawExhibits } from '../data/mandai.js';
import type { Exhibit } from '../types';
import { colors, radius, shadow, space, gradients } from '../theme';

const exhibits = rawExhibits as Exhibit[];

const containerStyle: CSSProperties = {
  padding: '16px',
  maxWidth: '640px',
  margin: '0 auto',
};

const titleStyle: CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 800,
  color: colors.forestGreen,
  margin: '0 0 16px',
};

const emptyStyle: CSSProperties = {
  padding: '32px 16px',
  textAlign: 'center',
  color: colors.textMuted,
  backgroundColor: colors.cream,
  border: `1px dashed ${colors.sandDark}`,
  borderRadius: radius.lg,
  fontWeight: 600,
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: '16px',
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const itemStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: colors.cream,
  border: `1px solid ${colors.sandDark}`,
  borderRadius: radius.lg,
  boxShadow: shadow.soft,
  padding: '12px 12px 0',
  overflow: 'hidden',
};

const nameStyle: CSSProperties = {
  fontSize: '0.9375rem',
  fontWeight: 700,
  margin: 0,
  textAlign: 'center',
  color: colors.white,
  background: gradients.forest,
  alignSelf: 'stretch',
  padding: `${space.sm}px ${space.sm}px`,
  marginTop: space.xs,
};

/**
 * Renders the "My Collected Animals" gallery. Consumes the CaptureContext
 * internally, so it takes no props. Must be rendered within a CaptureProvider.
 */
export function GalleryView() {
  const { collection } = useCapture();

  // Drive lazy, non-blocking sprite generation while the gallery is open. The
  // hook persists results via the capture context, which re-renders entries
  // as their sprites become available (Req 6.3).
  useSpriteGeneration();

  // Index exhibits by id for O(1) lookups while rendering.
  const exhibitsById = new Map<string, Exhibit>(
    exhibits.map((exhibit) => [exhibit.id, exhibit]),
  );

  return (
    <section className="gallery-view" style={containerStyle}>
      <h2 className="gallery-view__title" style={titleStyle}>
        My Collected Animals
      </h2>

      {collection.length === 0 ? (
        <p className="gallery-view__empty" style={emptyStyle}>
          No animals collected yet
        </p>
      ) : (
        <ul className="gallery-view__grid" style={gridStyle}>
          {collection.map((record, index) => {
            const exhibit = exhibitsById.get(record.exhibitId);
            // Graceful degradation: unknown exhibitId falls back to the raw id
            // for the label and leaves the body asset undefined (placeholder).
            const displayName = exhibit ? exhibit.name : record.exhibitId;

            return (
              <li
                // exhibitId can repeat across records; combine with the
                // timestamp and index for a stable, unique key.
                key={`${record.exhibitId}-${record.timestamp}-${index}`}
                className="gallery-view__item"
                style={itemStyle}
              >
                <SpriteImage
                  spriteDataUrl={record.spriteDataUrl}
                  bodyAssetUrl={exhibit?.spriteBodyAsset}
                  alt={displayName}
                />
                {exhibit ? <IUCNBadge status={exhibit.iucnStatus} /> : null}
                <h3 className="gallery-view__name" style={nameStyle}>
                  {displayName}
                </h3>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default GalleryView;
