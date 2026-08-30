// src/data/mandaiData.js
//
// The single static reference-data module for the whole app (PRD §2, §3). The exhibit
// SHAPE is fixed by the PRD — do not redesign it.
//
// Phases 1-6 read: lat/lng (location engine), iucnStatus, funFact, feedingTimes, diet,
// trophicRole/dependsOn/predatorOf/ecosystemImpactIfRemoved (food web), imagenetLabels
// (classifier), spriteBodyAsset (sprite compositor), points (questline).
//
// Phase 7 (Ah Meng's Kitchen) reads: id, name, dietTags, points, and the presentation
// extras at the bottom of each entry (emoji, palette).
//
// `dietTags` is the whole hinge of the game: an animal will only ever order food whose
// `satisfies` tags overlap its diet, which is what makes "cook what its real diet needs"
// true rather than decorative.
//
// Coordinates sit on the same grid as `facilities`, `dining` and `demoLocations` below,
// so the Phase 1 distance sort stays coherent.

export const exhibits = [
  {
    id: 'malayan-tiger',
    name: 'Malayan Tiger',
    lat: 1.41,
    lng: 103.792,
    iucnStatus: 'Critically Endangered',
    funFact:
      'Fewer than 150 Malayan tigers are left in the wild. No two have the same stripe pattern — it works like a fingerprint.',
    feedingTimes: ['11:00', '16:30'],
    diet: 'Carnivore',
    dietTags: ['meat', 'bone', 'fish'],
    trophicRole: 'Apex Predator',
    dependsOn: ['sambar deer', 'wild boar'],
    predatorOf: ['sambar deer', 'wild boar'],
    ecosystemImpactIfRemoved:
      'Without tigers, deer and boar numbers explode, over-browse the forest floor, and seedlings never make it to canopy height.',
    imagenetLabels: ['tiger'],
    spriteBodyAsset: '/sprites/bodies/malayan-tiger-body.png',
    spriteHeadAsset: null,
    points: 20,
    // --- presentation (Phase 7) ---
    emoji: '🐯',
    palette: { fur: '#E9A13B', dark: '#C87A18', belly: '#FCE7C0' },
  },
  {
    id: 'lion',
    name: 'African Lion',
    lat: 1.4083,
    lng: 103.7938,
    iucnStatus: 'Vulnerable',
    funFact:
      "A lion's roar carries up to 8km. The lionesses do most of the hunting while the males hold territory.",
    feedingTimes: ['11:00', '16:00'],
    diet: 'Carnivore',
    dietTags: ['meat', 'bone', 'fish'],
    trophicRole: 'Apex Predator',
    dependsOn: ['zebra', 'wildebeest'],
    predatorOf: ['zebra', 'wildebeest', 'antelope'],
    ecosystemImpactIfRemoved:
      'Grazing herds go unchecked, strip the grassland bare, and the savanna food web thins from the bottom up.',
    imagenetLabels: ['lion', 'King of beasts'],
    spriteBodyAsset: '/sprites/bodies/lion-body.png',
    spriteHeadAsset: null,
    points: 20,
    emoji: '🦁',
    palette: { fur: '#E8A33D', dark: '#B36514', belly: '#FBE6BE' },
  },
  {
    id: 'giant-panda',
    name: 'Giant Panda',
    lat: 1.4055,
    lng: 103.79,
    iucnStatus: 'Vulnerable',
    funFact:
      'A panda spends up to 14 hours a day eating, and gets through 12–38kg of bamboo to do it.',
    feedingTimes: ['10:00', '14:00'],
    diet: 'Herbivore',
    dietTags: ['bamboo', 'leaves'],
    trophicRole: 'Primary Consumer',
    dependsOn: ['bamboo groves'],
    predatorOf: [],
    ecosystemImpactIfRemoved:
      'Pandas spread bamboo seed as they move through the forest; without them the groves stop regenerating evenly.',
    imagenetLabels: ['giant panda', 'panda'],
    spriteBodyAsset: '/sprites/bodies/giant-panda-body.png',
    spriteHeadAsset: null,
    points: 20,
    emoji: '🐼',
    palette: { fur: '#F5F5F4', dark: '#3F3F46', belly: '#FFFFFF' },
  },
  {
    id: 'asian-elephant',
    name: 'Asian Elephant',
    lat: 1.403,
    lng: 103.7955,
    iucnStatus: 'Endangered',
    funFact:
      'An elephant drinks up to 200 litres a day and can pick up a single blade of grass with its trunk tip.',
    feedingTimes: ['09:30', '15:00'],
    diet: 'Herbivore',
    dietTags: ['hay', 'fruit', 'leaves'],
    trophicRole: 'Primary Consumer',
    dependsOn: ['grasses', 'tree bark'],
    predatorOf: [],
    ecosystemImpactIfRemoved:
      'Elephants knock down trees and keep grassland open. Lose them and the habitat closes over, pushing out grazing species.',
    imagenetLabels: ['Indian elephant', 'African elephant'],
    spriteBodyAsset: '/sprites/bodies/asian-elephant-body.png',
    spriteHeadAsset: null,
    points: 20,
    emoji: '🐘',
    palette: { fur: '#9CA3AF', dark: '#6B7280', belly: '#D1D5DB' },
  },
  {
    id: 'flamingo',
    name: 'Greater Flamingo',
    lat: 1.4065,
    lng: 103.7885,
    iucnStatus: 'Least Concern',
    funFact:
      'Flamingos are born grey. The pink comes from carotenoids in the brine shrimp and algae they filter-feed.',
    feedingTimes: ['10:15', '15:45'],
    diet: 'Filter feeder',
    dietTags: ['shrimp', 'algae'],
    trophicRole: 'Primary Consumer',
    dependsOn: ['algae', 'brine shrimp'],
    predatorOf: ['brine shrimp'],
    ecosystemImpactIfRemoved:
      'Flamingos keep algal blooms in check. Without them the shallows choke and the whole wetland loses oxygen.',
    imagenetLabels: ['flamingo'],
    spriteBodyAsset: '/sprites/bodies/flamingo-body.png',
    spriteHeadAsset: null,
    points: 20,
    emoji: '🦩',
    palette: { fur: '#F9A8D4', dark: '#EC4899', belly: '#FCE7F3' },
  },
  {
    id: 'giraffe',
    name: 'Reticulated Giraffe',
    lat: 1.4074,
    lng: 103.7902,
    iucnStatus: 'Endangered',
    funFact:
      'A giraffe has the same seven neck vertebrae you do — each one is just about 25cm long.',
    feedingTimes: ['10:45', '16:15'],
    diet: 'Herbivore',
    dietTags: ['leaves', 'fruit'],
    trophicRole: 'Primary Consumer',
    dependsOn: ['acacia trees'],
    predatorOf: [],
    ecosystemImpactIfRemoved:
      'Giraffes prune the canopy high up, which is what lets light reach the shrub layer below.',
    imagenetLabels: ['giraffe'],
    spriteBodyAsset: '/sprites/bodies/giraffe-body.png',
    spriteHeadAsset: null,
    points: 20,
    emoji: '🦒',
    palette: { fur: '#E2B14C', dark: '#A16207', belly: '#FEF3C7' },
  },
  {
    id: 'pygmy-hippo',
    name: 'Pygmy Hippopotamus',
    lat: 1.4043,
    lng: 103.793,
    iucnStatus: 'Endangered',
    funFact:
      'Pygmy hippos sweat a pink oily secretion that works as both sunscreen and antiseptic.',
    feedingTimes: ['10:30', '15:30'],
    diet: 'Herbivore',
    dietTags: ['fruit', 'leaves'],
    trophicRole: 'Primary Consumer',
    dependsOn: ['riverine plants'],
    predatorOf: [],
    ecosystemImpactIfRemoved:
      'Their trails through swamp forest keep waterways open for everything smaller that follows them.',
    imagenetLabels: ['hippopotamus', 'hippo'],
    spriteBodyAsset: '/sprites/bodies/pygmy-hippo-body.png',
    spriteHeadAsset: null,
    points: 20,
    emoji: '🦛',
    palette: { fur: '#A78BFA', dark: '#7C3AED', belly: '#EDE9FE' },
  },
];

