# Implementation Plan: Location-Aware Exhibit Discovery

## Overview

This plan implements the core visitor interaction loop for the Mandai Wildlife Reserve web app. The approach is incremental: start with pure utility functions (haversine, location engine), build the React context state layer, then wire up UI components. Each phase validates correctness before moving to the next. Implementation uses TypeScript, React with Context API, Vitest for testing, and fast-check for property-based tests.

## Tasks

- [x] 1. Set up project foundation and dependencies
  - [x] 1.1 Initialize React TypeScript project with Vite and install dependencies
    - Initialize the project with Vite React-TS template if not already set up
    - Install dependencies: `react`, `react-dom`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `fast-check`, `jsdom`
    - Configure `vitest.config.ts` with jsdom environment and test file patterns
    - Create base directory structure: `src/utils/`, `src/engine/`, `src/context/`, `src/components/`, and their `__tests__/` subdirectories
    - _Requirements: All (foundational setup)_

  - [x] 1.2 Create TypeScript type definitions for data models
    - Create `src/types/index.ts` with interfaces: `Exhibit`, `Facility`, `DemoLocation`, `Position`, `ExhibitWithDistance`, `FacilityWithDistance`
    - Define `PositionSource` type (`'gps' | 'simulator' | 'fallback'`) and `PositionStatus` type (`'acquiring' | 'available' | 'unavailable'`)
    - Define `LocationState` and `LocationContextValue` interfaces
    - Ensure types match the data shapes in `src/data/mandai.js`
    - _Requirements: 1.1, 1.2, 4.1_

- [x] 2. Implement Haversine utility and property tests
  - [x] 2.1 Implement the Haversine distance function
    - Create `src/utils/haversine.ts`
    - Implement `haversine(lat1, lng1, lat2, lng2)` returning distance in metres
    - Use the standard Haversine formula with Earth radius = 6,371,000 metres
    - Export the function as a named export
    - _Requirements: 1.1_

  - [ ]* 2.2 Write property test for Haversine completeness and non-negativity
    - Create `src/utils/__tests__/haversine.property.test.ts`
    - **Property 1: Haversine distance completeness and non-negativity**
    - Use `fc.float({min: -90, max: 90})` for lat, `fc.float({min: -180, max: 180})` for lng
    - Assert result is always ≥ 0 for any two valid coordinate pairs
    - **Validates: Requirements 1.1**

  - [ ]* 2.3 Write property test for Haversine symmetry
    - Add to `src/utils/__tests__/haversine.property.test.ts`
    - **Property 7: Haversine symmetry**
    - For any two valid positions A and B, `haversine(A.lat, A.lng, B.lat, B.lng)` equals `haversine(B.lat, B.lng, A.lat, A.lng)`
    - **Validates: Requirements 1.1**

  - [ ]* 2.4 Write unit tests for Haversine function
    - Create `src/utils/__tests__/haversine.test.ts`
    - Test known distances (e.g., same point = 0, antipodal points ≈ 20,015 km)
    - Test decimal-degree format acceptance
    - _Requirements: 1.1, 1.3_

