// src/game/navigation.js
//
// Where anyone is allowed to walk, and how they get there.
//
// Movement used to be a straight line from A to B, which meant the chef strolled through the
// glass chiller and animals cut across the dining tables and in through the wall. This replaces
// that with a coarse walkable grid built from the layout plus A* over it, so:
//
//   * the stone wall is solid, and the ONLY hole in it is the arch — animals have to walk in
//     and out through the front door like everyone else
//   * counters, the belt, the plating bench and every table are obstacles, for guests and for
//     the chef alike
//
// The grid is 1% of the frame per cell and cached per (layout, upgrades), so it is built a
// handful of times per session and then only read. Paths are re-planned when a walk target
// changes, not per frame.

import { tablesFor } from './layouts.js';

/** Grid covers a little outside the frame so the exit and the arrival path are addressable. */
const ORIGIN = -12;
const N = 124;

const index = (cx, cy) => cy * N + cx;
const cellOf = (v) => Math.min(N - 1, Math.max(0, Math.floor(v - ORIGIN)));
const centreOf = (c) => ORIGIN + c + 0.5;

/** Cells whose centre falls inside the rect. Used for opening space up. */
function markCentres(grid, rect, value) {
  const x0 = cellOf(rect.left);
  const x1 = cellOf(rect.right);
  const y0 = cellOf(rect.top);
  const y1 = cellOf(rect.bottom);

  for (let cy = y0; cy <= y1; cy += 1) {
    const wy = centreOf(cy);
    if (wy < rect.top || wy > rect.bottom) continue;
    for (let cx = x0; cx <= x1; cx += 1) {
      const wx = centreOf(cx);
      if (wx < rect.left || wx > rect.right) continue;
      grid[index(cx, cy)] = value;
    }
  }
}

/** Every cell the rect touches at all. Used for closing space off, so it errs solid. */
function markOverlap(grid, rect, value) {
  const x0 = cellOf(rect.left);
  const x1 = cellOf(rect.right);
  const y0 = cellOf(rect.top);
  const y1 = cellOf(rect.bottom);
  for (let cy = y0; cy <= y1; cy += 1) {
    for (let cx = x0; cx <= x1; cx += 1) grid[index(cx, cy)] = value;
  }
}

function setPoint(grid, x, y, value) {
  grid[index(cellOf(x), cellOf(y))] = value;
}

function inflate(rect, wall) {
  return {
    left: rect.left - wall.x,
    right: rect.right + wall.x,
    top: rect.top - wall.y,
    bottom: rect.bottom + wall.y,
  };
}

function boxOf(id, spot, w, h) {
  return {
    id,
    left: spot.x - w / 2,
    right: spot.x + w / 2,
    top: spot.y - h / 2,
    bottom: spot.y + h / 2,
  };
}

/**
 * The solid part of a table.
 *
 * Deliberately narrower than the table top, for two reasons. The top is an ellipse, so a
 * full-width rectangle over-blocks its corners; and more importantly the two usable chairs sit
 * just inside the top's left and right edges, so a full-width box would swallow them and leave
 * every seat unreachable. Insetting to just inside the chairs leaves each one a cell to stand on
 * while the middle of the table stays impassable.
 */
function tableBox(layout, table) {
  const insetX = Math.max(0, layout.tableSize.w / 2 - (layout.seatOffset.x - 1.6));
  const insetY = layout.tableSize.h * 0.16;
  return {
    id: table.id,
    left: table.x - layout.tableSize.w / 2 + insetX,
    right: table.x + layout.tableSize.w / 2 - insetX,
    top: table.y - layout.tableSize.h / 2 + insetY,
    bottom: table.y + layout.tableSize.h / 2 - insetY,
  };
}

/**
 * Everything solid. Note the counters use only their furniture footprint, not the signboard
 * above them — the signs hang overhead and nobody should have to walk around a sign.
 */
