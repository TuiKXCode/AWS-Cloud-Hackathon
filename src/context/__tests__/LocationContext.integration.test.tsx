// src/context/__tests__/LocationContext.integration.test.tsx
// Feature: location-aware-exhibit-discovery — integration tests (Task 9.2).
//
// These tests exercise the full flow through the real LocationProvider and the
// real consumer components (DemoLocationSimulator, NearbyExhibitCard,
// FacilitiesTab) rather than any single unit in isolation:
//
//  1. Select demo location -> nearest exhibit card updates -> facilities
//     re-sort.               (Requirements 2.3, 2.5, 3.3, 4.3)
//  2. Geolocation denied -> fallback state -> simulator reflects the first
//     entry -> card displays. (Requirements 5.1, 5.2, 5.3, 5.4)
//  3. Position changes by >5m -> recomputation -> new nearest exhibit shown.
//                             (Requirements 1.4, 3.3)
//
// Approach:
//  - Mock ../../data/mandai.js via vi.hoisted + vi.mock with controlled,
//    deterministic fixtures. Demo-location coordinates coincide with exhibit
//    coordinates so the nearest exhibit is unambiguous and well within the
//    500m radius. Facility coordinates are chosen so their sort order flips
//    between the two demo positions, proving the re-sort behaviour.
//  - Mock navigator.geolocation via vi.stubGlobal for the GPS / fallback tests.
//  - Render the real components under a real LocationProvider using RTL.

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocationProvider, useLocationContext } from '../LocationContext';
import { DemoLocationSimulator } from '../../components/DemoLocationSimulator';
import { NearbyExhibitCard } from '../../components/NearbyExhibitCard';
import { FacilitiesTab } from '../../components/FacilitiesTab';

// ---------------------------------------------------------------------------
// Controlled fixtures. Coordinates are near the real Mandai reserve so the
// Haversine distances are small and realistic.
//
// Two demo locations, each sitting exactly on top of one exhibit:
//   - "Panda Point"  == Giant Panda   (1.4043, 103.7930)
//   - "Tiger Point"  == Malayan Tiger (1.4100, 103.8000)
// The two exhibits are ~1km apart, so whichever position we pick, only the
// co-located exhibit is within the 500m radius -> deterministic nearest.
//
// Two facilities positioned so the sort order flips between the two demo
// positions:
//   - "Panda Restroom"  is next to Panda Point.
//   - "Tiger Water"     is next to Tiger Point.
// At Panda Point the restroom is nearest; at Tiger Point the water station is.
// ---------------------------------------------------------------------------
const { mockData } = vi.hoisted(() => {
  const exhibits = [
    {
      id: 'giant-panda',
      name: 'Giant Panda',
      lat: 1.4043,
      lng: 103.793,
      iucnStatus: 'Vulnerable',
      funFact: 'Pandas eat bamboo for most of the day.',
      feedingTimes: ['11:00', '16:00'],
      diet: 'Herbivore',
      dietTags: ['bamboo'],
      trophicRole: 'Primary Consumer',
      dependsOn: ['bamboo'],
      predatorOf: [],
      ecosystemImpactIfRemoved: '...',
      imagenetLabels: ['giant panda'],
      spriteBodyAsset: '/sprites/panda.png',
      points: 20,
    },
    {
      id: 'malayan-tiger',
      name: 'Malayan Tiger',
      lat: 1.41,
      lng: 103.8,
      iucnStatus: 'Critically Endangered',
      funFact: 'Malayan tigers are strong swimmers.',
      feedingTimes: [], // intentionally empty -> exercises placeholder (Req 3.5)
      diet: 'Carnivore',
      dietTags: ['meat'],
      trophicRole: 'Apex Predator',
      dependsOn: [],
      predatorOf: ['deer'],
      ecosystemImpactIfRemoved: '...',
      imagenetLabels: ['tiger'],
      spriteBodyAsset: '/sprites/tiger.png',
      points: 30,
    },
  ];

  const facilities = [
    {
      id: 'panda-restroom',
      type: 'restroom',
      name: 'Panda Restroom',
      lat: 1.40431, // ~1m from Panda Point
      lng: 103.793,
      nearestLandmark: 'Giant Panda Enclosure',
    },
    {
      id: 'tiger-water',
      type: 'water-refill',
      name: 'Tiger Water Station',
      lat: 1.41001, // ~1m from Tiger Point
      lng: 103.8,
      nearestLandmark: 'Malayan Tiger Enclosure',
    },
  ];

  const demoLocations = [
    { label: 'Panda Point', lat: 1.4043, lng: 103.793 },
    { label: 'Tiger Point', lat: 1.41, lng: 103.8 },
  ];

  return { mockData: { exhibits, facilities, demoLocations } };
});

vi.mock('../../data/mandai.js', () => ({
  exhibits: mockData.exhibits,
  facilities: mockData.facilities,
  demoLocations: mockData.demoLocations,
}));

/**
 * Render the three real consumer components under a real LocationProvider.
 * This mirrors the App shell wiring without the tab-navigation chrome, so both
 * the exhibit card and the facilities list are visible simultaneously and can
 * be asserted together.
 */
function renderApp() {
  return render(
    <LocationProvider>
      <DemoLocationSimulator />
      <NearbyExhibitCard />
      <FacilitiesTab />
    </LocationProvider>,
  );
}