- [x] 3. Checkpoint - Ensure Haversine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Location Engine module and property tests
  - [x] 4.1 Implement `computeExhibitDistances` and `findNearestExhibit`
    - Create `src/engine/locationEngine.ts`
    - Implement `computeExhibitDistances(position, exhibits)` returning `ExhibitWithDistance[]`
    - Implement `findNearestExhibit(exhibitsWithDistance, radiusMetres = 500)` returning nearest exhibit or null
    - Nearest exhibit logic: smallest distance within radius; ties broken by array order
    - _Requirements: 1.1, 1.2, 3.4_

  - [x] 4.2 Implement `computeFacilityDistances` and `hasMovedBeyondThreshold`
    - Add `computeFacilityDistances(position, facilities)` returning `FacilityWithDistance[]` sorted by ascending distance
    - Add `hasMovedBeyondThreshold(prev, current, thresholdMetres = 5)` returning boolean
    - Add `isValidPosition(position)` returning boolean (lat in [-90,90], lng in [-180,180])
    - _Requirements: 1.4, 1.5, 4.1_

  - [ ]* 4.3 Write property test for nearest exhibit selection correctness
    - Create `src/engine/__tests__/locationEngine.property.test.ts`
    - **Property 2: Nearest exhibit selection correctness**
    - For any valid position and exhibits array, `findNearestExhibit` returns the exhibit with minimum distance within radius, first-in-array for ties, or null if none within radius
    - **Validates: Requirements 1.2, 3.4**

  - [ ]* 4.4 Write property test for movement threshold consistency
    - Add to `src/engine/__tests__/locationEngine.property.test.ts`
    - **Property 3: Movement threshold consistency**
    - `hasMovedBeyondThreshold(prev, current, T)` returns true iff haversine(prev, current) >= T
    - **Validates: Requirements 1.4**

  - [ ]* 4.5 Write property test for invalid coordinate rejection
    - Add to `src/engine/__tests__/locationEngine.property.test.ts`
    - **Property 4: Invalid coordinate rejection**
    - For any position with lat outside [-90,90] or lng outside [-180,180], `isValidPosition` returns false
    - **Validates: Requirements 1.5**

  - [ ]* 4.6 Write property test for facilities sorted by ascending distance
    - Add to `src/engine/__tests__/locationEngine.property.test.ts`
    - **Property 5: Facilities sorted by ascending distance**
    - For any valid position and facilities array, returned list is sorted such that each distance ≤ the next
    - **Validates: Requirements 4.1**

  - [ ]* 4.7 Write unit tests for Location Engine
    - Create `src/engine/__tests__/locationEngine.test.ts`
    - Test edge cases: empty exhibits array, all exhibits beyond 500m, exact tie-breaking
    - Test facility sorting with known coordinates
    - Test threshold with exactly 5m movement
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 4.1_

- [x] 5. Checkpoint - Ensure Location Engine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement LocationProvider React Context
  - [x] 6.1 Create LocationContext and LocationProvider component
    - Create `src/context/LocationContext.tsx`
    - Implement `LocationProvider` that wraps children with context
    - On mount, attempt `navigator.geolocation.watchPosition`
    - Store `currentPosition`, `source`, `status`, `nearestExhibit`, `sortedFacilities`, `allExhibitDistances` in state
    - Implement 5m movement threshold check before recomputation
    - Expose `setSimulatedPosition` and `clearSimulatedPosition` via context
    - Import exhibits, facilities, demoLocations from `src/data/mandai.js`
    - _Requirements: 1.3, 1.4, 2.4, 5.1, 5.2_

  - [x] 6.2 Implement geolocation fallback logic in LocationProvider
    - On geolocation error (permission denied, timeout, position unavailable, API not supported), fall back to `demoLocations[0]`
    - Set source to `'fallback'`, set status to `'available'`
    - Trigger `FallbackNotification` visibility flag in state
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 6.3 Write unit tests for LocationProvider
    - Create `src/context/__tests__/LocationContext.test.ts`
    - Test: geolocation success sets GPS coordinates
    - Test: geolocation failure triggers fallback to first demo location
    - Test: simulator override updates position with exact coordinates
    - Test: movement <5m does not trigger recomputation
    - _Requirements: 1.3, 1.4, 5.1, 5.2, 5.3, 5.4_

