import { useEffect } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

/**
 * Module-scoped singleton so every component shares one AudioEngine instance.
 * Created lazily on first use.
 */
let sharedEngine: AudioEngine | null = null;

function getSharedEngine(): AudioEngine {
  if (sharedEngine === null) {
    sharedEngine = new AudioEngine();
  }
  return sharedEngine;
}

/**
 * Provides a singleton {@link AudioEngine} instance to components.
 *
 * - Returns `null` when neither the Web Speech API nor the Web Audio API is
 *   available (`AudioEngine.isSupported()` reports both as false). Consumers
 *   use this to skip rendering the sound trigger (Requirements 1.6, 5.4).
 * - Otherwise returns a lazily-created, module-scoped singleton instance.
 * - Calls `stop()` on unmount to tear down any in-progress playback.
 *
 * Requirements: 1.6, 5.4
 */
export function useAudioEngine(): AudioEngine | null {
  const support = AudioEngine.isSupported();
  const available = support.speech || support.oscillator;
  const engine = available ? getSharedEngine() : null;

  useEffect(() => {
    if (engine === null) {
      return;
    }
    return () => {
      engine.stop();
    };
  }, [engine]);

  return engine;
}
