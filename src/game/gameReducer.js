// src/game/gameReducer.js
//
// One reducer for the whole day: arrivals, seating, orders, patience, the chef's
// deliveries, scoring, upgrades and the day-over condition.
//
// No JSX in here on purpose — it runs unchanged in plain Node, which is how the loop
// gets smoke-tested without a browser.
//
// Note: arrival timing, seat choice and order choice call Math.random(), so this is not
// strictly pure. Deliberate prototype trade-off; React uses one result per dispatch, so
// nothing desyncs.

import {
  CHEF_STATE,
  CUSTOMER_STATE,
  DAY,
  GAME_PHASE,
  LANDSCAPE,
  MOOD,
  PLATE_CAPACITY,
  SCORING,
  TIMING,
  UPGRADES_BY_ID,
  availableSeats,
  chefIsBusy,
  moodFromPatience,
  pickupSpotForStation,
} from './constants.js';
import { generateOrder, plateMatchesOrder } from './orders.js';

const { ENTERING, SEATED, ORDERING, EATING, LEAVING, STORMING } = CUSTOMER_STATE;

/**
 * `layout` is part of state because every walk target is a coordinate in it. Rotating a phone
 * swaps the whole board, and the running day carries on — everyone snaps to their seat's new
 * position, which is the only sane thing to do without a re-entry animation.
 */
export function createInitialState({
  roster = [],
  day = 1,
  funds = 0,
  upgrades = {},
  layout = LANDSCAPE,
} = {}) {
  return {
    layout,
    roster,
    exhibitsById: roster.reduce((acc, exhibit) => {
      acc[exhibit.id] = exhibit;
      return acc;
    }, {}),

    phase: GAME_PHASE.IDLE,
    day,
    elapsed: 0,

    customers: [],
    chef: {
      x: layout.chefHome.x,
      y: layout.chefHome.y,
      facing: 1,
      walkPhase: 0,
      moving: false,
      atTarget: true,
      state: CHEF_STATE.IDLE,
      /** Finished plate in hand while delivering. */
      tray: [],
      targetCustomerId: null,
      /** Raw ingredients in hand on the way back from the counters. */
      carrying: [],
      /** Taps still to be collected, in tap order: [{ itemId, stationId }]. */
      fetchQueue: [],
      targetStationId: null,
      /** Counts down while he is picking something up. */
      dwell: 0,
    },

    plate: [],
    selectedCustomerId: null,

    arrivalsLeft: 0,
    arrivalTimer: TIMING.firstArrivalDelay,
    nextCustomerId: 1,
    /**
     * Who is still to walk in, in order. Decided up front at START_DAY rather than at the
     * moment of arrival, purely so the head of the list can be drawn waiting on the path
     * outside — the reference makes a feature of the queue at the gate.
     */
    upcoming: [],

    dayPoints: 0,
    funds,
    upgrades: { ...upgrades },

    served: 0,
    walkouts: 0,
    wrongOrders: 0,
    tips: 0,

    toasts: [],
    nextToastId: 1,
    errorPulse: 0,
  };
}

/* ------------------------------------------------------------------ helpers */

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function lerp(a, b, t) {
  return a + (b - a) * Math.min(Math.max(t, 0), 1);
}

function arrivalGapFor(day) {
  const { start, end, jitter } = TIMING.arrivalGap;
  // Days 1-6 ramp from relaxed to busy.
  return lerp(start, end, (day - 1) / 5) + randomBetween(0, jitter);
}

function pushToast(draft, text, kind) {
  draft.toasts = [
    ...draft.toasts,
    { id: draft.nextToastId, text, kind, ttl: TIMING.toastSeconds },
  ].slice(-4);
  draft.nextToastId += 1;
}

/**
 * The day's guest list. Avoids picking the same species twice in a row where it can, so a
 * short queue does not read as a bug.
 */
