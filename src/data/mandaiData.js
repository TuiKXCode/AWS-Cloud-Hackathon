// src/data/mandaiData.js
//
// Static reference data. The exhibit SHAPE is fixed by the PRD (§3) — do not redesign it.
//
// Phase 7 (Feeding Frenzy) reads: id, name, dietTags, points, and the presentation extras
// at the bottom of each entry (emoji, palette). Everything else is here so the file stays
// schema-true for Phases 1-6, which own this data properly.
//
// `dietTags` is the whole hinge of the game: an animal will only ever order food whose
// `satisfies` tags overlap its diet, which is what makes "cook what its real diet needs"
// true rather than decorative.

export const exhibits = [
  {
    id: 'malayan-tiger',
    name: 'Malayan Tiger',
    lat: 1.4048,
    lng: 103.7925,
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
    lat: 1.4051,
    lng: 103.7936,
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
    lat: 1.4039,
    lng: 103.7908,
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
    lat: 1.4062,
    lng: 103.7941,
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
    lat: 1.4035,
    lng: 103.7919,
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
    lat: 1.4057,
    lng: 103.7912,
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
  totalPointsToComplete: 100,
  prizeLabel: 'Free scoop at Ah Meng Restaurant',
};

export const exhibitsById = exhibits.reduce((acc, exhibit) => {
  acc[exhibit.id] = exhibit;
  return acc;
}, {});
