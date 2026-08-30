// src/components/__tests__/TycoonShellIntegration.test.tsx
// Phase 7 shell integration: the tycoon game is a tab of the real <App />, not a
// separate entry point. These tests render the actual shell and verify the seam:
//
//   - The "Kitchen" tab exists alongside the Phase 1-6 tabs.
//   - Selecting it mounts the game without throwing (it is JSX + Tailwind inside
//     a TypeScript tree, so this is also the check that the two halves compose).
//   - The persistent questline Progress Bar stays mounted while playing, since
//     the game feeds the same total (PRD Phase 7, "Output").
//   - The game reads the collection written by the capture flow, so photographed
//     animals become the customers.
//
// Environment notes:
//   - geolocation is stubbed empty so LocationProvider falls back without hanging.
//   - matchMedia is stubbed because jsdom does not implement it and the game's
//     useLayout() hook uses it to choose the portrait/landscape board.

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../App';
import { writeCollection } from '../../engine/storage';
import { STORAGE_KEY } from '../../engine/playerState.js';
import type { CollectedRecord } from '../../types';

/** Set true by a test to simulate a phone-sized window. */
let compact = false;

beforeEach(() => {
  compact = false;
  localStorage.clear();

  // Fall back to a default location rather than waiting on a real fix.
  vi.stubGlobal('navigator', {
    ...globalThis.navigator,
    geolocation: {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(() => 0),
      clearWatch: vi.fn(),
    },
  });

  // jsdom ships no matchMedia. Two different consumers need it: the game's layout hook
  // (portrait vs landscape board) and the shell's compact-viewport check. `compact` lets
  // a test pretend to be a phone; the default is a roomy desktop.
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: /max-width: 900px|max-height: 780px/.test(query) ? compact : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

/** Switch to the Kitchen tab. */
function openKitchen(): void {
  fireEvent.click(screen.getByRole('tab', { name: 'Kitchen' }));
}

/**
 * The shell's persistent Progress Bar.
 *
 * Both the shell and the game's in-scene HUD expose a `progressbar` labelled
 * "Questline progress" — the game carried its own readout from when it ran
 * standalone. They are told apart by their scale: the shell reports a
 * percentage (max 100), the HUD reports raw points (max = the questline goal).
 */
function shellProgressBar(): HTMLElement {
  const bar = screen
    .getAllByRole('progressbar')
    .find((el) => el.getAttribute('aria-valuemax') === '100');
  if (!bar) throw new Error('shell progress bar not found');
  return bar;
}

describe('the tycoon game inside the app shell', () => {
  it('offers a Kitchen tab alongside the Phase 1-6 tabs', () => {
    render(<App />);

    for (const name of [
      'Nearby Exhibit',
      'Facilities',
      'Food Web',
      'Dining',
      'Collection',
      'My Animals',
      'Kitchen',
    ]) {
      expect(screen.getByRole('tab', { name })).toBeInTheDocument();
    }
  });

  it('mounts the game when the Kitchen tab is selected', () => {
    render(<App />);

    expect(() => openKitchen()).not.toThrow();
    expect(screen.getByRole('tab', { name: 'Kitchen' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('keeps the questline progress bar visible while playing', () => {
    render(<App />);
    openKitchen();

    // The game contributes to the same total, so the bar must not be swapped out.
    expect(shellProgressBar()).toBeInTheDocument();
  });

  it('starts the player on day 1 with no saved game', () => {
    render(<App />);
    openKitchen();

    expect(
      screen.getByRole('button', { name: /open for day\s*1/i }),
    ).toBeInTheDocument();
  });

  it('restores a saved tycoon day rather than resetting it', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        points: 40,
        collectedAnimals: [],
        voucherRedeemed: false,
        voucherCode: null,
        tycoon: { day: 4, funds: 30, upgrades: {}, bestDay: 25, earnedPoints: 40 },
      }),
    );

    render(<App />);
    openKitchen();

    expect(
      screen.getByRole('button', { name: /open for day\s*4/i }),
    ).toBeInTheDocument();
  });

  it('counts points banked by the game toward the questline total', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        points: 70,
        collectedAnimals: [],
        voucherRedeemed: false,
        voucherCode: null,
        tycoon: { day: 3, funds: 0, upgrades: {}, bestDay: 25, earnedPoints: 70 },
      }),
    );

    render(<App />);

    // 70 of the dataset's 140-point goal, contributed entirely by the game.
    expect(shellProgressBar()).toHaveAttribute('aria-valuenow', '50');
  });

  it('adds capture points and game points into one total', () => {
    const photo: CollectedRecord = {
      photo: 'data:image/jpeg;base64,AAAA',
      exhibitId: 'malayan-tiger', // 20 points
      recognizedVia: 'classifier',
      timestamp: 1_724_832_000_000,
    };
    writeCollection(JSON.stringify([photo]));

    // Then bank a game day worth 50 on top.
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        points: state.points + 50,
        tycoon: { ...state.tycoon, earnedPoints: 50 },
      }),
    );

    render(<App />);

    // (20 + 50) / 140 = 50%
    expect(shellProgressBar()).toHaveAttribute('aria-valuenow', '50');
  });
});

describe('sizing the game for the window it is in', () => {
  it('opens straight into fullscreen on a compact screen', () => {
    compact = true;
    render(<App />);
    openKitchen();

    // Fullscreen replaces the "Fullscreen" affordance with a way back out.
    expect(
      screen.getByRole('button', { name: /exit fullscreen/i }),
    ).toBeInTheDocument();
  });

  it('stays inside the tabbed shell on a roomy screen', () => {
    render(<App />);
    openKitchen();

    expect(screen.queryByRole('button', { name: /exit fullscreen/i })).toBeNull();
    expect(screen.getByRole('button', { name: /fullscreen/i })).toBeInTheDocument();
  });

  it('exiting fullscreen brings the tabs back', () => {
    compact = true;
    render(<App />);
    openKitchen();

    fireEvent.click(screen.getByRole('button', { name: /exit fullscreen/i }));

    expect(screen.getByRole('tab', { name: 'Kitchen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /exit fullscreen/i })).toBeNull();
  });

  it('stands the location chrome down while the kitchen is open', () => {
    render(<App />);
    // The simulator is a combobox; it belongs to the location-driven views.
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    openKitchen();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('brings the location chrome back on a location tab', () => {
    render(<App />);
    openKitchen();
    expect(screen.queryByRole('combobox')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Nearby Exhibit' }));
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('does not repeat the app title inside the game', () => {
    render(<App />);
    openKitchen();

    // The shell heading is the visible one; the game's own is screen-reader only, so
    // the board does not pay ~30px for a duplicate.
    const visible = screen
      .getAllByText(/Mandai Echoes/i)
      .filter((el) => !el.className.includes('sr-only'));
    expect(visible.length).toBe(1);
  });
});
