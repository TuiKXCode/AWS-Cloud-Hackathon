// src/context/LocationContext.tsx
// LocationProvider: the single source of truth for the visitor's position and
// all derived location data (nearest exhibit, sorted facilities, all exhibit
// distances). Part of the location-aware-exhibit-discovery feature.
//
// Responsibilities:
//  - On mount, subscribe to browser geolocation via watchPosition (Req 1.3).
//  - Recompute distances only when the position has moved >= 5m (Req 1.4),
//    using hasMovedBeyondThreshold from the Location Engine.
//  - Allow the Demo Location Simulator to override the position exactly
//    (Req 2.4) via setSimulatedPosition, and clear it via clearSimulatedPosition.
//  - On any geolocation failure or when the API is unsupported, fall back to
//    demoLocations[0], mark the source as 'fallback', and raise a notification
//    flag (Req 5.1-5.4).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  computeExhibitDistances,
  computeFacilityDistances,
  findNearestExhibit,
  hasMovedBeyondThreshold,
  isValidPosition,
} from '../engine/locationEngine';

// mandai.js is a plain JS data module (allowJs). Cast the imported values to
// the strongly-typed shapes declared in src/types so the rest of the provider
// is fully typed.
import {
  exhibits as rawExhibits,
  facilities as rawFacilities,
  demoLocations as rawDemoLocations,
} from '../data/mandai.js';

import type {
  DemoLocation,
  Exhibit,
  ExhibitWithDistance,
  Facility,
  FacilityWithDistance,
  LocationContextValue,
  Position,
  PositionSource,
  PositionStatus,
} from '../types';

const exhibits = rawExhibits as Exhibit[];
const facilities = rawFacilities as Facility[];
const demoLocations = rawDemoLocations as DemoLocation[];

/**
 * The internal, fully-derived location state held by the provider. Consumers
 * receive this plus the mutation actions via {@link LocationContextValue}.
 */
interface DerivedState {
  currentPosition: Position | null;
  source: PositionSource;
  status: PositionStatus;
  nearestExhibit: ExhibitWithDistance | null;
  sortedFacilities: FacilityWithDistance[];
  allExhibitDistances: ExhibitWithDistance[];
  /** Whether the fallback-to-default-location notification should be shown. */
  fallbackNotificationVisible: boolean;
}

/**
 * Compute all derived location data for a given position. Returns the
 * exhibit distances, nearest exhibit, and facilities sorted by distance.
 */
function deriveForPosition(position: Position): {
  nearestExhibit: ExhibitWithDistance | null;
  sortedFacilities: FacilityWithDistance[];
  allExhibitDistances: ExhibitWithDistance[];
} {
  const allExhibitDistances = computeExhibitDistances(position, exhibits);
  const nearestExhibit = findNearestExhibit(allExhibitDistances);
  const sortedFacilities = computeFacilityDistances(position, facilities);
  return { nearestExhibit, sortedFacilities, allExhibitDistances };
}

const INITIAL_STATE: DerivedState = {
  currentPosition: null,
  source: 'gps',
  status: 'acquiring',
  nearestExhibit: null,
  sortedFacilities: [],
  allExhibitDistances: [],
  fallbackNotificationVisible: false,
};

const LocationContext = createContext<LocationContextValue | null>(null);

