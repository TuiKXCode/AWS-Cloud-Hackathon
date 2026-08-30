# Implementation Plan: Checkpoint Photo Capture & Animal Recognition

## Overview

This plan implements Phase 4 as a strict consumer of the already-implemented Phase 1 (location-aware-exhibit-discovery). It builds from the pure, property-testable core (recognition and collection logic) outward through the effectful adapters (MobileNet classifier, localStorage), the capture orchestration hook, the UI, and finally App shell wiring. Phase 1 infrastructure (Vite + React-TS, Vitest, fast-check, `LocationProvider`/`useLocationContext`, `NearbyExhibitCard`, `IUCNBadge`, exhibits data, tabbed `App.tsx`) already exists and is not re-created here.

Each step builds on the previous one and ends with integration into the running app, so there is no orphaned code. Property tests target the pure modules (`recognition.ts`, `collection.ts`); the classifier, camera input, and localStorage are exercised via mocks in integration/example tests.

## Tasks

- [ ] 1. Add dependencies and shared types
  - Add `@tensorflow/tfjs` and `@tensorflow-models/mobilenet` to `package.json` and install them
  - Add `Prediction` (`{ className: string; probability: number }`), `RecognitionMethod` (`'classifier' | 'location-fallback'`), and `CollectedRecord` (`{ photo: string; exhibitId: string; recognizedVia: RecognitionMethod; timestamp: number }`) to `src/types/index.ts`
  - Do not alter existing Phase 1 types (`Exhibit`, `ExhibitWithDistance`, `Position`)
  - _Requirements: 3.1, 6.1, 7.1, 7.6_

- [ ] 2. Implement the pure recognition engine
  - [ ] 2.1 Implement `matchExhibitByLabel` and `resolveTag` in `src/engine/recognition.ts`
    - Export `DEFAULT_CONFIDENCE_THRESHOLD = 0.6` and the `TagResult` interface
    - `matchExhibitByLabel`: return the highest-probability prediction whose `className` case-insensitively exactly matches an exhibit `imagenetLabels` entry (splitting the prediction `className` on commas and trimming so `"hippopotamus, hippo"` matches `"hippo"`); on a probability tie choose the exhibit earliest in dataset order; return `null` when nothing matches or predictions is `null`
    - `resolveTag`: confident label match (`>= threshold`) → `{ exhibit, recognizedVia: 'classifier' }`; else non-null `nearestExhibit` → `{ exhibit: nearestExhibit.exhibit, recognizedVia: 'location-fallback' }`; else `null`; treat `predictions === null` identically to no match
    - _Requirements: 3.2, 3.3, 3.4, 4.1, 4.2, 4.4, 4.5_

  - [ ]* 2.2 Write property test for classifier match selection
    - **Property 1: Classifier match selection is argmax over matching labels with dataset-order tiebreak**
    - **Validates: Requirements 3.2**
    - File: `src/engine/__tests__/recognition.property.test.ts`; minimum 100 iterations

  - [ ]* 2.3 Write property test for confident classifier tagging
    - **Property 2: A confident match produces a classifier tag to the owning exhibit**
    - **Validates: Requirements 3.3**

  - [ ]* 2.4 Write property test for null-normalization of classifier output
    - **Property 3: Missing or unusable classifier output is normalized to "no match"**
    - **Validates: Requirements 3.4, 4.4**

  - [ ]* 2.5 Write property test for location fallback
    - **Property 4: Absent a confident match, tagging falls back to the nearest exhibit**
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 2.6 Write property test for the no-tag case
    - **Property 5: No confident match and no nearest exhibit yields no tag**
    - **Validates: Requirements 4.5**

  - [ ]* 2.7 Write example unit tests for recognition edge cases
    - Comma-separated MobileNet class names, case-insensitivity, and threshold boundary (`prob === threshold`)
    - _Requirements: 3.2, 3.3_

