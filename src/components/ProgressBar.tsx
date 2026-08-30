// src/components/ProgressBar.tsx
// ProgressBar: the persistent questline progress indicator (Phase 5). Rendered
// in the App shell above the tabs so it stays visible regardless of the active
// tab (Req 1.1). It consumes useQuestline() and never recomputes points — the
// reactive playerTotal from Phase 4 flows through the provider, so the bar
// updates without a page reload as new animals are collected (Req 1.2).
//
// The fill width is driven by the clamped Progress_Ratio (0..100) computed by
// the provider (Req 1.3, 1.4). Tailwind is NOT installed, so styling uses
// inline styles: a track div with a fill div whose width is the percentage.
//
// Requirements: 1.1, 1.2, 1.3, 1.4

import type { CSSProperties } from 'react';

import { useQuestline } from '../context/QuestlineContext';
import { colors, radius, gradients } from '../theme';

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
  padding: '0.6rem 0.9rem',
};

const labelRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  fontSize: '0.8125rem',
  fontWeight: 700,
  lineHeight: 1.2,
  color: colors.forestGreen,
};

const trackStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '0.65rem',
  borderRadius: radius.pill,
  backgroundColor: colors.leafTint,
  border: `1px solid ${colors.sandDark}`,
  overflow: 'hidden',
};

const fillStyle = (widthPercent: number): CSSProperties => ({
  height: '100%',
  width: `${widthPercent}%`,
  borderRadius: radius.pill,
  background: gradients.fill,
  transition: 'width 0.3s ease',
});

/**
 * A labeled, accessible progress bar for the questline. The visible fill width
 * tracks the clamped Progress_Ratio and the "{playerTotal} / {total}" text
 * shows the raw points against the goal.
 */
export function ProgressBar() {
  const { playerTotal, totalPointsToComplete, progressRatio } = useQuestline();

  return (
    <div className="questline-progress-bar" style={containerStyle}>
      <div style={labelRowStyle}>
        <span>
          <span aria-hidden="true" style={{ marginRight: '0.35rem' }}>
            🌿
          </span>
          Questline progress
        </span>
        <span>
          {playerTotal} / {totalPointsToComplete}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Questline progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressRatio)}
        style={trackStyle}
      >
        <div style={fillStyle(progressRatio)} />
      </div>
    </div>
  );
}

export default ProgressBar;
