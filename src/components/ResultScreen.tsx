// src/components/ResultScreen.tsx
// ResultScreen: the post-tag result surface for the checkpoint-photo-capture
// feature (Phase 4). Shows the tagged exhibit's fun fact, diet, and IUCN
// status, plus points awarded on a first tag. The displayed fields are
// identical whether the tag came from the classifier or the location fallback
// (Req 6.1, 6.3); only subtle status notes differ.
//
// Notes surfaced conditionally:
//  - "recognition unavailable — tagged by location" when recognizedVia is the
//    location fallback (Req 4.4).
//  - "no points awarded" when this is a first tag but the exhibit's points are
//    not awardable (pointsAwarded === 0) (Req 5.4, 6.2).
//  - "saving did not complete" when the localStorage write failed (Req 7.2).
//
// Uses inline styles per project convention (Tailwind is not installed).

import { useState, type CSSProperties } from 'react';

import { IUCNBadge } from './IUCNBadge';
import type { CaptureResult } from '../context/CaptureContext';
import { colors, radius, shadow, space, font, gradients } from '../theme';

export interface ResultScreenProps {
  result: CaptureResult;
  onDismiss: () => void;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  padding: '16px',
  zIndex: 1000,
};

const cardStyle: CSSProperties = {
  backgroundColor: colors.cream,
  borderRadius: radius.lg,
  boxShadow: shadow.raised,
  maxWidth: '420px',
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: 0,
  boxSizing: 'border-box',
  fontFamily: font.family,
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space.md,
  padding: `${space.lg}px ${space.xl}px`,
  background: gradients.forest,
};

const bodyStyle: CSSProperties = {
  padding: space.xl,
};

const nameStyle: CSSProperties = {
  margin: 0,
  fontSize: '1.25rem',
  fontWeight: 700,
  color: colors.white,
};

const sectionLabelStyle: CSSProperties = {
  margin: '0 0 4px',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: colors.textMuted,
};

const sectionBodyStyle: CSSProperties = {
  margin: `0 0 ${space.lg}px`,
  fontSize: '0.95rem',
  lineHeight: 1.5,
  color: colors.textDark,
};

const pointsBannerStyle: CSSProperties = {
  backgroundColor: colors.leafTint,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: colors.leaf,
  borderRadius: radius.md,
  padding: `${space.md}px`,
  margin: `0 0 ${space.md}px`,
  fontSize: '0.95rem',
  fontWeight: 700,
  color: colors.forestGreen,
};

const noPointsBannerStyle: CSSProperties = {
  backgroundColor: colors.sand,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: colors.sandDark,
  borderRadius: radius.md,
  padding: `${space.md}px`,
  margin: `0 0 ${space.md}px`,
  fontSize: '0.9rem',
  color: colors.textMuted,
};

const subtleNoteStyle: CSSProperties = {
  margin: `0 0 ${space.sm}px`,
  fontSize: '0.8rem',
  color: colors.textMuted,
  fontStyle: 'italic',
};

const warningNoteStyle: CSSProperties = {
  margin: `0 0 ${space.sm}px`,
  fontSize: '0.8rem',
  color: '#c62828',
};

const dismissButtonStyle: CSSProperties = {
  marginTop: space.sm,
  width: '100%',
  padding: `${space.md}px ${space.lg}px`,
  border: 'none',
  borderRadius: radius.md,
  backgroundColor: colors.forestGreen,
  color: colors.white,
  fontSize: '1rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background-color 160ms ease',
};

/**
 * Renders the result of a successful capture tag. Field content (fun fact,
 * diet, IUCN status) is identical regardless of how the exhibit was
 * recognized; only the small status notes vary.
 */
export function ResultScreen({ result, onDismiss }: ResultScreenProps) {
  const { exhibit, recognizedVia, pointsAwarded, firstTag, saveOk } = result;

  const awardedPoints = firstTag && pointsAwarded > 0;
  const firstTagButNoPoints = firstTag && pointsAwarded === 0;

  const [hovered, setHovered] = useState(false);

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Capture result">
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h2 style={nameStyle}>{exhibit.name}</h2>
          <IUCNBadge status={exhibit.iucnStatus} />
        </div>

        <div style={bodyStyle}>
          {/* Req 4.4: subtle note when tagged via the location fallback. */}
          {recognizedVia === 'location-fallback' && (
            <p style={subtleNoteStyle}>recognition unavailable — tagged by location</p>
          )}

          {/* Req 5.4 / 6.2: points feedback for a first tag. */}
          {awardedPoints && (
            <p style={pointsBannerStyle}>+{pointsAwarded} points</p>
          )}
          {firstTagButNoPoints && (
            <p style={noPointsBannerStyle}>No points awarded</p>
          )}

          {/* Req 6.1 / 6.3: fun fact, diet, and IUCN status shown identically. */}
          <p style={sectionLabelStyle}>Fun fact</p>
          <p style={sectionBodyStyle}>{exhibit.funFact}</p>

          <p style={sectionLabelStyle}>Diet</p>
          <p style={sectionBodyStyle}>{exhibit.diet}</p>

          <p style={sectionLabelStyle}>Conservation status</p>
          <p style={sectionBodyStyle}>
            <IUCNBadge status={exhibit.iucnStatus} />
          </p>

          {/* Req 7.2: the write failed but the record is retained in memory. */}
          {!saveOk && (
            <p style={warningNoteStyle}>Saving did not complete — your progress may not persist.</p>
          )}

          <button
            type="button"
            style={hovered ? { ...dismissButtonStyle, backgroundColor: colors.green } : dismissButtonStyle}
            onClick={onDismiss}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultScreen;
