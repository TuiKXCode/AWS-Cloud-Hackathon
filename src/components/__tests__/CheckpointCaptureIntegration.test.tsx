// src/components/__tests__/CheckpointCaptureIntegration.test.tsx
// Feature: checkpoint-photo-capture — end-to-end integration tests (Task 10.1).
//
// These tests render the real <App /> (LocationProvider > CaptureProvider >
// AppShell) and drive a full capture through the real UI: pick a demo location
// so an exhibit is in range, tap "Take Photo", fire the hidden file input's
// change event with a File, and assert the Result Screen / Collection.
//
// The effectful edges are mocked so the flow is deterministic and never hangs:
//   - '../../engine/classifier' (createMobileNetClassifier) returns a
//     controllable classifier so we can simulate a confident match or a null
//     (unavailable) result without loading TensorFlow.js.
//   - '../../engine/storage' is mocked so we control read (initial collection)
//     and write (success / failure) without touching localStorage.
//   - '../../data/mandai.js' provides deterministic exhibits + demoLocations,
//     where each demo location sits on top of one exhibit so the nearest
//     exhibit is unambiguous and well within the 500m radius.
//   - FileReader / Image globals are stubbed to resolve synchronously so the
//     capture pipeline completes on the next microtask.
//
// Covered scenarios:
//   - Confident classifier match -> classifier tag + Result Screen (Req 3.3, 6.1)
//   - Classifier returns null -> location-fallback + "recognition unavailable"
//     note (Req 4.4)
//   - First-vs-duplicate: same exhibit twice -> points once, total stable
//     (Req 5.1, 5.2)
//   - writeCollection fails -> Result Screen still shown, save-incomplete note
//     (Req 7.2)
//   - Collection tab lists collected records and playerTotal (Req 7.3)

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

import type { Prediction } from '../../types';

