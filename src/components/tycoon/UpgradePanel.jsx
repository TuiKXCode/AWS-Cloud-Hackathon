import { memo } from 'react';
import { Lock } from 'lucide-react';
import { PALETTE, UPGRADES } from '../../game/constants.js';

const O = PALETTE.outline;

/**
 * The shop, staged on the patio exactly the way the reference does it: a hanging wooden
 * price sign above a ghosted footprint showing what would go there.
 *
 * Upgrades are paid for out of `funds`, a spendable balance separate from the questline
 * points total. That separation is deliberate — the PRD has this game feeding questline
 * progress, so buying a table must never claw progress back.
 */
export default function UpgradePanel({ layout, upgrades, funds, onBuy }) {
  const pending = UPGRADES.filter((upgrade) => !upgrades[upgrade.id]);
  if (pending.length === 0) return null;

  return (
    <>
      {pending.map((upgrade) => {
        const slot = layout.patioSlots[upgrade.id];
        if (!slot) return null;
        const affordable = funds >= upgrade.cost;
        const Ghost = GHOSTS[upgrade.id];

        return (
          <button
            key={upgrade.id}
            type="button"
            onClick={() => onBuy(upgrade.id)}
            disabled={!affordable}
            title={upgrade.blurb}
            className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed"
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: `${slot.w}%`,
              height: `${slot.h * 1.9}%`,
              zIndex: Math.round(slot.y * 10) + 5,
            }}
            aria-label={`Buy ${upgrade.label} for ${upgrade.cost} points${
              affordable ? '' : ' (not enough points yet)'
            }`}
          >
            {/* hanging wooden price sign */}
            <span className="absolute inset-x-[-8%] top-0 block h-[38%]">
              <span
                className="absolute inset-0 flex flex-col items-center justify-center rounded-[4px] px-1 transition group-enabled:group-hover:brightness-110"
                style={{
                  backgroundColor: PALETTE.wood,
                  backgroundImage:
                    'linear-gradient(180deg, rgba(255,236,203,0.45) 0 34%, transparent 34%)',
                  boxShadow: `0 0 0 2px ${O}, 0 2px 4px rgba(0,0,0,0.3)`,
                }}
              >
                <span className="flex items-center gap-[2px] text-[8px] font-black leading-tight text-[#3B2410] sm:text-[11px]">
                  {affordable ? null : <Lock className="h-2 w-2 shrink-0" aria-hidden="true" />}
                  Buy {upgrade.label}
                </span>
                <span className="text-[8px] font-black leading-tight text-[#3B2410] sm:text-[11px]">
                  — {upgrade.cost} pts
                </span>
              </span>
              {/* pointer down toward the footprint */}
              <span
                className="absolute bottom-[-14%] left-1/2 h-[26%] w-[16%] -translate-x-1/2 rotate-45"
                style={{ backgroundColor: PALETTE.wood, boxShadow: `0 0 0 2px ${O}` }}
              />
            </span>

            {/* ghosted footprint */}
            <span
              className={`absolute inset-x-0 bottom-0 block h-[50%] rounded-[5px] border-2 border-dashed transition ${
                affordable
                  ? 'border-lime-300 bg-lime-300/25 group-hover:bg-lime-300/40'
                  : 'border-stone-100/50 bg-stone-100/10'
              }`}
            >
              <Ghost />
            </span>
          </button>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ ghosts */

function GhostSvg({ viewBox, children }) {
  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full opacity-60"
      fill="none"
      stroke="#F5F5F4"
      strokeWidth="3"
      strokeDasharray="6 5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const GhostGrill = memo(function GhostGrill() {
  return (
    <GhostSvg viewBox="0 0 120 90">
      <rect x="18" y="30" width="84" height="30" rx="5" />
      <path d="M18 30 Q60 8 102 30" />
      <line x1="26" y1="60" x2="26" y2="80" />
      <line x1="94" y1="60" x2="94" y2="80" />
      <circle cx="26" cy="82" r="6" />
      <circle cx="94" cy="82" r="6" />
      <line x1="30" y1="44" x2="90" y2="44" />
    </GhostSvg>
  );
});

const GhostTable = memo(function GhostTable() {
  return (
    <GhostSvg viewBox="0 0 120 90">
      <ellipse cx="60" cy="44" rx="34" ry="18" />
      <line x1="60" y1="60" x2="60" y2="76" />
      <ellipse cx="60" cy="78" rx="14" ry="5" />
      <rect x="8" y="30" width="18" height="34" rx="4" />
      <rect x="94" y="30" width="18" height="34" rx="4" />
    </GhostSvg>
  );
});

const GHOSTS = { grillStation: GhostGrill, extraTable: GhostTable };

/* ------------------------------------------------------- what you built */

/**
 * The real furniture, once paid for. The extra table itself comes from `TABLES` so it is a
 * working four-seater rather than a prop; this only draws the grill.
 */
export const PatioBuilds = memo(function PatioBuilds({ layout, upgrades }) {
  if (!upgrades.grillStation) return null;
  const slot = layout.patioSlots.grillStation;

  return (
    <svg
      viewBox="0 0 120 100"
      preserveAspectRatio="xMidYMax meet"
      className="pointer-events-none absolute overflow-visible"
      style={{
        left: `${slot.x}%`,
        top: `${slot.y + slot.h / 2}%`,
        height: `${slot.h * 1.3}%`,
        aspectRatio: '120 / 100',
        transform: 'translate(-50%, -100%)',
        zIndex: Math.round((slot.y + slot.h / 2) * 10),
      }}
      aria-hidden="true"
    >
      <ellipse cx="60" cy="96" rx="44" ry="5" fill="rgba(0,0,0,0.2)" />

      {/* smoke */}
      <g fill="#E7E5E4" opacity="0.75">
        <circle cx="52" cy="18" r="9" />
        <circle cx="64" cy="9" r="11" />
        <circle cx="44" cy="8" r="7" />
      </g>

      {/* open lid */}
      <path d="M20 44 Q60 20 100 44 Z" fill="#57534E" stroke={O} strokeWidth="3.5" />
      {/* body */}
      <rect x="18" y="42" width="84" height="30" rx="5" fill="#71717A" stroke={O} strokeWidth="3.5" />
      <rect x="24" y="48" width="72" height="6" rx="3" fill="#3F3F46" />
      {/* grilling */}
      <ellipse cx="44" cy="47" rx="11" ry="5" fill="#B03B45" stroke="#7E2830" strokeWidth="2" />
      <ellipse cx="72" cy="47" rx="11" ry="5" fill="#C4515A" stroke="#7E2830" strokeWidth="2" />
      {/* legs and wheels */}
      <rect x="24" y="70" width="7" height="16" fill="#52525B" stroke={O} strokeWidth="3" />
      <rect x="89" y="70" width="7" height="16" fill="#52525B" stroke={O} strokeWidth="3" />
      <circle cx="27" cy="88" r="7" fill="#3F3F46" stroke={O} strokeWidth="3" />
      <circle cx="93" cy="88" r="7" fill="#3F3F46" stroke={O} strokeWidth="3" />
    </svg>
  );
});
