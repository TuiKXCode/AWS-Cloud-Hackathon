// src/components/__tests__/DemoLocationSimulator.property.test.tsx
// Feature: location-aware-exhibit-discovery, Property 6: Simulator position
// override exactness.
//
// Property 6: For any demo location entry with coordinates (lat, lng), when
// that entry is selected in the Demo Location Simulator, the resulting
// currentPosition SHALL have lat and lng values exactly equal to the selected
// entry's lat and lng.
//
// Validates: Requirements 2.4

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DemoLocationSimulator } from '../DemoLocationSimulator';
import {
  LocationProvider,
  useLocationContext,
} from '../../context/LocationContext';

// The property concerns the exactness of the coordinate override, so we drive
// the component with generated demo locations rather than the static dataset.
// We mock the data module the *component* (and context) import so the dropdown
// lists the generated entries, then read back currentPosition from the same
// context. vi.hoisted lets the mutable holder be shared with the hoisted mock
// factory without tripping the "cannot access before initialization" error.
const { mockDemoLocations } = vi.hoisted(() => ({
  mockDemoLocations: [] as { label: string; lat: number; lng: number }[],
}));

vi.mock('../../data/mandaiData.js', () => ({
  // The component only reads demoLocations; the context also reads exhibits and
  // facilities, so provide empty arrays for those to keep derivations valid.
  demoLocations: mockDemoLocations,
  exhibits: [],
  facilities: [],
}));

/**
 * Test probe that surfaces the context's currentPosition into the DOM so the
 * test can assert the exact coordinates after a selection.
 */
function PositionProbe() {
  const { currentPosition, source } = useLocationContext();
  return (
    <div>
      <span data-testid="source">{source}</span>
      <span data-testid="lat">
        {currentPosition ? String(currentPosition.lat) : 'none'}
      </span>
      <span data-testid="lng">
        {currentPosition ? String(currentPosition.lng) : 'none'}
      </span>
    </div>
  );
}

afterEach(() => {
  cleanup();
  mockDemoLocations.length = 0;
});

describe('DemoLocationSimulator — Property 6: simulator position override exactness', () => {
  it('sets currentPosition to exactly the selected demo location coordinates', () => {
    fc.assert(
      fc.property(
        // A non-empty list of demo locations with valid coordinates, plus an
        // index selecting one of them.
        fc
          .array(
            fc.record({
              label: fc.string(),
              lat: fc.double({ min: -90, max: 90, noNaN: true }),
              lng: fc.double({ min: -180, max: 180, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 },
          )
          .chain((locations) =>
            fc.record({
              locations: fc.constant(locations),
              index: fc.integer({ min: 0, max: locations.length - 1 }),
            }),
          ),
        ({ locations, index }) => {
          // Swap in the generated dataset for this iteration.
          mockDemoLocations.length = 0;
          mockDemoLocations.push(...locations);

          render(
            <LocationProvider>
              <DemoLocationSimulator />
              <PositionProbe />
            </LocationProvider>,
          );

          const select = screen.getByLabelText(
            'Demo location simulator',
          ) as HTMLSelectElement;

          // Selecting the entry means choosing its array index as the value.
          fireEvent.change(select, { target: { value: String(index) } });

          const expected = locations[index];
          const lat = Number(screen.getByTestId('lat').textContent);
          const lng = Number(screen.getByTestId('lng').textContent);

          expect(screen.getByTestId('source').textContent).toBe('simulator');
          expect(lat).toBe(expected.lat);
          expect(lng).toBe(expected.lng);

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});
