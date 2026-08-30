import { useRef, useState } from 'react';
import { Camera, Play, Trash2 } from 'lucide-react';
import { DAY, SCORING } from '../../game/constants.js';
import { downscaleImageFile } from '../../lib/downscaleImage.js';
import AnimalAvatar from './AnimalAvatar.jsx';

/**
 * Pre-day briefing: who is coming today and what the rules are.
 *
 * Sized for a phone held at arm's length rather than a desktop inspector — this is the screen
 * that has to teach the loop, so nothing on it is below 12px or below full contrast.
 *
 * The photo control is here because it is the honest stand-in for Phase 4: those animals become
 * customers because you photographed them. Until capture exists, this lets a demo put a real
 * picture on a real customer.
 */
export default function DayIntro({
  day,
  roster,
  headSources,
  onStart,
  onReset,
  onSetPhoto,
  onClearPhoto,
}) {
  const fileRef = useRef(null);
  const [targetId, setTargetId] = useState(roster[0]?.id ?? null);
  const [error, setError] = useState(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !targetId) return;

    try {
      setError(null);
      const dataUrl = await downscaleImageFile(file);
      onSetPhoto(targetId, dataUrl);
    } catch (cause) {
      console.warn('[tycoon] photo import failed', cause);
      setError('That image would not load. Try another one.');
    }
  };

  const pickPhotoFor = (exhibitId) => {
    setTargetId(exhibitId);
    fileRef.current?.click();
  };

  return (
    <div className="absolute inset-0 z-[3000] overflow-y-auto rounded-2xl bg-emerald-950/95 backdrop-blur-sm">
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-4 text-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
            Ah Meng&apos;s Kitchen
          </p>
          <h2 className="text-2xl font-black leading-tight text-amber-300 sm:text-3xl">
            Day {day}
          </h2>
          <p className="text-sm font-semibold text-emerald-100">
            {DAY.customersFor(day)} animals booked in today.
          </p>
        </div>

        {/* today's cast — tap one to give it a real photo */}
        <div className="flex max-w-md flex-wrap items-start justify-center gap-2">
          {roster.map((exhibit) => {
            const hasPhoto = Boolean(headSources[exhibit.id]);
            return (
              <div key={exhibit.id} className="flex w-16 flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => pickPhotoFor(exhibit.id)}
                  className="rounded-full transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  aria-label={`Use a photo for ${exhibit.name}`}
                >
                  <AnimalAvatar
                    exhibit={exhibit}
                    photoSrc={headSources[exhibit.id]}
                    className="h-13 w-13 sm:h-14 sm:w-14"
                  />
                </button>
                <span className="w-full text-[11px] font-medium leading-tight text-emerald-100">
                  {exhibit.name}
                </span>
                {hasPhoto ? (
                  <button
                    type="button"
                    onClick={() => onClearPhoto(exhibit.id)}
                    className="rounded p-1 text-emerald-300 transition hover:text-rose-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    aria-label={`Remove the photo for ${exhibit.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <Camera className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>

        <ol className="max-w-sm space-y-2 text-left text-[13px] leading-snug text-emerald-50 sm:text-sm">
          <Rule n="1">
            Animals sit down and order what their <strong>real diet</strong> needs.
          </Rule>
          <Rule n="2">
            Tap a storage counter — <strong>Butcher</strong>, <strong>Cold</strong> or{' '}
            <strong>Greens</strong> — and pick what you want. The chef walks over and fetches it.
          </Rule>
          <Rule n="3">
            When the plate on the bench matches the order, tap that animal and hit{' '}
            <strong>SERVE</strong>.
          </Rule>
          <Rule n="4">
            He can only carry so much and he has to walk, so the order you tap things in costs
            real time. Serve above {Math.round(SCORING.speedThreshold * 100)}% patience for a +
            {SCORING.speedBonus} tip.
          </Rule>
        </ol>

        <button
          type="button"
          onClick={onStart}
          className="flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-base font-black uppercase tracking-wide text-amber-950 shadow-lg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Play className="h-5 w-5" aria-hidden="true" />
          Open for Day {day}
        </button>

        {/* The run persists, so a browser that has played before reopens mid-run. That is
            right for a visitor coming back to it, but wrong for a demo handed to someone
            new — hence a way back to Day 1. Offered only once there is something to
            reset. */}
        {day > 1 && typeof onReset === 'function' ? (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200/70 underline underline-offset-4 transition hover:text-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Start over from Day 1
          </button>
        ) : null}

        {error ? <p className="text-[13px] font-semibold text-rose-300">{error}</p> : null}

        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
    </div>
  );
}

function Rule({ n, children }) {
  return (
    <li className="flex gap-2">
      <span
        className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-black text-amber-950"
        aria-hidden="true"
      >
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
