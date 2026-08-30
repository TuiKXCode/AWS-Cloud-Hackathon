// src/audio/AudioEngine.ts
// The Audio Engine: a standalone, React-independent module that generates
// placeholder audio cues for exhibits. It prefers the Web Speech API
// (speechSynthesis) and falls back to a Web Audio API oscillator tone.
//
// Part of Phase 3 (audio-polish). The engine is intentionally decoupled from
// React so it can be unit-tested in isolation with mocked browser APIs. Every
// public method is failure-tolerant: playForExhibit() never rejects, and all
// errors are caught and reported via console.warn (Requirements 1.2, 1.6, 5.5).

/**
 * Tuning options for the oscillator fallback. All values have sensible
 * defaults matching Requirement 1.5 (200–800 Hz, 200–1000 ms).
 */
export interface AudioEngineOptions {
  /** Minimum oscillator frequency in Hz. Default 200. */
  minFrequency?: number;
  /** Maximum oscillator frequency in Hz. Default 800. */
  maxFrequency?: number;
  /** Minimum oscillator duration in ms. Default 200. */
  minDuration?: number;
  /** Maximum oscillator duration in ms. Default 1000. */
  maxDuration?: number;
}

/**
 * Observable state of the engine. Exposed via {@link AudioEngine.getState}.
 */
export interface AudioEngineState {
  /** True while a cue is playing (guards against duplicate requests). */
  isPlaying: boolean;
  /** The name of the most recently requested exhibit, or null. */
  lastPlayedExhibit: string | null;
  /** Which API is currently producing sound, or null when idle. */
  activeMethod: 'speech' | 'oscillator' | null;
  /** False when neither audio API is available in this environment. */
  available: boolean;
}

/** Result of {@link AudioEngine.isSupported}. */
export interface AudioSupportResult {
  /** Whether the Web Speech API (speechSynthesis) is available. */
  speech: boolean;
  /** Whether the Web Audio API (AudioContext) is available. */
  oscillator: boolean;
}

/** Milliseconds to wait for speechSynthesis to start before falling back. */
const SPEECH_START_TIMEOUT_MS = 500;

const DEFAULTS: Required<AudioEngineOptions> = {
  minFrequency: 200,
  maxFrequency: 800,
  minDuration: 200,
  maxDuration: 1000,
};

/**
 * Resolve the AudioContext constructor across standard and webkit-prefixed
 * environments, returning undefined when unavailable.
 */
function getAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

/**
 * A small, deterministic string hash (djb2 variant). Used to map an exhibit
 * name onto a stable frequency so each exhibit gets a consistent tone.
 */
function simpleStringHash(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  // Force to an unsigned 32-bit integer.
  return hash >>> 0;
}

class AudioEngine {
  private readonly options: Required<AudioEngineOptions>;

  private isPlaying = false;
  private lastPlayedExhibit: string | null = null;
  private activeMethod: 'speech' | 'oscillator' | null = null;

  // Active resource handles, retained so stop() can tear them down.
  private audioContext: AudioContext | null = null;
  private activeOscillator: OscillatorNode | null = null;
  private oscillatorTimer: ReturnType<typeof setTimeout> | null = null;
  private speechStartTimer: ReturnType<typeof setTimeout> | null = null;
  // Settles the in-flight trySpeech promise if stop() is called mid-flight.
  private pendingSpeechSettle: ((started: boolean) => void) | null = null;

  constructor(options?: AudioEngineOptions) {
    this.options = { ...DEFAULTS, ...(options ?? {}) };
  }

  /** Returns a snapshot of the current engine state. */
  getState(): AudioEngineState {
    const support = AudioEngine.isSupported();
    return {
      isPlaying: this.isPlaying,
      lastPlayedExhibit: this.lastPlayedExhibit,
      activeMethod: this.activeMethod,
      available: support.speech || support.oscillator,
    };
  }

  /**
   * Detects browser API availability without triggering playback.
   * (Requirements 1.3, 1.6.)
   */
  static isSupported(): AudioSupportResult {
    const hasWindow = typeof window !== 'undefined';
    const speech = hasWindow && 'speechSynthesis' in window && !!window.speechSynthesis;
    const oscillator = getAudioContextCtor() !== undefined;
    return { speech, oscillator };
  }