function buildArrivalOrder(roster, count) {
  if (roster.length === 0) return [];
  const order = [];
  let previous = null;

  for (let i = 0; i < count; i += 1) {
    let pick = roster[Math.floor(Math.random() * roster.length)];
    if (roster.length > 1 && pick.id === previous) {
      pick = roster[Math.floor(Math.random() * roster.length)];
    }
    previous = pick.id;
    order.push(pick.id);
  }
  return order;
}

function seatMap(layout, upgrades) {
  const map = new Map();
  for (const seat of availableSeats(layout, upgrades)) map.set(seat.id, seat);
  return map;
}

function walk(entity, target, speed, dt) {
  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= TIMING.arriveEpsilon) {
    return [{ ...entity, x: target.x, y: target.y, moving: false, atTarget: true }, true];
  }

  const step = Math.min(distance, speed * dt);
  const facing = Math.abs(dx) > 0.4 ? (dx > 0 ? 1 : -1) : entity.facing;

  return [
    {
      ...entity,
      x: entity.x + (dx / distance) * step,
      y: entity.y + (dy / distance) * step,
      facing,
      moving: true,
      atTarget: false,
      walkPhase: entity.walkPhase + dt * 11,
    },
    false,
  ];
}

function customerTarget(layout, customer, seats) {
  switch (customer.state) {
    case LEAVING:
    case STORMING:
      return layout.exit;
    default:
      return seats.get(customer.seatId) ?? layout.exit;
  }
}

function chefTarget(layout, chef, customers, seats) {
  if (chef.state === CHEF_STATE.FETCHING && chef.targetStationId) {
    return pickupSpotForStation(layout, chef.targetStationId);
  }
  if (chef.state === CHEF_STATE.DELIVERING) {
    const target = customers.find((customer) => customer.id === chef.targetCustomerId);
    const seat = target ? seats.get(target.seatId) : null;
    if (seat) return seat.service;
  }
  return layout.chefHome;
}

/**
 * One step of the chef's errand. Split out of `tick` because it is now the busiest part of
 * the loop and reads better on its own.
 *
 * Returns the moved chef plus whatever landed this tick: `delivered` is the customer whose
 * food just arrived, `stocked` is the ingredients just put down on the plating bench.
 */
function stepChef(layout, chef, customers, seats, dt) {
  // Standing at a counter, picking something up.
  if (chef.dwell > 0) {
    return {
      chef: { ...chef, dwell: Math.max(0, chef.dwell - dt), moving: false },
      delivered: null,
      stocked: null,
    };
  }

  const [moved, arrived] = walk(
    chef,
    chefTarget(layout, chef, customers, seats),
    TIMING.chefWalkSpeed,
    dt
  );
  let next = moved;
  let delivered = null;
  let stocked = null;

  switch (next.state) {
    case CHEF_STATE.FETCHING: {
      if (!arrived) break;
      const [job, ...rest] = next.fetchQueue;

      if (!job) {
        // Queue was cleared out from under him mid-walk.
        next = {
          ...next,
          state: next.carrying.length > 0 ? CHEF_STATE.STOCKING : CHEF_STATE.IDLE,
          targetStationId: null,
          atTarget: false,
        };
        break;
      }

      // Pick it up, then head for the next counter or back to the bench. Two items from
      // the same counter simply means he grabs twice without moving.
      next = {
        ...next,
        carrying: [...next.carrying, job.itemId],
        fetchQueue: rest,
        dwell: TIMING.pickupSeconds,
        state: rest.length > 0 ? CHEF_STATE.FETCHING : CHEF_STATE.STOCKING,
        // Keep pointing at this counter while he is still reaching into it, so the view can
        // keep it lit for the length of the grab.
        targetStationId: rest.length > 0 ? rest[0].stationId : job.stationId,
        atTarget: false,
      };
      break;
    }

    case CHEF_STATE.STOCKING: {
      if (!arrived) break;
      stocked = next.carrying;
      next = { ...next, carrying: [], state: CHEF_STATE.IDLE };
      break;
    }

    case CHEF_STATE.DELIVERING: {
      // Target vanished mid-walk. Bail out rather than walking to a ghost.
      if (!customers.some((customer) => customer.id === next.targetCustomerId)) {
        next = {
          ...next,
          state: CHEF_STATE.RETURNING,
          tray: [],
          targetCustomerId: null,
          atTarget: false,
        };
        break;
      }
      if (!arrived) break;
      delivered = next.targetCustomerId;
      next = {
        ...next,
        state: CHEF_STATE.RETURNING,
        tray: [],
        targetCustomerId: null,
        atTarget: false,
      };
      break;
    }

    case CHEF_STATE.RETURNING: {
      if (arrived) next = { ...next, state: CHEF_STATE.IDLE };
      break;
    }

    default:
      break;
  }

  // Back at the bench with taps still waiting: set off again.
  if (next.state === CHEF_STATE.IDLE && next.dwell === 0 && next.fetchQueue.length > 0) {
    next = {
      ...next,
      state: CHEF_STATE.FETCHING,
      targetStationId: next.fetchQueue[0].stationId,
      atTarget: false,
    };
  }

  return { chef: next, delivered, stocked };
}