- [ ] 3. Implement the pure collection engine
  - [ ] 3.1 Implement collection logic in `src/engine/collection.ts`
    - `isValidRecord`: non-empty `photo`, non-empty `exhibitId`, `recognizedVia` in the allowed enum, finite numeric `timestamp`
    - `parseCollection(raw)`: `null`/non-array-JSON → `[]`; otherwise keep valid records in original order, drop invalid ones
    - `appendRecord`: return a new array without mutating the input
    - `computePlayerTotal`: sum `points` over the distinct exhibit ids present that map to a known exhibit whose `points` is present and within 0..999999; others contribute 0
    - `isFirstTag`: true when `exhibitId` is not already present in the collection
    - `isPointsAwardable`: false when the exhibit's `points` is missing or outside 0..999999
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.3, 7.4, 7.5_

  - [ ]* 3.2 Write property test for Player_Total derivation
    - **Property 6: Player_Total equals the sum of points over distinct awardable exhibits**
    - **Validates: Requirements 5.1, 5.3, 5.4, 7.3**
    - File: `src/engine/__tests__/collection.property.test.ts`; minimum 100 iterations

  - [ ]* 3.3 Write property test for duplicate-tag stability
    - **Property 7: Re-tagging an already-collected exhibit does not change Player_Total**
    - **Validates: Requirements 5.2**

  - [ ]* 3.4 Write property test for parse-and-drop behavior
    - **Property 8: Parsing keeps exactly the valid records and drops the rest**
    - **Validates: Requirements 7.4, 7.5, 7.6**

  - [ ]* 3.5 Write property test for serialize/parse round-trip
    - **Property 9: Valid records survive a serialize/parse round-trip unchanged**
    - **Validates: Requirements 7.1**

- [ ] 4. Checkpoint - pure engines complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement effectful adapters
  - [ ] 5.1 Implement the MobileNet classifier adapter in `src/engine/classifier.ts`
    - Export the `Classifier` interface and `createMobileNetClassifier()`
    - Lazily `load()` MobileNet once (module-scoped cache) and map `model.classify(image)` results to `Prediction[]`
    - Catch every load/classify error and return `null` (never throw); run entirely in-browser (image never sent externally)
    - _Requirements: 3.1, 3.4, 3.5, 4.4_

  - [ ] 5.2 Implement the localStorage adapter in `src/engine/storage.ts`
    - Export `COLLECTED_ANIMALS_KEY = 'collectedAnimals'`
    - `readRawCollection()`: return the raw string or `null` on any error (never throw)
    - `writeCollection(json)`: return `true` on success, `false` on quota/serialize error
    - _Requirements: 7.1, 7.2, 7.4_

  - [ ]* 5.3 Write unit tests for the adapters with mocks
    - Classifier: mock `@tensorflow-models/mobilenet` to succeed, to throw on load, and to throw on classify → assert `null` normalization
    - Storage: stub `localStorage` for read/write success, missing key, and a throwing setter
    - _Requirements: 3.4, 4.4, 7.2, 7.4_

- [ ] 6. Implement the capture orchestration hook
  - [ ] 6.1 Implement `CaptureProvider` / `useCapture` in `src/context/CaptureContext.tsx`
    - Define `CapturePhase`, `CaptureResult`, and `CaptureContextValue` per the design
    - Consume `useLocationContext()` for `nearestExhibit`; accept an injectable `classifier` prop defaulting to the MobileNet adapter
    - On mount, load the collection via `readRawCollection` → `parseCollection` and derive `playerTotal` via `computePlayerTotal`
    - `handleCapturedFile`: read `File` → data URL + `HTMLImageElement`, snapshot `nearestExhibit` at activation, set `phase='classifying'`, classify, `resolveTag`; on `null` set `phase='error'` and keep the image; otherwise build the `CollectedRecord`, compute `firstTag`/`pointsAwarded`, append, recompute `playerTotal`, attempt `writeCollection` (track `saveOk`), set `phase='result'`
    - `handleCaptureCancelled` (no record), `reportCameraUnavailable` (`cameraUnavailable`), and `dismissResult`
    - _Requirements: 1.5, 2.3, 3.1, 4.3, 5.1, 5.2, 5.4, 6.1, 7.1, 7.2, 7.3_

  - [ ]* 6.2 Write unit tests for the orchestration hook with a mocked classifier
    - Snapshot of `nearestExhibit` at activation used as fallback target; `saveOk=false` path retains the record; first-vs-duplicate `pointsAwarded`
    - _Requirements: 1.5, 5.1, 5.2, 7.2_

