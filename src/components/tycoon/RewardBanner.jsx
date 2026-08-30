import React from 'react';
import { PALETTE } from '../../game/constants.js';

/**
 * The "Reward unlocked" ribbon from the reference: a wide dark-wood band across the top of
 * the scene. Shown once, when the questline total is reached. The voucher itself belongs to
 * Phase 5 — this only announces that the bar filled.
 */
export default function RewardBanner({ prizeLabel }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[13%] z-[2500] flex justify-center px-[6%]">
      <p
        className="animate-pop-in rounded-md px-4 py-1.5 text-center text-[11px] font-black leading-tight text-[#FBEBD0] sm:px-8 sm:py-2.5 sm:text-lg"
        role="status"
        style={{
          backgroundColor: 'rgba(74,46,19,0.94)',
          boxShadow: `0 0 0 2px ${PALETTE.outline}, 0 4px 12px rgba(0,0,0,0.45)`,
        }}
      >
        Reward unlocked — {prizeLabel}
      </p>
    </div>
  );
}