export function solidsFor(layout, upgrades = {}) {
  const list = [];

  for (const [id, station] of Object.entries(layout.stations)) {
    const height = layout.stationHeight;
    list.push({
      id: `${id} counter`,
      left: station.x - station.w / 2,
      right: station.x + station.w / 2,
      top: station.y - height / 2 + height * 0.36,
      bottom: station.y + height / 2,
    });
  }

  const belt = layout.conveyor;
  list.push({
    id: 'belt run',
    left: belt.x - belt.w / 2,
    right: belt.x + belt.w / 2,
    top: belt.top,
    bottom: belt.bottom,
  });
  list.push({
    id: 'belt arm',
    left: belt.arm.left,
    right: belt.arm.right,
    top: belt.arm.y - belt.arm.h / 2,
    bottom: belt.arm.y + belt.arm.h / 2,
  });

  if (upgrades.grillStation) {
    list.push(boxOf('drinks case', layout.drinksCase, layout.drinksCase.w, layout.drinksCase.h));
  }

  list.push(
    boxOf('plating bench', layout.platingBench, layout.platingBench.w, layout.platingBench.h)
  );

  for (const table of tablesFor(layout, upgrades)) list.push(tableBox(layout, table));

  return list;
}

/**
 * Build the walkable grid.
 *
 * Order matters. Floor and outside path open space up; the wall ring then closes it again,
 * which is what stops anyone crossing the boundary anywhere except the door; the door opens one
 * gap; obstacles close their own footprints; and finally the handful of spots that people have
 * to be able to stand on are forced open, because chairs sit inside the table they belong to.
 */
export function buildNav(layout, upgrades = {}) {
  const grid = new Uint8Array(N * N);

  for (const rect of layout.floor) markCentres(grid, rect, 1);
  for (const rect of layout.paths) markCentres(grid, rect, 1);

  // The wall: everything the inflated floor covers that the floor itself does not. Computed as
  // a union so the shared edge between the kitchen strip and the dining hall stays open.
  const ring = new Uint8Array(N * N);
  const inner = new Uint8Array(N * N);
  for (const rect of layout.floor) markCentres(ring, inflate(rect, layout.wall), 1);
  for (const rect of layout.floor) markCentres(inner, rect, 1);
  for (let i = 0; i < grid.length; i += 1) {
    if (ring[i] && !inner[i]) grid[i] = 0;
  }

  // the one way in and out
  markCentres(grid, layout.door, 1);

  for (const rect of solidsFor(layout, upgrades)) markOverlap(grid, rect, 0);

  for (const table of tablesFor(layout, upgrades)) {
    for (const seat of table.seats) {
      setPoint(grid, seat.x, seat.y, 1);
      setPoint(grid, seat.service.x, seat.service.y, 1);
    }
  }
  for (const spot of Object.values(layout.stationPickup)) setPoint(grid, spot.x, spot.y, 1);
  setPoint(grid, layout.chefHome.x, layout.chefHome.y, 1);
  setPoint(grid, layout.arch.x, layout.arch.y, 1);
  setPoint(grid, layout.exit.x, layout.exit.y, 1);

  return { grid, layout };
}

const cache = new Map();

/** Cached per layout and per set of upgrades, since upgrades add furniture. */
export function navFor(layout, upgrades = {}) {
  const key = `${layout.id}|${upgrades.extraTable ? 1 : 0}${upgrades.grillStation ? 1 : 0}`;
  let nav = cache.get(key);
  if (!nav) {
    nav = buildNav(layout, upgrades);
    cache.set(key, nav);
  }
  return nav;
}

/* ------------------------------------------------------------------- A* */

/** Nearest open cell to a point, for when someone is nudged inside a wall by a layout swap. */
function nearestOpen(grid, x, y) {
  const sx = cellOf(x);
  const sy = cellOf(y);
  if (grid[index(sx, sy)]) return index(sx, sy);

  for (let r = 1; r <= 14; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const cx = sx + dx;
        const cy = sy + dy;
        if (cx < 0 || cy < 0 || cx >= N || cy >= N) continue;
        if (grid[index(cx, cy)]) return index(cx, cy);
      }
    }
  }
  return -1;
}

