// src/context/__tests__/CaptureContext.test.tsx
// Unit tests for CaptureProvider / useCapture (Task 6.2).
//
// Covers the orchestration behavior:
//  - nearestExhibit snapshotted at activation is used as the fallback target
//    when the classifier returns null (Req 1.5, 4.1, 4.4)
//  - saveOk=false when writeCollection fails; record still retained in memory
//    (Req 7.2)
//  - first-tag awards points once; a second capture of the same exhibit awards
//    0 and leaves Player_Total unchanged (Req 5.1, 5.2)
//  - a confident classifier match tags via 'classifier' (Req 3.3)
//
// The exhibits dataset, the storage adapter, and the browser FileReader/Image
// globals are all mocked/stubbed so the tests are deterministic and never hang.

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

// --- Mock the exhibits dataset so tagging is deterministic. --------------
vi.mock('../../data/mandaiData.js', () => ({
  exhibits: [
    {
      id: 'tiger',
      name: 'Malayan Tiger',
      lat: 1.4, lng: 103.7,
      iucnStatus: 'Endangered',
      funFact: 'stripes',
      feedingTimes: [],
      diet: 'Carnivore',
      dietTags: [],
      trophicRole: 'Apex Predator',
      dependsOn: [],
      predatorOf: [],
      ecosystemImpactIfRemoved: '',
      imagenetLabels: ['tiger'],
      spriteBodyAsset: '',
      points: 30,
    },
    {
      id: 'panda',
      name: 'Giant Panda',
      lat: 1.5, lng: 103.8,
      iucnStatus: 'Vulnerable',
      funFact: 'bamboo',
      feedingTimes: [],
      diet: 'Herbivore',
      dietTags: [],
      trophicRole: 'Primary Consumer',
      dependsOn: [],
      predatorOf: [],
      ecosystemImpactIfRemoved: '',
      imagenetLabels: ['giant panda', 'panda'],
      spriteBodyAsset: '',
      points: 25,
    },
  ],
  facilities: [],
  demoLocations: [{ label: 'Start', lat: 1.4, lng: 103.7 }],
  questlineConfig: { totalPointsToComplete: 100, prizeLabel: 'scoop' },
}));

// --- Mock the storage adapter. -------------------------------------------
const readRawCollection = vi.fn<() => string | null>(() => null);
const writeCollection = vi.fn<(json: string) => boolean>(() => true);
vi.mock('../../engine/storage', () => ({
  COLLECTED_ANIMALS_KEY: 'collectedAnimals',
  readRawCollection: () => readRawCollection(),
  writeCollection: (json: string) => writeCollection(json),
}));

import { CaptureProvider, useCapture } from '../CaptureContext';
import { LocationContext } from '../LocationContext';
import type {
  Classifier,
} from '../../engine/classifier';
import type {
  ExhibitWithDistance,
  LocationContextValue,
  Prediction,
} from '../../types';

// The mocked exhibits (imported after the mock is registered).
import { exhibits as rawExhibits } from '../../data/mandaiData.js';
import type { Exhibit } from '../../types';
const exhibits = rawExhibits as Exhibit[];
const tigerExhibit = exhibits[0];
const pandaExhibit = exhibits[1];

// --- Stub browser globals so FileReader/Image resolve synchronously. ------
class FakeFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(_file: unknown) {
    this.result = 'data:image/png;base64,ZmFrZQ==';
    // Fire asynchronously to mirror the real API but resolve immediately.
    queueMicrotask(() => this.onload?.());
  }
}

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = '';
  set src(value: string) {
    this._src = value;
    queueMicrotask(() => this.onload?.());
  }
  get src() {
    return this._src;
  }
}

beforeEach(() => {
  readRawCollection.mockReset();
  readRawCollection.mockReturnValue(null);
  writeCollection.mockReset();
  writeCollection.mockReturnValue(true);
  vi.stubGlobal('FileReader', FakeFileReader as unknown as typeof FileReader);
  vi.stubGlobal('Image', FakeImage as unknown as typeof Image);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/**
 * Build a mock LocationContextValue whose nearestExhibit is `nearest`.
 */
function makeLocationValue(
  nearest: ExhibitWithDistance | null,
): LocationContextValue {
  return {
    currentPosition: nearest ? { lat: nearest.exhibit.lat, lng: nearest.exhibit.lng } : null,
    source: 'simulator',
    status: 'available',
    nearestExhibit: nearest,
    sortedFacilities: [],
    allExhibitDistances: [],
    fallbackNotificationVisible: false,
    setSimulatedPosition: vi.fn(),
    clearSimulatedPosition: vi.fn(),
  };
}

/**
 * Build a wrapper providing a fixed LocationContext value plus a CaptureProvider
 * with the given (mock) classifier.
 */
function makeWrapper(
  nearest: ExhibitWithDistance | null,
  classifier: Classifier,
) {
  const locationValue = makeLocationValue(nearest);
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <LocationContext.Provider value={locationValue}>
        <CaptureProvider classifier={classifier}>{children}</CaptureProvider>
      </LocationContext.Provider>
    );
  };
}

