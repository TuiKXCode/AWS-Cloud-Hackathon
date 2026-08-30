// src/components/SoundTrigger.tsx
// SoundTrigger: a button rendered on the NearbyExhibitCard that plays a
// placeholder audio cue for the exhibit currently in range. Part of Phase 3
// (audio-polish).
//
// Responsibilities:
//  - Render a speaker button only when an exhibit is within range, i.e.
//    `exhibitName` is non-null (Req 1.8). When null, render nothing.
//  - On click, delegate to AudioEngine.playForExhibit(name). The engine
//    ignores duplicate requests while playing (Req 1.7) and never rejects
//    (Req 1.1), so the click handler stays non-blocking (Req 5.3).
//  - Reflect a pulsing "playing" visual state while a cue is in progress.
//  - Do not render at all when no audio API is available in this environment
//    (both speech and oscillator unsupported).
//
// Tailwind is NOT available in this project, so the pulse state is expressed
// with inline styles and a keyframes rule injected once at module load.

import { useEffect, useRef, useState } from 'react';

import { AudioEngine } from '../audio/AudioEngine';

export interface SoundTriggerProps {
  /** Name of the nearby exhibit, or null when nothing is within range. */
  exhibitName: string | null;
  /** The shared AudioEngine instance used to produce the cue. */
  audioEngine: AudioEngine;
}

// Inject the pulse keyframes exactly once. Guarded for SSR / repeated mounts.
const PULSE_STYLE_ID = 'sound-trigger-pulse-keyframes';
function ensurePulseKeyframes(): void {
  if (typeof document === 'undefined') {
    return;
  }
  if (document.getElementById(PULSE_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = PULSE_STYLE_ID;
  style.textContent =
    '@keyframes sound-trigger-pulse {' +
    '0% { opacity: 1; }' +
    '50% { opacity: 0.4; }' +
    '100% { opacity: 1; }' +
    '}';
  document.head.appendChild(style);
}

/**
 * Speaker button that triggers a placeholder audio cue for the nearby exhibit.
 */
export function SoundTrigger({ exhibitName, audioEngine }: SoundTriggerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  // Poll interval handle used to reconcile local state with the engine, so the
  // button leaves the playing state when the cue ends internally.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ensurePulseKeyframes();
  }, []);

  // Clean up any poll timer on unmount.
  useEffect(() => {
    return () => {
      if (pollRef.current !== null) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  // Determine audio support once per render. If neither API is available, the
  // component renders nothing regardless of exhibit proximity.
  const support = AudioEngine.isSupported();
  if (!support.speech && !support.oscillator) {
    return null;
  }

  // Req 1.8: only show the trigger when an exhibit is within range.
  if (exhibitName === null) {
    return null;
  }

  const startPolling = () => {
    if (pollRef.current !== null) {
      return;
    }
    pollRef.current = setInterval(() => {
      if (!audioEngine.getState().isPlaying) {
        setIsPlaying(false);
        if (pollRef.current !== null) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    }, 100);
  };

  const handleClick = () => {
    // Reflect the playing state immediately for responsiveness (Req 5.3).
    setIsPlaying(true);
    startPolling();

    // playForExhibit never rejects (Req 1.1). We intentionally do not await it
    // in the handler so the UI stays responsive; when the promise settles the
    // cue is done, so we drop the local playing flag. The poll above also
    // covers the internal-completion path.
    void audioEngine
      .playForExhibit(exhibitName)
      .then(() => {
        setIsPlaying(false);
        if (pollRef.current !== null) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      })
      .catch(() => {
        // Defensive: playForExhibit is documented never to reject, but we
        // reset state anyway rather than leaving the button stuck.
        setIsPlaying(false);
        if (pollRef.current !== null) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      });
  };

  const buttonStyle: React.CSSProperties = {
    cursor: 'pointer',
    fontSize: '1.25rem',
    lineHeight: 1,
    background: 'transparent',
    border: 'none',
    padding: '0.25rem',
    // Pulse the icon while playing (Tailwind's animate-pulse equivalent).
    animation: isPlaying ? 'sound-trigger-pulse 1s ease-in-out infinite' : undefined,
  };

  return (
    <button
      type="button"
      className="sound-trigger"
      aria-label="Play exhibit sound"
      aria-pressed={isPlaying}
      data-playing={isPlaying ? 'true' : 'false'}
      onClick={handleClick}
      style={buttonStyle}
    >
      <span aria-hidden="true">🔊</span>
    </button>
  );
}

export default SoundTrigger;
