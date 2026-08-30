// src/data/mandaiData.js

export const exhibits = [
  {
    id: "pygmy-hippo",
    name: "Pygmy Hippopotamus",
    lat: 1.4043, lng: 103.7930,
    iucnStatus: "Endangered", // Least Concern | Vulnerable | Endangered | Critically Endangered
    funFact: "...",
    feedingTimes: ["10:30", "15:30"],
    diet: "Herbivore",
    dietTags: ["fruit", "leaves"],          // used later by the tycoon game to match food items
    trophicRole: "Primary Consumer",
    dependsOn: ["riverine plants"],          // producers
    predatorOf: [],                          // it's prey, not predator
    ecosystemImpactIfRemoved: "...",
    imagenetLabels: ["hippopotamus", "hippo"],  // which MobileNet/ImageNet class labels count as a match
    spriteBodyAsset: "/sprites/bodies/pygmy-hippo-body.png", // pre-made placeholder body art, head gets swapped in
    points: 20                                // points awarded on first successful checkpoint capture
  },
  {
    id: "malayan-tiger",
    name: "Malayan Tiger",
    lat: 1.4100, lng: 103.7920,
    iucnStatus: "Critically Endangered",
    funFact: "Every Malayan tiger's stripe pattern is unique, like a human fingerprint, and fewer than about 150 remain in the wild.",
    feedingTimes: ["11:00", "16:00"],
    diet: "Carnivore",
    dietTags: ["meat"],
    trophicRole: "Apex Predator",
    dependsOn: [],
    predatorOf: ["deer", "wild boar"],
    ecosystemImpactIfRemoved: "Without this apex predator, deer and wild boar populations would explode and overgraze the forest, unbalancing the whole ecosystem.",
    imagenetLabels: ["tiger"],
    spriteBodyAsset: "/sprites/bodies/malayan-tiger-body.png",
    points: 25
  },
  {
    id: "giant-panda",
    name: "Giant Panda",
    lat: 1.4055, lng: 103.7900,
    iucnStatus: "Vulnerable",
    funFact: "A giant panda eats 12–38 kg of bamboo every day, with bamboo making up roughly 99% of its diet.",
    feedingTimes: ["09:30", "14:30"],
    diet: "Herbivore",
    dietTags: ["bamboo", "leaves"],
    trophicRole: "Primary Consumer",
    dependsOn: ["bamboo"],
    predatorOf: [],
    ecosystemImpactIfRemoved: "As they move and feed, pandas help disperse bamboo seeds and shape forest growth, so losing them would weaken bamboo forest health.",
    imagenetLabels: ["giant panda", "panda"],
    spriteBodyAsset: "/sprites/bodies/giant-panda-body.png",
    points: 25
  },
  {
    id: "asian-elephant",
    name: "Asian Elephant",
    lat: 1.4030, lng: 103.7955,
    iucnStatus: "Endangered",
    funFact: "A keystone species, the Asian elephant can eat up to about 150 kg of vegetation a day and disperses seeds across long distances.",
    feedingTimes: ["10:00", "15:00"],
    diet: "Herbivore",
    dietTags: ["fruit", "leaves", "grass"],
    trophicRole: "Primary Consumer",
    dependsOn: ["grasses", "fruit trees"],
    predatorOf: [],
    ecosystemImpactIfRemoved: "Elephants disperse seeds and clear paths that engineer habitats, so their loss would reduce plant diversity and forest regeneration.",
    imagenetLabels: ["Indian elephant", "African elephant"],
    spriteBodyAsset: "/sprites/bodies/asian-elephant-body.png",
    points: 20
  },
  {
    id: "flamingo",
    name: "Greater Flamingo",
    lat: 1.4065, lng: 103.7885,
    iucnStatus: "Least Concern",
    funFact: "A flamingo's pink color comes from carotenoid pigments in the algae and brine shrimp it eats.",
    feedingTimes: ["09:00", "13:00"],
    diet: "Omnivore",
    dietTags: ["algae", "shrimp"],
    trophicRole: "Primary Consumer",
    dependsOn: ["algae", "brine shrimp"],
    predatorOf: [],
    ecosystemImpactIfRemoved: "By filter-feeding on algae and shrimp, flamingos help keep wetland algae in balance, so removing them could trigger algal overgrowth.",
    imagenetLabels: ["flamingo"],
    spriteBodyAsset: "/sprites/bodies/flamingo-body.png",
    points: 10
  }
];

export const facilities = [
  {
    id: "restroom-1",
    type: "restroom",
    name: "Central Restrooms",
    lat: 1.4058, lng: 103.7912,
    nearestLandmark: "Giant Panda Forest"
  },
  {
    id: "nursing-1",
    type: "nursing",
    name: "Family Nursing Room",
    lat: 1.4047, lng: 103.7935,
    nearestLandmark: "Pygmy Hippo Enclosure"
  },
  {
    id: "accessible-1",
    type: "accessible",
    name: "Accessible Restroom & Ramp",
    lat: 1.4096, lng: 103.7918,
    nearestLandmark: "Malayan Tiger Enclosure"
  },
  {
    id: "water-refill-1",
    type: "water-refill",
    name: "Water Refill Station",
    lat: 1.4068, lng: 103.7888,
    nearestLandmark: "Flamingo Lagoon"
  }
];

export const dining = [
  {
    id: "ah-meng",
    name: "Ah Meng Restaurant",
    lat: 1.4052, lng: 103.7905,
    tags: ["halal", "air-conditioned", "kid-friendly"],
    hours: "10:00–18:00",
    topPicks: ["Nasi Lemak", "Roti Prata"]
  },
  {
    id: "canopy-cafe",
    name: "Canopy Green Cafe",
    lat: 1.4034, lng: 103.7950,
    tags: ["vegetarian", "air-conditioned"],
    hours: "09:00–17:00",
    topPicks: ["Garden Salad Bowl", "Veggie Wrap"]
  },
  {
    id: "riverside-kiosk",
    name: "Riverside Snack Kiosk",
    lat: 1.4062, lng: 103.7890,
    tags: ["halal", "kid-friendly"],
    hours: "10:00–19:00",
    topPicks: ["Chicken Nuggets", "Ice Cream"]
  }
];

export const demoLocations = [
  { label: "Pygmy Hippo Enclosure", lat: 1.4043, lng: 103.7930 },
  { label: "Malayan Tiger Enclosure", lat: 1.4100, lng: 103.7920 },
  { label: "Giant Panda Forest", lat: 1.4055, lng: 103.7900 },
  { label: "Asian Elephant Trail", lat: 1.4030, lng: 103.7955 },
  { label: "Flamingo Lagoon", lat: 1.4065, lng: 103.7885 },
  { label: "Night Safari Entrance", lat: 1.4108, lng: 103.7880 }
];

export const questlineConfig = {
  totalPointsToComplete: 100,   // sum of all 5 exhibits' `points` = 100
  prizeLabel: "Free scoop at Ah Meng Restaurant" // shown on the redemption voucher
};
