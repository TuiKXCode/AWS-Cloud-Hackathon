// src/game/layouts.js
//
// Two arrangements of the same restaurant, because a phone is not a squeezed laptop.
//
// Everything in the scene is positioned as a percentage of the frame, so the whole board can
// be re-laid-out by swapping one of these objects. The landscape build is traced off the
// 16:9 reference art: kitchen down the left, dining hall on the right. The portrait build is
// traced off the mobile reference: kitchen across the middle, dining hall stacked underneath,
// which is the only way tables stay big enough to hit with a thumb.
//
// x: 0 = left, 100 = right.  y: 0 = top (back of the room), 100 = bottom (front).
//
// Sprites are sized by WIDTH here rather than height. A share of the height means something
// very different in a 16:9 box than in a 9:16 one, and getting that wrong is what made the
// phone build feel like a diagram instead of a room.

/* ------------------------------------------------------------------ shared */

/** Chairs are drawn at all four seats; only the back pair is sittable. */
const FOUR_CHAIRS = (x, back, front) => [
  { x: -x, y: back, back: true },
  { x, y: back, back: true },
  { x: -x, y: front, back: false },
  { x, y: front, back: false },
];

/* --------------------------------------------------------------- landscape */

const LANDSCAPE_RAW = {
  id: 'landscape',
  aspect: '16 / 9',

  wall: { x: 2.4, y: 2.4 },

  /**
   * Two overlapping rectangles that union into an L: a kitchen strip along the bottom-left
   * and the dining hall filling the right. Drawing it this way lets the stone wall hug the
   * real silhouette instead of boxing everything in.
   */
  floor: [
    { left: 10.5, right: 57, top: 49.5, bottom: 91 },
    { left: 47, right: 96.5, top: 25, bottom: 91 },
  ],

  patio: { left: 9, right: 45.5, top: 11.5, bottom: 49.5 },
  patioSlots: {
    grillStation: { x: 19.5, y: 34, w: 15, h: 15 },
    extraTable: { x: 36, y: 34, w: 15, h: 15 },
  },

  arch: { x: 71, y: 19, w: 13.5, h: 21 },
  exit: { x: 71, y: -16 },
  queueSpots: [
    { x: 79, y: 19 },
    { x: 86, y: 14 },
  ],

  chefHome: { x: 47, y: 79 },
  platingBench: { x: 29, y: 85, w: 30, h: 9 },

  stations: {
    butcher: { x: 16, y: 63, w: 9 },
    cold: { x: 26, y: 63, w: 11 },
    greens: { x: 36, y: 63, w: 9 },
  },
  stationHeight: 26,
  /**
   * The chef's lane. Level with `chefHome` and above the plating bench, so every fetch is a
   * clean slide across the front of the kitchen — no route from the bench to a counter, or
   * between two counters, crosses any furniture. Straight-line movement with no pathfinding
   * only stays honest if the layout cooperates.
   */
  stationLaneY: 78,

  conveyor: {
    x: 50,
    w: 6,
    top: 37,
    bottom: 57,
    arm: { left: 41.5, right: 51, y: 60, h: 7 },
  },
  drinksCase: { x: 50, y: 30, w: 8, h: 13 },

  planters: [
    { x: 10.5, y: 19 },
    { x: 44.5, y: 19 },
    { x: 94, y: 34 },
    { x: 94, y: 88 },
    { x: 12, y: 79 },
  ],
  planterHeight: 11,

  tables: [
    { id: 'table-1', x: 65, y: 42, unlockedBy: null },
    { id: 'table-2', x: 84, y: 42, unlockedBy: null },
    { id: 'table-3', x: 65, y: 76, unlockedBy: null },
    { id: 'table-4', x: 84, y: 76, unlockedBy: null },
    { id: 'table-5', x: 36, y: 34, unlockedBy: 'extraTable', outdoor: true },
  ],
  tableSize: { w: 15, h: 9.5 },
  seatOffset: { x: 7, y: 0.5 },
  chairOffsets: FOUR_CHAIRS(7, -4.5, 6.5),
  chairHeight: 10,
  serviceOffset: { x: 1.5, y: 9.5 },
  seatedZLift: 4,

  spriteWidth: { customer: 8.2, chef: 7.6, queue: 6 },
  spriteBounds: { minX: 6, maxX: 94 },
  bubbleAnchor: { left: 34, right: 76 },

  serve: { x: 50, y: 90 },
  picker: { mode: 'popover', minX: 12, maxX: 88, gap: 15 },

  /** Dirt the guests arrive along, drawn under the canopy. */
  paths: [
    { left: 55, right: 101, top: -4, bottom: 9.5 },
    { left: 62.5, right: 92, top: 8, bottom: 26 },
    { left: 55, right: 63.5, top: 88, bottom: 102 },
  ],
  /** Where the canopy band breaks so the path is not buried under leaves. */
  canopyGaps: { top: [[57, 99]], bottom: [], left: [], right: [[-4, 24]] },
  palms: [
    { x: 1.5, y: 34, h: 46, flip: true },
    { x: 6.5, y: 72, h: 40 },
    { x: 2, y: 98, h: 42, flip: true },
    { x: 26, y: 9, h: 26 },
    { x: 98.5, y: 40, h: 44 },
    { x: 95, y: 78, h: 38, flip: true },
    { x: 99, y: 104, h: 40 },
  ],
  leaves: [
    { x: 4, y: 54, h: 13, rotate: -24 },
    { x: 9, y: 95, h: 15, rotate: 16 },
    { x: 92.5, y: 58, h: 13, rotate: 22 },
    { x: 97, y: 94, h: 15, rotate: -14 },
    { x: 55, y: 6, h: 11, rotate: 8 },
    { x: 17, y: 5, h: 11, rotate: -10 },
  ],
};

