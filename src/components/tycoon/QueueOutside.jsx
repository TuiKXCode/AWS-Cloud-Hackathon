import React, { memo } from 'react';
import { pantryForDiet } from '../../game/orders.js';
import { AnimalAvatarGroup } from './AnimalAvatar.jsx';

/**
 * The animals queueing on the path outside the gate, with thought bubbles for what they are
 * hoping to eat — the detail the reference opens on.
 *
 * These are the head of the day's guest list, not live customers: no state machine, no
 * movement, nothing to tick. Which food each one is daydreaming about is picked by index
 * from its real diet, so it stays put between frames instead of flickering.
 */
function QueueOutside({ layout, upcoming = [], exhibitsById, headSources }) {
  const waiting = upcoming.slice(0, layout.queueSpots.length);
  if (waiting.length === 0) return null;

  return (
    <>
      {waiting.map((exhibitId, index) => {
        const exhibit = exhibitsById[exhibitId];
        const spot = layout.queueSpots[index];
        const edible = pantryForDiet(exhibit?.dietTags);
        const craving = edible[index % Math.max(edible.length, 1)];

        return (
          <div
            key={`${exhibitId}-${index}`}
            className="pointer-events-none absolute"
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              width: `${layout.spriteWidth.queue}%`,
              aspectRatio: '100 / 130',
              transform: 'translate(-50%, -100%)',
              zIndex: Math.round(spot.y * 10),
            }}
          >
            {/* thought bubble */}
            <div className="absolute bottom-[92%] left-1/2 flex -translate-x-1/2 flex-col items-center">
              <span
                className="flex items-center gap-[1px] rounded-full border-2 border-stone-400/80 bg-white px-1 py-[1px] shadow"
                aria-hidden="true"
              >
                <span className="text-[8px] leading-[1.3] sm:text-[11px]">
                  {craving?.emoji ?? '🍽️'}
                </span>
              </span>
              <span className="mt-[1px] h-[3px] w-[3px] rounded-full border border-stone-400/80 bg-white" />
            </div>

            <svg viewBox="0 0 100 130" className="h-full w-full overflow-visible" aria-hidden="true">
              <ellipse cx="50" cy="126" rx="18" ry="4" fill="rgba(0,0,0,0.22)" />
              <Body exhibit={exhibit} />
              <g transform="translate(50 40)">
                <AnimalAvatarGroup
                  exhibit={exhibit}
                  photoSrc={headSources?.[exhibitId] ?? null}
                  radius={28}
                />
              </g>
            </svg>

            <span className="sr-only">{exhibit?.name ?? 'A guest'} waiting outside</span>
          </div>
        );
      })}
    </>
  );
}

export default memo(QueueOutside);

/** Same chibi body as a seated customer, minus anything that needs a walk cycle. */
function Body({ exhibit }) {
  const palette = exhibit?.palette ?? { fur: '#D8A263', dark: '#8C4A0C', belly: '#F5E4C8' };

  return (
    <g>
      <path
        d="M70 92 Q80 88 78 76"
        stroke={palette.dark}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="38" y="97" width="8.5" height="21" rx="4" fill={palette.dark} />
      <ellipse cx="42" cy="119" rx="6.5" ry="3.6" fill={palette.dark} />
      <rect x="53.5" y="97" width="8.5" height="21" rx="4" fill={palette.dark} />
      <ellipse cx="58" cy="119" rx="6.5" ry="3.6" fill={palette.dark} />
      <rect x="30" y="60" width="40" height="48" rx="19" fill={palette.fur} />
      <ellipse cx="50" cy="86" rx="12" ry="13" fill={palette.belly ?? '#F5E4C8'} />
      <rect x="22" y="68" width="9.5" height="26" rx="4.75" fill={palette.dark} />
      <rect x="68.5" y="68" width="9.5" height="26" rx="4.75" fill={palette.dark} />
    </g>
  );
}
