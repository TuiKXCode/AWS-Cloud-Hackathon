// src/game/constants.js
//
// Rules, tuning and shared vocabulary for Feeding Frenzy.
//
// Anything positional lives in layouts.js instead, because the phone and the laptop lay the
// restaurant out differently. This file is what both builds agree on.

export { LANDSCAPE, PORTRAIT, LAYOUTS } from './layouts.js';
export {
  availableSeats,
  bubbleAnchorFor,
  clampToScene,
  pickupSpotForStation,
  seatById,
  tablesFor,
} from './layouts.js';

export const GAME_PHASE = {
  IDLE: 'idle', // pre-day briefing
  RUNNING: 'running',
  PAUSED: 'paused',
  DAY_OVER: 'day-over',
};

/**
 * Customers sit down and order from their table — the chef comes to them.
 */
export const CUSTOMER_STATE = {
  ENTERING: 'entering', // arch -> assigned chair
  SEATED: 'seated', // sat down, reading the menu
  ORDERING: 'ordering', // order bubble up, patience draining
  EATING: 'eating', // food delivered
  LEAVING: 'leaving', // happy, heading for the arch
  STORMING: 'storming', // patience ran out
};

/**
 * The chef does all the walking, both halves of the job.
 *
 * Ingredients are not conjured out of a menu — you tap the counter that stores them and he
 * walks over, picks them up, and carries them back to the plating bench. Several taps queue
 * up and he does them as one round trip, which is what makes the kitchen layout matter
 * instead of being scenery.
 */
export const CHEF_STATE = {
  IDLE: 'idle', // at the plating bench, hands empty
  FETCHING: 'fetching', // walking to a counter to collect the next queued item
  STOCKING: 'stocking', // walking back to the bench with ingredients in hand
  DELIVERING: 'delivering', // walking a finished plate to a table
  RETURNING: 'returning', // walking back empty-handed
};

/** True while the chef is mid-errand and cannot be handed a new job. */
export function chefIsBusy(chef) {
  return chef.state !== CHEF_STATE.IDLE || chef.fetchQueue.length > 0 || chef.carrying.length > 0;
}

/**
 * Shared palette. Every piece of scenery pulls its colours from here so the whole board
 * looks like one illustration rather than a pile of components.
 */
export const PALETTE = {
  outline: '#4A2E13',
  wood: '#A9713C',
  woodLight: '#C89464',
  woodDark: '#7B4E24',
  woodTop: '#C08552',
  stone: '#CFC6B4',
  stoneShade: '#AFA593',
  tile: '#F2E7CE',
  dirt: '#C2A176',
  dirtDark: '#A98757',
  grass: '#3F8A3C',
  grassDark: '#14532D',
  metal: '#9AA0A6',
  metalDark: '#6B7280',
  glass: '#CFE3F2',
};

export const TIMING = {
  /** Floor-percent units per second. */
  customerWalkSpeed: 15,
  chefWalkSpeed: 36,
  arriveEpsilon: 0.9,
  /** Beat spent at a counter picking the item up, so the grab reads as an action. */
  pickupSeconds: 0.3,
  /** Sat down, deciding what to have. */
  seatedSeconds: { min: 1.2, max: 3 },
  /** Full patience bar once the order is placed. */
  patienceSeconds: 34,
  eatSeconds: 5.5,
  /** Gap between arrivals — tightens as the days go on. */
  arrivalGap: { start: 6, end: 3, jitter: 1.4 },
  firstArrivalDelay: 0.6,
  toastSeconds: 2.4,
  /** Reward banner dwell time. */
  bannerSeconds: 4.5,
};

export const DAY = {
  /** Customers per day: 4 + day, capped. Day 1 is a gentle five. */
  customersFor: (day) => Math.min(4 + day, 11),
  /** Never let more animals in than there are chairs. */
  maxOnFloor: (seatCount) => seatCount,
};

export const SCORING = {
  /** Base points for a correct plate. */
  correct: 10,
  /** Bonus if the customer was still above `speedThreshold` patience when served. */
  speedBonus: 5,
  speedThreshold: 0.6,
  /** Grill station upgrade multiplier on everything you earn. */
  grillMultiplier: 1.5,
  wrongPenalty: 5,
  wrongPatienceHit: 0.2,
  walkoutPenalty: 5,
};

export const UPGRADES = [
  {
    id: 'extraTable',
    label: 'Extra Table',
    cost: 80,
    blurb: 'Two more chairs out on the patio, so fewer animals wait outside.',
  },
  {
    id: 'grillStation',
    label: 'Grill Station',
    cost: 150,
    blurb: 'Cooked food sells for more — every order pays 1.5x.',
  },
];

export const UPGRADES_BY_ID = UPGRADES.reduce((acc, upgrade) => {
  acc[upgrade.id] = upgrade;
  return acc;
}, {});

/** Biggest recipe is three items; the chef's hands hold two extra so mistakes are possible. */
export const PLATE_CAPACITY = 5;

export const MOOD = {
  HAPPY: 'happy',
  IMPATIENT: 'impatient',
  ANGRY: 'angry',
};

export function moodFromPatience(patience) {
  if (patience > 0.6) return MOOD.HAPPY;
  if (patience > 0.3) return MOOD.IMPATIENT;
  return MOOD.ANGRY;
}
