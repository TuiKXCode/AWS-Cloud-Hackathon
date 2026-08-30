// src/audio/__tests__/AudioEngine.test.ts
// Example-based unit tests for the AudioEngine module. Browser audio APIs
// (speechSynthesis, AudioContext/OscillatorNode) are mocked via vi.stubGlobal.
//
// Covers Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, and 5.5.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from '../AudioEngine';

// ---------------------------------------------------------------------------
// Mock: speechSynthesis + SpeechSynthesisUtterance
// ---------------------------------------------------------------------------

type UtteranceEventHandler = (() => void) | null;

interface MockUtterance {
  text: string;
  onstart: UtteranceEventHandler;
  onend: UtteranceEventHandler;
  onerror: UtteranceEventHandler;
}

/**
 * Installs a speechSynthesis mock whose `speak` behavior is controlled by
 * `mode`:
 *  - 'start-then-end': fires onstart, then onend on a microtask (normal path).
 *  - 'never-start': never fires onstart (exercises the 500ms timeout).
 *  - 'error-before-start': fires onerror without onstart.
 *  - 'throw': speak() throws synchronously.
 * Returns handles for assertions.
 */
function stubSpeechSynthesis(
  mode: 'start-then-end' | 'never-start' | 'error-before-start' | 'throw',
) {
  const utterances: MockUtterance[] = [];
  const speak = vi.fn((u: MockUtterance) => {
    utterances.push(u);
    if (mode === 'throw') {
      throw new Error('speak boom');
    }
    if (mode === 'start-then-end') {
      // Fire start synchronously-ish, then end shortly after.
      u.onstart?.();
      setTimeout(() => u.onend?.(), 5);
    } else if (mode === 'error-before-start') {
      u.onerror?.();
    }
    // 'never-start': do nothing, let the engine time out.
  });
  const cancel = vi.fn();

  vi.stubGlobal('speechSynthesis', { speak, cancel });
  // Provide a constructor that produces a mutable mock utterance object.
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      onstart: UtteranceEventHandler = null;
      onend: UtteranceEventHandler = null;
      onerror: UtteranceEventHandler = null;
      constructor(text: string) {
        this.text = text;
      }
    },
  );

  // jsdom's window needs the same globals for the `'speechSynthesis' in window`
  // check; vi.stubGlobal assigns to globalThis which is window under jsdom.
  return { speak, cancel, utterances };
}

// ---------------------------------------------------------------------------
// Mock: AudioContext / OscillatorNode
// ---------------------------------------------------------------------------

interface MockOscillator {
  type: string;
  frequency: { value: number };
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
}

function stubAudioContext(options?: { failConstruct?: boolean }) {
  const created: MockOscillator[] = [];

  class MockAudioContext {
    state = 'running';
    destination = {};
    constructor() {
      if (options?.failConstruct) {
        throw new Error('AudioContext construction failed');
      }
    }
    resume = vi.fn(() => Promise.resolve());
    createOscillator(): MockOscillator {
      const osc: MockOscillator = {
        type: 'sine',
        frequency: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        // stop() triggers onended, mirroring real behavior.
        stop: vi.fn(function (this: MockOscillator) {
          this.onended?.();
        }),
        onended: null,
      };
      created.push(osc);
      return osc;
    }
  }

  vi.stubGlobal('AudioContext', MockAudioContext);
  return { created };
}

function clearAudioApis() {
  vi.stubGlobal('speechSynthesis', undefined);
  vi.stubGlobal('SpeechSynthesisUtterance', undefined);
  vi.stubGlobal('AudioContext', undefined);
  vi.stubGlobal('webkitAudioContext', undefined);
}

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AudioEngine.isSupported', () => {
  it('reports both APIs when available', () => {
    stubSpeechSynthesis('start-then-end');
    stubAudioContext();
    const support = AudioEngine.isSupported();
    expect(support.speech).toBe(true);
    expect(support.oscillator).toBe(true);
  });

  it('reports neither API when unavailable', () => {
    clearAudioApis();
    const support = AudioEngine.isSupported();
    expect(support.speech).toBe(false);
    expect(support.oscillator).toBe(false);
  });

  it('detects webkit-prefixed AudioContext', () => {
    clearAudioApis();
    vi.stubGlobal('webkitAudioContext', class {});
    expect(AudioEngine.isSupported().oscillator).toBe(true);
  });
});

describe('playForExhibit — speech path (Req 1.1, 1.3, 1.4)', () => {
  it('uses speechSynthesis and speaks the exhibit name', async () => {
    const { speak, utterances } = stubSpeechSynthesis('start-then-end');
    stubAudioContext();
    const engine = new AudioEngine();

    const promise = engine.playForExhibit('Malayan Tiger');
    // Advance past the onend timeout.
    await vi.advanceTimersByTimeAsync(10);
    await promise;

    expect(speak).toHaveBeenCalledTimes(1);
    // Req 1.4: utterance text is the exhibit name.
    expect(utterances[0].text).toBe('Malayan Tiger');
    // Ends idle.
    expect(engine.getState().isPlaying).toBe(false);
    expect(engine.getState().lastPlayedExhibit).toBe('Malayan Tiger');
  });
});