/* ---------------------------------------------------------------- portrait */

const PORTRAIT_RAW = {
  id: 'portrait',
  aspect: '9 / 16',

  wall: { x: 3.6, y: 2 },

  /** One rectangle in portrait — the kitchen row lives inside the walls, up at the top. */
  floor: [{ left: 7, right: 93, top: 40, bottom: 92 }],

  patio: { left: 6, right: 72, top: 11.5, bottom: 40 },
  patioSlots: {
    grillStation: { x: 20, y: 26, w: 26, h: 8 },
    extraTable: { x: 50, y: 26, w: 26, h: 8 },
  },

  arch: { x: 80, y: 35, w: 15.5, h: 9.4 },
  exit: { x: 80, y: 2 },
  /** Stacked down the path rather than side by side — it reads as a queue at the gate. */
  queueSpots: [
    { x: 89, y: 29 },
    { x: 89, y: 21 },
  ],

  chefHome: { x: 62, y: 54 },
  platingBench: { x: 28, y: 57, w: 44, h: 5 },

  stations: {
    butcher: { x: 16, y: 43, w: 15 },
    cold: { x: 33, y: 43, w: 17 },
    greens: { x: 50, y: 43, w: 15 },
  },
  stationHeight: 13,
  stationLaneY: 54,

  conveyor: {
    x: 67,
    w: 7,
    top: 30,
    bottom: 43.5,
    arm: { left: 59, right: 70.5, y: 45.5, h: 4 },
  },
  drinksCase: { x: 67, y: 26, w: 10, h: 7 },

  planters: [
    { x: 11, y: 38 },
    { x: 66, y: 38 },
    { x: 11, y: 68 },
    { x: 89, y: 68 },
  ],
  planterHeight: 6,

  tables: [
    { id: 'table-1', x: 27, y: 62, unlockedBy: null },
    { id: 'table-2', x: 73, y: 62, unlockedBy: null },
    { id: 'table-3', x: 27, y: 79, unlockedBy: null },
    { id: 'table-4', x: 73, y: 79, unlockedBy: null },
    { id: 'table-5', x: 50, y: 26, unlockedBy: 'extraTable', outdoor: true },
  ],
  tableSize: { w: 21, h: 6 },
  seatOffset: { x: 9.5, y: -0.5 },
  chairOffsets: FOUR_CHAIRS(9.5, -2.8, 4),
  chairHeight: 6,
  serviceOffset: { x: 2, y: 6 },
  seatedZLift: 1.2,

  spriteWidth: { customer: 13, chef: 12, queue: 10 },
  spriteBounds: { minX: 8, maxX: 92 },
  bubbleAnchor: { left: 40, right: 60 },

  serve: { x: 50, y: 87 },
  /** A bottom sheet, not a popover: a floating panel over a counter has nowhere to go here. */
  picker: { mode: 'sheet', minX: 50, maxX: 50, gap: 0 },

  paths: [
    { left: 83, right: 101, top: -4, bottom: 41 },
    { left: 71, right: 92, top: 27, bottom: 41 },
    { left: 44, right: 57, top: 90, bottom: 102 },
  ],
  canopyGaps: { top: [[80, 101]], bottom: [[42, 59]], left: [], right: [[-4, 44]] },
  palms: [
    { x: 2, y: 16, h: 17, flip: true },
    { x: 3.5, y: 48, h: 15 },
    { x: 2, y: 84, h: 16, flip: true },
    { x: 97, y: 54, h: 16 },
    { x: 98.5, y: 90, h: 15, flip: true },
    { x: 30, y: 6, h: 11 },
  ],
  leaves: [
    { x: 4, y: 62, h: 6, rotate: -22 },
    { x: 5, y: 97, h: 7, rotate: 14 },
    { x: 96, y: 40, h: 6, rotate: 20 },
    { x: 96.5, y: 99, h: 7, rotate: -12 },
    { x: 20, y: 5, h: 5, rotate: -8 },
  ],
};

