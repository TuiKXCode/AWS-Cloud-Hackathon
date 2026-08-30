// src/components/FacilitiesTab.tsx
// FacilitiesTab: lists all facilities sorted by ascending Haversine distance
// from the visitor's current position. Part of the
// location-aware-exhibit-discovery feature.
//
// Requirements:
//  - 4.1: When opened, display all facilities sorted by ascending distance
//    from the current position. Sorting is performed upstream by the Location
//    Engine (computeFacilityDistances) and exposed as `sortedFacilities`.
//  - 4.2: Each entry shows name, type, distance rounded to the nearest whole
//    metre, and a landmark-relative direction string
//    (e.g., "45m toward Giant Panda Enclosure").
//  - 4.3: When the current position changes, the list re-sorts and distances
//    update. This is automatic: the component subscribes to context state,
//    which is recomputed on position change.
//  - 4.4: When the position is unavailable, show a "location required" message
//    and do not display distances or the sorted list.

import { useState, type CSSProperties } from 'react';

import { useLocationContext } from '../context/LocationContext';
import type { FacilityType, FacilityWithDistance } from '../types';
import { colors, radius, shadow, space, font } from '../theme';

/**
 * Human-readable labels for each facility type. Falls back to the raw type
 * string if an unexpected value is encountered.
 */
const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  restroom: 'Restroom',
  nursing: 'Nursing Room',
  accessible: 'Accessible Facility',
  'water-refill': 'Water Refill Station',
};

function formatType(type: string): string {
  return FACILITY_TYPE_LABELS[type as FacilityType] ?? type;
}

/**
 * Build the landmark-relative direction string for a facility, rounding the
 * distance to the nearest whole metre (Req 4.2).
 * Example: "45m toward Giant Panda Enclosure".
 */
function formatDirection(entry: FacilityWithDistance): string {
  const rounded = Math.round(entry.distance);
  return `${rounded}m toward ${entry.facility.nearestLandmark}`;
}

const sectionStyle: CSSProperties = {
  fontFamily: font.family,
  color: colors.textDark,
  padding: space.lg,
  maxWidth: 640,
  margin: '0 auto',
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

const typePillStyle: CSSProperties = {
  display: 'inline-block',
  padding: `2px ${space.sm}px`,
  borderRadius: radius.pill,
  backgroundColor: colors.limeTint,
  color: colors.green,
  fontSize: '0.75rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
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

const directionStyle: CSSProperties = {
  flexBasis: '100%',
  fontSize: '0.85rem',
  color: colors.textMuted,
};

export function FacilitiesTab() {
  const { sortedFacilities, status, currentPosition } = useLocationContext();

  // Purely visual hover state for the facility cards (styling only).
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Req 4.4: position unavailable -> show a "location required" message and do
  // not show distances or a sorted list.
  if (status === 'unavailable' || currentPosition === null) {
    return (
      <section className="facilities-tab" aria-label="Facilities" style={sectionStyle}>
        <p className="facilities-tab__location-required" role="status" style={messageStyle}>
          Location required to show nearby facilities.
        </p>
      </section>
    );
  }

  // Edge case: position is available but there are no facilities to show.
  if (sortedFacilities.length === 0) {
    return (
      <section className="facilities-tab" aria-label="Facilities" style={sectionStyle}>
        <p className="facilities-tab__empty" style={messageStyle}>No facilities available.</p>
      </section>
    );
  }

  return (
    <section className="facilities-tab" aria-label="Facilities" style={sectionStyle}>
      <ul className="facilities-tab__list" style={listStyle}>
        {sortedFacilities.map((entry) => {
          const roundedDistance = Math.round(entry.distance);
          const hovered = hoveredId === entry.facility.id;
          return (
            <li
              key={entry.facility.id}
              className="facilities-tab__item"
              style={
                hovered
                  ? { ...itemStyle, transform: 'translateY(-2px)', boxShadow: shadow.raised }
                  : itemStyle
              }
              onMouseEnter={() => setHoveredId(entry.facility.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span className="facilities-tab__name" style={nameStyle}>
                {entry.facility.name}
              </span>
              <span className="facilities-tab__type" style={typePillStyle}>
                {formatType(entry.facility.type)}
              </span>
              <span className="facilities-tab__distance" style={distancePillStyle}>
                {roundedDistance}m
              </span>
              <span className="facilities-tab__direction" style={directionStyle}>
                {formatDirection(entry)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default FacilitiesTab;