/** Points for a correct plate, including the speed tip and the grill multiplier. */
export function payoutFor(customer, upgrades) {
  const fast = customer.patience >= SCORING.speedThreshold;
  const base = SCORING.correct + (fast ? SCORING.speedBonus : 0);
  const total = upgrades?.grillStation ? Math.round(base * SCORING.grillMultiplier) : base;
  return { total, fast };
}

/** Customers currently showing an order bubble and not already waiting on the chef. */
export function waitingCustomers(state) {
  return state.customers.filter(
    (customer) => customer.state === ORDERING && !customer.awaitingDelivery
  );
}

/**
 * Who a SERVE would go to: the explicitly selected table, or — if nothing is selected —
 * the most impatient customer whose order the plate actually satisfies.
 */
export function resolveServeTarget(state) {
  if (state.selectedCustomerId) {
    return (
      state.customers.find(
        (customer) =>
          customer.id === state.selectedCustomerId &&
          customer.state === ORDERING &&
          !customer.awaitingDelivery
      ) ?? null
    );
  }

  const matches = waitingCustomers(state).filter((customer) =>
    plateMatchesOrder(state.plate, customer.order)
  );
  if (matches.length === 0) return null;
  return matches.reduce((worst, customer) => (customer.patience < worst.patience ? customer : worst));
}

function makeCustomer(layout, id, exhibit, seat) {
  return {
    id,
    exhibitId: exhibit.id,
    seatId: seat.id,
    tableId: seat.tableId,
    side: seat.side,
    x: layout.arch.x,
    y: layout.arch.y,
    facing: -1,
    walkPhase: 0,
    moving: true,
    atTarget: false,
    state: ENTERING,
    timer: 0,
    patience: 1,
    mood: MOOD.HAPPY,
    order: null,
    awaitingDelivery: false,
    tray: [],
  };
}

/* --------------------------------------------------------------------- tick */

