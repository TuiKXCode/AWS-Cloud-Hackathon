// src/components/FilterChip.tsx
// FilterChip: a toggleable pill-shaped button representing a single dining tag
// filter (Halal, Vegetarian, Air-Conditioned, Kid-Friendly). Part of the
// food-web-dining feature.
//
// Requirements:
//  - 5.1: Tapping an unselected chip selects it (adds the tag). The selected
//    state is reflected visually (filled) and via aria-pressed for a11y.
//  - 5.2: Tapping a selected chip unselects it (removes the tag), reflected
//    visually (outlined) and via aria-pressed.
//
// Selection state is owned by the parent (DiningTab); this component is purely
// presentational and delegates all state changes through onToggle(tag).

import { useState, type CSSProperties } from 'react';
import type { DiningTag } from '../engine/diningFilterEngine';
import { colors, radius, space, font } from '../theme';

export interface FilterChipProps {
  /** The dining tag this chip toggles. */
  tag: DiningTag;
  /** Human-readable label shown on the chip. */
  label: string;
  /** Whether this chip is currently part of the active filter set. */
  selected: boolean;
  /** Called with the chip's tag when the user taps it. */
  onToggle: (tag: DiningTag) => void;
}

const baseStyle: CSSProperties = {
  borderRadius: radius.pill, // pill shape
  padding: `${space.sm}px ${space.lg}px`,
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 600,
  fontFamily: font.family,
  lineHeight: 1.2,
  borderWidth: '1px',
  borderStyle: 'solid',
  transition: 'background-color 160ms ease, color 160ms ease, transform 120ms ease, box-shadow 160ms ease',
};

// Filled when selected (forest green + white).
const selectedStyle: CSSProperties = {
  ...baseStyle,
  backgroundColor: colors.forestGreen,
  color: colors.white,
  borderColor: colors.forestGreen,
};

// Outlined / leaf-tint wash when unselected.
const unselectedStyle: CSSProperties = {
  ...baseStyle,
  backgroundColor: colors.leafTint,
  color: colors.green,
  borderColor: colors.green,
};

/**
 * A single toggleable dining filter chip. Renders a button with aria-pressed
 * so assistive technology can announce the toggle state.
 */
export function FilterChip({ tag, label, selected, onToggle }: FilterChipProps) {
  const [hovered, setHovered] = useState(false);

  // Subtle hover feedback only — the selected/unselected logic is unchanged.
  const style: CSSProperties = {
    ...(selected ? selectedStyle : unselectedStyle),
    ...(hovered
      ? {
          transform: 'translateY(-1px)',
          backgroundColor: selected ? colors.green : colors.limeTint,
        }
      : null),
  };

  return (
    <button
      type="button"
      className={`filter-chip${selected ? ' filter-chip--selected' : ''}`}
      aria-pressed={selected}
      style={style}
      onClick={() => onToggle(tag)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
}

export default FilterChip;
