// src/types/index.ts
// Type definitions for the location-aware-exhibit-discovery feature.
// These interfaces match the data shapes in src/data/mandaiData.js
// (exhibits, facilities, dining, demoLocations) and the design document's
// "Data Models" section.

/**
 * IUCN conservation status categories used to color-code the IUCN badge.
 */
export type IUCNStatus =
  | 'Least Concern'
  | 'Vulnerable'
  | 'Endangered'
  | 'Critically Endangered';

/**
 * Facility category. Matches the `type` field of facility records in mandaiData.js.
 */
export type FacilityType = 'restroom' | 'nursing' | 'accessible' | 'water-refill';

/**
 * An exhibit record (from mandaiData.js `exhibits`).
 */
export interface Exhibit {
  id: string;
  name: string;
  lat: number;
  lng: number;
  iucnStatus: IUCNStatus;
  funFact: string;
  feedingTimes: string[];
  diet: string;
  dietTags: string[];
  trophicRole: string;
  dependsOn: string[];
  predatorOf: string[];
  ecosystemImpactIfRemoved: string;
  imagenetLabels: string[];
  spriteBodyAsset: string;
  /**
   * A photograph of the animal's head, used as its face until the visitor takes their
   * own. Optional: an exhibit without one falls back to the drawn vector face.
   * Sources and licences: `public/sprites/heads/CREDITS.md`.
   */
  spriteHeadAsset?: string | null;
  points: number;
}

/**
 * A facility record (from mandaiData.js `facilities`).
 */
export interface Facility {
  id: string;
  type: FacilityType;
  name: string;
  lat: number;
  lng: number;
  nearestLandmark: string;
}

/**
 * A dining venue record (from mandaiData.js `dining`).
 */
export interface Dining {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tags: string[];
  hours: string;
  topPicks: string[];
}

/**
 * A demo/simulator location entry (from mandaiData.js `demoLocations`).
 */
export interface DemoLocation {
  label: string;
  lat: number;
  lng: number;
}

/**
 * Questline configuration (from mandaiData.js `questlineConfig`).
 */
export interface QuestlineConfig {
  totalPointsToComplete: number;
  prizeLabel: string;
}

/**
 * A geographic coordinate pair.
 * lat is expected in [-90, 90], lng in [-180, 180].
 */
export interface Position {
  lat: number;
  lng: number;
}

/**
 * An exhibit paired with its computed Haversine distance from the current
 * position, in metres.
 */
export interface ExhibitWithDistance {
  exhibit: Exhibit;
  distance: number; // metres
}

/**
 * A facility paired with its computed Haversine distance from the current
 * position, in metres.
 */
export interface FacilityWithDistance {
  facility: Facility;
  distance: number; // metres
}

/**
 * Where the current position originated from.
 */
export type PositionSource = 'gps' | 'simulator' | 'fallback';

/**
 * Availability status of the current position.
 */
export type PositionStatus = 'acquiring' | 'available' | 'unavailable';

/**
 * The shared location state exposed via React Context.
 */
export interface LocationState {
  currentPosition: Position | null;
  source: PositionSource;
  status: PositionStatus;
  nearestExhibit: ExhibitWithDistance | null;
  sortedFacilities: FacilityWithDistance[];
  allExhibitDistances: ExhibitWithDistance[];
  /**
   * Whether the geolocation fallback notification should be shown. Set true
   * when the system falls back to the default demo location (Requirement 5.4).
   */
  fallbackNotificationVisible: boolean;
}

/**
 * The context value: location state plus the actions consumers can invoke.
 */
export interface LocationContextValue extends LocationState {
  setSimulatedPosition: (position: Position) => void;
  clearSimulatedPosition: () => void;
}

// ---------------------------------------------------------------------------
// Phase 4 — checkpoint-photo-capture types
// These support on-device MobileNet classification and the persisted
// collection of tagged animals. They are additive to the Phase 1 types above.
// ---------------------------------------------------------------------------

/**
 * A single ranked prediction produced by the MobileNet classifier for a
 * captured image. `probability` is on a 0.0 to 1.0 scale.
 */
export interface Prediction {
  className: string;
  probability: number;
}

/**
 * How an exhibit was tagged for a capture: via the on-device classifier, or
 * via the location fallback that tags the nearest exhibit when classification
 * is inconclusive.
 */
export type RecognitionMethod = 'classifier' | 'location-fallback';

/**
 * A single persisted entry in the collection of tagged animals
 * (stored in `localStorage` under the `collectedAnimals` key).
 */
export interface CollectedRecord {
  /** The captured photo reference (e.g. a data URL). */
  photo: string;
  /** The id of the exhibit this capture was tagged to. */
  exhibitId: string;
  /** How the exhibit was recognized for this capture. */
  recognizedVia: RecognitionMethod;
  /** Capture time as milliseconds since the Unix epoch. */
  timestamp: number;
  /**
   * NEW (Phase 6): the composited sprite as a data URL; absent until generated.
   */
  spriteDataUrl?: string;
}
