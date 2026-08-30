// src/game/orders.js
//
// Orders are generated from an animal's `dietTags`. A recipe is only valid if every item
// in it satisfies one of those tags, which is what stops a tiger asking for a salad and
// makes "cook what its real diet needs" the actual rule rather than a slogan.

import { foodItems, foodItemsById, recipes } from '../data/foodItems.js';

export function itemMatchesDiet(item, dietTags = []) {
  if (!item) return false;
  return item.satisfies.some((tag) => dietTags.includes(tag));
}

/** Pantry items this animal will eat. */
export function pantryForDiet(dietTags = []) {
  return foodItems.filter((item) => itemMatchesDiet(item, dietTags));
}

/** Named recipes this animal can legally order. */
export function recipesForDiet(dietTags = []) {
  return recipes.filter((recipe) =>
    recipe.items.every((itemId) => itemMatchesDiet(foodItemsById[itemId], dietTags))
  );
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Build an order.
 *
 * Two flavours, both visible in the reference art: a named dish ("The Mane Course") or a
 * plain quantity order ("Hay Bundle x2"). Named ones are more fun, so they come up more
 * often; the plain path is also the fallback that keeps a brand-new exhibit working
 * without anyone writing recipes for it.
 */
export function generateOrder(exhibit) {
  const dietTags = exhibit?.dietTags ?? [];
  const named = recipesForDiet(dietTags);
  const edible = pantryForDiet(dietTags);

  if (named.length > 0 && (edible.length === 0 || Math.random() < 0.65)) {
    const recipe = pick(named);
    return { recipeId: recipe.id, name: recipe.name, items: [...recipe.items] };
  }

  if (edible.length === 0) {
    // The pantry has nothing this animal eats — a data problem, not a gameplay one.
    return { recipeId: 'empty', name: 'Just water, thanks', items: [] };
  }

  const item = pick(edible);
  const quantity = Math.random() < 0.4 ? 2 : 1;
  return {
    recipeId: `${item.id}x${quantity}`,
    name: item.name,
    items: Array.from({ length: quantity }, () => item.id),
  };
}

/** Collapse a flat item list into display rows: [{ itemId, quantity }]. */
export function groupItems(items = []) {
  const rows = [];
  const index = new Map();
  for (const itemId of items) {
    if (index.has(itemId)) {
      rows[index.get(itemId)].quantity += 1;
    } else {
      index.set(itemId, rows.length);
      rows.push({ itemId, quantity: 1 });
    }
  }
  return rows;
}

/** Plate vs order as a multiset — two hay bundles is not the same as one. */
export function plateMatchesOrder(plate = [], order) {
  const required = order?.items ?? [];
  if (plate.length !== required.length) return false;

  const tally = new Map();
  for (const id of required) tally.set(id, (tally.get(id) ?? 0) + 1);
  for (const id of plate) {
    const left = tally.get(id);
    if (!left) return false;
    tally.set(id, left - 1);
  }
  return true;
}

/**
 * Tick each required item off against the plate, in order, as a multiset.
 * Drives the green checks on the order ticket.
 */
export function reconcilePlate(plate = [], order) {
  const stock = new Map();
  for (const itemId of plate) stock.set(itemId, (stock.get(itemId) ?? 0) + 1);

  return (order?.items ?? []).map((itemId) => {
    const left = stock.get(itemId) ?? 0;
    if (left > 0) {
      stock.set(itemId, left - 1);
      return { itemId, satisfied: true };
    }
    return { itemId, satisfied: false };
  });
}
