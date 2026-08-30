// src/components/__tests__/SpriteGenerationIntegration.test.tsx
// Feature: sprite-generation (Phase 6) — end-to-end integration tests (Task 9.2).
//
// These tests render the real <App /> (LocationProvider > CaptureProvider >
// QuestlineProvider > AppShell), navigate to the "My Animals" tab, and assert
// the full lazy sprite-generation flow through the real UI + contexts.
//
// The effectful edges are mocked so the flow is deterministic and never hangs:
//   - '../../engine/spriteCompositor' (generateSprite) is mocked so canvas /
//     Image are never exercised here; a module-level `compositorImpl` lets each
//     test control what generateSprite resolves to (a data URL, or null).
//   - '../../data/mandaiData.js' provides deterministic exhibits (with real-looking
//     spriteBodyAsset paths) + benign defaults for the other tabs.
//   - '../../engine/storage' is mocked so `readRawCollection` seeds the initial
//     collection (records LACKING spriteDataUrl) and `writeCollection` is a spy
//     returning true. CaptureProvider restores the collection from
//     readRawCollection on mount, so this seeds the gallery.
//
// Covered scenarios:
//   1. My Animals tab renders one entry per seeded record (Req 5.1).
//   2. Records lacking spriteDataUrl trigger generation from the existing photo
//      (no re-capture); generateSprite is called with (record.photo,
//      exhibit.spriteBodyAsset); on resolve, updateSpriteDataUrl persists
//      (writeCollection called with the record carrying spriteDataUrl) and the
//      sprite <img> appears (Req 1.1, 1.2, 3.1, 3.4, 6.3).
//   3. When generateSprite returns null for a record, that entry still renders
//      via the body-art fallback (no crash) while the other record still gets
//      its composited sprite (Req 6.2, 4.2).

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Deterministic exhibits + benign defaults for the other tabs. --------
const { mockData } = vi.hoisted(() => {
  const exhibits = [
    {
      id: 'pygmy-hippo',
      name: 'Pygmy Hippopotamus',
      lat: 1.4043,
      lng: 103.793,
      iucnStatus: 'Endangered',
      funFact: '...',
      feedingTimes: [],
      diet: 'Herbivore',
      dietTags: [],
      trophicRole: 'Primary Consumer',
      dependsOn: [],
      predatorOf: [],
      ecosystemImpactIfRemoved: '',
      imagenetLabels: ['hippopotamus'],
      spriteBodyAsset: '/sprites/bodies/pygmy-hippo-body.png',
      points: 20,
    },
    {
      id: 'tiger',
      name: 'Malayan Tiger',
      lat: 1.41,
      lng: 103.8,
      iucnStatus: 'Endangered',
      funFact: '...',
      feedingTimes: [],
      diet: 'Carnivore',
      dietTags: [],
      trophicRole: 'Apex Predator',
      dependsOn: [],
      predatorOf: [],
      ecosystemImpactIfRemoved: '',
      imagenetLabels: ['tiger'],
      spriteBodyAsset: '/sprites/bodies/tiger-body.png',
      points: 30,
    },
  ];

  const demoLocations = [
    { label: 'Pygmy Hippo Enclosure', lat: 1.4043, lng: 103.793 },
    { label: 'Tiger Point', lat: 1.41, lng: 103.8 },
  ];

  return { mockData: { exhibits, demoLocations } };
});

vi.mock('../../data/mandaiData.js', () => ({
  exhibits: mockData.exhibits,
  facilities: [],
  demoLocations: mockData.demoLocations,
  dining: [],
  questlineConfig: { totalPointsToComplete: 100, prizeLabel: 'scoop' },
}));

// --- Controllable compositor. --------------------------------------------
// `compositorImpl` is swapped per test. It receives the same args the hook
// passes (photoDataUrl, bodyAssetUrl) so tests can assert wiring and vary the
// result (a data URL, or null for a Compositing_Failure).
let compositorImpl: (
  photoDataUrl: string,
  bodyAssetUrl: string,
) => Promise<string | null> = async () => 'data:image/png;base64,SPRITE';
const generateSprite = vi.fn(
  (photoDataUrl: string, bodyAssetUrl: string) =>
    compositorImpl(photoDataUrl, bodyAssetUrl),
);
vi.mock('../../engine/spriteCompositor', () => ({
  IMAGE_LOAD_TIMEOUT_MS: 5000,
  generateSprite: (photoDataUrl: string, bodyAssetUrl: string) =>
    generateSprite(photoDataUrl, bodyAssetUrl),
}));

// --- Storage adapter mock. ------------------------------------------------
// readRawCollection seeds the initial collection restored by CaptureProvider.
const readRawCollection = vi.fn<() => string | null>(() => null);
const writeCollection = vi.fn<(json: string) => boolean>(() => true);
vi.mock('../../engine/storage', () => ({
  COLLECTED_ANIMALS_KEY: 'collectedAnimals',
  readRawCollection: () => readRawCollection(),
  writeCollection: (json: string) => writeCollection(json),
}));

import { App } from '../../App';

// Two seeded records (different exhibits), both lacking spriteDataUrl so both
// are eligible for lazy generation on load.
const SEEDED_COLLECTION = [
  {
    photo: 'data:image/png;base64,HIPPOPHOTO',
    exhibitId: 'pygmy-hippo',
    recognizedVia: 'classifier',
    timestamp: 1000,
  },
  {
    photo: 'data:image/png;base64,TIGERPHOTO',
    exhibitId: 'tiger',
    recognizedVia: 'location-fallback',
    timestamp: 2000,
  },
];

