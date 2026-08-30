// src/components/DemoLocationSimulator.tsx
// DemoLocationSimulator: a persistent, sticky dropdown that lets a developer or
// demo presenter override the visitor's position with one of the predefined
// demoLocations entries. Part of the location-aware-exhibit-discovery feature.
//
// Responsibilities:
//  - Render a sticky <select> that stays visible regardless of scroll/view
//    (Req 2.1).
//  - List every entry from demoLocations by its label (Req 2.2).
//  - Show a "Select a location" placeholder while nothing is selected; in that
//    state the app relies on real GPS (Req 2.6).
//  - On selection, override the position with the entry's exact lat/lng via
//    setSimulatedPosition from the location context (Req 2.3, 2.4, 2.5).
//  - Persist the selection across view/tab navigation. The selected index is
//    kept in local state, but because the position lives in the context the
//    override survives re-renders and navigation (Req 2.7).

import { useState, type ChangeEvent, type CSSProperties } from 'react';

import { useLocationContext } from '../context/LocationContext';

// mandai.js is a plain JS data module (allowJs). Cast to the typed shape.
import { demoLocations as rawDemoLocations } from '../data/mandai.js';
import type { DemoLocation } from '../types';
import { colors, radius, shadow, space, font } from '../theme';

const demoLocations = rawDemoLocations as DemoLocation[];

/** Sentinel value for the unselected placeholder option. */
const PLACEHOLDER_VALUE = '';

const containerStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 1000,
  backgroundColor: colors.limeTint,
  borderBottom: `1px solid ${colors.sandDark}`,
  boxShadow: shadow.soft,
  padding: `${space.sm}px ${space.lg}px`,
};

const labelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space.sm,
  fontFamily: font.family,
  fontSize: '0.8125rem',
  fontWeight: 700,
  color: colors.forestGreen,
};

const selectStyle: CSSProperties = {
  flex: '1 1 auto',
  fontFamily: font.family,
  fontSize: '0.875rem',
  color: colors.textDark,
  backgroundColor: colors.white,
  border: `1px solid ${colors.leaf}`,
  borderRadius: radius.md,
  padding: '0.35rem 0.6rem',
  cursor: 'pointer',
};

/**
 * Sticky dropdown for simulating the visitor's location. Consumes the location
 * context internally; no props required.
 */
export function DemoLocationSimulator() {
  const { setSimulatedPosition } = useLocationContext();

  // Track the selected index so the dropdown reflects the current choice across
  // re-renders and navigation (Req 2.7). Empty string means "not yet selected".
  const [selectedIndex, setSelectedIndex] = useState<string>(PLACEHOLDER_VALUE);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedIndex(value);

    if (value === PLACEHOLDER_VALUE) {
      // Placeholder re-selected: nothing to override. Real GPS keeps driving
      // the views (Req 2.6).
      return;
    }

    const index = Number(value);
    const entry = demoLocations[index];
    if (!entry) {
      return;
    }

    // Override the position with the entry's exact coordinates (Req 2.4).
    setSimulatedPosition({ lat: entry.lat, lng: entry.lng });
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>
        <span aria-hidden="true">📍</span>
        <span>Demo location</span>
        <select
          aria-label="Demo location simulator"
          value={selectedIndex}
          onChange={handleChange}
          style={selectStyle}
        >
          <option value={PLACEHOLDER_VALUE}>Select a location</option>
          {demoLocations.map((location, index) => (
            <option key={`${location.label}-${index}`} value={String(index)}>
              {location.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default DemoLocationSimulator;
