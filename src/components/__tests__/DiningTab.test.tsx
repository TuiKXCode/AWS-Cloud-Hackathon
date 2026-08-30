// src/components/__tests__/DiningTab.test.tsx
// Feature: food-web-dining — component tests for the DiningTab.
//
// Covers:
//  - Exactly 4 FilterChip components render with the correct labels (Req 3.4).
//  - Clicking an unselected chip adds its tag and narrows the venue list
//    (Req 5.1).
//  - Clicking a selected chip removes its tag and widens the list (Req 5.2).
//  - When no venues match the active filters, an explicit empty-state message
//    is shown (Req 3.3).
//  - When the position is unavailable, a fallback message is shown and no
//    venues/distances are listed (Req 3.7, 4.2).
//
// Approach:
//  - Mock ../../data/mandai.js with controlled dining fixtures (plus empty
//    exhibits/facilities/demoLocations so the LocationProvider derivations stay
//    valid), following the vi.hoisted + vi.mock pattern used elsewhere.
//  - Control the position by stubbing navigator.geolocation:
//     * A watchPosition that reports success with a fixed fix -> position
//       available.
//     * For the unavailable case, an empty navigator with no demoLocations to
//       fall back to, forcing status 'unavailable'.

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DiningTab } from '../DiningTab';
import { LocationProvider } from '../../context/LocationContext';

// Controlled dining fixtures. Coordinates are near the Mandai reserve so
// distances are small. Venues are positioned so we can reason about ordering,
// and tags are chosen so AND-logic filtering has clear expected results.
const { mockData } = vi.hoisted(() => {
  const dining = [
    {
      id: 'ah-meng',
      name: 'Ah Meng Restaurant',
      lat: 1.4043,
      lng: 103.793,
      // Deliberately NOT kid-friendly so that no venue holds all four tags,
      // giving us a deterministic empty-state case (halal + kid-friendly).
      tags: ['halal', 'vegetarian', 'air-conditioned'],
      hours: '10:00-18:00',
      topPicks: ['a', 'b'],
    },
    {
      id: 'veg-cafe',
      name: 'Veg Cafe',
      lat: 1.405,
      lng: 103.7935,
      tags: ['vegetarian', 'air-conditioned', 'kid-friendly'],
      hours: '09:00-17:00',
      topPicks: ['c'],
    },
    {
      id: 'grill-house',
      name: 'Grill House',
      lat: 1.406,
      lng: 103.794,
      tags: ['halal'],
      hours: '11:00-20:00',
      topPicks: ['d'],
    },
  ];

  return { mockData: { dining } };
});

vi.mock('../../data/mandai.js', () => ({
  dining: mockData.dining,
  // The LocationProvider also reads these; provide empty arrays so its
  // derivations stay valid. Empty demoLocations means there is nothing to fall
  // back to, which we use to force the 'unavailable' status.
  exhibits: [],
  facilities: [],
  demoLocations: [],
}));

/** Stub navigator.geolocation so the provider acquires a fixed position. */
function stubGeolocationAt(lat: number, lng: number) {
  const watchPosition = vi.fn((success: PositionCallback) => {
    success({
      coords: {
        latitude: lat,
        longitude: lng,
        accuracy: 5,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as GeolocationPosition);
    return 1;
  });
  vi.stubGlobal('navigator', {
    geolocation: { watchPosition, clearWatch: vi.fn() },
  });
}

function renderTab() {
  return render(
    <LocationProvider>
      <DiningTab />
    </LocationProvider>,
  );
}

/** Read the ordered venue names currently rendered in the list. */
function venueNamesInOrder(): string[] {
  return Array.from(document.querySelectorAll('.dining-tab__name')).map(
    (el) => el.textContent ?? '',
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DiningTab', () => {
  it('renders exactly 4 filter chips with the correct labels (Req 3.4)', () => {
    stubGeolocationAt(1.4043, 103.793);
    renderTab();

    const group = screen.getByRole('group', { name: 'Dining filters' });
    const chips = within(group).getAllByRole('button');
    expect(chips).toHaveLength(4);
    expect(chips.map((c) => c.textContent)).toEqual([
      'Halal',
      'Vegetarian',
      'Air-Conditioned',
      'Kid-Friendly',
    ]);
  });

  it('lists all venues when no filters are active (Req 3.1)', () => {
    stubGeolocationAt(1.4043, 103.793);
    renderTab();

    // All three fixtures appear; Ah Meng is co-located with the position so it
    // sorts first.
    expect(venueNamesInOrder()).toEqual([
      'Ah Meng Restaurant',
      'Veg Cafe',
      'Grill House',
    ]);
  });

  it('clicking an unselected chip adds its tag and narrows the list (Req 5.1)', () => {
    stubGeolocationAt(1.4043, 103.793);
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: 'Vegetarian' }));

    // Only venues tagged 'vegetarian' remain (Ah Meng + Veg Cafe).
    expect(screen.getByRole('button', { name: 'Vegetarian' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(venueNamesInOrder()).toEqual(['Ah Meng Restaurant', 'Veg Cafe']);
    expect(screen.queryByText('Grill House')).not.toBeInTheDocument();
  });

  it('AND-logic: multiple chips narrow further (Req 5.4)', () => {
    stubGeolocationAt(1.4043, 103.793);
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: 'Vegetarian' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kid-Friendly' }));

    // Only Veg Cafe has both 'vegetarian' AND 'kid-friendly'.
    expect(venueNamesInOrder()).toEqual(['Veg Cafe']);
  });

  it('clicking a selected chip removes its tag and widens the list (Req 5.2)', () => {
    stubGeolocationAt(1.4043, 103.793);
    renderTab();

    const vegChip = screen.getByRole('button', { name: 'Vegetarian' });

    // Select then deselect.
    fireEvent.click(vegChip);
    expect(venueNamesInOrder()).toEqual(['Ah Meng Restaurant', 'Veg Cafe']);

    fireEvent.click(vegChip);
    expect(vegChip).toHaveAttribute('aria-pressed', 'false');
    // Full list restored (Req 5.2 / 5.3).
    expect(venueNamesInOrder()).toEqual([
      'Ah Meng Restaurant',
      'Veg Cafe',
      'Grill House',
    ]);
  });

  it('shows an empty-state message when no venues match the filters (Req 3.3)', () => {
    stubGeolocationAt(1.4043, 103.793);
    renderTab();

    // No fixture is both 'halal' AND 'kid-friendly': Ah Meng lacks
    // kid-friendly, Veg Cafe lacks halal, Grill House lacks kid-friendly.
    fireEvent.click(screen.getByRole('button', { name: 'Halal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kid-Friendly' }));

    expect(
      screen.getByText('No dining options match your current filters'),
    ).toBeInTheDocument();
    expect(venueNamesInOrder()).toEqual([]);
  });

  it('shows the location-required message when position is unavailable (Req 3.7, 4.2)', () => {
    // No geolocation and empty demoLocations -> provider cannot establish a
    // position -> status becomes 'unavailable'.
    vi.stubGlobal('navigator', {});
    renderTab();

    expect(
      screen.getByText('Location required to show nearby dining options'),
    ).toBeInTheDocument();
    // No venue list / distances shown.
    expect(venueNamesInOrder()).toEqual([]);
  });
});
