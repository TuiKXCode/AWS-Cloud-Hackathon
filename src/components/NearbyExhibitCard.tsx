// src/components/NearbyExhibitCard.tsx
// NearbyExhibitCard: displays contextual information about the exhibit nearest
// to the visitor's current position. Part of the
// location-aware-exhibit-discovery feature.
//
// Responsibilities:
//  - Consume `nearestExhibit` from the LocationContext (Req 3.1, 3.3).
//  - Render the exhibit name, IUCN badge, fun fact, and feeding times (Req 3.1).
//  - Colour-code the IUCN badge via the shared IUCNBadge component (Req 3.2).
//  - Show a "Feeding times unavailable" placeholder when feeding times are
//    missing/empty, while still rendering the remaining fields (Req 3.5).
//  - Show a "No exhibit nearby" fallback state when there is no exhibit within
//    the reasonable radius, i.e. `nearestExhibit` is null (Req 3.4).

import type { CSSProperties } from 'react';

import { useLocationContext } from '../context/LocationContext';
import { IUCNBadge } from './IUCNBadge';
import { colors, radius, shadow, space, gradients } from '../theme';

const cardStyle: CSSProperties = {
  backgroundColor: colors.cream,
  borderRadius: radius.lg,
  boxShadow: shadow.card,
  border: `1px solid ${colors.sandDark}`,
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  background: gradients.forest,
  color: colors.white,
  padding: `${space.md}px ${space.lg}px`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.md,
};

/**
 * The animal photo, as an avatar in the header beside the name. Sitting in the header row
 * rather than floating over it costs no vertical height — which matters, because this card
 * is the first thing on the screen on a phone. Circular to match how the same photo appears
 * as the animal's face in the game.
 */
const photoStyle: CSSProperties = {
  flexShrink: 0,
  width: 52,
  height: 52,
  objectFit: 'cover',
  borderRadius: '50%',
  border: `2px solid rgba(255, 255, 255, 0.85)`,
  backgroundColor: colors.leafTint,
};

/** Groups the photo and the name so the badge stays pushed to the far end. */
const headerMainStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space.md,
  minWidth: 0,
};

const nameStyle: CSSProperties = {
  margin: 0,
  fontSize: '1.25rem',
  fontWeight: 800,
  color: colors.white,
};

const bodyStyle: CSSProperties = {
  padding: `${space.lg}px`,
  display: 'flex',
  flexDirection: 'column',
  gap: space.md,
};

const funFactStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.95rem',
  lineHeight: 1.5,
  color: colors.textDark,
};

const feedingTitleStyle: CSSProperties = {
  margin: `0 0 ${space.xs}px`,
  fontSize: '0.8125rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: colors.textMuted,
};

const feedingListStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexWrap: 'wrap',
  gap: space.sm,
};

const feedingItemStyle: CSSProperties = {
  backgroundColor: colors.leafTint,
  color: colors.forestGreen,
  borderRadius: radius.pill,
  padding: '0.2rem 0.7rem',
  fontSize: '0.8125rem',
  fontWeight: 600,
};

const feedingPlaceholderStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.875rem',
  fontStyle: 'italic',
  color: colors.textMuted,
};

const emptyCardStyle: CSSProperties = {
  backgroundColor: colors.cream,
  borderRadius: radius.lg,
  boxShadow: shadow.soft,
  border: `1px dashed ${colors.sandDark}`,
  padding: `${space.xxl}px ${space.lg}px`,
  textAlign: 'center',
};

const emptyMessageStyle: CSSProperties = {
  margin: 0,
  fontSize: '1rem',
  fontWeight: 600,
  color: colors.textMuted,
};

/**
 * Renders the Nearby Exhibit Card. Consumes the LocationContext internally, so
 * it takes no props. Must be rendered within a LocationProvider.
 */
export function NearbyExhibitCard() {
  const { nearestExhibit } = useLocationContext();

  // Req 3.4: no exhibit within the reasonable radius -> explicit fallback state
  // rather than an empty or broken card.
  if (nearestExhibit === null) {
    return (
      <section
        className="nearby-exhibit-card nearby-exhibit-card--empty"
        style={emptyCardStyle}
      >
        <p
          className="nearby-exhibit-card__empty-message"
          style={emptyMessageStyle}
        >
          No exhibit nearby
        </p>
      </section>
    );
  }

  const { exhibit } = nearestExhibit;
  const hasFeedingTimes =
    Array.isArray(exhibit.feedingTimes) && exhibit.feedingTimes.length > 0;

  return (
    <section className="nearby-exhibit-card" style={cardStyle}>
      <header className="nearby-exhibit-card__header" style={headerStyle}>
        <div style={headerMainStyle}>
          {/* A photograph of the animal, so the card shows what the visitor is looking
              at rather than describing it in words alone. Rendered only when the exhibit
              has one; the header is unchanged for any exhibit that does not. Decorative —
              the name beside it is the heading — so the alt text stays empty. */}
          {exhibit.spriteHeadAsset ? (
            <img
              className="nearby-exhibit-card__photo"
              src={exhibit.spriteHeadAsset}
              alt=""
              width={52}
              height={52}
              loading="lazy"
              style={photoStyle}
            />
          ) : null}
          <h2 className="nearby-exhibit-card__name" style={nameStyle}>
            {exhibit.name}
          </h2>
        </div>
        {/* Req 3.2: colour-coded conservation status badge. */}
        <IUCNBadge status={exhibit.iucnStatus} />
      </header>

      <div style={bodyStyle}>
        <p className="nearby-exhibit-card__fun-fact" style={funFactStyle}>
          {exhibit.funFact}
        </p>

        <div className="nearby-exhibit-card__feeding-times">
          <h3
            className="nearby-exhibit-card__feeding-times-title"
            style={feedingTitleStyle}
          >
            Feeding times
          </h3>
          {hasFeedingTimes ? (
            <ul
              className="nearby-exhibit-card__feeding-times-list"
              style={feedingListStyle}
            >
              {exhibit.feedingTimes.map((time) => (
                <li
                  key={time}
                  className="nearby-exhibit-card__feeding-time"
                  style={feedingItemStyle}
                >
                  {time}
                </li>
              ))}
            </ul>
          ) : (
            // Req 3.5: placeholder when feeding times are unavailable.
            <p
              className="nearby-exhibit-card__feeding-times-placeholder"
              style={feedingPlaceholderStyle}
            >
              Feeding times unavailable
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default NearbyExhibitCard;
