# Implementation Plan: Sprite Generation (Phase 6)

## Overview

This plan implements sprite generation for the Mandai visitor app: each collected animal's captured photo is cropped to a circular head and composited onto per-exhibit placeholder body art via the Canvas API, persisted as `spriteDataUrl`, and shown in a "My Collected Animals" gallery.

The build proceeds bottom-up: static assets and the extended data type first, then the pure geometry core (property-tested), the effectful canvas compositor (example-tested against mocked jsdom canvas), the persistence/selection helpers and capture-context extension (property- and example-tested), the orchestration hook, the UI (fallback-chain image + gallery), and finally app integration and end-to-end wiring. Each step builds on the previous and ends by integrating into the running app.

Stack: Vite + React-TS, Vitest + fast-check, React Testing Library, jsdom. Tailwind is NOT installed — all styling uses inline styles. This feature is a strict consumer/extender of Phase 4 (checkpoint-photo-capture).

## Tasks

- [ ] 1. Assets and data model foundation
  - [ ] 1.1 Create placeholder body-art assets and extend the CollectedRecord type
    - Add `public/sprites/bodies/pygmy-hippo-body.png` — a simple solid-color silhouette (colored rounded shape on transparent background), sized consistently (e.g. 256×256) so the fixed fractional Head_Position lands sensibly. One PNG per exhibit id currently referenced by `mandai.js` `spriteBodyAsset` (only `pygmy-hippo-body.png` is active today).
    - Extend `CollectedRecord` in `src/types/index.ts` with an optional `spriteDataUrl?: string` field; preserve all existing Phase 4 fields (`photo`, `exhibitId`, `recognizedVia`, `timestamp`).
    - Add a `Rect` interface (`{ x, y, width, height }`) to the geometry module's home (created in task 2) or `src/types` per project convention.
    - _Requirements: 1.1, 3.4, 4.1_

  - [ ]* 1.2 Add an asset smoke check for body-art paths
    - Write a lightweight test verifying every `spriteBodyAsset` path referenced by `mandai.js` has a corresponding file under `public/sprites/bodies/`.
    - _Requirements: 5.3_

- [ ] 2. Pure sprite geometry (head/crop math)
  - [ ] 2.1 Implement `spriteGeometry.ts`
    - Create `src/engine/spriteGeometry.ts` with the `HeadPosition` interface, the fixed `HEAD_POSITION` constant (e.g. `{ cx: 0.5, cy: 0.28, diameter: 0.42 }`), the `Rect` interface, `cropRegion(photoWidth, photoHeight): Rect` (centered square, side = `min(w,h)`, side `0` when either dimension is `0`), and `headRect(bodyWidth, bodyHeight, head?): Rect` (bounding box of the circle centered at `(cx·bw, cy·bh)` with diameter `diameter·bw`, defaulting to `HEAD_POSITION`). Pure, deterministic, no I/O.
    - _Requirements: 2.1, 2.5_

  - [ ]* 2.2 Write property test for the crop region
    - **Property 2: Crop region is a centered square within the photo bounds**
    - **Validates: Requirements 2.1, 2.2**
    - fast-check, ≥100 iterations; random `w,h` in `[0, 4000]` incl. zeros/asymmetric; assert `width === height === min(w,h)`, centered (`x = (w−side)/2`, `y = (h−side)/2`), within bounds, and side `0` when a dimension is `0`. File: `spriteGeometry.property.test.ts`.

  - [ ]* 2.3 Write property test for the head rectangle
    - **Property 3: Head rectangle is a deterministic function of the fixed Head_Position**
    - **Validates: Requirements 2.5**
    - fast-check, ≥100 iterations; random positive `bw,bh`; assert determinism (identical inputs → identical `Rect`) and the exact bounding-box formula from `HEAD_POSITION`. File: `spriteGeometry.property.test.ts`.

