// src/game/useTycoonGame.js
//
// Drives the reducer off requestAnimationFrame. The loop only exists while a day is
// RUNNING, so the briefing, pause and summary screens cost nothing.

import { useEffect, useMemo, useReducer } from 'react';
import { GAME_PHASE } from './constants.js';
import {
  createInitialState,
  gameReducer,
  resolveServeTarget,
  waitingCustomers,
} from './gameReducer.js';

/**
 * @param {object} context
 * @param {Array}  context.roster   animals that can walk in. Must be referentially stable.
 * @param {number} context.day      day to open on (restored from localStorage)
 * @param {number} context.funds    spendable points balance
 * @param {object} context.upgrades owned upgrades, e.g. { extraTable: true }
 * @param {object} context.layout   LANDSCAPE or PORTRAIT geometry for the current frame
 */
export function useTycoonGame({ roster, day, funds, upgrades, layout }) {
  const [state, dispatch] = useReducer(
    gameReducer,
    { roster, day, funds, upgrades, layout },
    createInitialState
  );

  useEffect(() => {
    dispatch({ type: 'SET_CONTEXT', roster, day, funds, upgrades });
    // Only re-seeds while idle, and bails when nothing actually changed.
  }, [roster, day, funds, upgrades]);

  // Rotating the device swaps the board mid-service; the day carries on.
  useEffect(() => {
    dispatch({ type: 'SET_LAYOUT', layout });
  }, [layout]);

  useEffect(() => {
    if (state.phase !== GAME_PHASE.RUNNING) return undefined;

    let frame = 0;
    let last = performance.now();

    const loop = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      dispatch({ type: 'TICK', dt });
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.phase]);

  // Backgrounding the tab shouldn't cost the player their patience meters.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) dispatch({ type: 'PAUSE' });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const actions = useMemo(
    () => ({
      startDay: () => dispatch({ type: 'START_DAY' }),
      nextDay: () => dispatch({ type: 'NEXT_DAY' }),
      pause: () => dispatch({ type: 'PAUSE' }),
      resume: () => dispatch({ type: 'RESUME' }),
      endDay: () => dispatch({ type: 'END_DAY' }),
      select: (customerId) => dispatch({ type: 'SELECT_CUSTOMER', customerId }),
      /** Send the chef to a counter to collect one item. */
      queueItem: (itemId, stationId) => dispatch({ type: 'QUEUE_ITEM', itemId, stationId }),
      removeItem: (index) => dispatch({ type: 'REMOVE_ITEM', index }),
      clearPlate: () => dispatch({ type: 'CLEAR_PLATE' }),
      serve: () => dispatch({ type: 'SERVE' }),
      buyUpgrade: (upgradeId) => dispatch({ type: 'BUY_UPGRADE', upgradeId }),
    }),
    []
  );

  // Cheap derivations — a handful of customers at most.
  const serveTarget = resolveServeTarget(state);
  const waiting = waitingCustomers(state);

  return { state, actions, serveTarget, waiting };
}
