// src/components/EcosystemCollapseToggle.tsx
// EcosystemCollapseToggle: a toggle control that activates the ecosystem-
// collapse simulation for the currently selected trophic node.
// Part of the food-web-dining feature (Phase 2).
//
// Responsibilities:
//  - Render a toggle button labeled "Simulate Ecosystem Collapse" (Req 2.1).
//  - Be disabled when no node is selected (`selectedNodeLabel` is null) so the
//    simulation cannot be activated without a target.
//  - Reflect active state via `aria-pressed` for accessibility (Req 2.5).
//  - Invoke `onToggle` to let the parent flip the collapse state on/off
//    (Req 2.1, 2.3).

import type { CSSProperties } from 'react';
import { colors, radius, space, font } from '../theme';

const baseButtonStyle: CSSProperties = {
  fontFamily: font.family,
  fontSize: '0.9rem',
  fontWeight: 700,
  padding: `${space.sm}px ${space.lg}px`,
  borderRadius: radius.pill,
  borderWidth: '1px',
  borderStyle: 'solid',
  cursor: 'pointer',
  transition: 'background-color 160ms ease, color 160ms ease, opacity 160ms ease',
};

const activeButtonStyle: CSSProperties = {
  ...baseButtonStyle,
  backgroundColor: colors.bark,
  color: colors.white,
  borderColor: colors.bark,
};

const inactiveButtonStyle: CSSProperties = {
  ...baseButtonStyle,
  backgroundColor: colors.leafTint,
  color: colors.forestGreen,
  borderColor: colors.green,
};

const disabledButtonStyle: CSSProperties = {
  ...baseButtonStyle,
  backgroundColor: colors.sandDark,
  color: colors.textMuted,
  borderColor: colors.sandDark,
  cursor: 'not-allowed',
  opacity: 0.7,
};

export interface EcosystemCollapseToggleProps {
  /** Whether the collapse simulation is currently active. */
  active: boolean;
  /** Label of the selected node, or null when nothing is selected. */
  selectedNodeLabel: string | null;
  /** Called when the toggle is activated. */
  onToggle: () => void;
}

/**
 * Render the "Simulate Ecosystem Collapse" toggle.
 */
export function EcosystemCollapseToggle({
  active,
  selectedNodeLabel,
  onToggle,
}: EcosystemCollapseToggleProps) {
  const disabled = selectedNodeLabel === null;

  const buttonStyle = disabled
    ? disabledButtonStyle
    : active
      ? activeButtonStyle
      : inactiveButtonStyle;

  return (
    <button
      type="button"
      className={`ecosystem-collapse-toggle${
        active ? ' ecosystem-collapse-toggle--active' : ''
      }`}
      aria-pressed={active}
      disabled={disabled}
      onClick={onToggle}
      style={buttonStyle}
    >
      Simulate Ecosystem Collapse
      {selectedNodeLabel !== null ? (
        <span className="ecosystem-collapse-toggle__target">
          {' '}
          — {selectedNodeLabel}
        </span>
      ) : null}
    </button>
  );
}

export default EcosystemCollapseToggle;
