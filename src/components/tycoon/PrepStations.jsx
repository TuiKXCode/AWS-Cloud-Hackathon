import { memo, useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { STATIONS, itemsForStation } from '../../data/foodItems.js';
import { PALETTE } from '../../game/constants.js';

const O = PALETTE.outline;

const TILE_STYLE = {
  backgroundColor: '#E9D3AC',
  backgroundImage: 'linear-gradient(180deg, #F4E3C4 0 45%, #E2C79C 45%)',
  boxShadow: `0 0 0 1.5px ${O}`,
};

/**
 * The three storage counters — Butcher, Cold, Greens — and the pickers that hang off them.
 *
 * This is where ingredients come from. There is no pantry panel bolted to the edge of the
 * screen: you tap the thing that physically holds the food, choose from what is stored there,
 * and the chef walks over and collects it.
 *
 * The picker stays open after a tap so you can take several things from one counter in a row —
 * each tile shows a running count of how many of that item are already spoken for. It renders
 * as a floating board over the counter on a wide screen, and as a bottom sheet on a phone,
 * where a board over the counter would have nowhere to go and nothing big enough to hit.
 */
function PrepStations({ layout, disabled, capacityLeft, counts, activeStationId, onPick }) {
  const [openId, setOpenId] = useState(null);
  const openStation = STATIONS.find((station) => station.id === openId) ?? null;

  useEffect(() => {
    if (disabled) setOpenId(null);
  }, [disabled]);

  useEffect(() => {
    if (!openId) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpenId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openId]);

  const sheet = layout.picker.mode === 'sheet';

  return (
    <>
      {/* click-away catcher, under the picker but over the scene */}
      {openId ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close the picker"
          onClick={() => setOpenId(null)}
          className="absolute inset-0 z-[1950] cursor-default bg-black/30"
        />
      ) : null}

      {STATIONS.map((station) => {
        const spot = layout.stations[station.id];
        if (!spot) return null;
        const Furniture = FURNITURE[station.id];
        const isOpen = openId === station.id;
        const isActive = activeStationId === station.id;

        return (
          <button
            key={station.id}
            type="button"
            disabled={disabled}
            onClick={() => setOpenId(isOpen ? null : station.id)}
            aria-expanded={isOpen}
            aria-label={`${station.label} counter — choose what to fetch`}
            className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-lg transition disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              width: `${spot.w}%`,
              height: `${layout.stationHeight}%`,
              zIndex: isOpen ? 1960 : Math.round(spot.y * 10),
            }}
          >
            {/* highlight: always on while the chef is here, on hover otherwise */}
            <span
              className={`absolute inset-x-[-4%] bottom-[-2%] top-[32%] rounded-lg transition ${
                isOpen || isActive
                  ? 'bg-amber-300/40 ring-2 ring-amber-200'
                  : 'ring-0 group-enabled:group-hover:bg-amber-200/25'
              }`}
            />

            <Signboard label={station.label} />
            <span className="absolute inset-x-0 bottom-0 top-[36%] block">
              <Furniture />
            </span>

            {/* Tap affordance, centred over the sign so it is unmissable. */}
            {disabled ? null : (
              <span className="absolute left-1/2 top-0 block -translate-x-1/2 -translate-y-[70%]">
                <span
                  className="flex h-5 w-5 animate-bob items-center justify-center rounded-full text-white sm:h-7 sm:w-7"
                  style={{
                    background: 'radial-gradient(circle at 35% 30%, #5CD26A, #2F7A34 75%)',
                    boxShadow: `0 0 0 2px ${O}, 0 2px 4px rgba(0,0,0,0.35)`,
                  }}
                  aria-hidden="true"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={4} />
                </span>
              </span>
            )}
          </button>
        );
      })}

      {openStation ? (
        <StationPicker
          layout={layout}
          station={openStation}
          spot={layout.stations[openStation.id]}
          sheet={sheet}
          capacityLeft={capacityLeft}
          counts={counts}
          onClose={() => setOpenId(null)}
          onPick={(itemId) => onPick(itemId, openStation.id)}
        />
      ) : null}
    </>
  );
}

export default memo(PrepStations);

/**
 * The picker. Lists everything stored at one counter and stays open while you take things, so
 * "two chicken legs and a bone" is three taps in one place rather than three round trips
 * through the menu.
 */
