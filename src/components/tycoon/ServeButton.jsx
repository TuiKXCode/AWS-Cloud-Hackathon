import React from 'react';
import { PALETTE } from '../../game/constants.js';

/**
 * The big glowing SERVE button from the reference, sitting on the floor at the bottom of the
 * scene. It only lights up when the plate actually matches the order it is aimed at, which
 * makes it a readable "yes, this is right" signal rather than a guess.
 *
 * It is dead while the chef is on his feet — fetching, carrying or delivering — which is what
 * gives the kitchen layout teeth. Lining up a bad route costs real seconds.
 */
export default function ServeButton({
  layout,
  busy,
  busyLabel,
  plateCount,
  ready,
  targetName,
  onServe,
}) {
  const disabled = busy || plateCount === 0;

  const hint = busy
    ? busyLabel
    : plateCount === 0
      ? 'tap a counter to fetch food'
      : targetName
        ? `→ ${targetName}`
        : 'tap a table';

  return (
    <div
      className="absolute z-[1900] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
      style={{ left: `${layout.serve.x}%`, top: `${layout.serve.y}%` }}
    >
      <span className="whitespace-nowrap rounded-full bg-black/75 px-2 py-[2px] text-[10px] font-bold text-amber-100 shadow">
        {hint}
      </span>

      <button
        type="button"
        onClick={onServe}
        disabled={disabled}
        className={`flex h-12 w-12 items-center justify-center rounded-full text-[10px] font-black uppercase tracking-wide transition active:scale-95 disabled:active:scale-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70 sm:h-16 sm:w-16 sm:text-xs ${
          disabled
            ? 'cursor-not-allowed text-amber-200/60'
            : ready
              ? 'text-[#4A2E13]'
              : 'text-[#4A2E13]/85'
        }`}
        style={{
          background: disabled
            ? 'radial-gradient(circle at 38% 28%, #A97F3A, #6E4E18 78%)'
            : 'radial-gradient(circle at 38% 28%, #FDE68A, #F0A81E 62%, #B4700C)',
          boxShadow: disabled
            ? `0 0 0 3px ${PALETTE.outline}, 0 2px 4px rgba(0,0,0,0.4)`
            : ready
              ? `0 0 0 3px ${PALETTE.outline}, 0 0 0 7px rgba(251,191,36,0.45), 0 0 18px 6px rgba(251,191,36,0.55)`
              : `0 0 0 3px ${PALETTE.outline}, 0 0 0 5px rgba(251,191,36,0.28), 0 3px 6px rgba(0,0,0,0.4)`,
        }}
      >
        Serve
      </button>
    </div>
  );
}