/** Read the ordered list of facility names currently rendered. */
function facilityNamesInOrder(): string[] {
  return Array.from(
    document.querySelectorAll('.facilities-tab__name'),
  ).map((el) => el.textContent ?? '');
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LocationContext integration — full flow', () => {
  describe('Scenario 1: selecting a demo location drives card + facilities (Req 2.3, 2.5, 3.3, 4.3)', () => {
    beforeEach(() => {
      // No geolocation available so the app starts in fallback (Panda Point),
      // giving a deterministic baseline before the user selects a location.
      vi.stubGlobal('navigator', {});
    });

    it('updates the nearby exhibit card and re-sorts facilities when a demo location is selected', () => {
      renderApp();

      const select = screen.getByLabelText(
        'Demo location simulator',
      ) as HTMLSelectElement;

      // Select "Tiger Point" (index 1).
      fireEvent.change(select, { target: { value: '1' } });

      // Card reflects the Malayan Tiger, the only exhibit within 500m of Tiger
      // Point (Req 3.3).
      expect(screen.getByText('Malayan Tiger')).toBeInTheDocument();
      expect(screen.queryByText('Giant Panda')).not.toBeInTheDocument();
      // Tiger has no feeding times -> placeholder shown (Req 3.5).
      expect(screen.getByText('Feeding times unavailable')).toBeInTheDocument();

      // Facilities re-sorted so the Tiger water station is first (Req 4.3).
      let names = facilityNamesInOrder();
      expect(names[0]).toBe('Tiger Water Station');
      expect(names[1]).toBe('Panda Restroom');

      // Now switch to "Panda Point" (index 0): card + sort order both flip.
      fireEvent.change(select, { target: { value: '0' } });

      expect(screen.getByText('Giant Panda')).toBeInTheDocument();
      expect(screen.queryByText('Malayan Tiger')).not.toBeInTheDocument();

      names = facilityNamesInOrder();
      expect(names[0]).toBe('Panda Restroom');
      expect(names[1]).toBe('Tiger Water Station');
    });
  });

  describe('Scenario 2: geolocation denied -> fallback flow (Req 5.1, 5.2, 5.3, 5.4)', () => {
    it('falls back to the first demo location, shows the notification, and displays the card', () => {
      // Geolocation present but watchPosition immediately reports an error
      // (permission denied) -> the provider must fall back (Req 5.1).
      const watchPosition = vi.fn(
        (_success: PositionCallback, error?: PositionErrorCallback) => {
          error?.({
            code: 1, // PERMISSION_DENIED
            message: 'denied',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
          return 1;
        },
      );
      vi.stubGlobal('navigator', {
        geolocation: { watchPosition, clearWatch: vi.fn() },
      });

      render(
        <LocationProvider>
          <DemoLocationSimulator />
          <NearbyExhibitCard />
        </LocationProvider>,
      );

      // Fallback uses demoLocations[0] == Panda Point, so the Giant Panda card
      // is shown (Req 5.2 + Req 3.1).
      expect(screen.getByText('Giant Panda')).toBeInTheDocument();
      expect(screen.getByText('Pandas eat bamboo for most of the day.')).toBeInTheDocument();
    });

    it('exposes the fallback notification flag so the app can warn the user (Req 5.4)', () => {
      const watchPosition = vi.fn(
        (_success: PositionCallback, error?: PositionErrorCallback) => {
          error?.({
            code: 1,
            message: 'denied',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
          return 1;
        },
      );
      vi.stubGlobal('navigator', {
        geolocation: { watchPosition, clearWatch: vi.fn() },
      });

      // A small probe surfaces the context flags used by the App shell to show
      // the FallbackNotification banner.
      const captured: { source: string; fallbackVisible: boolean } = {
        source: '',
        fallbackVisible: false,
      };
      function Probe() {
        const ctx = useLocationContext();
        captured.source = ctx.source;
        captured.fallbackVisible = ctx.fallbackNotificationVisible;
        return null;
      }

      render(
        <LocationProvider>
          <Probe />
        </LocationProvider>,
      );

      expect(captured.source).toBe('fallback');
      expect(captured.fallbackVisible).toBe(true);
    });
  });

  describe('Scenario 3: position change beyond 5m recomputes nearest exhibit (Req 1.4, 3.3)', () => {
    it('shows a new nearest exhibit after a >5m GPS movement between exhibits', () => {
      // Capture the watchPosition success callback so the test can push
      // successive GPS fixes and drive recomputation.
      let successCb: PositionCallback | null = null;
      const watchPosition = vi.fn((success: PositionCallback) => {
        successCb = success;
        return 1;
      });
      vi.stubGlobal('navigator', {
        geolocation: { watchPosition, clearWatch: vi.fn() },
      });

      renderApp();

      const emit = (lat: number, lng: number) => {
        act(() => {
          successCb?.({
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
        });
      };

      // First fix at Panda Point -> Giant Panda is nearest.
      emit(1.4043, 103.793);
      expect(screen.getByText('Giant Panda')).toBeInTheDocument();

      // Move ~1km to Tiger Point (well beyond the 5m threshold) -> recompute
      // yields Malayan Tiger as the new nearest exhibit (Req 1.4, 3.3).
      emit(1.41, 103.8);
      expect(screen.getByText('Malayan Tiger')).toBeInTheDocument();
      expect(screen.queryByText('Giant Panda')).not.toBeInTheDocument();
    });

    it('does not change the nearest exhibit for sub-5m jitter (Req 1.4)', () => {
      let successCb: PositionCallback | null = null;
      const watchPosition = vi.fn((success: PositionCallback) => {
        successCb = success;
        return 1;
      });
      vi.stubGlobal('navigator', {
        geolocation: { watchPosition, clearWatch: vi.fn() },
      });

      renderApp();

      const emit = (lat: number, lng: number) => {
        act(() => {
          successCb?.({
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
        });
      };

      emit(1.4043, 103.793);
      expect(screen.getByText('Giant Panda')).toBeInTheDocument();

      // ~2m nudge (below 5m threshold): still the Giant Panda, no recompute.
      emit(1.404318, 103.793);
      expect(screen.getByText('Giant Panda')).toBeInTheDocument();
    });
  });
});