function tick(state, dt) {
  if (state.phase !== GAME_PHASE.RUNNING) return state;

  const draft = { ...state };
  draft.elapsed = state.elapsed + dt;

  const { layout } = state;
  const seats = seatMap(layout, state.upgrades);
  const next = [];

  /* --- chef ------------------------------------------------------------- */
  const { chef, delivered: deliveredTo, stocked } = stepChef(
    layout,
    state.chef,
    state.customers,
    seats,
    dt
  );

  // Ingredients he just put down on the bench join the plate.
  if (stocked && stocked.length > 0) {
    draft.plate = [...state.plate, ...stocked].slice(0, PLATE_CAPACITY);
  }

  /* --- customers -------------------------------------------------------- */
  for (const current of state.customers) {
    let customer = current;
    const [moved, atTarget] = walk(
      customer,
      customerTarget(layout, customer, seats),
      TIMING.customerWalkSpeed,
      dt
    );
    customer = moved;

    // Food just landed on this table.
    if (deliveredTo === customer.id && customer.state === ORDERING) {
      const { total, fast } = payoutFor(customer, state.upgrades);
      draft.dayPoints = state.dayPoints + total;
      draft.funds = draft.funds + total;
      draft.served = draft.served + 1;
      if (fast) draft.tips = draft.tips + 1;
      pushToast(draft, `+${total} pts`, 'good');

      customer = {
        ...customer,
        state: EATING,
        timer: TIMING.eatSeconds,
        awaitingDelivery: false,
        tray: [...state.chef.tray],
      };
      if (draft.selectedCustomerId === customer.id) draft.selectedCustomerId = null;
      next.push(customer);
      continue;
    }

    switch (customer.state) {
      case ENTERING: {
        if (atTarget) {
          customer = {
            ...customer,
            state: SEATED,
            timer: randomBetween(TIMING.seatedSeconds.min, TIMING.seatedSeconds.max),
          };
        }
        break;
      }

      case SEATED: {
        const timer = customer.timer - dt;
        if (timer <= 0) {
          customer = {
            ...customer,
            state: ORDERING,
            timer: 0,
            patience: 1,
            mood: MOOD.HAPPY,
            order: generateOrder(draft.exhibitsById[customer.exhibitId]),
          };
        } else {
          customer = { ...customer, timer };
        }
        break;
      }

      case ORDERING: {
        // Patience freezes the moment the chef picks the order up, so nobody storms out
        // while their food is halfway across the floor.
        if (customer.awaitingDelivery) break;

        const patience = customer.patience - dt / TIMING.patienceSeconds;
        if (patience <= 0) {
          draft.walkouts = draft.walkouts + 1;
          draft.dayPoints = Math.max(0, draft.dayPoints - SCORING.walkoutPenalty);
          pushToast(draft, `-${SCORING.walkoutPenalty} walked out`, 'bad');
          if (draft.selectedCustomerId === customer.id) draft.selectedCustomerId = null;
          customer = {
            ...customer,
            state: STORMING,
            patience: 0,
            mood: MOOD.ANGRY,
            atTarget: false,
          };
        } else {
          customer = { ...customer, patience, mood: moodFromPatience(patience) };
        }
        break;
      }

      case EATING: {
        const timer = customer.timer - dt;
        customer =
          timer <= 0
            ? { ...customer, state: LEAVING, timer: 0, tray: [], atTarget: false }
            : { ...customer, timer };
        break;
      }

      case LEAVING:
      case STORMING: {
        if (atTarget) continue; // out through the arch — drop from the floor
        break;
      }

      default:
        break;
    }

    next.push(customer);
  }

  draft.chef = chef;
  draft.customers = next;

  /* --- arrivals --------------------------------------------------------- */
  draft.arrivalTimer = state.arrivalTimer - dt;
  if (draft.arrivalsLeft > 0 && draft.arrivalTimer <= 0) {
    const taken = new Set(draft.customers.map((customer) => customer.seatId));
    const open = [...seats.values()].filter((seat) => !taken.has(seat.id));

    if (open.length > 0 && draft.roster.length > 0) {
      const seat = open[Math.floor(Math.random() * open.length)];
      // Whoever is at the head of the queue outside walks in next.
      const exhibit =
        draft.exhibitsById[draft.upcoming[0]] ??
        draft.roster[Math.floor(Math.random() * draft.roster.length)];
      draft.customers = [
        ...draft.customers,
        makeCustomer(layout, draft.nextCustomerId, exhibit, seat),
      ];
      draft.upcoming = draft.upcoming.slice(1);
      draft.nextCustomerId += 1;
      draft.arrivalsLeft -= 1;
      draft.arrivalTimer = arrivalGapFor(draft.day);
    } else {
      draft.arrivalTimer = 1; // full house, check again shortly
    }
  }

  /* --- toasts ----------------------------------------------------------- */
  if (draft.toasts.length > 0) {
    draft.toasts = draft.toasts
      .map((toast) => ({ ...toast, ttl: toast.ttl - dt }))
      .filter((toast) => toast.ttl > 0);
  }

  /* --- day over --------------------------------------------------------- */
  if (draft.arrivalsLeft === 0 && draft.customers.length === 0) {
    draft.phase = GAME_PHASE.DAY_OVER;
  }

  return draft;
}

