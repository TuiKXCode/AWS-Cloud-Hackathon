import { useEffect, useRef, useState } from 'react';
import { exhibitsById, questlineConfig } from '../../data/mandaiData.js';
import { CHEF_STATE, GAME_PHASE, TIMING, chefIsBusy } from '../../game/constants.js';
import { plateMatchesOrder } from '../../game/orders.js';
import { useTycoonGame } from '../../game/useTycoonGame.js';
import { useLayout } from '../../hooks/useLayout.js';
import { usePlayerState } from '../../hooks/usePlayerState.js';
import DayIntro from './DayIntro.jsx';
import DaySummary from './DaySummary.jsx';
import RestaurantScene from './RestaurantScene.jsx';
import RewardBanner from './RewardBanner.jsx';
import ServeButton from './ServeButton.jsx';

const BUSY_LABEL = {
  [CHEF_STATE.FETCHING]: 'fetching…',
  [CHEF_STATE.STOCKING]: 'bringing it back…',
  [CHEF_STATE.DELIVERING]: 'delivering…',
  [CHEF_STATE.RETURNING]: 'on his way back…',
};

/**
 * Cap the frame by whichever axis runs out first, leaving room for the header and the help
 * line. Without this the scene is either letterboxed on a laptop or taller than the window on
 * a phone.
 */
const CHROME = '5.5rem';
const FRAME_MAX_WIDTH = {
  landscape: `min(1700px, calc((100vh - ${CHROME}) * 16 / 9))`,
  portrait: `min(100%, calc((100vh - ${CHROME}) * 9 / 16))`,
};

/**
 * Phase 7 — Feeding Frenzy.
 *
 * Reads `collectedAnimals` for its cast, writes each day's earnings into the same `points`
 * total the Phase 5 questline bar uses. Nothing from Phases 1-6 is required for it to run;
 * when they land, the roster narrows to animals actually photographed and the portraits
 * become real captures.
 *
 * The game is one frame that fills the window. Every control lives inside it — you tap the
 * counter that stores an ingredient and the chef walks over to collect it, the plate sits on
 * the plating bench, and the readouts are layered over the jungle border. Nothing is docked
 * to the edge of the page.
 */