  /**
   * Attempts to play a placeholder audio cue for the given exhibit.
   *
   * Resolves when playback completes or is skipped. Never rejects — all errors
   * are caught and logged via console.warn (Requirements 1.1, 1.2, 5.5).
   *
   * Behavior:
   * - Duplicate requests while playing are ignored (Requirement 1.7).
   * - speechSynthesis is attempted first; if unavailable, failing, or not
   *   started within 500 ms, falls back to the oscillator (Requirements 1.3).
   * - If neither API is available, logs a warning and takes no action
   *   (Requirement 1.6).
   */
  async playForExhibit(exhibitName: string): Promise<void> {
    // Requirement 1.7: ignore duplicate requests while a cue is in progress.
    if (this.isPlaying) {
      return;
    }

    const support = AudioEngine.isSupported();

    // Requirement 1.6: neither API available — warn and do nothing.
    if (!support.speech && !support.oscillator) {
      console.warn(
        '[audio-polish] No audio API available — sound features disabled.',
      );
      return;
    }

    this.isPlaying = true;
    this.lastPlayedExhibit = exhibitName;

    try {
      if (support.speech) {
        const started = await this.trySpeech(exhibitName);
        if (started) {
          return;
        }
        // Speech did not start (unavailable/failed/timed out) — fall through.
      }

      if (support.oscillator) {
        await this.tryOscillator(exhibitName);
        return;
      }

      // Speech was the only reported API but failed to start.
      console.warn(
        '[audio-polish] speechSynthesis failed and no oscillator fallback available.',
      );
      this.resetPlaybackState();
    } catch (error) {
      // Requirements 1.2 / 5.5: never let errors escape; reset to idle.
      console.warn(
        '[audio-polish] Unexpected error during playback, resetting:',
        error instanceof Error ? error.message : String(error),
      );
      this.resetPlaybackState();
    }
  }

  /**
   * Stops any in-progress playback and resets state. Safe to call at any time.
   */
  stop(): void {
    if (this.speechStartTimer !== null) {
      clearTimeout(this.speechStartTimer);
      this.speechStartTimer = null;
    }
    if (this.oscillatorTimer !== null) {
      clearTimeout(this.oscillatorTimer);
      this.oscillatorTimer = null;
    }

    // Cancel any pending/active speech utterance.
    try {
      if (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        window.speechSynthesis
      ) {
        window.speechSynthesis.cancel();
      }
    } catch (error) {
      console.warn(
        '[audio-polish] Error cancelling speech:',
        error instanceof Error ? error.message : String(error),
      );
    }

    // Settle any in-flight speech promise so playForExhibit() resolves.
    // Report started=true to prevent the caller falling through to oscillator.
    if (this.pendingSpeechSettle !== null) {
      const settle = this.pendingSpeechSettle;
      this.pendingSpeechSettle = null;
      settle(true);
    }

    // Stop and disconnect any active oscillator.
    if (this.activeOscillator) {
      try {
        this.activeOscillator.stop();
      } catch {
        // Oscillator may already be stopped; ignore.
      }
      try {
        this.activeOscillator.disconnect();
      } catch {
        // Ignore disconnect errors.
      }
      this.activeOscillator = null;
    }

    this.resetPlaybackState();
  }

