// src/context/__tests__/LocationContext.test.tsx
// Unit tests for LocationProvider / useLocationContext (Task 6.3).
//
// Covers:
//  - geolocation success sets GPS coordinates (Req 1.3)
//  - geolocation failure triggers fallback to first demo location (Req 5.1-5.4)
//  - simulator override updates position with exact coordinates (Req 2.4)
//  - movement < 5m does not trigger recomputation (Req 1.4)
//
// navigator.geolocation is mocked so tests are deterministic.

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { LocationProvider, useLocationContext } from '../LocationContext';
import {
  demoLocations as rawDemoLocations,
} from '../../data/mandai.js';
import type { DemoLocation } from '../../types';

const demoLocations = rawDemoLocations as DemoLocation[];

type PositionSuccess = (position: {
  coords: { latitude: number; longitude: number };
}) => void;
type PositionError = (err: { code: number; message: string }) => void;

/**
 * Build a mock geolocation object. The `mode` controls how watchPosition
 * behaves:
 *  - 'success': immediately invokes the success callback with `coords`
 *  - 'error':   immediately invokes the error callback
 *  - 'manual':  captures the callbacks so the test can drive them
 */
function installGeolocation(
  mode: 'success' | 'error' | 'manual',
  coords: { latitude: number; longitude: number } = {
    latitude: 40,
    longitude: 40,
  },
) {
  let successCb: PositionSuccess | null = null;
  const watchPosition = vi.fn(
    (onSuccess: PositionSuccess, onError?: PositionError) => {
      successCb = onSuccess;
      if (mode === 'success') {
        onSuccess({ coords });
      } else if (mode === 'error') {
        onError?.({ code: 1, message: 'User denied Geolocation' });
      }
      return 1; // watch id
    },
  );
  const clearWatch = vi.fn();

  const geolocation = { watchPosition, clearWatch };
  vi.stubGlobal('navigator', { geolocation });

  return {
    watchPosition,
    clearWatch,
    emitSuccess: (next: { latitude: number; longitude: number }) => {
      successCb?.({ coords: next });
    },
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <LocationProvider>{children}</LocationProvider>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('LocationProvider', () => {
  it('sets GPS coordinates on geolocation success', async () => {
    installGeolocation('success', { latitude: 1.4, longitude: 103.8 });

    const { result } = renderHook(() => useLocationContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('available');
    });

    expect(result.current.source).toBe('gps');
    expect(result.current.currentPosition).toEqual({ lat: 1.4, lng: 103.8 });
    expect(result.current.fallbackNotificationVisible).toBe(false);
  });

  it('falls back to the first demo location on geolocation failure', async () => {
    installGeolocation('error');
    const first = demoLocations[0];

    const { result } = renderHook(() => useLocationContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('available');
    });

    expect(result.current.source).toBe('fallback');
    expect(result.current.currentPosition).toEqual({
      lat: first.lat,
      lng: first.lng,
    });
    expect(result.current.fallbackNotificationVisible).toBe(true);
  });

  it('falls back when the geolocation API is not supported', async () => {
    vi.stubGlobal('navigator', {});
    const first = demoLocations[0];

    const { result } = renderHook(() => useLocationContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.source).toBe('fallback');
    });

    expect(result.current.currentPosition).toEqual({
      lat: first.lat,
      lng: first.lng,
    });
    expect(result.current.fallbackNotificationVisible).toBe(true);
  });

  it('overrides position with exact simulator coordinates', async () => {
    installGeolocation('success', { latitude: 1.4, longitude: 103.8 });

    const { result } = renderHook(() => useLocationContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.source).toBe('gps');
    });

    const target = { lat: 1.29027, lng: 103.851959 };
    act(() => {
      result.current.setSimulatedPosition(target);
    });

    expect(result.current.source).toBe('simulator');
    expect(result.current.currentPosition).toEqual(target);
    // Exactly equal, not rounded (Property 6 / Req 2.4).
    expect(result.current.currentPosition?.lat).toBe(target.lat);
    expect(result.current.currentPosition?.lng).toBe(target.lng);
  });

  it('ignores GPS updates once the simulator has taken over', async () => {
    const geo = installGeolocation('success', {
      latitude: 1.4,
      longitude: 103.8,
    });

    const { result } = renderHook(() => useLocationContext(), { wrapper });
    await waitFor(() => expect(result.current.source).toBe('gps'));

    const target = { lat: 1.29027, lng: 103.851959 };
    act(() => {
      result.current.setSimulatedPosition(target);
    });

    // A later GPS fix should be ignored.
    act(() => {
      geo.emitSuccess({ latitude: 1.5, longitude: 103.9 });
    });

    expect(result.current.source).toBe('simulator');
    expect(result.current.currentPosition).toEqual(target);
  });

  it('does not recompute when movement is below the 5m threshold', async () => {
    // Start at a known position via GPS.
    const start = { latitude: 1.4043, longitude: 103.793 };
    const geo = installGeolocation('success', start);

    const { result } = renderHook(() => useLocationContext(), { wrapper });
    await waitFor(() => expect(result.current.source).toBe('gps'));

    const initialPosition = result.current.currentPosition;
    const initialDistances = result.current.allExhibitDistances;

    // Move ~1m (well under 5m): ~0.000009 degrees latitude ≈ 1 metre.
    act(() => {
      geo.emitSuccess({ latitude: 1.4043 + 0.000009, longitude: 103.793 });
    });

    // currentPosition should NOT update because the threshold wasn't crossed.
    expect(result.current.currentPosition).toEqual(initialPosition);
    expect(result.current.allExhibitDistances).toBe(initialDistances);
  });

  it('recomputes when movement exceeds the 5m threshold', async () => {
    const start = { latitude: 1.4043, longitude: 103.793 };
    const geo = installGeolocation('success', start);

    const { result } = renderHook(() => useLocationContext(), { wrapper });
    await waitFor(() => expect(result.current.source).toBe('gps'));

    // Move ~11m north: ~0.0001 degrees latitude ≈ 11 metres.
    const moved = { latitude: 1.4043 + 0.0001, longitude: 103.793 };
    act(() => {
      geo.emitSuccess(moved);
    });

    expect(result.current.currentPosition).toEqual({
      lat: moved.latitude,
      lng: moved.longitude,
    });
  });

  it('throws when useLocationContext is used outside a provider', () => {
    // Suppress the expected React error boundary console noise.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useLocationContext())).toThrow(
      /must be used within a LocationProvider/,
    );
    spy.mockRestore();
  });
});
