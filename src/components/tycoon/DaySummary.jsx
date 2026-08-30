import { ArrowRight, Coins, Sparkles } from 'lucide-react';
import { UPGRADES } from '../../game/constants.js';
import { questlineConfig } from '../../data/mandaiData.js';

/**
 * End of day: what you earned, where it went, and what you can buy before opening again.
 *
 * Same sizing rule as the briefing screen — this is read on a phone, so nothing here is set in
 * 9px grey. It scrolls rather than shrinking when the shop and the metrics do not both fit.
 */
export default function DaySummary({
  state,
  pointsAwarded,
  questlinePoints,
  onNextDay,
  onBuyUpgrade,
}) {
  const total = questlineConfig.totalPointsToComplete;
  const complete = questlinePoints >= total;
  const shop = UPGRADES.filter((upgrade) => !state.upgrades[upgrade.id]);

  return (
    <div className="absolute inset-0 z-[3000] overflow-y-auto rounded-2xl bg-emerald-950/96 backdrop-blur-sm">
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-4 text-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
            Closing time
          </p>
          <h2 className="text-2xl font-black leading-tight text-amber-300 sm:text-3xl">
            Day {state.day} done
          </h2>
        </div>

        <div className="grid w-full max-w-sm grid-cols-2 gap-2 text-left">
          <Metric label="Orders served" value={state.served} tone="good" />
          <Metric label="Speed tips" value={state.tips} tone="good" />
          <Metric label="Wrong orders" value={state.wrongOrders} tone="bad" />
          <Metric label="Walked out" value={state.walkouts} tone="bad" />
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-amber-400/20 px-4 py-2.5">
          <Sparkles className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
          <p className="text-base font-bold text-amber-100">
            +{pointsAwarded} pts
            <span className="ml-1.5 text-sm font-medium text-amber-100/85">
              → questline {questlinePoints}/{total}
            </span>
          </p>
        </div>

        {complete ? (
          <p className="max-w-sm text-[13px] font-semibold text-emerald-200">
            Questline complete — {questlineConfig.prizeLabel}. The voucher screen itself is Phase
            5&apos;s job.
          </p>
        ) : null}

        {shop.length > 0 ? (
          <div className="w-full max-w-sm">
            <p className="mb-1.5 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-200">
              <Coins className="h-4 w-4" aria-hidden="true" />
              Shop · {state.funds} pts to spend
            </p>
            <div className="flex gap-2">
              {shop.map((upgrade) => {
                const affordable = state.funds >= upgrade.cost;
                return (
                  <button
                    key={upgrade.id}
                    type="button"
                    onClick={() => onBuyUpgrade(upgrade.id)}
                    disabled={!affordable}
                    className={`flex-1 rounded-xl border-2 px-2.5 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                      affordable
                        ? 'border-emerald-400 bg-emerald-800/70 hover:bg-emerald-700/70'
                        : 'cursor-not-allowed border-stone-600 bg-black/25'
                    }`}
                  >
                    <span className="block text-[13px] font-bold text-emerald-50">
                      {upgrade.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-emerald-100/85">
                      {upgrade.blurb}
                    </span>
                    <span className="mt-1 block font-mono text-[13px] font-black text-amber-300">
                      {upgrade.cost} pts
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onNextDay}
          className="flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-base font-black uppercase tracking-wide text-amber-950 shadow-lg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Day {state.day + 1}
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className="rounded-xl bg-black/35 px-3 py-2">
      <p
        className={`font-mono text-2xl font-bold leading-none tabular-nums ${
          tone === 'bad' ? 'text-rose-300' : 'text-emerald-300'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-100">
        {label}
      </p>
    </div>
  );
}
