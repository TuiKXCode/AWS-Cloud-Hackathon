// src/components/__tests__/QuestlineShellIntegration.test.tsx
// Feature: questline-progress — App shell integration tests (Task 7.2).
//
// These tests render the real <App /> (LocationProvider > CaptureProvider >
// QuestlineProvider > AppShell) and verify the Phase 5 wiring end-to-end:
//   - The persistent Progress Bar is present and stays present across tab
//     switches (Req 1.1).
//   - Below the completion threshold, no Redemption Voucher overlay is shown
//     (Req 2.7).
//   - At/over the threshold (and not redeemed), the voucher overlay appears on
//     the next commit with no polling (Req 2.1); tapping "Mark as redeemed"
//     hides it and it stays hidden even while the questline is complete
//     (Req 3.2).
//
// Determinism strategy (mirrors CheckpointCaptureIntegration.test.tsx):
//   - '../../data/mandaiData.js' is mocked with a small questlineConfig
//     (totalPointsToComplete: 100) plus deterministic exhibits/demoLocations so
//     the shell renders without touching the real dataset.
//   - '../context/CaptureContext' is mocked so useCapture() returns a
//     controllable playerTotal and CaptureProvider is a passthrough. The mock
//     supplies the full CaptureContextValue shape so every consumer
//     (AppShell, TakePhotoButton, CollectionView, etc.) renders safely.
//   - navigator geolocation is stubbed empty so LocationProvider falls back to
//     a default location without hanging.
//   - Real localStorage is used and cleared per test so the voucher
//     code/redeemed persistence behaves like production.

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

// --- Deterministic dataset. -----------------------------------------------
// A single exhibit + demo location keeps the shell simple; the questlineConfig
// completion goal is 100 so we can drive playerTotal across the threshold.
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
  ];
  const demoLocations = [{ label: 'Tiger Point', lat: 1.41, lng: 103.8 }];
  return { mockData: { exhibits, demoLocations } };
});

vi.mock('../../data/mandaiData.js', () => ({
  exhibits: mockData.exhibits,
  facilities: [],
  demoLocations: mockData.demoLocations,
  dining: [],
  questlineConfig: {
    totalPointsToComplete: 100,
    prizeLabel: 'Free scoop at Ah Meng Restaurant',
  },
}));

// --- Controllable Capture context. ----------------------------------------
// The QuestlineProvider reads `playerTotal` from useCapture(); AppShell and the
// exhibit tab read phase/result/cameraUnavailable/dismissResult and the capture
// action callbacks. We mock the whole module: CaptureProvider is a passthrough
// and useCapture returns a full value shape with a controllable playerTotal.
let currentPlayerTotal = 0;
const captureCallbacks = {
  handleCapturedFile: vi.fn(async () => {}),
  handleCaptureCancelled: vi.fn(),
  reportCameraUnavailable: vi.fn(),
  dismissResult: vi.fn(),
};

vi.mock('../../context/CaptureContext', () => ({
  CaptureProvider: ({ children }: { children: ReactNode }) => children,
  useCapture: () => ({
    phase: 'idle' as const,
    cameraUnavailable: false,
    result: null,
    collection: [],
    playerTotal: currentPlayerTotal,
    retainedImage: null,
    recognitionUnavailable: false,
    ...captureCallbacks,
  }),
}));

import { App } from '../../App';

beforeEach(() => {
  currentPlayerTotal = 0;
  Object.values(captureCallbacks).forEach((fn) => fn.mockClear());
  localStorage.clear();
  // No geolocation: LocationProvider falls back to a default location without
  // waiting on the (absent) geolocation API.
  vi.stubGlobal('navigator', {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const VOUCHER_LABEL = 'Redemption voucher';

describe('Questline shell integration', () => {
  it('renders the persistent Progress Bar and keeps it present across tab switches (Req 1.1)', () => {
    render(<App />);

    // Present on the initial (exhibit) tab.
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Switch to Facilities — the bar lives above the tabs so it must remain.
    fireEvent.click(screen.getByRole('tab', { name: /facilities/i }));
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // And back to the exhibit tab.
    fireEvent.click(screen.getByRole('tab', { name: /nearby exhibit/i }));
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('does not show the voucher overlay while below the completion threshold (Req 2.7)', () => {
    currentPlayerTotal = 0;
    render(<App />);

    expect(
      screen.queryByRole('dialog', { name: VOUCHER_LABEL }),
    ).not.toBeInTheDocument();
  });

  it('shows the voucher overlay at/over the threshold and hides it (and keeps it hidden) after Mark as redeemed (Req 2.1, 3.2)', async () => {
    currentPlayerTotal = 100; // exactly meets the goal
    render(<App />);

    // The overlay appears on the next commit (code generated via an effect).
    const dialog = await screen.findByRole('dialog', { name: VOUCHER_LABEL });
    expect(dialog).toBeInTheDocument();
    // The configured prize label and a voucher code are presented.
    expect(
      screen.getByText('Free scoop at Ah Meng Restaurant'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('voucher-code').textContent).toMatch(
      /^[A-Z0-9]{6,32}$/,
    );

    // Mark as redeemed: the overlay is suppressed even though still complete.
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /mark as redeemed/i }),
      );
    });

    expect(
      screen.queryByRole('dialog', { name: VOUCHER_LABEL }),
    ).not.toBeInTheDocument();

    // The redeemed flag is persisted so it survives a fresh mount (Req 3.2).
    cleanup();
    render(<App />);
    expect(
      screen.queryByRole('dialog', { name: VOUCHER_LABEL }),
    ).not.toBeInTheDocument();
  });
});