function StationPicker({ layout, station, spot, sheet, capacityLeft, counts, onClose, onPick }) {
  const items = itemsForStation(station.id);
  const full = capacityLeft <= 0;

  const body = (
    <div
      className={sheet ? 'rounded-t-2xl p-2 pb-3' : 'rounded-lg p-1.5'}
      style={{
        backgroundColor: '#8B5A2B',
        boxShadow: sheet
          ? `0 -2px 0 2px ${O}, 0 -8px 24px rgba(0,0,0,0.5)`
          : `0 0 0 2px ${O}, 0 6px 16px rgba(0,0,0,0.45)`,
      }}
    >
      <div className="flex items-center justify-between gap-2 px-0.5 pb-1.5">
        <p
          className={`font-black uppercase tracking-wider text-amber-100 ${
            sheet ? 'text-xs' : 'text-[9px] sm:text-[11px]'
          }`}
        >
          {station.label}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 rounded-md bg-black/30 px-2 py-1 text-amber-100 transition hover:bg-black/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          aria-label="Close the picker"
        >
          <span className={sheet ? 'text-[11px] font-bold' : 'text-[9px] font-bold'}>Done</span>
          <X className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
        </button>
      </div>

      <div className={sheet ? 'flex gap-1.5' : 'grid grid-cols-3 gap-1.5'}>
        {items.map((item) => {
          const count = counts?.[item.id] ?? 0;
          return (
            <button
              key={item.id}
              type="button"
              disabled={full}
              onClick={() => onPick(item.id)}
              className={`relative flex flex-col items-center rounded-lg px-0.5 py-1.5 transition active:scale-95 hover:brightness-105 disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                sheet ? 'min-w-0 flex-1' : 'w-[52px] sm:w-[62px]'
              }`}
              style={TILE_STYLE}
              aria-label={`Fetch ${item.name} from the ${station.label} counter${
                count > 0 ? ` (${count} already lined up)` : ''
              }`}
            >
              <span className={sheet ? 'text-xl leading-none' : 'text-lg leading-none'} aria-hidden="true">
                {item.emoji}
              </span>
              <span
                className={`mt-1 w-full truncate text-center font-semibold leading-tight text-[#4A2E13] ${
                  sheet ? 'text-[9px]' : 'text-[7px] sm:text-[9px]'
                }`}
              >
                {item.name}
              </span>

              {count > 0 ? (
                <span
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
                  style={{ backgroundColor: '#2F7A34', boxShadow: `0 0 0 1.5px ${O}` }}
                  aria-hidden="true"
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p
        className={`px-0.5 pt-1.5 leading-tight text-amber-100/85 ${
          sheet ? 'text-[10px]' : 'text-[7px] sm:text-[9px]'
        }`}
      >
        {full
          ? 'His hands are full — plate or bin something first.'
          : `Tap to send the chef · room for ${capacityLeft} more`}
      </p>
    </div>
  );

  if (sheet) {
    return (
      <div className="absolute inset-x-0 bottom-0 z-[1970] animate-pop-in">{body}</div>
    );
  }

  const { minX, maxX, gap } = layout.picker;
  return (
    <div
      className="absolute z-[1970] -translate-x-1/2 -translate-y-full animate-pop-in"
      style={{ left: `${Math.min(Math.max(spot.x, minX), maxX)}%`, top: `${spot.y - gap}%` }}
    >
      {body}
      <span
        className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-[6px] rotate-45"
        style={{ backgroundColor: '#8B5A2B', boxShadow: `2px 2px 0 0 ${O}` }}
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * Wooden plank sign on two posts. Kept in HTML rather than SVG so the label uses the same
 * font stack as the rest of the UI and stays crisp at any size.
 */
const Signboard = memo(function Signboard({ label }) {
  return (
    <span className="absolute inset-x-[-6%] top-0 block h-[34%]">
      <span
        className="absolute bottom-0 left-[22%] h-[46%] w-[5%] rounded-sm"
        style={{ backgroundColor: PALETTE.woodDark, boxShadow: `0 0 0 1.5px ${O}` }}
      />
      <span
        className="absolute bottom-0 right-[22%] h-[46%] w-[5%] rounded-sm"
        style={{ backgroundColor: PALETTE.woodDark, boxShadow: `0 0 0 1.5px ${O}` }}
      />
      <span
        className="absolute inset-x-0 top-0 flex h-[62%] items-center justify-center rounded-[3px]"
        style={{
          backgroundColor: PALETTE.wood,
          backgroundImage:
            'linear-gradient(180deg, rgba(255,235,200,0.45) 0 38%, transparent 38%)',
          boxShadow: `0 0 0 2px ${O}`,
        }}
      >
        <span className="text-[8px] font-black leading-none tracking-tight text-[#3B2410] sm:text-[11px]">
          {label}
        </span>
      </span>
    </span>
  );
});

/* --------------------------------------------------------------- furniture */

/**
 * Each counter is a fixed-aspect SVG scaled to fit its slot, so the steak, fish and fruit
 * keep their shapes whatever the scene's aspect ratio does.
 */
function Counter({ viewBox, children }) {
  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMax meet"
      className="h-full w-full overflow-visible"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ButcherBlock = memo(function ButcherBlock() {
  return (
    <Counter viewBox="0 0 120 100">
      <ellipse cx="60" cy="96" rx="46" ry="5" fill="rgba(0,0,0,0.18)" />
      <rect x="16" y="72" width="10" height="24" rx="3" fill={PALETTE.woodDark} stroke={O} strokeWidth="3" />
      <rect x="94" y="72" width="10" height="24" rx="3" fill={PALETTE.woodDark} stroke={O} strokeWidth="3" />
      <rect x="6" y="44" width="108" height="30" rx="5" fill={PALETTE.wood} stroke={O} strokeWidth="3.5" />
      <rect x="6" y="44" width="108" height="11" rx="5" fill={PALETTE.woodLight} />
      <rect x="20" y="26" width="80" height="20" rx="4" fill="#C79A62" stroke={O} strokeWidth="3" />
      <path
        d="M34 32 Q42 20 60 22 Q78 24 76 34 Q70 42 52 42 Q36 41 34 32 Z"
        fill="#D9525C"
        stroke="#8E2733"
        strokeWidth="2.5"
      />
      <path d="M44 28 Q56 25 68 30" stroke="#F0A0A6" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M34 32 Q40 25 50 23" stroke="#FBEBD2" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="76" y="24" width="22" height="14" rx="2" fill="#D6DAE0" stroke={O} strokeWidth="2.5" />
      <rect x="84" y="36" width="7" height="16" rx="3" fill="#3F3F46" stroke={O} strokeWidth="2.5" />
    </Counter>
  );
});

const ColdChiller = memo(function ColdChiller() {
  return (
    <Counter viewBox="0 0 150 100">
      <ellipse cx="75" cy="96" rx="62" ry="5" fill="rgba(0,0,0,0.18)" />
      <rect x="8" y="58" width="134" height="38" rx="5" fill="#AEB7C2" stroke={O} strokeWidth="3.5" />
      <rect x="18" y="76" width="42" height="12" rx="3" fill="#8E99A6" />
      <rect x="6" y="18" width="138" height="42" rx="5" fill={PALETTE.glass} stroke={O} strokeWidth="3.5" />
      <line x1="75" y1="18" x2="75" y2="60" stroke={O} strokeWidth="3" />
      <Fish x={40} y={40} />
      <Fish x={110} y={40} />
      <path d="M18 56 L44 20 L58 20 L32 56 Z" fill="#FFFFFF" opacity="0.5" />
      <path d="M88 56 L114 20 L124 20 L98 56 Z" fill="#FFFFFF" opacity="0.4" />
    </Counter>
  );
});

function Fish({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-26 0 Q-10 -13 12 -8 Q24 -4 24 0 Q24 4 12 8 Q-10 13 -26 0 Z" fill="#8DA7BF" stroke="#4F6579" strokeWidth="2.5" />
      <path d="M-26 0 Q-34 -9 -38 0 Q-34 9 -26 0 Z" fill="#6F8AA3" stroke="#4F6579" strokeWidth="2.5" />
      <path d="M-8 -9 Q-2 -16 6 -9" fill="#6F8AA3" stroke="#4F6579" strokeWidth="2" />
      <circle cx="14" cy="-2" r="2.6" fill="#1F2937" />
      <path d="M-16 0 Q0 3 14 0" stroke="#C6D5E2" strokeWidth="2.5" fill="none" />
    </g>
  );
}

const GreensCrates = memo(function GreensCrates() {
  return (
    <Counter viewBox="0 0 130 100">
      <ellipse cx="65" cy="96" rx="56" ry="5" fill="rgba(0,0,0,0.18)" />

      {/* left crate: leaves and broccoli */}
      <g>
        <path d="M46 40 Q30 26 12 34 Q4 46 18 52 Q10 60 22 64 Q38 66 46 52 Z" fill="#3F9E45" stroke="#1B6B30" strokeWidth="2.5" />
        <path d="M46 42 Q56 28 68 34 Q74 46 62 54 Q52 58 46 50 Z" fill="#59B95B" stroke="#1B6B30" strokeWidth="2.5" />
        <path d="M20 44 Q32 48 44 46" stroke="#1B6B30" strokeWidth="2" fill="none" />
        <rect x="6" y="60" width="60" height="34" rx="4" fill={PALETTE.wood} stroke={O} strokeWidth="3.5" />
        <g stroke={PALETTE.woodDark} strokeWidth="2.5">
          <line x1="6" y1="72" x2="66" y2="72" />
          <line x1="6" y1="84" x2="66" y2="84" />
        </g>
      </g>

      {/* right crate: bananas and melon */}
      <g>
        <g stroke="#8A6410" strokeWidth="2.5" fill="#F2C744">
          <path d="M76 46 Q88 34 104 40 Q94 52 78 52 Z" />
          <path d="M80 54 Q94 42 110 48 Q100 60 82 60 Z" />
        </g>
        <path d="M100 40 Q120 40 124 58 L100 60 Z" fill="#E04B5A" stroke="#B33845" strokeWidth="2.5" />
        <path d="M100 60 L124 58 Q126 66 120 70 L102 68 Z" fill="#3F9E45" stroke="#1B6B30" strokeWidth="2.5" />
        <circle cx="110" cy="48" r="2" fill="#3B1C1C" />
        <circle cx="117" cy="52" r="2" fill="#3B1C1C" />
        <rect x="70" y="62" width="56" height="32" rx="4" fill={PALETTE.wood} stroke={O} strokeWidth="3.5" />
        <g stroke={PALETTE.woodDark} strokeWidth="2.5">
          <line x1="70" y1="74" x2="126" y2="74" />
          <line x1="70" y1="85" x2="126" y2="85" />
        </g>
      </g>
    </Counter>
  );
});

const FURNITURE = {
  butcher: ButcherBlock,
  cold: ColdChiller,
  greens: GreensCrates,
};