/** Minimal binary heap keyed on f-score. */
function heapPush(heap, node) {
  heap.push(node);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (heap[parent].f <= heap[i].f) break;
    [heap[parent], heap[i]] = [heap[i], heap[parent]];
    i = parent;
  }
}

function heapPop(heap) {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let small = i;
      if (l < heap.length && heap[l].f < heap[small].f) small = l;
      if (r < heap.length && heap[r].f < heap[small].f) small = r;
      if (small === i) break;
      [heap[small], heap[i]] = [heap[i], heap[small]];
      i = small;
    }
  }
  return top;
}

const SQRT2 = Math.SQRT2;
const NEIGHBOURS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, SQRT2],
  [1, -1, SQRT2],
  [-1, 1, SQRT2],
  [-1, -1, SQRT2],
];

/** Is the straight segment between two points clear? Used to straighten the cell path. */
function lineClear(grid, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const steps = Math.ceil(Math.hypot(dx, dy) / 0.4);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    if (!grid[index(cellOf(a.x + dx * t), cellOf(a.y + dy * t))]) return false;
  }
  return true;
}

/**
 * A route from `from` to `to` as a short list of waypoints.
 *
 * Falls back to a straight line if the goal is genuinely unreachable, so a bad layout tweak
 * shows up as someone clipping a table rather than as a customer frozen in place forever.
 */
export function findPath(nav, from, to) {
  const { grid } = nav;
  const goalPoint = { x: to.x, y: to.y };

  const start = nearestOpen(grid, from.x, from.y);
  const goal = nearestOpen(grid, to.x, to.y);
  if (start < 0 || goal < 0) return [goalPoint];
  if (start === goal) return [goalPoint];

  // Nothing in the way at all: skip the search.
  if (lineClear(grid, from, goalPoint)) return [goalPoint];

  const gScore = new Float32Array(grid.length).fill(Infinity);
  const cameFrom = new Int32Array(grid.length).fill(-1);
  const closed = new Uint8Array(grid.length);
  const gx = goal % N;
  const gy = (goal - gx) / N;

  const heuristic = (cx, cy) => {
    const dx = Math.abs(cx - gx);
    const dy = Math.abs(cy - gy);
    return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
  };

  gScore[start] = 0;
  const heap = [];
  heapPush(heap, { cell: start, f: heuristic(start % N, Math.floor(start / N)) });

  let found = false;
  while (heap.length > 0) {
    const { cell } = heapPop(heap);
    if (closed[cell]) continue;
    closed[cell] = 1;
    if (cell === goal) {
      found = true;
      break;
    }

    const cx = cell % N;
    const cy = (cell - cx) / N;

    for (const [dx, dy, cost] of NEIGHBOURS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const next = index(nx, ny);
      if (!grid[next] || closed[next]) continue;
      // No slipping through the diagonal join between two solid cells.
      if (dx !== 0 && dy !== 0 && (!grid[index(cx + dx, cy)] || !grid[index(cx, cy + dy)])) {
        continue;
      }

      const tentative = gScore[cell] + cost;
      if (tentative < gScore[next]) {
        gScore[next] = tentative;
        cameFrom[next] = cell;
        heapPush(heap, { cell: next, f: tentative + heuristic(nx, ny) });
      }
    }
  }

  if (!found) return [goalPoint];

  const cells = [];
  for (let cell = goal; cell !== -1; cell = cameFrom[cell]) {
    const cx = cell % N;
    cells.push({ x: centreOf(cx), y: centreOf((cell - cx) / N) });
    if (cell === start) break;
  }
  cells.reverse();
  cells[cells.length - 1] = goalPoint;

  // Straighten it: keep only the waypoints the walker actually has to turn at.
  const points = [{ x: from.x, y: from.y }, ...cells];
  const route = [];
  let i = 0;
  while (i < points.length - 1) {
    let j = points.length - 1;
    while (j > i + 1 && !lineClear(grid, points[i], points[j])) j -= 1;
    route.push(points[j]);
    i = j;
  }
  return route;
}