/**
 * Provides the shared location state to the component tree. Wrap the app (or
 * the subtree that needs location) in this provider.
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DerivedState>(INITIAL_STATE);

  // The last position that we actually ran a recomputation for. Used to apply
  // the 5m movement threshold. A ref (not state) so updating it does not force
  // a render and so the watchPosition callback always sees the latest value.
  const lastComputedRef = useRef<Position | null>(null);

  // Once the simulator has taken over, GPS updates must be ignored (Req 2.4 /
  // design: "stops using GPS values"). This ref lets the geolocation callback
  // bail out without needing to re-subscribe.
  const simulatorActiveRef = useRef(false);

  /**
   * Apply a new position, respecting the movement threshold. Recomputes and
   * commits derived state only when the position is the first fix or has moved
   * at least 5m from the last computed position.
   */
  const applyPosition = useCallback(
    (position: Position, source: PositionSource, showFallback: boolean) => {
      if (!isValidPosition(position)) {
        // Withhold results for an invalid position (Req 1.5).
        setState((prev) => ({
          ...prev,
          status: 'unavailable',
        }));
        return;
      }

      const prev = lastComputedRef.current;
      const shouldRecompute =
        prev === null || hasMovedBeyondThreshold(prev, position);

      if (!shouldRecompute) {
        // Movement below the 5m threshold: keep existing derived data but make
        // sure the source/status stay consistent.
        setState((current) => ({
          ...current,
          source,
          status: 'available',
        }));
        return;
      }

      lastComputedRef.current = position;
      const derived = deriveForPosition(position);
      setState((current) => ({
        ...current,
        currentPosition: position,
        source,
        status: 'available',
        nearestExhibit: derived.nearestExhibit,
        sortedFacilities: derived.sortedFacilities,
        allExhibitDistances: derived.allExhibitDistances,
        fallbackNotificationVisible:
          showFallback || current.fallbackNotificationVisible,
      }));
    },
    [],
  );

  /**
   * Fall back to the first demo location when geolocation is unavailable
   * (Req 5.1-5.4). Sets source to 'fallback' and raises the notification flag.
   */
  const fallBackToDefault = useCallback(() => {
    if (simulatorActiveRef.current) {
      // The user has already chosen a simulated location; do not override it.
      return;
    }
    const first = demoLocations[0];
    if (!first) {
      // No demo locations to fall back to; mark position unavailable.
      setState((prev) => ({ ...prev, status: 'unavailable' }));
      return;
    }
    applyPosition({ lat: first.lat, lng: first.lng }, 'fallback', true);
  }, [applyPosition]);

  useEffect(() => {
    if (
      typeof navigator === 'undefined' ||
      !('geolocation' in navigator) ||
      typeof navigator.geolocation?.watchPosition !== 'function'
    ) {
      // Geolocation API not supported -> fallback (Req 5.1).
      fallBackToDefault();
      return;
    }

    let watchId: number | null = null;
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (simulatorActiveRef.current) {
            return; // Simulator override takes precedence over GPS.
          }
          applyPosition(
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            'gps',
            false,
          );
        },
        () => {
          // Permission denied, timeout, or position unavailable (Req 5.1).
          fallBackToDefault();
        },
      );
    } catch {
      // Defensive: some environments throw synchronously.
      fallBackToDefault();
    }

    return () => {
      if (watchId !== null && navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [applyPosition, fallBackToDefault]);

  const setSimulatedPosition = useCallback(
    (position: Position) => {
      simulatorActiveRef.current = true;
      // A simulator selection is an explicit jump; reset the threshold anchor
      // so the exact selected coordinates are always applied (Req 2.4).
      lastComputedRef.current = null;
      applyPosition(position, 'simulator', false);
    },
    [applyPosition],
  );

  const clearSimulatedPosition = useCallback(() => {
    simulatorActiveRef.current = false;
    lastComputedRef.current = null;
    // Revert to fallback until the next GPS fix arrives.
    fallBackToDefault();
  }, [fallBackToDefault]);

  const value = useMemo<LocationContextValue>(
    () => ({
      currentPosition: state.currentPosition,
      source: state.source,
      status: state.status,
      nearestExhibit: state.nearestExhibit,
      sortedFacilities: state.sortedFacilities,
      allExhibitDistances: state.allExhibitDistances,
      fallbackNotificationVisible: state.fallbackNotificationVisible,
      setSimulatedPosition,
      clearSimulatedPosition,
    }),
    [state, setSimulatedPosition, clearSimulatedPosition],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

/**
 * Consumer hook for the location context. Throws if used outside a
 * {@link LocationProvider} so misuse is caught early.
 */
export function useLocationContext(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (ctx === null) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return ctx;
}

export { LocationContext };
