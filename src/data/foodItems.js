// src/data/foodItems.js
//
// The pantry, grouped into the three stations from the reference art: Butcher, Cold,
// Greens. Each item declares which `dietTags` it satisfies, which is the only link
// between food and animals — add an exhibit to mandaiData.js and the right items
// immediately become valid for it, with no changes here.

export const STATIONS = [
  { id: 'butcher', label: 'Butcher', tone: 'rose' },
  { id: 'cold', label: 'Cold', tone: 'sky' },
  { id: 'greens', label: 'Greens', tone: 'emerald' },
];

export const foodItems = [
  // --- Butcher ---
  { id: 'raw-steak', name: 'Raw Steak', emoji: '🥩', satisfies: ['meat'], station: 'butcher' },
  { id: 'chicken-leg', name: 'Chicken Leg', emoji: '🍗', satisfies: ['meat'], station: 'butcher' },
  { id: 'marrow-bone', name: 'Marrow Bone', emoji: '🦴', satisfies: ['bone'], station: 'butcher' },

  // --- Cold ---
  { id: 'whole-fish', name: 'Whole Fish', emoji: '🐟', satisfies: ['fish'], station: 'cold' },
  { id: 'brine-shrimp', name: 'Brine Shrimp', emoji: '🦐', satisfies: ['shrimp'], station: 'cold' },
  { id: 'algae-cake', name: 'Algae Cake', emoji: '🥬', satisfies: ['algae'], station: 'cold' },

  // --- Greens ---
  { id: 'leafy-greens', name: 'Leafy Greens', emoji: '🥗', satisfies: ['leaves'], station: 'greens' },
  { id: 'bamboo-shoot', name: 'Bamboo Shoot', emoji: '🎍', satisfies: ['bamboo'], station: 'greens' },
  { id: 'melon-slice', name: 'Melon Slice', emoji: '🍉', satisfies: ['fruit'], station: 'greens' },
  { id: 'banana-bunch', name: 'Bananas', emoji: '🍌', satisfies: ['fruit'], station: 'greens' },
  { id: 'hay-bundle', name: 'Hay Bundle', emoji: '🌾', satisfies: ['hay'], station: 'greens' },
];

export const foodItemsById = foodItems.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});

export function itemsForStation(stationId) {
  return foodItems.filter((item) => item.station === stationId);
}

// Named dishes. A recipe is only offered to an animal if EVERY item in it satisfies one
// of that animal's dietTags. Repeated ids mean quantity — the order ticket renders them
// as "x2", and the plate has to match as a multiset.
export const recipes = [
  // big cats
  { id: 'the-mane-course', name: 'The Mane Course', items: ['raw-steak', 'chicken-leg'] },
  { id: 'savanna-steak-bowl', name: 'Savanna Steak Bowl', items: ['raw-steak', 'marrow-bone'] },
  { id: 'surf-and-roar', name: 'Surf & Roar', items: ['raw-steak', 'whole-fish'] },
  { id: 'bone-appetit', name: 'Bone Appétit', items: ['marrow-bone', 'whole-fish'] },
  { id: 'double-drumstick', name: 'Double Drumstick', items: ['chicken-leg', 'chicken-leg'] },

  // panda
  { id: 'bamboo-brunch', name: 'Bamboo Brunch', items: ['bamboo-shoot', 'bamboo-shoot'] },
  { id: 'panda-platter', name: 'Panda Platter', items: ['bamboo-shoot', 'leafy-greens'] },

  // elephant
  { id: 'trunk-special', name: 'Trunk Special', items: ['hay-bundle', 'hay-bundle'] },
  { id: 'elephant-feast', name: 'Elephant Feast', items: ['hay-bundle', 'melon-slice'] },

  // giraffe / hippo
  { id: 'canopy-salad', name: 'Canopy Salad', items: ['leafy-greens', 'banana-bunch'] },
  { id: 'river-snack', name: 'River Snack', items: ['melon-slice', 'leafy-greens'] },

  // flamingo
  { id: 'pink-plate', name: 'The Pink Plate', items: ['brine-shrimp', 'algae-cake'] },
  { id: 'shrimp-double', name: 'Shrimp Double', items: ['brine-shrimp', 'brine-shrimp'] },
];
