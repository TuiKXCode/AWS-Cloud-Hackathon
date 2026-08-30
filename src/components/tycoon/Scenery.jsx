import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { PALETTE, PLATE_CAPACITY } from '../../game/constants.js';
import { foodItemsById } from '../../data/foodItems.js';

const O = PALETTE.outline;

/** Percentage box helper — every piece of scenery is placed the same way. */
function box(rect) {
  return {
    left: `${rect.left}%`,
    top: `${rect.top}%`,
    width: `${rect.right - rect.left}%`,
    height: `${rect.bottom - rect.top}%`,
  };
}

/**
 * Grow a rectangle by the wall thickness. x and y are separate because a percentage means a
 * different number of pixels on each axis, and a wall that looks even in landscape would look
 * lopsided in portrait.
 */
function inflate(rect, wall) {
  return {
    left: rect.left - wall.x,
    right: rect.right + wall.x,
    top: rect.top - wall.y,
    bottom: rect.bottom + wall.y,
  };
}

function centred(spot, w, h) {
  return { left: spot.x - w / 2, right: spot.x + w / 2, top: spot.y - h / 2, bottom: spot.y + h / 2 };
}

/* ------------------------------------------------------------------ ground */

const STONE_TEXTURE = {
  backgroundColor: PALETTE.stone,
  backgroundImage: [
    'repeating-linear-gradient(90deg, rgba(90,80,64,0.30) 0 1.5px, transparent 1.5px 3.2%)',
    'repeating-linear-gradient(0deg, rgba(90,80,64,0.30) 0 1.5px, transparent 1.5px 42%)',
    'linear-gradient(180deg, rgba(255,255,255,0.35), rgba(120,108,88,0.25))',
  ].join(', '),
};

const TILE_TEXTURE = {
  backgroundColor: PALETTE.tile,
  backgroundImage: [
    'repeating-linear-gradient(0deg, rgba(150,120,80,0.16) 0 1.5px, transparent 1.5px 7.5%)',
    'repeating-linear-gradient(90deg, rgba(150,120,80,0.16) 0 1.5px, transparent 1.5px 4.2%)',
    'radial-gradient(ellipse at 55% 35%, rgba(255,248,226,0.85) 0%, rgba(220,198,158,0.35) 100%)',
  ].join(', '),
};

const DIRT_TEXTURE = {
  backgroundColor: PALETTE.dirt,
  backgroundImage: [
    'radial-gradient(circle at 18% 26%, rgba(120,88,48,0.26) 0 6%, transparent 7%)',
    'radial-gradient(circle at 64% 58%, rgba(120,88,48,0.22) 0 5%, transparent 6%)',
    'radial-gradient(circle at 38% 84%, rgba(120,88,48,0.2) 0 4.5%, transparent 5.5%)',
    'radial-gradient(circle at 86% 20%, rgba(120,88,48,0.18) 0 4%, transparent 5%)',
  ].join(', '),
};

/**
 * The paved area: a low stone wall drawn as inflated copies of the floor rectangles, with the
 * cream tiled floor laid inside them. Landscape uses two overlapping rectangles so the wall
 * traces an L; portrait uses one. Either way the wall comes out of the floor shape for free.
 *
 * The wall is broken where the path leaves the floor and under the arch, so guests are not
 * visibly walled in.
 */
export const PavedFloor = memo(function PavedFloor({ layout }) {
  const { floor, wall, arch } = layout;
  const exitGap = layout.paths[layout.paths.length - 1];
  const lastFloor = floor[floor.length - 1];

  return (
    <>
      {floor.map((rect, index) => (
        <div
          key={`wall-${index}`}
          className="pointer-events-none absolute rounded-[3px]"
          style={{ ...box(inflate(rect, wall)), ...STONE_TEXTURE, boxShadow: `0 0 0 2px ${O}` }}
        />
      ))}

      {floor.map((rect, index) => (
        <div
          key={`floor-${index}`}
          className="pointer-events-none absolute"
          style={{ ...box(rect), ...TILE_TEXTURE }}
        />
      ))}

      {/* gap in the bottom wall where the service path leaves */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: `${exitGap.left}%`,
          top: `${lastFloor.bottom - 0.4}%`,
          width: `${exitGap.right - exitGap.left}%`,
          height: `${wall.y + 2}%`,
          ...DIRT_TEXTURE,
        }}
      />
      {/* and in the top wall under the arch */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: `${arch.x - arch.w / 2 + 1}%`,
          top: `${lastFloor.top - wall.y - 0.4}%`,
          width: `${arch.w - 2}%`,
          height: `${wall.y + 1}%`,
          ...TILE_TEXTURE,
        }}
      />
    </>
  );
});