- [ ] 7. Implement UI components
  - [ ] 7.1 Implement `TakePhotoButton` in `src/components/TakePhotoButton.tsx`
    - Enabled only when `useLocationContext().nearestExhibit` is non-null; disabled otherwise
    - Own a hidden `<input type="file" accept="image/*" capture="environment" hidden />`
    - Enabled click → `input.click()`; disabled click → no-op; `onChange` with a file → `handleCapturedFile`, without a file → `handleCaptureCancelled`
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 2.1, 2.2, 2.4_

  - [ ] 7.2 Extend `NearbyExhibitCard` to host `TakePhotoButton`
    - Render `<TakePhotoButton />` in the card footer; keep the existing "No exhibit nearby" branch and retain card contents unchanged when out of range
    - _Requirements: 1.1, 1.2, 1.6_

  - [ ] 7.3 Implement `ResultScreen` in `src/components/ResultScreen.tsx`
    - Show the tagged exhibit's fun fact, diet, and IUCN status (reuse `IUCNBadge`); identical fields for classifier vs location-fallback
    - Show points awarded on a first tag and a "no points awarded" indication when not awardable; show a subtle "recognition unavailable" note when `recognizedVia === 'location-fallback'` due to classifier unavailability; show a "saving did not complete" note when `saveOk === false`
    - _Requirements: 4.4, 5.4, 6.1, 6.2, 6.3, 7.2_

  - [ ] 7.4 Implement `CollectionView` in `src/components/CollectionView.tsx`
    - Consume `useCapture()`; list `Collected_Animals` (exhibit name, `IUCNBadge`, recognized-via, timestamp) and show `playerTotal`
    - _Requirements: 6.1, 7.3_

  - [ ]* 7.5 Write component tests for the UI
    - Button enabled/disabled from `nearestExhibit`; disabled click is a no-op; camera-unavailable message retains card; input has `accept`/`capture`; no custom preview UI; Result Screen fields and points indications
    - _Requirements: 1.1, 1.2, 1.6, 1.7, 2.1, 2.2, 5.4, 6.1, 6.2, 6.3_

- [ ] 8. Integrate into the App shell
  - [ ] 8.1 Wire `CaptureProvider` and the Collection tab into `App.tsx`
    - Wrap the tree with `CaptureProvider` inside `LocationProvider`
    - Add a third `'collection'` tab rendering `CollectionView` alongside the existing "Nearby Exhibit" and "Facilities" tabs
    - Render `ResultScreen` as an overlay when `phase === 'result'`, and render the camera-unavailable / no-tag messages when `cameraUnavailable` or `phase === 'error'`
    - _Requirements: 1.7, 4.5, 6.1, 7.3_

- [ ] 9. Checkpoint - UI and wiring complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Integration tests
  - [ ]* 10.1 Write end-to-end integration tests with mocked classifier and localStorage
    - Confident classifier → classifier tag + result; classifier returns null/throws → fallback tag + "recognition unavailable"; no exhibit in range → "no exhibit could be tagged", image retained; `nearestExhibit` snapshot at activation as fallback target; first-vs-duplicate points; `writeCollection` fails → `saveOk=false`, result still shown, no data lost; app load restores valid records and derives `playerTotal`
    - _Requirements: 1.5, 3.1, 3.3, 3.4, 4.3, 4.4, 4.5, 5.1, 5.2, 6.1, 7.2, 7.3_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (tests) and can be skipped for a faster MVP; core implementation tasks are never marked optional.
- Each task references specific requirements for traceability.
- Property tests (P1–P9) target the pure modules `recognition.ts` and `collection.ts` and run a minimum of 100 iterations with fast-check.
- The classifier (TensorFlow.js/MobileNet) and `localStorage` are mocked in tests via the injectable `Classifier` and stubbed `localStorage`; timing budgets (1s/3s) are validated via example/integration tests, not wall-clock assertions.
- Checkpoints ensure incremental validation after the engines and after the UI/wiring.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "3.2", "3.3", "3.4", "3.5", "5.1", "5.2"] },
    { "id": 3, "tasks": ["5.3", "6.1"] },
    { "id": 4, "tasks": ["6.2", "7.1", "7.3", "7.4"] },
    { "id": 5, "tasks": ["7.2", "7.5"] },
    { "id": 6, "tasks": ["8.1"] },
    { "id": 7, "tasks": ["10.1"] }
  ]
}
```
