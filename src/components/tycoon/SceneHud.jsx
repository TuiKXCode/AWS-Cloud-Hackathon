import React from 'react';
import { Pause, Play, Wallet } from 'lucide-react';
import { GAME_PHASE, PALETTE } from '../../game/constants.js';
import { questlineConfig } from '../../data/mandaiData.js';

const O = PALETTE.outline;

/**
 * The status readouts, laid over the scene the way the reference has them rather than in a strip
 * above it: gold coin bar and next reward top-left, wooden day plaque beside it.
 *
 * Putting these inside the frame is most of what makes the game read as one illustration instead
 * of stacked panels. Portrait gets a wider bar and the plaque pushed right, because a narrow
 * frame cannot fit both at landscape proportions.
 */
export default function SceneHud({ layout, state, questlinePoints, onPause, onResume }) {
  const total = questlineConfig.totalPointsToComplete;
  const fraction = Math.min(questlinePoints / total, 1);
  const complete = questlinePoints >= total;
  const running = state.phase === GAME_PHASE.RUNNING;
  const pausable = running || state.phase === GAME_PHASE.PAUSED;
  const portrait = layout.id === 'portrait';

  return (
    <div className="pointer-events-none absolute inset-0 z-[1800]">
      {/* ---------------------------------------------- questline coin bar */}
      <div
        className="absolute left-[1.5%] top-[1.5%]"
        style={{ width: portrait ? '40%' : '28%' }}
      >
        <div className="flex items-center">
          <span
            className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-amber-900 sm:h-6 sm:w-6 sm:text-sm"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #FDE68A, #F59E0B 70%, #B45309)',
              boxShadow: `0 0 0 2px ${O}`,
            }}
            aria-hidden="true"
          >
            C
          </span>

          <div
            className="relative -ml-2 h-[18px] min-w-0 flex-1 overflow-hidden rounded-full sm:-ml-2.5 sm:h-[22px]"
            style={{ backgroundColor: '#5B3C18', boxShadow: `0 0 0 2px ${O}` }}
            role="progressbar"
            aria-label="Questline progress"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={questlinePoints}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${
                complete
                  ? 'bg-gradient-to-b from-emerald-300 to-emerald-500'
                  : 'bg-gradient-to-b from-amber-300 to-amber-500'
              }`}
              style={{ width: `${fraction * 100}%` }}
            />

            {/* Centred inside the bar rather than positioned at a percentage of the HUD.
                A percentage assumed the bar was wide; on a small board it put the reading
                under the coin, which is how "0 / 140 pts" ended up showing as ") / 140". */}
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center px-1 font-mono text-[11px] font-black tabular-nums text-white sm:text-[13px]"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.8)' }}
            >
              {questlinePoints} / {total} pts
            </span>
          </div>

        </div>

        {/* One line, always. Allowed to wrap it ran three lines deep on a phone-sized
            board and covered the day plaque, the wallet chips and the upgrade signs
            behind it. The full prize label is spelled out on the day summary and on the
            voucher itself, so truncating here loses nothing. */}
        <p
          className="mt-1 w-fit truncate rounded-md bg-black/65 px-2 py-[2px] text-[10px] font-medium leading-snug text-white sm:text-xs"
          style={{ maxWidth: portrait ? '120%' : '100%' }}
        >
          Next reward:{' '}
          <span className="font-bold text-amber-200">{questlineConfig.prizeLabel}</span>
        </p>
      </div>

      {/* ------------------------------------------------- wooden day plaque */}
      <div
        className="absolute top-[1.5%] flex -translate-x-1/2 flex-col items-center gap-1"
        style={{ left: portrait ? '64%' : '50%' }}
      >
        <span
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1"
          style={{
            backgroundColor: '#FBEBD0',
            backgroundImage: 'linear-gradient(180deg, #FFF7E6 0 45%, #F3DCB6 45%)',
            boxShadow: `0 0 0 2px ${O}, 0 2px 4px rgba(0,0,0,0.3)`,
          }}
        >
          <SunIcon />
          <span className="text-[12px] font-black leading-none text-[#7A4A12] sm:text-sm">
            Day {state.day}
          </span>
        </span>

        <span className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-black/65 px-1.5 py-[2px]">
            <Wallet className="h-3 w-3 text-emerald-300" aria-hidden="true" />
            <span className="sr-only">Points available to spend: </span>
            <span className="font-mono text-[10px] font-bold tabular-nums text-white">
              {state.funds}
            </span>
          </span>
          <span className="rounded-full bg-black/65 px-1.5 py-[2px] font-mono text-[10px] font-bold tabular-nums text-amber-200">
            +{state.dayPoints} today
          </span>
        </span>
      </div>

      {/* --------------------------------------------------------- pause */}
      <button
        type="button"
        onClick={running ? onPause : onResume}
        disabled={!pausable}
        className="pointer-events-auto absolute right-[1.5%] top-[1.5%] rounded-lg border-2 border-[#4A2E13] bg-amber-100 p-1.5 text-[#7A4A12] shadow-md transition hover:bg-white disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        aria-label={running ? 'Pause day' : 'Resume day'}
      >
        {running ? (
          <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
        ) : (
          <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

/** Small drawn sun, to match the plaque in the reference. */
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden="true">
      <circle cx="12" cy="12" r="5.5" fill="#F59E0B" />
      <g stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round">
        <path d="M12 1.5v3" />
        <path d="M12 19.5v3" />
        <path d="M1.5 12h3" />
        <path d="M19.5 12h3" />
        <path d="M4.6 4.6l2.1 2.1" />
        <path d="M17.3 17.3l2.1 2.1" />
        <path d="M19.4 4.6l-2.1 2.1" />
        <path d="M6.7 17.3l-2.1 2.1" />
      </g>
    </svg>
  );
}