/** The dirt patio the upgrades get built on. */
export const PatioGround = memo(function PatioGround({ layout }) {
  return (
    <div
      className="pointer-events-none absolute rounded-[4px]"
      style={{
        ...box(layout.patio),
        ...DIRT_TEXTURE,
        boxShadow: `0 0 0 2px ${O}, inset 0 0 0 3px rgba(63,138,60,0.35)`,
      }}
    />
  );
});

/* -------------------------------------------------------------------- arch */

/**
 * The wooden entrance arch. Fixed aspect ratio, because a stretched arch reads as a
 * mistake rather than as perspective.
 */
export const Arch = memo(function Arch({ layout }) {
  const { arch } = layout;

  return (
    <svg
      viewBox="0 0 140 150"
      className="pointer-events-none absolute"
      style={{
        left: `${arch.x}%`,
        top: `${arch.y}%`,
        height: `${arch.h}%`,
        aspectRatio: '140 / 150',
        transform: 'translate(-50%, -50%)',
        zIndex: Math.round(arch.y * 10),
      }}
      aria-hidden="true"
    >
      {/* posts */}
      <rect x="10" y="30" width="20" height="120" rx="4" fill="#A9713C" stroke={O} strokeWidth="4" />
      <rect x="110" y="30" width="20" height="120" rx="4" fill="#A9713C" stroke={O} strokeWidth="4" />
      <rect x="14" y="34" width="6" height="112" fill="#C89464" opacity="0.7" />
      <rect x="114" y="34" width="6" height="112" fill="#C89464" opacity="0.7" />

      {/* head beam */}
      <rect x="0" y="8" width="140" height="24" rx="5" fill="#8B5A2B" stroke={O} strokeWidth="4" />
      <rect x="6" y="13" width="128" height="7" rx="3" fill="#B07C42" opacity="0.75" />

      {/* curved brace under the beam */}
      <path
        d="M20 44 Q70 74 120 44 L120 34 Q70 60 20 34 Z"
        fill="#A9713C"
        stroke={O}
        strokeWidth="4"
      />
    </svg>
  );
});

/* ---------------------------------------------------------------- conveyor */

/**
 * Pass-through belt. Two grey runs — out of the kitchen, then turning along its end — with
 * ribbed treads, side rails and a couple of plates riding it.
 *
 * Purely set dressing: the plate you build is the one the chef carries. This is the visual
 * answer to "where does the food come out", which the reference makes a feature of.
 */
export const Conveyor = memo(function Conveyor({ layout }) {
  const { conveyor } = layout;
  const vertical = {
    left: conveyor.x - conveyor.w / 2,
    right: conveyor.x + conveyor.w / 2,
    top: conveyor.top,
    bottom: conveyor.bottom,
  };
  const arm = {
    left: conveyor.arm.left,
    right: conveyor.arm.right,
    top: conveyor.arm.y - conveyor.arm.h / 2,
    bottom: conveyor.arm.y + conveyor.arm.h / 2,
  };

  return (
    <>
      <BeltRun rect={vertical} axis="vertical" z={Math.round(conveyor.bottom * 10) - 30} />
      <BeltRun rect={arm} axis="horizontal" z={Math.round(conveyor.arm.y * 10)} />

      <BeltPlate x={conveyor.x} y={conveyor.top + (conveyor.bottom - conveyor.top) * 0.25} items={['raw-steak']} />
      <BeltPlate
        x={conveyor.x}
        y={conveyor.top + (conveyor.bottom - conveyor.top) * 0.65}
        items={['raw-steak', 'leafy-greens']}
      />
      <BeltPlate x={arm.left + (arm.right - arm.left) * 0.25} y={conveyor.arm.y - 0.3} items={['leafy-greens']} />
      <BeltPlate
        x={arm.left + (arm.right - arm.left) * 0.75}
        y={conveyor.arm.y - 0.3}
        items={['raw-steak', 'melon-slice']}
      />
    </>
  );
});