- [ ] 3. Effectful canvas compositor
  - [ ] 3.1 Implement `spriteCompositor.ts`
    - Create `src/engine/spriteCompositor.ts` exporting `IMAGE_LOAD_TIMEOUT_MS = 5000` and `generateSprite(photoDataUrl, bodyAssetUrl, headPosition?): Promise<string | null>`.
    - Internal `loadImage(url, timeoutMs)` resolves to `HTMLImageElement | null` (never rejects): clears its timer on load/error, resolves `null` on timeout or error.
    - Steps: load photo + body (each bounded by the timeout); return `null` if the photo has zero width or height; compute `cropRegion` (source) and `headRect` (destination) from `spriteGeometry`; draw body onto a canvas sized to the body, then `save → beginPath → arc → clip → drawImage(photo, srcCrop, headRect) → restore` (body first, head over it); export via `canvas.toDataURL('image/png')`.
    - Never throw: normalize every failure (missing `getContext`, draw throw, `toDataURL` throw/empty, load error/timeout) to a `null` return.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 4.2_

  - [ ]* 3.2 Write unit/example tests for `generateSprite`
    - Mock the global `Image` (src setter schedules `load`/`error`/never-fire, controllable `naturalWidth`/`naturalHeight`), stub `getContext('2d')` to a spy context recording call order, stub `toDataURL` to a deterministic marker; use `vi.useFakeTimers` for the timeout.
    - Assert: receives `record.photo` as `photoDataUrl` (1.2); `null` for zero-dimension photo (2.2); body `drawImage` precedes head clip + `drawImage`, `toDataURL` returned (2.3, 2.4); same inputs twice → same data URL (2.5); body never loads + fake timers → `null` after 5s (2.6); corrupt photo / missing `getContext` / `toDataURL` throw → `null`, never rejects (4.2).
    - _Requirements: 1.2, 2.2, 2.3, 2.4, 2.5, 2.6, 4.2_

- [ ] 4. Checkpoint — engines
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Persistence, selection, and capture-context extension
  - [ ] 5.1 Add pure selection and record-updater helpers
    - In a pure module (e.g. `src/engine/spriteSelection.ts` or a helper co-located with the hook), implement the generation-selection predicate: given a collection, the exhibits dataset, and a per-record attempt map, return exactly the records that (a) resolve to a known exhibit, (b) have no `spriteDataUrl`, and (c) have attempts `< MAX_SPRITE_ATTEMPTS`. Export `MAX_SPRITE_ATTEMPTS = 3`.
    - Implement a pure record-updater helper that, given a collection, a stable record key (`${exhibitId}-${timestamp}`), and a non-empty `spriteDataUrl`, returns a new collection with only that record's `spriteDataUrl` set (all other fields and records unchanged, length unchanged).
    - _Requirements: 1.3, 3.2, 3.4, 4.4_

  - [ ] 5.2 Extend `parseCollection` and `CaptureContext` with `updateSpriteDataUrl`
    - Extend Phase 4 `parseCollection` to preserve an optional valid `spriteDataUrl` string and treat its absence as a normal (legacy-compatible) record.
    - Add `updateSpriteDataUrl(recordKey, spriteDataUrl)` to `CaptureProvider` / `useCapture()`: build the next collection immutably via the record-updater helper, `setCollection`, then attempt `writeCollection(JSON.stringify(next))`; on write failure keep the in-memory update and discard no records.
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 5.3 Write property test for generation selection
    - **Property 1: Generation selection picks exactly the eligible records**
    - **Validates: Requirements 1.3, 3.2, 4.4**
    - fast-check, ≥100 iterations; random collections (mixed known/unknown `exhibitId`, with/without `spriteDataUrl`) + random exhibit sets + random attempt maps; assert selected ⇔ known ∧ no-sprite ∧ attempts < MAX. File: `spriteSelection.property.test.ts`.

  - [ ]* 5.4 Write property test for the record updater
    - **Property 4: The updater sets only spriteDataUrl on the target record and preserves everything else**
    - **Validates: Requirements 3.4**
    - fast-check, ≥100 iterations; random collections + random target key + random url; assert only the target's `spriteDataUrl` changes, all other fields/records and length unchanged. File: `spriteUpdate.property.test.ts`.

  - [ ]* 5.5 Write unit tests for persistence behavior
    - `writeCollection` stubbed → `false`: collection keeps `spriteDataUrl`, no records dropped (3.3). `parseCollection` round-trips a record with `spriteDataUrl` and accepts legacy records without it.
    - _Requirements: 3.1, 3.3_

