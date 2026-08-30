// src/components/DiningTab.tsx
// DiningTab: lists dining venues filtered by tag (AND logic) and sorted by
// ascending Haversine distance from the visitor's current position. Part of
// the food-web-dining feature.
//
// Requirements:
//  - 3.1 / 4.1: When opened with a position available, display all venues
//    sorted by ascending distance, each showing name, distance (rounded whole
//    metres), operating hours, and tags.
//  - 3.2 / 5.4: Selecting one or more Filter_Chips shows only venues whose tags
//    include ALL selected filters (AND logic — performed by the engine).
//  - 3.3: When no venues match the active filters, show an explicit empty-state
//    message (not a blank list).
//  - 3.4: Provide Filter_Chips for Halal, Vegetarian, Air-Conditioned, and
//    Kid-Friendly.
//  - 3.5 / 5.3: Deselecting all chips shows the full unfiltered list.
//  - 3.6 / 4.3: When the position changes, the list re-sorts and distances
//    update — automatic, since the component subscribes to context state and
//    recomputes on every render.
//  - 3.7 / 4.2: When the position is unavailable, show a "location required"
//    message and do not display distance or sorting.
//  - 5.1 / 5.2: Tapping a chip adds/removes its tag from the active filter set.

import { useState, type CSSProperties } from 'react';

import { useLocationContext } from '../context/LocationContext';
import { filterAndSort, type DiningTag } from '../engine/diningFilterEngine';
import { FilterChip } from './FilterChip';
import { colors, radius, shadow, space, font } from '../theme';

// mandai.js is a plain JS data module (allowJs). Cast to the typed shape,
// mirroring the pattern used by the other consumer components.
import { dining as rawDining } from '../data/mandai.js';
import type { Dining } from '../types';

const dining = rawDining as Dining[];

/**
 * The four filter chips exposed on the Dining_Tab (Requirement 3.4). Order is
 * fixed so the UI is deterministic.
 */
const FILTER_DEFS: { tag: DiningTag; label: string }[] = [
  { tag: 'halal', label: 'Halal' },
  { tag: 'vegetarian', label: 'Vegetarian' },
  { tag: 'air-conditioned', label: 'Air-Conditioned' },
  { tag: 'kid-friendly', label: 'Kid-Friendly' },
];

const sectionStyle: CSSProperties = {
  fontFamily: font.family,
  color: colors.textDark,
  padding: space.lg,
  maxWidth: 640,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: space.lg,
};

const chipRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: space.sm,
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
  padding: space.lg,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: space.sm,
  transition: 'transform 140ms ease, box-shadow 140ms ease',
};

const nameStyle: CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 700,
  color: colors.forestGreen,
  flex: '1 1 auto',
};

const distancePillStyle: CSSProperties = {
  display: 'inline-block',
  padding: `${space.xs}px ${space.md}px`,
  borderRadius: radius.pill,
  backgroundColor: colors.leafTint,
  color: colors.forestGreen,
  fontSize: '0.8125rem',
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

const hoursStyle: CSSProperties = {
  flexBasis: '100%',
  fontSize: '0.85rem',
  color: colors.textMuted,
};

const tagsStyle: CSSProperties = {
  flexBasis: '100%',
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexWrap: 'wrap',
  gap: space.xs,
};

const tagStyle: CSSProperties = {
  padding: `2px ${space.sm}px`,
  borderRadius: radius.pill,
  backgroundColor: colors.limeTint,
  color: colors.green,
  fontSize: '0.75rem',
  fontWeight: 600,
};

const messageStyle: CSSProperties = {
  backgroundColor: colors.cream,
  borderRadius: radius.md,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: colors.sandDark,
  padding: space.lg,
  color: colors.textMuted,
  textAlign: 'center',
};

export function DiningTab() {
  const { currentPosition, status } = useLocationContext();

  // Filter selection is local to the Dining_Tab (design: local component
  // state, no additional context needed).
  const [activeFilters, setActiveFilters] = useState<DiningTag[]>([]);

  // Purely visual hover state for the venue cards (styling only).
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  /**
   * Toggle a tag in/out of the active filter set (Req 5.1, 5.2). Adding a tag
   * appends it; removing drops it. Emptying the set restores the full list
   * (Req 5.3), handled downstream by the engine.
   */
  const toggleFilter = (tag: DiningTag) => {
    setActiveFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // Req 3.7 / 4.2: position unavailable -> show a message and do NOT display
  // distance or sorting. We still render the chips so the user can pre-select
  // filters, but the venue list is withheld until a position is established.
  const positionAvailable = status !== 'unavailable' && currentPosition !== null;

  // Recompute on every render; because currentPosition and activeFilters are
  // reactive, the list re-sorts/updates automatically when either changes
  // (Req 3.6, 4.3).
  const results = filterAndSort(dining, activeFilters, currentPosition);

  const chips = (
    <div className="dining-tab__filters" style={chipRowStyle} role="group" aria-label="Dining filters">
      {FILTER_DEFS.map(({ tag, label }) => (
        <FilterChip
          key={tag}
          tag={tag}
          label={label}
          selected={activeFilters.includes(tag)}
          onToggle={toggleFilter}
        />
      ))}
    </div>
  );

  if (!positionAvailable) {
    return (
      <section className="dining-tab" aria-label="Dining" style={sectionStyle}>
        {chips}
        <p className="dining-tab__location-required" role="status" style={messageStyle}>
          Location required to show nearby dining options
        </p>
      </section>
    );
  }

  return (
    <section className="dining-tab" aria-label="Dining" style={sectionStyle}>
      {chips}

      {results.length === 0 ? (
        // Req 3.3: explicit empty-state message when no venues match filters.
        <p className="dining-tab__empty" role="status" style={messageStyle}>
          No dining options match your current filters
        </p>
      ) : (
        <ul className="dining-tab__list" style={listStyle}>
          {results.map(({ venue, distance }) => {
            // Distance can be NaN when the venue is missing coordinates; guard
            // so we never render "NaNm".
            const distanceLabel = Number.isNaN(distance)
              ? 'Distance unavailable'
              : `${distance}m`;
            const hovered = hoveredId === venue.id;
            return (
              <li
                key={venue.id}
                className="dining-tab__item"
                style={
                  hovered
                    ? { ...itemStyle, transform: 'translateY(-2px)', boxShadow: shadow.raised }
                    : itemStyle
                }
                onMouseEnter={() => setHoveredId(venue.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <span className="dining-tab__name" style={nameStyle}>
                  {venue.name}
                </span>
                <span className="dining-tab__distance" style={distancePillStyle}>
                  {distanceLabel}
                </span>
                <span className="dining-tab__hours" style={hoursStyle}>
                  {venue.hours}
                </span>
                <ul className="dining-tab__tags" style={tagsStyle}>
                  {venue.tags.map((tag) => (
                    <li key={tag} className="dining-tab__tag" style={tagStyle}>
                      {tag}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default DiningTab;