- [x] 7. Implement UI Components
  - [x] 7.1 Implement DemoLocationSimulator component
    - Create `src/components/DemoLocationSimulator.tsx`
    - Render a sticky dropdown (`position: sticky; top: 0; z-index: 1000`)
    - List all `demoLocations` entries with their labels
    - Show placeholder "Select a location" as default option
    - On selection change, call `setSimulatedPosition` from context
    - Selection persists across view navigation (state in context)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 7.2 Write property test for simulator position override
    - Create `src/components/__tests__/DemoLocationSimulator.property.test.ts`
    - **Property 6: Simulator position override exactness**
    - For any demo location entry, when selected, the resulting `currentPosition` lat/lng exactly equals the entry's lat/lng
    - **Validates: Requirements 2.4**

  - [x] 7.3 Implement IUCNBadge component
    - Create `src/components/IUCNBadge.tsx`
    - Accept `status` prop with the four IUCN values
    - Apply color mapping: Least Concern → green (#4caf50), Vulnerable → yellow (#ffeb3b), Endangered → orange (#ff9800), Critically Endangered → red (#f44336)
    - Render as a styled span/tag with accessible text
    - _Requirements: 3.2_

  - [x] 7.4 Implement NearbyExhibitCard component
    - Create `src/components/NearbyExhibitCard.tsx`
    - Consume `nearestExhibit` from LocationContext
    - Display: exhibit name, IUCNBadge, fun fact, feeding times
    - Show "Feeding times unavailable" placeholder if feedingTimes is empty/null
    - Show fallback "No exhibit nearby" state when `nearestExhibit` is null
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 7.5 Implement FacilitiesTab component
    - Create `src/components/FacilitiesTab.tsx`
    - Consume `sortedFacilities` and `status` from LocationContext
    - Display each facility with: name, type, distance rounded to nearest whole metre, landmark-relative direction (e.g., "45m toward Giant Panda Enclosure")
    - Show "Location required" message if position is unavailable
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.6 Implement FallbackNotification component
    - Create `src/components/FallbackNotification.tsx`
    - Display dismissible banner/toast when geolocation falls back
    - Show message explaining location permission was denied and a default location is used
    - Accept `visible` and `onDismiss` props
    - _Requirements: 5.4_

  - [ ]* 7.7 Write unit tests for UI components
    - Create test files: `DemoLocationSimulator.test.tsx`, `NearbyExhibitCard.test.tsx`, `FacilitiesTab.test.tsx`
    - Test: Simulator renders with sticky positioning and all demo locations
    - Test: Card renders name, IUCN badge, fun fact, feeding times
    - Test: Card shows fallback when no exhibit nearby
    - Test: Card shows placeholder for missing feeding times
    - Test: Facilities tab shows sorted facilities with correct format
    - Test: Facilities tab shows location-required message when position unavailable
    - Test: IUCN badge renders correct colors for all 4 statuses
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.4, 3.5, 4.2, 4.4_

- [x] 8. Checkpoint - Ensure component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Wire together App shell and integration
  - [x] 9.1 Create App component with tab navigation and wire all components
    - Create or update `src/App.tsx`
    - Wrap app in `LocationProvider`
    - Render `DemoLocationSimulator` (sticky, always visible)
    - Render `FallbackNotification` (conditionally visible)
    - Implement simple tab navigation between "Nearby Exhibit" and "Facilities" views
    - Render `NearbyExhibitCard` and `FacilitiesTab` based on active tab
    - _Requirements: 2.1, 2.7, 3.1, 4.1_

  - [ ]* 9.2 Write integration tests for full flow
    - Create `src/context/__tests__/LocationContext.integration.test.ts`
    - Test: Select demo location → card updates with nearest exhibit → facilities re-sort
    - Test: Geolocation denied → fallback state → simulator shows first entry → card displays
    - Test: Position changes by >5m → recomputation → new nearest exhibit shown
    - _Requirements: 1.4, 2.3, 2.5, 3.3, 4.3, 5.1, 5.2, 5.3, 5.4_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `mandai.js` data file already exists and does not need to be created
- All computation logic is in pure functions (haversine, locationEngine) for easy testing
- UI components consume LocationContext — no prop drilling needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 4, "tasks": ["4.1", "4.2"] },
    { "id": 5, "tasks": ["4.3", "4.4", "4.5", "4.6", "4.7"] },
    { "id": 6, "tasks": ["6.1"] },
    { "id": 7, "tasks": ["6.2"] },
    { "id": 8, "tasks": ["6.3", "7.1", "7.3"] },
    { "id": 9, "tasks": ["7.2", "7.4", "7.5", "7.6"] },
    { "id": 10, "tasks": ["7.7"] },
    { "id": 11, "tasks": ["9.1"] },
    { "id": 12, "tasks": ["9.2"] }
  ]
}
```