const BeltRun = memo(function BeltRun({ rect, axis, z }) {
  const ribs =
    axis === 'vertical'
      ? 'repeating-linear-gradient(0deg, rgba(60,58,54,0.55) 0 2px, transparent 2px 12%)'
      : 'repeating-linear-gradient(90deg, rgba(60,58,54,0.55) 0 2px, transparent 2px 9%)';

  return (
    <div
      className="pointer-events-none absolute overflow-hidden rounded-[3px]"
      style={{ ...box(rect), zIndex: z, backgroundColor: PALETTE.metal, boxShadow: `0 0 0 2px ${O}` }}
    >
      <div className="absolute inset-0" style={{ backgroundImage: ribs }} />
      {axis === 'vertical' ? (
        <>
          <span className="absolute inset-y-0 left-0 w-[16%]" style={{ backgroundColor: PALETTE.metalDark }} />
          <span className="absolute inset-y-0 right-0 w-[16%]" style={{ backgroundColor: PALETTE.metalDark }} />
        </>
      ) : (
        <>
          <span className="absolute inset-x-0 top-0 h-[18%]" style={{ backgroundColor: '#B6BCC2' }} />
          <span className="absolute inset-x-0 bottom-0 h-[22%]" style={{ backgroundColor: PALETTE.metalDark }} />
        </>
      )}
    </div>
  );
});

const BeltPlate = memo(function BeltPlate({ x, y, items }) {
  return (
    <span
      className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-[1px] rounded-full border border-stone-400 bg-white px-1 shadow-sm"
      style={{ left: `${x}%`, top: `${y}%`, zIndex: Math.round(y * 10) + 2 }}
      aria-hidden="true"
    >
      {items.map((id, index) => (
        <span key={`${id}-${index}`} className="text-[7px] leading-[1.4] sm:text-[10px]">
          {foodItemsById[id]?.emoji ?? '🍽️'}
        </span>
      ))}
    </span>
  );
});

/* ----------------------------------------------------------- plating bench */

/**
 * The long wooden bench the plate is assembled on — and, now that the pantry panel is gone,
 * the only plate UI there is.
 *
 * Each slot is a real control: tap a plated item to bin it. Items the chef is still walking
 * for show as ghost dishes in the slots ahead, so the bench doubles as the "what have I asked
 * for" readout without needing a separate panel.
 */