describe('playForExhibit — oscillator fallback (Req 1.3, 1.5)', () => {
  it('falls back to oscillator when speechSynthesis is unavailable', async () => {
    // No speech, but audio context present.
    vi.stubGlobal('speechSynthesis', undefined);
    vi.stubGlobal('SpeechSynthesisUtterance', undefined);
    const { created } = stubAudioContext();
    const engine = new AudioEngine();

    const promise = engine.playForExhibit('Orangutan');
    await vi.advanceTimersByTimeAsync(1100);
    await promise;

    expect(created).toHaveLength(1);
    const osc = created[0];
    expect(osc.type).toBe('sine');
    expect(osc.start).toHaveBeenCalledTimes(1);
    // Req 1.5: frequency within 200–800 Hz.
    expect(osc.frequency.value).toBeGreaterThanOrEqual(200);
    expect(osc.frequency.value).toBeLessThanOrEqual(800);
    expect(engine.getState().isPlaying).toBe(false);
  });

  it('derives a deterministic frequency for the same exhibit name', async () => {
    vi.stubGlobal('speechSynthesis', undefined);
    const { created } = stubAudioContext();
    const engine = new AudioEngine();

    const p1 = engine.playForExhibit('Proboscis Monkey');
    await vi.advanceTimersByTimeAsync(1100);
    await p1;
    const p2 = engine.playForExhibit('Proboscis Monkey');
    await vi.advanceTimersByTimeAsync(1100);
    await p2;

    expect(created).toHaveLength(2);
    expect(created[0].frequency.value).toBe(created[1].frequency.value);
  });

  it('respects custom frequency and duration bounds (Req 1.5)', async () => {
    vi.stubGlobal('speechSynthesis', undefined);
    const { created } = stubAudioContext();
    const engine = new AudioEngine({
      minFrequency: 300,
      maxFrequency: 400,
      minDuration: 200,
      maxDuration: 1000,
    });

    const promise = engine.playForExhibit('Hornbill');
    await vi.advanceTimersByTimeAsync(1100);
    await promise;

    expect(created[0].frequency.value).toBeGreaterThanOrEqual(300);
    expect(created[0].frequency.value).toBeLessThanOrEqual(400);
    // The stop() call (auto-stop after duration) must have occurred.
    expect(created[0].stop).toHaveBeenCalledTimes(1);
  });
});

describe('playForExhibit — speech timeout fallback (Req 1.3)', () => {
  it('falls back to oscillator when speechSynthesis never starts', async () => {
    const { speak, cancel } = stubSpeechSynthesis('never-start');
    const { created } = stubAudioContext();
    const engine = new AudioEngine();

    const promise = engine.playForExhibit('Sun Bear');
    // Cross the 500ms speech-start timeout, then the oscillator duration.
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1100);
    await promise;

    expect(speak).toHaveBeenCalledTimes(1);
    // Timed-out utterance is cancelled before falling back.
    expect(cancel).toHaveBeenCalled();
    expect(created).toHaveLength(1);
    expect(engine.getState().isPlaying).toBe(false);
  });

  it('falls back when speechSynthesis errors before starting', async () => {
    stubSpeechSynthesis('error-before-start');
    const { created } = stubAudioContext();
    const engine = new AudioEngine();

    const promise = engine.playForExhibit('Otter');
    await vi.advanceTimersByTimeAsync(1100);
    await promise;

    expect(created).toHaveLength(1);
    expect(engine.getState().isPlaying).toBe(false);
  });

  it('falls back when speechSynthesis.speak() throws (Req 1.2)', async () => {
    stubSpeechSynthesis('throw');
    const { created } = stubAudioContext();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = new AudioEngine();

    const promise = engine.playForExhibit('Tapir');
    await vi.advanceTimersByTimeAsync(1100);
    await promise;

    expect(warn).toHaveBeenCalled();
    expect(created).toHaveLength(1);
    expect(engine.getState().isPlaying).toBe(false);
  });
});

describe('playForExhibit — duplicate guard (Req 1.7)', () => {
  it('ignores a duplicate request while a cue is playing', async () => {
    const { speak } = stubSpeechSynthesis('never-start'); // stays "playing"
    stubAudioContext();
    const engine = new AudioEngine();

    // First call begins and stays in-flight (speech not started yet).
    const first = engine.playForExhibit('Elephant');
    expect(engine.getState().isPlaying).toBe(true);

    // Second call while playing should be ignored — no additional speak.
    await engine.playForExhibit('Elephant');
    expect(speak).toHaveBeenCalledTimes(1);

    // Let the first call complete via timeout + oscillator.
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1100);
    await first;
    expect(engine.getState().isPlaying).toBe(false);
  });
});

describe('playForExhibit — no APIs available (Req 1.6)', () => {
  it('logs a warning and takes no action', async () => {
    clearAudioApis();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = new AudioEngine();

    await engine.playForExhibit('Nothing');

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('No audio API available'),
    );
    expect(engine.getState().isPlaying).toBe(false);
    expect(engine.getState().available).toBe(false);
  });
});

describe('failed playback resets to idle (Req 5.5)', () => {
  it('resets state when AudioContext construction fails', async () => {
    vi.stubGlobal('speechSynthesis', undefined);
    stubAudioContext({ failConstruct: true });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = new AudioEngine();

    await engine.playForExhibit('Broken');

    expect(warn).toHaveBeenCalled();
    expect(engine.getState().isPlaying).toBe(false);
    expect(engine.getState().activeMethod).toBeNull();
  });
});

describe('stop()', () => {
  it('cancels speech and resets state', async () => {
    const { cancel } = stubSpeechSynthesis('never-start');
    stubAudioContext();
    const engine = new AudioEngine();

    const promise = engine.playForExhibit('Gibbon');
    expect(engine.getState().isPlaying).toBe(true);

    engine.stop();
    expect(cancel).toHaveBeenCalled();
    expect(engine.getState().isPlaying).toBe(false);

    // Drain the in-flight promise cleanly.
    await vi.advanceTimersByTimeAsync(2000);
    await promise;
  });
});