/* ------------------------------------------------------------------ reducer */

export function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_CONTEXT': {
      // Roster / saved progress can resolve after first render.
      if (state.phase !== GAME_PHASE.IDLE) return state;
      const roster = action.roster ?? state.roster;
      const sameRoster =
        state.roster.length === roster.length &&
        state.roster.every((exhibit, index) => exhibit.id === roster[index].id);
      const sameProgress =
        state.day === (action.day ?? state.day) &&
        state.funds === (action.funds ?? state.funds) &&
        JSON.stringify(state.upgrades) === JSON.stringify(action.upgrades ?? state.upgrades);
      if (sameRoster && sameProgress) return state;

      return createInitialState({
        roster,
        day: action.day ?? state.day,
        funds: action.funds ?? state.funds,
        upgrades: action.upgrades ?? state.upgrades,
        layout: state.layout,
      });
    }

    /**
     * The frame changed shape — a phone rotated, or a window resized past the threshold.
     *
     * Seat ids are the same in both layouts, so this is a coordinate swap rather than a
     * reshuffle: anyone already settled snaps to where their chair now is, and anyone still
     * walking restarts from the new arch. No re-entry animation, but no lost customers either.
     */
    case 'SET_LAYOUT': {
      const layout = action.layout;
      if (!layout || layout === state.layout) return state;
      const seats = seatMap(layout, state.upgrades);

      return {
        ...state,
        layout,
        chef: {
          ...state.chef,
          x: layout.chefHome.x,
          y: layout.chefHome.y,
          moving: false,
          atTarget: false,
        },
        customers: state.customers.map((customer) => {
          const seat = seats.get(customer.seatId);
          if (!seat) return customer;
          return customer.state === ENTERING
            ? { ...customer, x: layout.arch.x, y: layout.arch.y, atTarget: false }
            : { ...customer, x: seat.x, y: seat.y, moving: false, atTarget: true };
        }),
      };
    }

    case 'START_DAY': {
      const seatCount = availableSeats(state.layout, state.upgrades).length;
      const arrivals = Math.min(DAY.customersFor(state.day), DAY.maxOnFloor(seatCount) * 3);
      return {
        ...createInitialState({
          roster: state.roster,
          day: state.day,
          funds: state.funds,
          upgrades: state.upgrades,
          layout: state.layout,
        }),
        phase: GAME_PHASE.RUNNING,
        arrivalsLeft: arrivals,
        upcoming: buildArrivalOrder(state.roster, arrivals),
      };
    }

    case 'NEXT_DAY':
      return {
        ...createInitialState({
          roster: state.roster,
          day: state.day + 1,
          funds: state.funds,
          upgrades: state.upgrades,
          layout: state.layout,
        }),
      };

    case 'PAUSE':
      return state.phase === GAME_PHASE.RUNNING ? { ...state, phase: GAME_PHASE.PAUSED } : state;

    case 'RESUME':
      return state.phase === GAME_PHASE.PAUSED ? { ...state, phase: GAME_PHASE.RUNNING } : state;

    case 'TICK':
      return tick(state, Math.min(action.dt, 0.05));

    case 'SELECT_CUSTOMER': {
      const target = state.customers.find(
        (customer) =>
          customer.id === action.customerId &&
          customer.state === ORDERING &&
          !customer.awaitingDelivery
      );
      if (!target) return state;
      return {
        ...state,
        selectedCustomerId: state.selectedCustomerId === target.id ? null : target.id,
      };
    }

    /**
     * Tapping a counter does not put food on the plate — it tells the chef to go and get
     * it. Taps stack up, so you can line up a whole order and watch him run the route.
     */
    case 'QUEUE_ITEM': {
      if (state.phase !== GAME_PHASE.RUNNING) return state;

      const inFlight =
        state.plate.length + state.chef.carrying.length + state.chef.fetchQueue.length;
      if (inFlight >= PLATE_CAPACITY) {
        const draft = { ...state };
        pushToast(draft, 'That is all he can carry', 'info');
        return draft;
      }

      return {
        ...state,
        chef: {
          ...state.chef,
          fetchQueue: [
            ...state.chef.fetchQueue,
            { itemId: action.itemId, stationId: action.stationId },
          ],
        },
      };
    }

    case 'REMOVE_ITEM':
      return { ...state, plate: state.plate.filter((_, index) => index !== action.index) };

    /** Wipes the bench and calls off anything he has not collected yet. */
    case 'CLEAR_PLATE': {
      const { chef } = state;
      if (state.plate.length === 0 && chef.fetchQueue.length === 0 && chef.carrying.length === 0) {
        return state;
      }
      return {
        ...state,
        plate: [],
        chef: {
          ...chef,
          fetchQueue: [],
          carrying: [],
          // If he is out at a counter, send him back rather than leaving him parked there.
          state: chef.state === CHEF_STATE.FETCHING ? CHEF_STATE.STOCKING : chef.state,
          targetStationId: null,
          atTarget: false,
        },
      };
    }

    case 'SERVE': {
      if (state.phase !== GAME_PHASE.RUNNING) return state;
      if (state.plate.length === 0) return state;

      const draft = { ...state };

      if (chefIsBusy(state.chef)) {
        pushToast(draft, 'Chef is still on his feet', 'info');
        return draft;
      }

      const target = resolveServeTarget(state);
      if (!target) {
        pushToast(draft, 'Tap the table you are serving', 'info');
        return draft;
      }

      if (!plateMatchesOrder(state.plate, target.order)) {
        draft.wrongOrders = state.wrongOrders + 1;
        draft.errorPulse = state.errorPulse + 1;
        draft.dayPoints = Math.max(0, state.dayPoints - SCORING.wrongPenalty);
        pushToast(draft, `-${SCORING.wrongPenalty} wrong order`, 'bad');
        draft.plate = [];
        draft.customers = state.customers.map((customer) => {
          if (customer.id !== target.id) return customer;
          const patience = Math.max(0.05, customer.patience - SCORING.wrongPatienceHit);
          return { ...customer, patience, mood: moodFromPatience(patience) };
        });
        return draft;
      }

      // Correct: the chef picks it up and walks it over. Points land on arrival.
      draft.chef = {
        ...state.chef,
        state: CHEF_STATE.DELIVERING,
        tray: [...state.plate],
        targetCustomerId: target.id,
        atTarget: false,
      };
      draft.plate = [];
      draft.customers = state.customers.map((customer) =>
        customer.id === target.id ? { ...customer, awaitingDelivery: true } : customer
      );
      return draft;
    }

    case 'BUY_UPGRADE': {
      const upgrade = UPGRADES_BY_ID[action.upgradeId];
      if (!upgrade || state.upgrades[upgrade.id]) return state;

      const draft = { ...state };
      if (state.funds < upgrade.cost) {
        pushToast(draft, `Need ${upgrade.cost - state.funds} more pts`, 'info');
        return draft;
      }

      draft.funds = state.funds - upgrade.cost;
      draft.upgrades = { ...state.upgrades, [upgrade.id]: true };
      pushToast(draft, `${upgrade.label} unlocked`, 'good');
      return draft;
    }

    case 'END_DAY':
      return { ...state, phase: GAME_PHASE.DAY_OVER, arrivalsLeft: 0, customers: [] };

    default:
      return state;
  }
}