function mockClassifier(predictions: Prediction[] | null): Classifier {
  return { classify: vi.fn().mockResolvedValue(predictions) };
}

const fakeFile = new File(['x'], 'photo.png', { type: 'image/png' });

describe('CaptureProvider / useCapture', () => {
  it('uses the nearestExhibit snapshot as the fallback target when the classifier returns null', async () => {
    const nearest: ExhibitWithDistance = { exhibit: pandaExhibit, distance: 42 };
    const classifier = mockClassifier(null);
    const { result } = renderHook(() => useCapture(), {
      wrapper: makeWrapper(nearest, classifier),
    });

    await act(async () => {
      await result.current.handleCapturedFile(fakeFile);
    });

    await waitFor(() => expect(result.current.phase).toBe('result'));
    expect(result.current.result?.exhibit.id).toBe('panda');
    expect(result.current.result?.recognizedVia).toBe('location-fallback');
    expect(result.current.recognitionUnavailable).toBe(true);
    expect(result.current.collection).toHaveLength(1);
  });

  it('reports saveOk=false when writeCollection fails but retains the record in memory', async () => {
    writeCollection.mockReturnValue(false);
    const nearest: ExhibitWithDistance = { exhibit: pandaExhibit, distance: 10 };
    const classifier = mockClassifier(null);
    const { result } = renderHook(() => useCapture(), {
      wrapper: makeWrapper(nearest, classifier),
    });

    await act(async () => {
      await result.current.handleCapturedFile(fakeFile);
    });

    await waitFor(() => expect(result.current.phase).toBe('result'));
    expect(result.current.result?.saveOk).toBe(false);
    // Record is still kept in the in-memory collection (Req 7.2).
    expect(result.current.collection).toHaveLength(1);
    expect(result.current.collection[0].exhibitId).toBe('panda');
  });

  it('awards points on the first tag and awards 0 on a repeat tag of the same exhibit', async () => {
    const nearest: ExhibitWithDistance = { exhibit: pandaExhibit, distance: 5 };
    const classifier = mockClassifier(null);
    const { result } = renderHook(() => useCapture(), {
      wrapper: makeWrapper(nearest, classifier),
    });

    // First tag → points awarded once.
    await act(async () => {
      await result.current.handleCapturedFile(fakeFile);
    });
    await waitFor(() => expect(result.current.phase).toBe('result'));
    expect(result.current.result?.firstTag).toBe(true);
    expect(result.current.result?.pointsAwarded).toBe(pandaExhibit.points);
    expect(result.current.playerTotal).toBe(pandaExhibit.points);

    // Dismiss, then capture the same exhibit again → 0 points, total unchanged.
    act(() => result.current.dismissResult());
    await act(async () => {
      await result.current.handleCapturedFile(fakeFile);
    });
    await waitFor(() => expect(result.current.phase).toBe('result'));
    expect(result.current.result?.firstTag).toBe(false);
    expect(result.current.result?.pointsAwarded).toBe(0);
    expect(result.current.playerTotal).toBe(pandaExhibit.points);
    expect(result.current.collection).toHaveLength(2);
  });

  it('tags via the classifier when a confident match is produced', async () => {
    const nearest: ExhibitWithDistance = { exhibit: pandaExhibit, distance: 5 };
    // Confident match for the tiger label, above the 0.6 threshold.
    const classifier = mockClassifier([
      { className: 'tiger', probability: 0.92 },
    ]);
    const { result } = renderHook(() => useCapture(), {
      wrapper: makeWrapper(nearest, classifier),
    });

    await act(async () => {
      await result.current.handleCapturedFile(fakeFile);
    });

    await waitFor(() => expect(result.current.phase).toBe('result'));
    expect(result.current.result?.exhibit.id).toBe('tiger');
    expect(result.current.result?.recognizedVia).toBe('classifier');
    expect(result.current.recognitionUnavailable).toBe(false);
    expect(result.current.result?.pointsAwarded).toBe(tigerExhibit.points);
  });
});
