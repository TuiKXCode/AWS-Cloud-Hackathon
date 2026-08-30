// src/components/__tests__/SoundTrigger.test.tsx
// Unit tests for the SoundTrigger component (Phase 3 / audio-polish, Task 4.2).
//
// Covers:
//  - Req 1.8: button visible when an exhibit is in range, absent otherwise.
//  - Req 1.1/1.7: clicking delegates to AudioEngine.playForExhibit(name).
//  - Playing visual state reflected while a cue is in progress.
//  - Not rendered when no audio API is available.
//  - Req 5.3: click handler stays responsive (does not block / await).

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SoundTrigger } from '../SoundTrigger';
import { AudioEngine } from '../../audio/AudioEngine';

/**
 * Builds a stub that satisfies the subset of the AudioEngine surface the
 * SoundTrigger uses: playForExhibit() and getState(). The stub lets each test
 * control when the "playing" cue resolves.
 */
function makeStubEngine(overrides?: {
  isPlaying?: boolean;
  playImpl?: (name: string) => Promise<void>;
}) {
  let playing = overrides?.isPlaying ?? false;
  const playForExhibit = vi.fn(
    overrides?.playImpl ??
      ((_name: string) => {
        playing = false;
        return Promise.resolve();
      }),
  );
  const getState = vi.fn(() => ({
    isPlaying: playing,
    lastPlayedExhibit: null,
    activeMethod: null as 'speech' | 'oscillator' | null,
    available: true,
  }));
  return {
    engine: { playForExhibit, getState } as unknown as AudioEngine,
    playForExhibit,
    getState,
    setPlaying: (v: boolean) => {
      playing = v;
    },
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SoundTrigger', () => {
  it('renders the button when an exhibit is within range', () => {
    vi.spyOn(AudioEngine, 'isSupported').mockReturnValue({
      speech: true,
      oscillator: true,
    });
    const { engine } = makeStubEngine();

    render(<SoundTrigger exhibitName="Asian Elephant" audioEngine={engine} />);

    expect(
      screen.getByRole('button', { name: 'Play exhibit sound' }),
    ).toBeInTheDocument();
  });

  it('renders nothing when exhibitName is null (Req 1.8)', () => {
    vi.spyOn(AudioEngine, 'isSupported').mockReturnValue({
      speech: true,
      oscillator: true,
    });
    const { engine } = makeStubEngine();

    const { container } = render(
      <SoundTrigger exhibitName={null} audioEngine={engine} />,
    );

    expect(
      screen.queryByRole('button', { name: 'Play exhibit sound' }),
    ).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('calls playForExhibit with the exhibit name on click (Req 1.1)', async () => {
    vi.spyOn(AudioEngine, 'isSupported').mockReturnValue({
      speech: true,
      oscillator: true,
    });
    const { engine, playForExhibit } = makeStubEngine();

    render(<SoundTrigger exhibitName="Malayan Tiger" audioEngine={engine} />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Play exhibit sound' }),
      );
    });

    expect(playForExhibit).toHaveBeenCalledTimes(1);
    expect(playForExhibit).toHaveBeenCalledWith('Malayan Tiger');
  });

  it('shows the playing state while a cue is in progress', async () => {
    vi.spyOn(AudioEngine, 'isSupported').mockReturnValue({
      speech: true,
      oscillator: true,
    });

    // A play promise we resolve manually so we can observe the mid-flight state.
    let resolvePlay: (() => void) | undefined;
    const stub = makeStubEngine({
      isPlaying: true,
      playImpl: () =>
        new Promise<void>((resolve) => {
          resolvePlay = () => {
            stub.setPlaying(false);
            resolve();
          };
        }),
    });

    render(<SoundTrigger exhibitName="Orangutan" audioEngine={stub.engine} />);

    const button = screen.getByRole('button', { name: 'Play exhibit sound' });
    fireEvent.click(button);

    // While playing: data attribute flips and pulse animation is applied.
    await waitFor(() => {
      expect(button).toHaveAttribute('data-playing', 'true');
    });
    expect(button.style.animation).toContain('sound-trigger-pulse');

    // Completing the cue clears the playing state.
    resolvePlay?.();
    await waitFor(() => {
      expect(button).toHaveAttribute('data-playing', 'false');
    });
  });

  it('does not render when no audio API is available', () => {
    vi.spyOn(AudioEngine, 'isSupported').mockReturnValue({
      speech: false,
      oscillator: false,
    });
    const { engine } = makeStubEngine();

    const { container } = render(
      <SoundTrigger exhibitName="Proboscis Monkey" audioEngine={engine} />,
    );

    expect(
      screen.queryByRole('button', { name: 'Play exhibit sound' }),
    ).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('remains responsive during playback — click handler returns without awaiting (Req 5.3)', () => {
    vi.spyOn(AudioEngine, 'isSupported').mockReturnValue({
      speech: true,
      oscillator: true,
    });

    // A play promise that never resolves; the handler must not block on it.
    const stub = makeStubEngine({
      isPlaying: true,
      playImpl: () => new Promise<void>(() => {}),
    });

    render(<SoundTrigger exhibitName="Hornbill" audioEngine={stub.engine} />);

    const button = screen.getByRole('button', { name: 'Play exhibit sound' });

    const start = performance.now();
    fireEvent.click(button);
    const elapsed = performance.now() - start;

    // The synchronous click dispatch returns effectively immediately even
    // though the underlying cue never completes.
    expect(elapsed).toBeLessThan(200);
    expect(button).toHaveAttribute('data-playing', 'true');
    expect(stub.playForExhibit).toHaveBeenCalledTimes(1);
  });
});