/* ---------------------------------------------------------------- assembly */

/**
 * Bake the derived geometry once, at module load: seats with their service spots, chairs in
 * absolute coordinates, and the spot the chef stands on at each counter.
 *
 * The reducer runs every animation frame, so it reads these rather than recomputing them.
 */
function finalize(raw) {
  const tables = raw.tables.map((table) => ({
    ...table,
    seats: [-1, 1].map((side) => {
      const x = table.x + side * raw.seatOffset.x;
      const y = table.y + raw.seatOffset.y;
      return {
        id: `${table.id}-${side < 0 ? 'left' : 'right'}`,
        tableId: table.id,
        side,
        x,
        y,
        service: { x: x + side * raw.serviceOffset.x, y: y + raw.serviceOffset.y },
      };
    }),
    chairs: raw.chairOffsets.map((chair) => ({
      x: table.x + chair.x,
      y: table.y + chair.y,
      back: chair.back,
    })),
  }));

  const stationPickup = Object.fromEntries(
    Object.entries(raw.stations).map(([id, spot]) => [id, { x: spot.x, y: raw.stationLaneY }])
  );

  return { ...raw, tables, stationPickup };
}

export const LANDSCAPE = finalize(LANDSCAPE_RAW);
export const PORTRAIT = finalize(PORTRAIT_RAW);

export const LAYOUTS = { landscape: LANDSCAPE, portrait: PORTRAIT };

/* ----------------------------------------------------------------- helpers */

/** Tables that exist given the upgrades owned. */
export function tablesFor(layout, upgrades = {}) {
  return layout.tables.filter((table) => !table.unlockedBy || upgrades[table.unlockedBy]);
}

/** Every seat that exists given the upgrades owned. */
export function availableSeats(layout, upgrades = {}) {
  return tablesFor(layout, upgrades).flatMap((table) => table.seats);
}

export function seatById(layout, seatId) {
  for (const table of layout.tables) {
    for (const seat of table.seats) if (seat.id === seatId) return seat;
  }
  return null;
}

/** Where the chef stands to collect from a counter. */
export function pickupSpotForStation(layout, stationId) {
  return layout.stationPickup[stationId] ?? layout.chefHome;
}

/**
 * Keep a sprite's box inside the frame. Sprites are anchored bottom-centre, so their centres
 * have to stay a little away from the edges or they get clipped.
 */
export function clampToScene(layout, x) {
  const { minX, maxX } = layout.spriteBounds;
  return Math.min(Math.max(x, minX), maxX);
}

/**
 * Order tickets are wider than the animal holding one, so near the edges they have to hang to
 * one side instead of being centred.
 */
export function bubbleAnchorFor(layout, x) {
  if (x > layout.bubbleAnchor.right) return 'right';
  if (x < layout.bubbleAnchor.left) return 'left';
  return 'center';
}