beforeEach(() => {
  compositorImpl = async () => 'data:image/png;base64,SPRITE';
  generateSprite.mockClear();
  readRawCollection.mockReset();
  readRawCollection.mockReturnValue(JSON.stringify(SEEDED_COLLECTION));
  writeCollection.mockReset();
  writeCollection.mockReturnValue(true);
  // No geolocation; the location provider falls back to a demo location.
  vi.stubGlobal('navigator', {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/** Open the "My Animals" tab. */
function openGallery() {
  fireEvent.click(screen.getByRole('tab', { name: /my animals/i }));
}

/** Let queued microtasks / promise resolutions settle. */
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('Sprite generation — end-to-end integration', () => {
  it('shows one gallery entry per seeded Collected_Record on the My Animals tab (Req 5.1)', async () => {
    // Keep generation from resolving so we assert the raw entry count without
    // sprites racing in.
    compositorImpl = () => new Promise(() => {});

    render(<App />);
    openGallery();

    // Two seeded records -> two named entries.
    expect(
      await screen.findByText('Pygmy Hippopotamus'),
    ).toBeInTheDocument();
    expect(screen.getByText('Malayan Tiger')).toBeInTheDocument();

    const items = document.querySelectorAll('.gallery-view__item');
    expect(items).toHaveLength(2);
  });

  it('generates sprites from existing photos and persists them, showing the composited sprite (Req 1.1, 1.2, 3.1, 3.4, 6.3)', async () => {
    compositorImpl = async () => 'data:image/png;base64,SPRITE';

    render(<App />);
    openGallery();

    // The hook generates each eligible record from its EXISTING photo (no
    // re-capture) using its exhibit's body asset.
    await waitFor(() => {
      expect(generateSprite).toHaveBeenCalledWith(
        'data:image/png;base64,HIPPOPHOTO',
        '/sprites/bodies/pygmy-hippo-body.png',
      );
    });
    await waitFor(() => {
      expect(generateSprite).toHaveBeenCalledWith(
        'data:image/png;base64,TIGERPHOTO',
        '/sprites/bodies/tiger-body.png',
      );
    });

    // Both composited sprites eventually render (Req 6.3).
    await waitFor(() => {
      const sprites = document.querySelectorAll('.sprite-image--sprite');
      expect(sprites).toHaveLength(2);
    });
    document
      .querySelectorAll<HTMLImageElement>('.sprite-image--sprite')
      .forEach((img) => {
        expect(img.getAttribute('src')).toBe('data:image/png;base64,SPRITE');
      });

    // The generated sprite is persisted; the last write carries the
    // spriteDataUrl while preserving the other record fields (Req 3.1, 3.4).
    await waitFor(() => {
      const persistedWithSprite = writeCollection.mock.calls.some(([json]) => {
        try {
          const parsed = JSON.parse(json) as Array<Record<string, unknown>>;
          return parsed.some(
            (r) =>
              r.spriteDataUrl === 'data:image/png;base64,SPRITE' &&
              typeof r.photo === 'string' &&
              typeof r.exhibitId === 'string' &&
              typeof r.recognizedVia === 'string' &&
              typeof r.timestamp === 'number',
          );
        } catch {
          return false;
        }
      });
      expect(persistedWithSprite).toBe(true);
    });
  });

  it('falls back to body art for a record whose generation fails while the other still gets its sprite (Req 6.2, 4.2)', async () => {
    // Fail the hippo, succeed the tiger. Independent generation means one
    // failure must not block the other (Req 6.2).
    compositorImpl = async (photoDataUrl: string) =>
      photoDataUrl === 'data:image/png;base64,HIPPOPHOTO'
        ? null
        : 'data:image/png;base64,SPRITE';

    render(<App />);
    openGallery();

    // The tiger's sprite renders...
    await waitFor(() => {
      expect(
        document.querySelectorAll('.sprite-image--sprite'),
      ).toHaveLength(1);
    });
    await flush();

    // ...and the hippo (failed) shows the Body_Only_Fallback body art, never a
    // broken composited image (Req 4.2). Locate its gallery item by name.
    const hippoName = screen.getByText('Pygmy Hippopotamus');
    const hippoItem = hippoName.closest('.gallery-view__item') as HTMLElement;
    const bodyImg = within(hippoItem).getByRole('img', {
      name: 'Pygmy Hippopotamus',
    }) as HTMLImageElement;
    expect(bodyImg.className).toContain('sprite-image--body');
    expect(bodyImg.getAttribute('src')).toBe(
      '/sprites/bodies/pygmy-hippo-body.png',
    );

    // The tiger entry shows its composited sprite.
    const tigerName = screen.getByText('Malayan Tiger');
    const tigerItem = tigerName.closest('.gallery-view__item') as HTMLElement;
    const tigerImg = within(tigerItem).getByRole('img', {
      name: 'Malayan Tiger',
    }) as HTMLImageElement;
    expect(tigerImg.className).toContain('sprite-image--sprite');
    expect(tigerImg.getAttribute('src')).toBe('data:image/png;base64,SPRITE');
  });
});
