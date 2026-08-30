import React, { memo } from 'react';
import { CHEF_STATE } from '../../game/constants.js';
import { foodItemsById } from '../../data/foodItems.js';

const UNIFORM = '#8B9560'; // keeper khaki
const UNIFORM_DARK = '#6B7548';
const SKIN = '#D79B6B';
const SKIN_SHADE = '#BD8355';
const CAP = '#6B7548';
const HAIR = '#5B3A1E';

/**
 * You. A zoo-restaurant keeper in khaki and a cap, carrying plates out to tables.
 *
 * The walk is what makes the SERVE button cost something: while the chef is crossing the
 * floor you cannot send another plate, so a badly ordered queue costs real seconds.
 */
function ChefSprite({ layout, chef }) {
  const swing = chef.moving ? Math.sin(chef.walkPhase) * 22 : 0;
  const bob = chef.moving ? -Math.abs(Math.sin(chef.walkPhase)) * 2.5 : 0;
  const depth = 0.9 + (chef.y / 100) * 0.22;

  // Plated food on the way to a table, raw ingredients on the way back from a counter.
  const held =
    chef.state === CHEF_STATE.DELIVERING && chef.tray.length > 0 ? chef.tray : chef.carrying;
  const carrying = held.length > 0;
  const reaching = chef.dwell > 0;

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${chef.x}%`,
        top: `${chef.y}%`,
        width: `${layout.spriteWidth.chef}%`,
        aspectRatio: '100 / 140',
        transformOrigin: '50% 100%',
        transform: `translate(-50%, -100%) scale(${depth})`,
        zIndex: Math.round(chef.y * 10) + 1,
      }}
    >
      {/* What he is holding sits outside the mirrored SVG so food never reads backwards. */}
      {carrying ? (
        <div className="absolute bottom-[34%] left-1/2 flex -translate-x-1/2 items-center gap-[2px]">
          {held.map((itemId, index) => (
            <span
              key={`${itemId}-${index}`}
              className="flex animate-pop-in items-center rounded-full border border-stone-400 bg-white px-[3px] shadow-sm"
            >
              <span className="text-[8px] leading-[1.3] sm:text-[11px]" aria-hidden="true">
                {foodItemsById[itemId]?.emoji ?? '🍽️'}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {/* the grab, so a pickup reads as an action rather than a pause */}
      {reaching ? (
        <div
          className="absolute bottom-[78%] left-1/2 -translate-x-1/2 text-[9px] leading-none sm:text-xs"
          aria-hidden="true"
        >
          <span className="animate-pulse">✋</span>
        </div>
      ) : null}

      <svg
        viewBox="0 0 100 140"
        className="h-full w-full overflow-visible"
        style={{ transform: chef.facing === -1 ? 'scaleX(-1)' : 'none' }}
        aria-hidden="true"
      >
        <ellipse cx="50" cy="137" rx="19" ry="4.5" fill="rgba(0,0,0,0.25)" />
        {/* the "this is you" marker from the reference */}
        <ellipse
          cx="50"
          cy="136"
          rx="25"
          ry="7"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          opacity="0.85"
        />

        <g transform={`translate(0 ${bob})`}>
          {/* legs */}
          <g transform={`rotate(${swing} 42 108)`}>
            <rect x="38" y="104" width="9.5" height="24" rx="4" fill={UNIFORM_DARK} />
            <rect x="33" y="126" width="16" height="8" rx="4" fill="#4A3728" />
          </g>
          <g transform={`rotate(${-swing} 58 108)`}>
            <rect x="52.5" y="104" width="9.5" height="24" rx="4" fill={UNIFORM_DARK} />
            <rect x="51" y="126" width="16" height="8" rx="4" fill="#4A3728" />
          </g>

          {/* torso */}
          <rect x="31" y="62" width="38" height="46" rx="13" fill={UNIFORM} />
          <rect x="31" y="94" width="38" height="8" rx="4" fill="#7A5330" />
          <rect x="46" y="62" width="8" height="34" rx="3" fill={UNIFORM_DARK} opacity="0.55" />
          {/* chest pocket */}
          <rect x="35" y="72" width="9" height="8" rx="2" fill={UNIFORM_DARK} opacity="0.7" />

          {/* arms — forward when carrying, raised when reaching into a counter */}
          <rect
            x="23"
            y="66"
            width="9.5"
            height="30"
            rx="4.75"
            fill={SKIN_SHADE}
            transform={`rotate(${reaching ? -128 : carrying ? -66 : -swing * 0.6} 27.75 70)`}
          />
          <rect
            x="67.5"
            y="66"
            width="9.5"
            height="30"
            rx="4.75"
            fill={SKIN}
            transform={`rotate(${reaching ? 128 : carrying ? 66 : swing * 0.6} 72.25 70)`}
          />

          {/* head, hair and cap */}
          <circle cx="50" cy="44" r="17.5" fill={SKIN} />
          <path d="M32 46 A18 18 0 0 1 68 46 L68 40 L32 40 Z" fill={HAIR} opacity="0.9" />
          <path d="M33 41 A17 17 0 0 1 67 41 L67 44 L33 44 Z" fill={CAP} />
          <rect x="29" y="42" width="31" height="4.5" rx="2.25" fill={CAP} />
          <circle cx="44" cy="49" r="1.9" fill="#2A1A0C" />
          <circle cx="56" cy="49" r="1.9" fill="#2A1A0C" />
          <ellipse cx="39" cy="53" rx="3" ry="2" fill="#E8836F" opacity="0.4" />
          <ellipse cx="61" cy="53" rx="3" ry="2" fill="#E8836F" opacity="0.4" />
          <path
            d="M46 55 Q50 58 54 55"
            stroke="#2A1A0C"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}

export default memo(ChefSprite);