  /**
   * Attempts speechSynthesis playback. Resolves true if the utterance started
   * (and playback state will be reset on end/error), or false if it did not
   * start within the timeout / failed / is unavailable — signalling the caller
   * to fall back to the oscillator.
   */
  private trySpeech(exhibitName: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (started: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        this.pendingSpeechSettle = null;
        if (this.speechStartTimer !== null) {
          clearTimeout(this.speechStartTimer);
          this.speechStartTimer = null;
        }
        resolve(started);
      };
      // Expose the settler so stop() can resolve this promise if it interrupts
      // playback before speech starts/ends.
      this.pendingSpeechSettle = settle;

      try {
        const synth = window.speechSynthesis;
        // Requirement 1.4: use the exhibit name with the browser's default
        // voice, rate, and pitch (we intentionally leave those unset).
        const utterance = new SpeechSynthesisUtterance(exhibitName);
        this.activeMethod = 'speech';

        utterance.onstart = () => {
          settle(true);
        };
        utterance.onend = () => {
          this.resetPlaybackState();
          settle(true);
        };
        utterance.onerror = () => {
          // Requirement 5.5: failed playback resets to idle. If it errors
          // before starting, fall back; if after starting, just reset.
          if (!settled) {
            settle(false);
          } else {
            this.resetPlaybackState();
          }
        };

        // Requirement: 500 ms timeout — if onstart hasn't fired, cancel and
        // fall back to the oscillator.
        this.speechStartTimer = setTimeout(() => {
          try {
            synth.cancel();
          } catch {
            // ignore
          }
          settle(false);
        }, SPEECH_START_TIMEOUT_MS);

        synth.speak(utterance);
      } catch (error) {
        console.warn(
          '[audio-polish] speechSynthesis threw, falling back to oscillator:',
          error instanceof Error ? error.message : String(error),
        );
        settle(false);
      }
    });
  }

  /**
   * Attempts Web Audio API oscillator playback. Generates a sine tone at a
   * deterministic frequency derived from the exhibit name (Requirement 1.5),
   * schedules an automatic stop, and resets state on completion.
   */
  private tryOscillator(exhibitName: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const Ctor = getAudioContextCtor();
      if (!Ctor) {
        console.warn('[audio-polish] Web Audio API unavailable.');
        this.resetPlaybackState();
        resolve();
        return;
      }

      try {
        this.activeMethod = 'oscillator';
        const context = this.audioContext ?? new Ctor();
        this.audioContext = context;

        // Some browsers start the context suspended (autoplay policy).
        if (context.state === 'suspended' && typeof context.resume === 'function') {
          context.resume().catch((error: unknown) => {
            console.warn(
              '[audio-polish] AudioContext resume failed:',
              error instanceof Error ? error.message : String(error),
            );
          });
        }

        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = this.deriveFrequency(exhibitName);
        oscillator.connect(context.destination);

        this.activeOscillator = oscillator;

        const durationMs = this.deriveDuration(exhibitName);

        const finish = () => {
          if (this.oscillatorTimer !== null) {
            clearTimeout(this.oscillatorTimer);
            this.oscillatorTimer = null;
          }
          if (this.activeOscillator === oscillator) {
            try {
              oscillator.disconnect();
            } catch {
              // ignore
            }
            this.activeOscillator = null;
          }
          this.resetPlaybackState();
          resolve();
        };

        oscillator.onended = finish;

        oscillator.start();
        // Requirement 1.5: stop automatically after the tone duration.
        this.oscillatorTimer = setTimeout(() => {
          try {
            oscillator.stop();
          } catch {
            // If stop() throws (already stopped), finish manually.
            finish();
          }
        }, durationMs);
      } catch (error) {
        // Requirement 1.2 / 5.5: catch, log, reset to idle.
        console.warn(
          '[audio-polish] Oscillator playback failed:',
          error instanceof Error ? error.message : String(error),
        );
        this.resetPlaybackState();
        resolve();
      }
    });
  }

  /**
   * Maps an exhibit name to a stable frequency within [minFrequency,
   * maxFrequency]. The range is inclusive of the minimum; a zero-width range
   * simply returns the minimum.
   */
  private deriveFrequency(exhibitName: string): number {
    const { minFrequency, maxFrequency } = this.options;
    const span = Math.max(0, maxFrequency - minFrequency);
    if (span === 0) {
      return minFrequency;
    }
    const hash = simpleStringHash(exhibitName);
    return minFrequency + (hash % (span + 1));
  }

  /**
   * Maps an exhibit name to a stable duration within [minDuration,
   * maxDuration] milliseconds.
   */
  private deriveDuration(exhibitName: string): number {
    const { minDuration, maxDuration } = this.options;
    const span = Math.max(0, maxDuration - minDuration);
    if (span === 0) {
      return minDuration;
    }
    // Offset the hash so the duration is not perfectly correlated with freq.
    const hash = simpleStringHash(`${exhibitName}#duration`);
    return minDuration + (hash % (span + 1));
  }

  /** Clears playback flags without tearing down resources. */
  private resetPlaybackState(): void {
    this.isPlaying = false;
    this.activeMethod = null;
  }
}

export { AudioEngine, simpleStringHash };
