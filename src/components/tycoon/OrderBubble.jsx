import React from 'react';
import { foodItemsById } from '../../data/foodItems.js';
import { MOOD } from '../../game/constants.js';
import { groupItems } from '../../game/orders.js';
import AnimalAvatar from './AnimalAvatar.jsx';

const MOOD_FILL = {
  [MOOD.HAPPY]: '#F59E0B',
  [MOOD.IMPATIENT]: '#FB923C',
  [MOOD.ANGRY]: '#F43F5E',
};

/** Where the ticket hangs relative to the animal, so it never runs off the frame. */
const ANCHOR = {
  center: 'left-1/2 -translate-x-1/2',
  left: 'left-[12%]',
  right: 'right-[12%]',
};

const TAIL = {
  center: 'left-1/2 -translate-x-1/2',
  left: 'left-[14%]',
  right: 'right-[14%]',
};

/**
 * The order ticket from the reference: a white card with the dish name and the items it
 * needs, a pie timer for patience, and the animal's portrait in a white ring straddling the
 * left edge.
 *
 * Tickets are wider than the animal holding one, so `anchor` swings the card inboard for
 * tables near the left and right walls rather than letting it clip the frame.
 */
export default function OrderBubble({
  order,
  exhibit,
  photoSrc,
  patience,
  mood,
  anchor = 'center',
  isSelected,
  isServeTarget,
  awaitingDelivery,
}) {
  const rows = groupItems(order.items);
  const clamped = Math.min(Math.max(patience, 0), 1);

  return (
    <div
      className={`absolute bottom-[86%] z-10 animate-pop-in rounded-lg border-2 bg-white py-[3px] pl-[13px] pr-1.5 shadow-[0_2px_6px_rgba(0,0,0,0.3)] sm:pl-[17px] ${
        ANCHOR[anchor] ?? ANCHOR.center
      } ${
        isSelected
          ? 'border-amber-400 ring-2 ring-amber-300/70'
          : isServeTarget
            ? 'border-dashed border-amber-400'
            : 'border-stone-400/70'
      }`}
    >
      {/* portrait, straddling the left edge like the reference */}
      <span className="absolute left-0 top-1/2 block h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-white bg-stone-200 shadow sm:h-[30px] sm:w-[30px]">
        <AnimalAvatar exhibit={exhibit} photoSrc={photoSrc} className="h-full w-full" />
      </span>

      <div className="flex items-center gap-1">
        <PieTimer value={clamped} fill={awaitingDelivery ? '#38BDF8' : (MOOD_FILL[mood] ?? '#F59E0B')} />
        <p className="whitespace-nowrap text-[8px] font-bold leading-tight text-[#3B2410] sm:text-[10px]">
          {awaitingDelivery ? 'On its way…' : order.name}
        </p>
      </div>

      <div className="mt-[1px] flex items-center gap-[3px]">
        {rows.map(({ itemId, quantity }) => (
          <span key={itemId} className="flex items-center leading-none">
            <span className="text-[9px] sm:text-[12px]" aria-hidden="true">
              {foodItemsById[itemId]?.emoji ?? '❓'}
            </span>
            {quantity > 1 ? (
              <span className="ml-[1px] text-[7px] font-bold text-stone-500 sm:text-[9px]">
                x{quantity}
              </span>
            ) : null}
          </span>
        ))}
      </div>

      {/* bubble tail */}
      <span
        className={`absolute top-full h-2 w-2 -translate-y-[5px] rotate-45 border-b-2 border-r-2 bg-white ${
          TAIL[anchor] ?? TAIL.center
        } ${isSelected ? 'border-amber-400' : 'border-stone-400/70'}`}
      />
    </div>
  );
}

/**
 * Patience as a filled pie rather than a bar: it takes almost no room on the ticket and the
 * reference uses the same clock motif. Built from a dashed stroke on a small circle, which
 * fills from the centre out and needs no arc maths.
 */
function PieTimer({ value, fill }) {
  const circumference = 2 * Math.PI * 5;

  return (
    <svg
      viewBox="-11 -11 22 22"
      className="h-[9px] w-[9px] shrink-0 -rotate-90 sm:h-[12px] sm:w-[12px]"
      aria-hidden="true"
    >
      <circle cx="0" cy="0" r="9.2" fill="#FFFFFF" stroke="#8A6A45" strokeWidth="1.6" />
      <circle
        cx="0"
        cy="0"
        r="5"
        fill="none"
        stroke={fill}
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value)}
      />
    </svg>
  );
}