export default function TycoonGame() {
  const {
    playerState,
    tycoon,
    roster,
    headSources,
    addPoints,
    syncTycoon,
    setAnimalPhoto,
    clearAnimalPhoto,
  } = usePlayerState();

  const layout = useLayout();

  const { state, actions, serveTarget } = useTycoonGame({
    roster,
    day: tycoon.day,
    funds: tycoon.funds,
    upgrades: tycoon.upgrades,
    layout,
  });

  const committedRef = useRef(false);
  const [pointsAwarded, setPointsAwarded] = useState(0);

  // Bank the day's earnings into the shared questline total, exactly once per day.
  useEffect(() => {
    if (state.phase === GAME_PHASE.RUNNING) {
      committedRef.current = false;
      return;
    }
    if (state.phase === GAME_PHASE.DAY_OVER && !committedRef.current) {
      committedRef.current = true;
      setPointsAwarded(state.dayPoints);
      addPoints(state.dayPoints);
    }
  }, [state.phase, state.dayPoints, addPoints]);

  // Persist tycoon progress (day, spendable funds, owned upgrades) as it changes.
  useEffect(() => {
    syncTycoon({ day: state.day, funds: state.funds, upgrades: state.upgrades });
  }, [state.day, state.funds, state.upgrades, syncTycoon]);

  // Announce the questline reward the moment it fills, but only if it filled this session.
  const startedBelowTargetRef = useRef(
    playerState.points < questlineConfig.totalPointsToComplete
  );
  const bannerShownRef = useRef(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (
      playerState.points < questlineConfig.totalPointsToComplete ||
      !startedBelowTargetRef.current ||
      bannerShownRef.current
    ) {
      return undefined;
    }
    bannerShownRef.current = true;
    setShowBanner(true);
    const timer = setTimeout(() => setShowBanner(false), TIMING.bannerSeconds * 1000);
    return () => clearTimeout(timer);
  }, [playerState.points]);

  /**
   * Two desktop conveniences, and that is all.
   *
   * The old number-key bindings are gone: mapping 1-9 onto a pantry list only made sense when
   * a pantry list existed, and keeping it meant the game had two different mental models for
   * getting food. Ingredients now come from the counters, on both input methods.
   *
   * Escape is deliberately left alone — the counter pickers use it to close, and having it also
   * pause the day would be a nasty surprise mid-service.
   */
  useEffect(() => {
    if (state.phase !== GAME_PHASE.RUNNING) return undefined;

    const onKeyDown = (event) => {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (event.key === 'Enter') {
        event.preventDefault();
        actions.serve();
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        actions.clearPlate();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, actions]);

  const isRunning = state.phase === GAME_PHASE.RUNNING;
  const ready = Boolean(serveTarget) && plateMatchesOrder(state.plate, serveTarget.order);
  const targetName = serveTarget ? exhibitsById[serveTarget.exhibitId]?.name : null;
  const busy = chefIsBusy(state.chef);

  return (
    <div className="flex h-full flex-col gap-1.5 overflow-y-auto p-2 sm:gap-2 sm:overflow-hidden sm:p-3">
      <header className="flex shrink-0 items-baseline justify-between gap-2">
        <h1 className="text-sm font-black uppercase tracking-[0.2em] text-amber-300 sm:text-base">
          Mandai Echoes
        </h1>
        <p className="text-[10px] uppercase tracking-widest text-emerald-300/70">
          Feeding Frenzy · prototype
        </p>
      </header>

      <div className="flex min-h-0 flex-1 justify-center">
        {/* Fits the frame to whichever of width or height runs out first, so a laptop gets a
            big scene and a phone gets a tall one, rather than either being letterboxed. */}
        <div
          className="relative w-full self-center"
          style={{ aspectRatio: layout.aspect, maxWidth: FRAME_MAX_WIDTH[layout.id] }}
        >
          <RestaurantScene
            state={state}
            exhibitsById={exhibitsById}
            headSources={headSources}
            questlinePoints={playerState.points}
            serveTargetId={serveTarget?.id ?? null}
            interactive={isRunning}
            onSelectCustomer={actions.select}
            onBuyUpgrade={actions.buyUpgrade}
            onFetchItem={actions.queueItem}
            onRemoveItem={actions.removeItem}
            onClearPlate={actions.clearPlate}
            onPause={actions.pause}
            onResume={actions.resume}
          />

          {isRunning ? (
            <ServeButton
              layout={layout}
              busy={busy}
              busyLabel={BUSY_LABEL[state.chef.state] ?? 'busy…'}
              plateCount={state.plate.length}
              ready={ready}
              targetName={targetName}
              onServe={actions.serve}
            />
          ) : null}

          {showBanner ? <RewardBanner prizeLabel={questlineConfig.prizeLabel} /> : null}

          {state.phase === GAME_PHASE.IDLE ? (
            <DayIntro
              day={state.day}
              roster={roster}
              headSources={headSources}
              onStart={actions.startDay}
              onSetPhoto={setAnimalPhoto}
              onClearPhoto={clearAnimalPhoto}
            />
          ) : null}

          {state.phase === GAME_PHASE.PAUSED ? (
            <div className="absolute inset-0 z-[3000] flex flex-col items-center justify-center gap-3 rounded-2xl bg-emerald-950/80 backdrop-blur-sm">
              <p className="text-sm font-bold uppercase tracking-widest text-amber-200">Paused</p>
              <button
                type="button"
                onClick={actions.resume}
                className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-black uppercase tracking-wide text-amber-950 shadow-lg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Resume
              </button>
            </div>
          ) : null}

          {state.phase === GAME_PHASE.DAY_OVER ? (
            <DaySummary
              state={state}
              pointsAwarded={pointsAwarded}
              questlinePoints={playerState.points}
              onNextDay={actions.nextDay}
              onBuyUpgrade={actions.buyUpgrade}
            />
          ) : null}
        </div>
      </div>

      <p className="shrink-0 text-balance px-1 text-center text-[11px] font-medium leading-snug text-emerald-50/90 sm:text-xs">
        Tap a <span className="font-bold text-amber-200">＋</span> counter to send the chef for
        ingredients, then tap the animal you are feeding and hit{' '}
        <span className="font-bold text-amber-200">SERVE</span>.
      </p>
    </div>
  );
}
