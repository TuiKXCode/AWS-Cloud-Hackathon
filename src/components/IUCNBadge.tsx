// src/components/IUCNBadge.tsx
// Presentational component for the IUCN conservation status indicator.
// Color-codes the badge per Requirement 3.2 and the design's color mapping.

import type { CSSProperties } from 'react';
import type { IUCNStatus } from '../types';

export interface IUCNBadgeProps {
  status: IUCNStatus;
}

/**
 * Background color per conservation status (design "Color mapping" table).
 */
const STATUS_BACKGROUND: Record<IUCNStatus, string> = {
  'Least Concern': '#4caf50', // green
  Vulnerable: '#ffeb3b', // yellow
  Endangered: '#ff9800', // orange
  'Critically Endangered': '#f44336', // red
};

/**
 * Foreground (text) color chosen for adequate contrast against each
 * background. Yellow is light, so it uses dark text; the rest use white.
 */
const STATUS_FOREGROUND: Record<IUCNStatus, string> = {
  'Least Concern': '#ffffff',
  Vulnerable: '#212121',
  Endangered: '#ffffff',
  'Critically Endangered': '#ffffff',
};

/**
 * A small color-coded tag showing an exhibit's IUCN conservation status.
 * The status text is rendered visibly and also exposed to assistive
 * technology via an accessible label.
 */
export function IUCNBadge({ status }: IUCNBadgeProps) {
  const style: CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: 1.4,
    backgroundColor: STATUS_BACKGROUND[status],
    color: STATUS_FOREGROUND[status],
    whiteSpace: 'nowrap',
  };

  return (
    <span
      className="iucn-badge"
      style={style}
      role="status"
      aria-label={`IUCN conservation status: ${status}`}
    >
      {status}
    </span>
  );
}

export default IUCNBadge;
