// src/components/CollectionView.tsx
// CollectionView: the Collection tab for the checkpoint-photo-capture feature
// (Phase 4). Lists the visitor's persisted collection of tagged animals and
// shows the derived Player_Total.
//
// Responsibilities:
//  - Consume useCapture() for `collection` and `playerTotal` (Req 7.3).
//  - Resolve each record's exhibitId to its exhibit to display the name and
//    IUCN status badge (Req 6.1).
//  - For each record, show the exhibit name, IUCNBadge, recognition method,
//    and a human-readable timestamp.
//  - Show an empty-state message when nothing has been collected yet.
//  - Degrade gracefully when a record's exhibitId does not resolve to a known
//    exhibit (show the raw id, skip the badge).
//
// Styling uses inline styles per the project convention (Tailwind is not
// installed).

import type { CSSProperties } from 'react';

import { useCapture } from '../context/CaptureContext';
import { IUCNBadge } from './IUCNBadge';
import { colors, radius, shadow, space, font } from '../theme';

import { exhibits as rawExhibits } from '../data/mandaiData.js';
import type { Exhibit, RecognitionMethod } from '../types';

const exhibits = rawExhibits as Exhibit[];

/** Human-readable label for the recognition method. */
const RECOGNITION_LABEL: Record<RecognitionMethod, string> = {
  classifier: 'Recognized by camera',
  'location-fallback': 'Tagged by location',
};

const containerStyle: CSSProperties = {
  fontFamily: font.family,
  color: colors.textDark,
  padding: space.lg,
  maxWidth: 640,
  margin: '0 auto',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.md,
  marginBottom: space.lg,
  padding: `${space.md}px ${space.lg}px`,
  borderRadius: radius.lg,
  background: `linear-gradient(135deg, ${colors.forestGreen} 0%, ${colors.green} 55%, ${colors.leaf} 100%)`,
  boxShadow: shadow.soft,
};

const titleStyle: CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 700,
  margin: 0,
  color: colors.white,
};

const pointsStyle: CSSProperties = {
  fontSize: '1rem',
  fontWeight: 800,
  padding: `${space.xs}px ${space.md}px`,
  borderRadius: radius.pill,
  backgroundColor: colors.cream,
  color: colors.forestGreen,
  whiteSpace: 'nowrap',
  boxShadow: shadow.soft,
};

const emptyStyle: CSSProperties = {
  padding: `${space.xxl}px ${space.lg}px`,
  textAlign: 'center',
  color: colors.textMuted,
  backgroundColor: colors.cream,
  borderRadius: radius.lg,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: colors.sandDark,
};

const listStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: space.md,
};

const itemStyle: CSSProperties = {
  backgroundColor: colors.cream,
  borderRadius: radius.lg,
  boxShadow: shadow.card,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: colors.sandDark,
  borderLeftWidth: '4px',
  borderLeftColor: colors.leaf,
  padding: space.md,
  display: 'flex',
  flexDirection: 'column',
  gap: space.sm,
};

const itemHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.sm,
};

const nameStyle: CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  margin: 0,
  color: colors.forestGreen,
};

const metaStyle: CSSProperties = {
  fontSize: '0.8125rem',
  color: colors.textMuted,
};

/**
 * Renders the Collection tab. Consumes the CaptureContext internally, so it
 * takes no props. Must be rendered within a CaptureProvider.
 */
export function CollectionView() {
  const { collection, playerTotal } = useCapture();

  // Index exhibits by id for O(1) lookups while rendering the list.
  const exhibitsById = new Map<string, Exhibit>(
    exhibits.map((exhibit) => [exhibit.id, exhibit]),
  );

  return (
    <section className="collection-view" style={containerStyle}>
      <header className="collection-view__header" style={headerStyle}>
        <h2 className="collection-view__title" style={titleStyle}>
          My Collection
        </h2>
        {/* Req 7.3: Player_Total shown prominently, derived from the collection. */}
        <span
          className="collection-view__points"
          style={pointsStyle}
          aria-label={`Points: ${playerTotal}`}
        >
          Points: {playerTotal}
        </span>
      </header>

      {collection.length === 0 ? (
        <p className="collection-view__empty" style={emptyStyle}>
          No animals collected yet
        </p>
      ) : (
        <ul className="collection-view__list" style={listStyle}>
          {collection.map((record, index) => {
            const exhibit = exhibitsById.get(record.exhibitId);
            // Graceful degradation: unknown exhibitId falls back to the raw id
            // and the badge is skipped.
            const displayName = exhibit ? exhibit.name : record.exhibitId;
            const capturedAt = new Date(record.timestamp).toLocaleString();

            return (
              <li
                // exhibitId can repeat across records; combine with the index
                // and timestamp for a stable, unique key.
                key={`${record.exhibitId}-${record.timestamp}-${index}`}
                className="collection-view__item"
                style={itemStyle}
              >
                <div
                  className="collection-view__item-header"
                  style={itemHeaderStyle}
                >
                  <h3 className="collection-view__item-name" style={nameStyle}>
                    {displayName}
                  </h3>
                  {exhibit ? <IUCNBadge status={exhibit.iucnStatus} /> : null}
                </div>
                <span className="collection-view__item-method" style={metaStyle}>
                  {RECOGNITION_LABEL[record.recognizedVia]}
                </span>
                <span
                  className="collection-view__item-timestamp"
                  style={metaStyle}
                >
                  {capturedAt}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default CollectionView;