export const PlatingBench = memo(function PlatingBench({
  layout,
  plate = [],
  incoming = [],
  errorPulse = 0,
  disabled = false,
  onRemove,
  onClear,
}) {
  const bench = layout.platingBench;
  const rect = centred(bench, bench.w, bench.h);
  const empty = plate.length === 0 && incoming.length === 0;
  const slots = Array.from({ length: PLATE_CAPACITY });

  return (
    <div className="absolute" style={{ ...box(rect), zIndex: Math.round(bench.y * 10) }}>
      {/* two bench segments, like the reference */}
      <div className="pointer-events-none absolute inset-0 flex gap-[1.5%]">
        <span
          className="h-full w-[34%] rounded-[3px]"
          style={{ backgroundColor: PALETTE.wood, boxShadow: `0 0 0 2px ${O}` }}
        />
        <span
          className="h-full flex-1 rounded-[3px]"
          style={{ backgroundColor: PALETTE.wood, boxShadow: `0 0 0 2px ${O}` }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30%] rounded-t-[3px] bg-amber-200/35" />
      {/* legs */}
      <span className="pointer-events-none absolute -bottom-[22%] left-[4%] h-[24%] w-[3%] rounded-b" style={{ backgroundColor: PALETTE.woodDark }} />
      <span className="pointer-events-none absolute -bottom-[22%] right-[4%] h-[24%] w-[3%] rounded-b" style={{ backgroundColor: PALETTE.woodDark }} />
      <span className="pointer-events-none absolute -bottom-[22%] left-[47%] h-[24%] w-[3%] rounded-b" style={{ backgroundColor: PALETTE.woodDark }} />

      {/* Only labelled while empty, so it reads as a hint and then gets out of the way. */}
      {empty ? (
        <span
          className="pointer-events-none absolute inset-x-0 -top-[64%] text-center text-[8px] font-black uppercase tracking-[0.2em] text-white sm:text-[10px]"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
        >
          Plating bench
        </span>
      ) : null}

      <div
        key={errorPulse}
        className={`absolute inset-0 flex items-center justify-center gap-[2%] px-[2.5%] ${
          errorPulse > 0 ? 'animate-nudge' : ''
        }`}
      >
        {slots.map((_, index) => {
          const itemId = plate[index];
          if (itemId) {
            const item = foodItemsById[itemId];
            return (
              <button
                key={`plated-${index}`}
                type="button"
                disabled={disabled}
                onClick={() => onRemove?.(index)}
                className="flex h-[74%] flex-1 animate-pop-in items-center justify-center rounded-full border border-stone-400 bg-white shadow-sm transition hover:border-rose-400 hover:bg-rose-50 disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                aria-label={`Take ${item?.name ?? 'this item'} off the plate`}
              >
                <span className="text-[10px] leading-none sm:text-[13px]" aria-hidden="true">
                  {item?.emoji ?? '🍽️'}
                </span>
              </button>
            );
          }

          const pendingId = incoming[index - plate.length];
          if (pendingId) {
            return (
              <span
                key={`incoming-${index}`}
                className="flex h-[74%] flex-1 animate-pulse items-center justify-center rounded-full border border-dashed border-white/70 bg-white/35"
                title={`${foodItemsById[pendingId]?.name ?? 'On its way'} — on its way`}
                aria-hidden="true"
              >
                <span className="text-[10px] leading-none opacity-60 sm:text-[13px]">
                  {foodItemsById[pendingId]?.emoji ?? '🍽️'}
                </span>
              </span>
            );
          }

          return (
            <span
              key={`slot-${index}`}
              className="h-[74%] flex-1 rounded-full border border-dashed border-amber-100/30"
              aria-hidden="true"
            />
          );
        })}

        <button
          type="button"
          disabled={disabled || empty}
          onClick={onClear}
          className="flex h-[74%] w-[9%] shrink-0 items-center justify-center rounded-md text-amber-100 transition hover:bg-[#3B2410] disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          style={{ backgroundColor: '#4A2E13' }}
          aria-label="Bin the plate and cancel anything still being fetched"
        >
          <Trash2 className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------- drinks case */

/** Glass drinks chiller at the head of the belt. Arrives with the grill station. */
export const DrinksCase = memo(function DrinksCase({ layout }) {
  const { drinksCase } = layout;

  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[3px]"
      style={{
        left: `${drinksCase.x}%`,
        top: `${drinksCase.y}%`,
        width: `${drinksCase.w}%`,
        height: `${drinksCase.h}%`,
        backgroundColor: PALETTE.metalDark,
        boxShadow: `0 0 0 2px ${O}`,
        zIndex: Math.round(drinksCase.y * 10),
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-[8%] bottom-[22%] flex items-end justify-around gap-[2%] rounded-[2px] px-[4%] pb-[6%]"
        style={{ backgroundColor: PALETTE.glass }}
      >
        {['#F87171', '#FBBF24', '#60A5FA', '#34D399', '#F472B6'].map((colour, index) => (
          <span
            key={colour}
            className="w-[13%] rounded-t-[2px]"
            style={{ backgroundColor: colour, height: `${58 + (index % 3) * 12}%` }}
          />
        ))}
        <span className="absolute inset-y-0 left-[18%] w-[14%] -skew-x-12 bg-white/55" />
      </div>
      <span className="absolute inset-x-[8%] bottom-[8%] h-[10%] rounded bg-stone-300/70" />
    </div>
  );
});

/* ----------------------------------------------------------------- planters */

/** Terracotta pots dressing the edge of the floor. */
export const Planters = memo(function Planters({ layout }) {
  return (
    <>
      {layout.planters.map((spot) => (
        <svg
          key={`${spot.x}-${spot.y}`}
          viewBox="0 0 80 100"
          className="pointer-events-none absolute"
          style={{
            left: `${spot.x}%`,
            top: `${spot.y}%`,
            height: `${layout.planterHeight}%`,
            aspectRatio: '80 / 100',
            transform: 'translate(-50%, -100%)',
            zIndex: Math.round(spot.y * 10) + 1,
          }}
          aria-hidden="true"
        >
          <ellipse cx="40" cy="96" rx="24" ry="5" fill="rgba(0,0,0,0.22)" />
          <g stroke="#14532D" strokeWidth="3" fill="#2C8F44">
            <path d="M40 62 Q10 50 14 22 Q30 16 40 44 Z" />
            <path d="M40 62 Q70 50 66 22 Q50 16 40 44 Z" />
            <path d="M40 58 Q34 24 42 4 Q52 22 46 58 Z" />
          </g>
          <path d="M16 60 H64 L58 94 H22 Z" fill="#C2703A" stroke={O} strokeWidth="3.5" />
          <rect x="12" y="54" width="56" height="10" rx="3" fill="#D98149" stroke={O} strokeWidth="3.5" />
        </svg>
      ))}
    </>
  );
});
