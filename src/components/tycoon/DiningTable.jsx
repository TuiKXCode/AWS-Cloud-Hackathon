import React, { memo } from 'react';
import { CUSTOMER_STATE, PALETTE } from '../../game/constants.js';
import { foodItemsById } from '../../data/foodItems.js';

const O = PALETTE.outline;

/**
 * A round four-seater, drawn in three depth layers so seated animals read correctly:
 *
 *   back chairs  →  animals (drawn elsewhere)  →  table top  →  near chairs
 *
 * The two usable seats are the back pair, which puts the table top in front of the lower half
 * of each animal. That is what makes them look like they are sitting at the table rather than
 * standing on it, and it is the whole reason this is split out from the sprite itself — no
 * per-frame animation is involved, just z-ordering.
 */
function DiningTable({ layout, table, customers }) {
  const eating = customers.filter(
    (customer) => customer.state === CUSTOMER_STATE.EATING && customer.tableId === table.id
  );
  const { w, h } = layout.tableSize;

  return (
    <>
      {table.chairs
        .filter((chair) => chair.back)
        .map((chair) => (
          <Chair
            key={`${table.id}-back-${chair.x}`}
            x={chair.x}
            y={chair.y}
            height={layout.chairHeight}
            z={Math.round(chair.y * 10)}
          />
        ))}

      {/* table top */}
      <div
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${table.x}%`,
          top: `${table.y}%`,
          width: `${w}%`,
          height: `${h}%`,
          zIndex: Math.round(table.y * 10),
        }}
      >
        {/* pedestal + foot, peeking out below the top */}
        <span
          className="absolute bottom-[-52%] left-1/2 h-[62%] w-[13%] -translate-x-1/2 rounded-sm"
          style={{ backgroundColor: PALETTE.woodDark, boxShadow: `0 0 0 2px ${O}` }}
        />
        <span
          className="absolute bottom-[-58%] left-1/2 h-[22%] w-[42%] -translate-x-1/2 rounded-[50%]"
          style={{ backgroundColor: PALETTE.woodDark, boxShadow: `0 0 0 2px ${O}` }}
        />
        {/* top */}
        <span
          className="absolute inset-0 rounded-[50%]"
          style={{ backgroundColor: '#7A4E24', boxShadow: `0 0 0 2px ${O}` }}
        />
        <span
          className="absolute inset-x-[4%] bottom-[16%] top-[4%] rounded-[50%]"
          style={{
            backgroundColor: '#A9713C',
            backgroundImage:
              'radial-gradient(ellipse at 42% 26%, rgba(255,228,186,0.55) 0%, rgba(140,86,40,0.25) 78%)',
          }}
        />

        {/* dishes in front of whoever is eating */}
        {eating.length > 0 ? (
          <div className="absolute inset-x-[10%] top-[14%] flex items-center justify-center gap-[6%]">
            {eating.map((customer) => (
              <span
                key={customer.id}
                className="flex animate-pop-in items-center rounded-full border border-stone-400 bg-white px-1 shadow-sm"
              >
                {customer.tray.map((itemId, index) => (
                  <span
                    key={`${itemId}-${index}`}
                    className="text-[8px] leading-[1.3] sm:text-[11px]"
                    aria-hidden="true"
                  >
                    {foodItemsById[itemId]?.emoji ?? '🍽️'}
                  </span>
                ))}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {table.chairs
        .filter((chair) => !chair.back)
        .map((chair) => (
          <Chair
            key={`${table.id}-front-${chair.x}`}
            x={chair.x}
            y={chair.y}
            height={layout.chairHeight}
            z={Math.round(chair.y * 10)}
          />
        ))}
    </>
  );
}

export default memo(DiningTable);

/** One wooden chair, three-quarter view: slatted back, seat, four legs. */
const Chair = memo(function Chair({ x, y, height, z }) {
  return (
    <svg
      viewBox="0 0 64 86"
      className="pointer-events-none absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        height: `${height}%`,
        aspectRatio: '64 / 86',
        transform: 'translate(-50%, -58%)',
        zIndex: z,
      }}
      aria-hidden="true"
    >
      <ellipse cx="32" cy="82" rx="22" ry="4" fill="rgba(0,0,0,0.18)" />
      <rect x="12" y="4" width="40" height="8" rx="3" fill="#8B5A2B" stroke={O} strokeWidth="3" />
      <rect x="16" y="10" width="7" height="30" rx="3" fill="#A9713C" stroke={O} strokeWidth="3" />
      <rect x="41" y="10" width="7" height="30" rx="3" fill="#A9713C" stroke={O} strokeWidth="3" />
      <rect x="8" y="36" width="48" height="14" rx="4" fill="#A9713C" stroke={O} strokeWidth="3" />
      <rect x="11" y="38" width="42" height="4" rx="2" fill="#C89464" opacity="0.8" />
      <rect x="12" y="48" width="7" height="32" rx="3" fill="#8B5A2B" stroke={O} strokeWidth="3" />
      <rect x="45" y="48" width="7" height="32" rx="3" fill="#8B5A2B" stroke={O} strokeWidth="3" />
    </svg>
  );
});