export const questlineConfig = {
  // Sum of all 7 exhibits' `points` (7 x 20). Photographing every exhibit completes the
  // questline on its own; Phase 7 order points get the visitor there sooner.
  totalPointsToComplete: 140,
  prizeLabel: 'Free scoop at Ah Meng Restaurant',
};

export const facilities = [
  {
    id: 'restroom-1',
    type: 'restroom',
    name: 'Central Restrooms',
    lat: 1.4058,
    lng: 103.7912,
    nearestLandmark: 'Giant Panda Forest',
  },
  {
    id: 'nursing-1',
    type: 'nursing',
    name: 'Family Nursing Room',
    lat: 1.4047,
    lng: 103.7935,
    nearestLandmark: 'Pygmy Hippo Enclosure',
  },
  {
    id: 'accessible-1',
    type: 'accessible',
    name: 'Accessible Restroom & Ramp',
    lat: 1.4096,
    lng: 103.7918,
    nearestLandmark: 'Malayan Tiger Enclosure',
  },
  {
    id: 'water-refill-1',
    type: 'water-refill',
    name: 'Water Refill Station',
    lat: 1.4068,
    lng: 103.7888,
    nearestLandmark: 'Flamingo Lagoon',
  },
];

export const dining = [
  {
    id: 'ah-meng',
    name: 'Ah Meng Restaurant',
    lat: 1.4052,
    lng: 103.7905,
    tags: ['halal', 'air-conditioned', 'kid-friendly'],
    hours: '10:00–18:00',
    topPicks: ['Nasi Lemak', 'Roti Prata'],
  },
  {
    id: 'canopy-cafe',
    name: 'Canopy Green Cafe',
    lat: 1.4034,
    lng: 103.795,
    tags: ['vegetarian', 'air-conditioned'],
    hours: '09:00–17:00',
    topPicks: ['Garden Salad Bowl', 'Veggie Wrap'],
  },
  {
    id: 'riverside-kiosk',
    name: 'Riverside Snack Kiosk',
    lat: 1.4062,
    lng: 103.789,
    tags: ['halal', 'kid-friendly'],
    hours: '10:00–19:00',
    topPicks: ['Chicken Nuggets', 'Ice Cream'],
  },
];

// One entry per exhibit, plus a couple of landmark points (PRD §3).
export const demoLocations = [
  { label: 'Pygmy Hippo Enclosure', lat: 1.4043, lng: 103.793 },
  { label: 'Malayan Tiger Enclosure', lat: 1.41, lng: 103.792 },
  { label: 'African Lion Habitat', lat: 1.4083, lng: 103.7938 },
  { label: 'Giant Panda Forest', lat: 1.4055, lng: 103.79 },
  { label: 'Asian Elephant Trail', lat: 1.403, lng: 103.7955 },
  { label: 'Flamingo Lagoon', lat: 1.4065, lng: 103.7885 },
  { label: 'Giraffe Savannah', lat: 1.4074, lng: 103.7902 },
  { label: 'Night Safari Entrance', lat: 1.4108, lng: 103.788 },
];

export const exhibitsById = exhibits.reduce((acc, exhibit) => {
  acc[exhibit.id] = exhibit;
  return acc;
}, {});