// --- Deterministic exhibits + demo locations. ----------------------------
// Two exhibits ~1km apart; each demo location sits on top of one exhibit, so
// selecting a location yields exactly one in-range (<500m) nearest exhibit.
const { mockData } = vi.hoisted(() => {
  const exhibits = [
    {
      id: 'tiger',
      name: 'Malayan Tiger',
      lat: 1.41,
      lng: 103.8,
      iucnStatus: 'Endangered',
      funFact: 'Tigers have unique stripe patterns.',
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
      lat: 1.4043,
      lng: 103.793,
      iucnStatus: 'Vulnerable',
      funFact: 'Pandas eat bamboo most of the day.',
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
  ];

  const demoLocations = [
    { label: 'Tiger Point', lat: 1.41, lng: 103.8 },
    { label: 'Panda Point', lat: 1.4043, lng: 103.793 },
  ];

  return { mockData: { exhibits, facilities: [], demoLocations } };
});

vi.mock('../../data/mandai.js', () => ({
  exhibits: mockData.exhibits,
  facilities: mockData.facilities,
  demoLocations: mockData.demoLocations,
  // Some components (FoodWebSimulator / DiningTab) read these; provide benign
  // defaults so the shell renders without throwing.
  dining: [],
  questlineConfig: { totalPointsToComplete: 100, prizeLabel: 'scoop' },
}));

// --- Controllable classifier. --------------------------------------------
// The App wires CaptureProvider without an injectable classifier prop, so we
// mock the module the provider imports. `classifyResult` is swapped per test.
let classifyResult: Prediction[] | null = null;
const classifyMock = vi.fn(async () => classifyResult);
vi.mock('../../engine/classifier', () => ({
  createMobileNetClassifier: () => ({ classify: classifyMock }),
}));

// --- Storage adapter mock. ------------------------------------------------
const readRawCollection = vi.fn<() => string | null>(() => null);
const writeCollection = vi.fn<(json: string) => boolean>(() => true);
vi.mock('../../engine/storage', () => ({
  COLLECTED_ANIMALS_KEY: 'collectedAnimals',
  readRawCollection: () => readRawCollection(),
  writeCollection: (json: string) => writeCollection(json),
}));

import { App } from '../../App';

// --- Stub browser globals so FileReader/Image resolve synchronously. ------
class FakeFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(_file: unknown) {
    this.result = 'data:image/png;base64,ZmFrZQ==';
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

const fakeFile = new File(['x'], 'photo.png', { type: 'image/png' });

beforeEach(() => {
  classifyResult = null;
  classifyMock.mockClear();
  readRawCollection.mockReset();
  readRawCollection.mockReturnValue(null);
  writeCollection.mockReset();
  writeCollection.mockReturnValue(true);
  vi.stubGlobal('FileReader', FakeFileReader as unknown as typeof FileReader);
  vi.stubGlobal('Image', FakeImage as unknown as typeof Image);
  // No geolocation: the provider falls back to demoLocations[0] (Tiger Point),
  // but each test explicitly selects a location via the simulator for clarity.
  vi.stubGlobal('navigator', {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/** Select a demo location by its <option> index to set the nearest exhibit. */
function selectDemoLocation(index: number) {
  const select = screen.getByLabelText(
    'Demo location simulator',
  ) as HTMLSelectElement;
  fireEvent.change(select, { target: { value: String(index) } });
}

/** The hidden native camera file input rendered by TakePhotoButton. */
function getFileInput(): HTMLInputElement {
  const input = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement | null;
  if (!input) {
    throw new Error('file input not found');
  }
  return input;
}

/**
 * Fire a change event on the hidden file input carrying `fakeFile`, then wait
 * for the async capture pipeline (FileReader/Image microtasks + classify) to
 * settle. Using a real change event exercises TakePhotoButton -> useCapture.
 */
async function capturePhoto() {
  const input = getFileInput();
  await act(async () => {
    fireEvent.change(input, { target: { files: [fakeFile] } });
    // Let the queued microtasks (FileReader/Image) and the awaited classify
    // resolve so the provider transitions to its terminal phase.
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('Checkpoint capture — end-to-end integration', () => {
  it('tags via the classifier on a confident match and shows the Result Screen (Req 3.3, 6.1)', async () => {
    classifyResult = [{ className: 'giant panda', probability: 0.95 }];

    render(<App />);
    // Stand at Tiger Point so the nearest exhibit is the Tiger; the confident
    // panda match must override the location to tag the Panda via classifier.
    selectDemoLocation(0);

    await capturePhoto();

    const dialog = await screen.findByRole('dialog', {
      name: /capture result/i,
    });
    // Result shows the classifier-tagged exhibit (Panda), not the nearest.
    expect(within(dialog).getByText('Giant Panda')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Pandas eat bamboo most of the day.'),
    ).toBeInTheDocument();
    // A classifier tag shows no "recognition unavailable" note.
    expect(
      within(dialog).queryByText(/recognition unavailable/i),
    ).not.toBeInTheDocument();
    // First tag of Panda -> its points are awarded.
    expect(within(dialog).getByText('+25 points')).toBeInTheDocument();
  });

  it('falls back to the nearest exhibit and notes recognition was unavailable when the classifier returns null (Req 4.4)', async () => {
    classifyResult = null; // classifier unavailable / no prediction

    render(<App />);
    selectDemoLocation(0); // Tiger Point -> nearest exhibit is the Tiger

    await capturePhoto();

    const dialog = await screen.findByRole('dialog', {
      name: /capture result/i,
    });
    expect(within(dialog).getByText('Malayan Tiger')).toBeInTheDocument();
    // Location-fallback due to unavailable recognition surfaces the note.
    expect(
      within(dialog).getByText(/recognition unavailable/i),
    ).toBeInTheDocument();
  });

  it('awards points once and keeps playerTotal stable when the same exhibit is tagged twice (Req 5.1, 5.2)', async () => {
    classifyResult = null; // always fall back to the nearest (Tiger)

    render(<App />);
    selectDemoLocation(0); // Tiger Point

    // First capture: Tiger tagged for the first time -> +30.
    await capturePhoto();
    let dialog = await screen.findByRole('dialog', { name: /capture result/i });
    expect(within(dialog).getByText('Malayan Tiger')).toBeInTheDocument();
    expect(within(dialog).getByText('+30 points')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /continue/i }));

    // Second capture of the same exhibit -> not a first tag, so no points
    // banner is shown (the total-stable assertion below confirms dedup).
    await capturePhoto();
    dialog = await screen.findByRole('dialog', { name: /capture result/i });
    expect(within(dialog).getByText('Malayan Tiger')).toBeInTheDocument();
    expect(within(dialog).queryByText(/\+\d+ points/)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /continue/i }));

    // The Collection tab shows both records but a stable total of 30.
    fireEvent.click(screen.getByRole('tab', { name: /collection/i }));
    expect(screen.getByLabelText('Points: 30')).toBeInTheDocument();
    expect(screen.getAllByText('Malayan Tiger')).toHaveLength(2);
  });

  it('still shows the Result Screen with a save-incomplete note when writeCollection fails (Req 7.2)', async () => {
    writeCollection.mockReturnValue(false);
    classifyResult = null;

    render(<App />);
    selectDemoLocation(0); // Tiger Point

    await capturePhoto();

    const dialog = await screen.findByRole('dialog', {
      name: /capture result/i,
    });
    expect(within(dialog).getByText('Malayan Tiger')).toBeInTheDocument();
    expect(
      within(dialog).getByText(/saving did not complete/i),
    ).toBeInTheDocument();
  });

  it('lists collected records and the derived playerTotal on the Collection tab (Req 7.3)', async () => {
    classifyResult = null;

    render(<App />);

    // Empty collection to start.
    fireEvent.click(screen.getByRole('tab', { name: /collection/i }));
    expect(screen.getByText(/no animals collected yet/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Points: 0')).toBeInTheDocument();

    // Capture the Tiger, then the Panda, from their respective demo locations.
    fireEvent.click(screen.getByRole('tab', { name: /nearby exhibit/i }));
    selectDemoLocation(0); // Tiger Point
    await capturePhoto();
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: /capture result/i }))
        .getByRole('button', { name: /continue/i }),
    );

    selectDemoLocation(1); // Panda Point
    await capturePhoto();
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: /capture result/i }))
        .getByRole('button', { name: /continue/i }),
    );

    // Collection now lists both exhibits with total = 30 + 25 = 55.
    fireEvent.click(screen.getByRole('tab', { name: /collection/i }));
    await waitFor(() =>
      expect(screen.getByLabelText('Points: 55')).toBeInTheDocument(),
    );
    expect(screen.getByText('Malayan Tiger')).toBeInTheDocument();
    expect(screen.getByText('Giant Panda')).toBeInTheDocument();
  });
});