- [ ] 6. Orchestration hook
  - [ ] 6.1 Implement `useSpriteGeneration()`
    - Create `src/hooks/useSpriteGeneration.ts`. On mount and whenever `collection` changes, select eligible records (via the task 5.1 predicate) and generate one at a time, asynchronously, so the UI stays responsive. Track attempts in a `useRef<Map<string, number>>` keyed by the stable record key; use a `useRef` "busy" guard so only one generation runs at a time and re-scan after each completion.
    - Resolve each record's exhibit by `exhibitId`; skip unknown-exhibit records without retry. On success call `updateSpriteDataUrl`; on `null` leave `spriteDataUrl` absent for retry within the attempt budget. Process records independently. Return `{ generating: boolean }`.
    - _Requirements: 1.1, 1.3, 3.1, 4.4, 6.1, 6.2, 6.3_

- [ ] 7. UI components
  - [ ] 7.1 Implement `SpriteImage` (fallback chain)
    - Create `src/components/SpriteImage.tsx` with `SpriteImageProps` (`spriteDataUrl?`, `bodyAssetUrl?`, `alt`, `size?`). Precedence: show `spriteDataUrl` if present; else show `bodyAssetUrl` in an `<img>` with an `onError` handler that flips a `bodyErrored` state; when errored or `bodyAssetUrl` absent, render a neutral `Placeholder_Fallback` (inline SVG data URI / styled box) — never a broken `<img>`. Inline styles only.
    - _Requirements: 4.2, 4.3, 5.2, 5.3_

  - [ ] 7.2 Implement `GalleryView` (My Collected Animals)
    - Create `src/components/GalleryView.tsx` consuming `useCapture()`. Render one `SpriteImage` per record (resolve exhibit by `exhibitId` for `spriteBodyAsset` + display name); mount `useSpriteGeneration()` so generation runs while the gallery is open and entries re-render as sprites arrive. Empty state when `collection.length === 0`. Grid layout via inline styles.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.3_

  - [ ]* 7.3 Write component tests for `SpriteImage` and `GalleryView`
    - `SpriteImage` with `spriteDataUrl` shows the sprite (5.2); no sprite → body `<img>` (4.2); body `onError` → placeholder, no broken image (4.3); full chain sprite→body→placeholder (5.3). `GalleryView` with N records renders N entries (5.1); empty collection shows the no-animals indication (5.4).
    - _Requirements: 4.2, 4.3, 5.1, 5.2, 5.3, 5.4_

- [ ] 8. Checkpoint — components
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. App integration and wiring
  - [ ] 9.1 Add the "My Animals" tab rendering `GalleryView`
    - Update `App.tsx` (inside the existing `LocationProvider` → `CaptureProvider`) to add a "My Animals" tab that renders `GalleryView`, retaining the existing Phase 4 `CollectionView`. `GalleryView` shares the same `CaptureProvider` collection instance and persistence.
    - _Requirements: 5.1, 6.3_

  - [ ]* 9.2 Write integration tests for the full generation flow
    - Mounted gallery with a mocked compositor: record lacking `spriteDataUrl` triggers generation without re-capture (1.1, 1.2, 4.1); successful generation calls `writeCollection` with the record carrying `spriteDataUrl`, other fields intact (3.1, 3.4); compositor fails for a subset → remaining records still receive sprites (6.2); slow mocked compositor → gallery interactive before completion (6.1); resolution → the record's entry re-renders to show its sprite (6.3); unknown `exhibitId` → skipped, `spriteDataUrl` stays absent (1.3); permanently-failing record → retried up to `MAX_SPRITE_ATTEMPTS`, then stops (4.4).
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.4, 4.1, 4.4, 6.1, 6.2, 6.3_

- [ ] 10. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (unit/property/integration tests) and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references specific requirements (granular sub-requirements) for traceability.
- Property-based tests (fast-check, ≥100 iterations) apply only to the pure modules: crop region (P2), head rectangle (P3), generation selection (P1), and the record updater (P4). The effectful canvas compositor, persistence effects, concurrency, and UI fallback rendering use example/component/integration tests against mocked jsdom canvas and stubbed browser primitives.
- Checkpoints after the engines (task 4) and after the components (task 8) ensure incremental validation.
- Styling is inline throughout (Tailwind is not installed); tests assert on roles/attributes/content, not utility classes.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1", "5.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "5.2"] },
    { "id": 3, "tasks": ["5.3", "5.4", "5.5", "6.1"] },
    { "id": 4, "tasks": ["7.1", "7.2"] },
    { "id": 5, "tasks": ["7.3", "9.1"] },
    { "id": 6, "tasks": ["9.2"] }
  ]
}
```
