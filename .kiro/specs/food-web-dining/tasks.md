# Implementation Plan: Food Web & Dining

## Overview

This plan implements Phase 2 of the Mandai Wildlife Reserve app: a Trophic Food Web Simulator (SVG-based interactive node diagram) and a Dining Tab (filterable, distance-sorted venue list). Implementation proceeds engine-first (pure computation modules with property tests), then UI components, then integration — building incrementally on the existing Phase 1 infrastructure (Vitest, fast-check, LocationProvider, haversine util).

## Tasks

- [x] 1. Implement Food Web Engine
  - [x] 1.1 Create `src/engine/foodWebEngine.ts` with `extractGraph` and `findDependents` functions
    - Define `TrophicNode`, `TrophicEdge`, and `FoodWebGraph` interfaces
    - Implement `extractGraph(exhibits)`: create nodes for valid exhibits, infer Producer nodes from `dependsOn` entries not already in exhibits, create directed edges from `dependsOn` and `predatorOf` fields, exclude exhibits with invalid `trophicRole` and add to `warnings`
    - Implement `findDependents(graph, removedNodeId)`: traverse edges to find all nodes whose `dependsOn` includes the removed node
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

  - [ ]* 1.2 Write property tests for Food Web Engine (`src/engine/__tests__/foodWebEngine.property.test.ts`)
    - **Property 1: Graph node completeness** — for any exhibits with valid trophicRole, extractGraph returns exactly one node per exhibit + one per unique inferred producer, no extras
    - **Validates: Requirement 1.1**
    - **Property 3: Edge directionality follows energy flow** — for any exhibit with non-empty dependsOn, edge goes from dependency to exhibit; for predatorOf, edge goes from prey to exhibit
    - **Validates: Requirement 1.3**
    - **Property 4: Invalid trophicRole exclusion** — exhibits with unrecognized trophicRole are excluded from nodes and added to warnings
    - **Validates: Requirement 1.5**
    - **Property 5: Dependent identification correctness** — findDependents returns exactly the set of nodes whose dependsOn includes the removed node
    - **Validates: Requirements 2.1, 2.4**

  - [ ]* 1.3 Write unit tests for Food Web Engine (`src/engine/__tests__/foodWebEngine.test.ts`)
    - Test extractGraph only uses trophicRole, dependsOn, predatorOf fields (Requirement 1.4)
    - Test empty-state when all dependsOn and predatorOf are empty (Requirement 1.6)
    - Test node with no dependents returns empty array from findDependents (Requirement 2.4)
    - _Requirements: 1.4, 1.6, 2.4_

- [x] 2. Implement Dining Filter Engine
  - [x] 2.1 Create `src/engine/diningFilterEngine.ts` with `filterByTags`, `sortByDistance`, and `filterAndSort` functions
    - Define `DiningTag` type and `DiningVenueWithDistance` interface
    - Implement `filterByTags(venues, activeFilters)`: return all venues when filters empty, otherwise AND-logic filtering
    - Implement `sortByDistance(venues, position)`: compute Haversine distance (reuse existing util), round to nearest whole metre, stable sort ascending
    - Implement `filterAndSort(venues, activeFilters, position)`: apply filterByTags then sortByDistance (or dataset order if position null)
    - _Requirements: 3.1, 3.2, 4.1, 4.4_

  - [ ]* 2.2 Write property tests for Dining Filter Engine (`src/engine/__tests__/diningFilterEngine.property.test.ts`)
    - **Property 6: AND-logic tag filtering** — filterByTags returns only venues containing every active filter tag; empty filters returns all venues
    - **Validates: Requirements 3.2, 5.3, 5.4**
    - **Property 7: Distance sort ascending with stable tie-breaking** — sortByDistance returns venues in ascending Haversine distance order; equal distances preserve dataset order
    - **Validates: Requirements 3.1, 4.1, 4.4**

  - [ ]* 2.3 Write unit tests for Dining Filter Engine (`src/engine/__tests__/diningFilterEngine.test.ts`)
    - Test empty filter set returns all venues (Requirement 5.3)
    - Test no venues match returns empty array (Requirement 3.3)
    - Test venues with missing lat/lng (0,0) get "Distance unavailable" handling
    - Test dataset order preserved when position is null (Requirement 4.2)
    - _Requirements: 3.3, 4.2, 5.3_

- [ ] 3. Checkpoint — Verify engines
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement Food Web UI Components
  - [ ] 4.1 Create `src/components/TrophicNode.tsx` component
    - Render SVG `<g>` group with `<circle>` and `<text>` label
    - Accept `dimmed` prop driving `opacity` style with `transition: opacity 400ms ease`
    - Accept `selected` prop for visual highlight
    - Handle click to call `onSelect(nodeId)`
    - Ensure accessibility with appropriate ARIA attributes
    - _Requirements: 1.1, 2.2_

  - [ ] 4.2 Create `src/components/EcosystemCollapseToggle.tsx` component
    - Render toggle button labeled "Simulate Ecosystem Collapse"
    - Disabled state when no node is selected
    - Call `onToggle` when activated/deactivated
    - Use `aria-pressed` for accessibility
    - _Requirements: 2.1, 2.3, 2.5_

  - [ ] 4.3 Create `src/components/FoodWebSimulator.tsx` component
    - Call `extractGraph(exhibits)` to get nodes and edges
    - Render SVG viewport with `viewBox` for responsiveness
    - Position nodes deterministically: Producers at y=80%, Primary Consumers at y=50%, Apex Predators at y=20%; x evenly distributed per level
    - Render directed edges as SVG `<path>` with arrowhead `<marker>` definitions
    - Manage `selectedNodeId` and `collapseActive` state
    - When collapse active: apply opacity 0.3 to selected node + dependents (400ms CSS transition), show `ecosystemImpactIfRemoved` text overlay for affected exhibits
    - When collapse deactivated: restore all nodes to opacity 1.0 (400ms transition)
    - Handle warning indicator when exhibits are excluded
    - Display empty-state message when no relationships exist
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 4.4 Write component tests for Food Web UI (`src/components/__tests__/FoodWebSimulator.test.ts`)
    - Test nodes render at correct trophic level positions (Requirement 1.2)
    - Test collapse toggle dims selected node + dependents with opacity 0.3 (Requirement 2.1)
    - Test deactivation restores opacity to 1.0 (Requirement 2.3)
    - Test ecosystem impact text displays for affected exhibits (Requirement 2.1)
    - Test empty-state message when no relationships (Requirement 1.6)
    - Test warning indicator for invalid trophicRole exhibits (Requirement 1.5)
    - _Requirements: 1.2, 1.5, 1.6, 2.1, 2.3_

- [ ] 5. Implement Dining Tab UI Components
  - [ ] 5.1 Create `src/components/FilterChip.tsx` component
    - Render pill-shaped button with `aria-pressed` attribute
    - Visual distinction: filled when selected, outlined when unselected
    - Call `onToggle(tag)` on click
    - _Requirements: 5.1, 5.2_

  - [ ] 5.2 Create `src/components/DiningTab.tsx` component
    - Subscribe to `LocationProvider` context for `currentPosition`
    - Manage `activeFilters` state (local component state)
    - Call `DiningFilterEngine.filterAndSort` on mount and when position/filters change
    - Render 4 FilterChip components: Halal, Vegetarian, Air-Conditioned, Kid-Friendly
    - Render venue list showing: name, distance (rounded whole metres or "—" if unavailable), operating hours, tags
    - Display fallback message when position unavailable (no distance or sorting)
    - Display empty-state message when no venues match filters
    - Re-sort and update distances when position changes
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 5.3 Write component tests for Dining Tab UI (`src/components/__tests__/DiningTab.test.ts` and `src/components/__tests__/FilterChip.test.ts`)
    - Test exactly 4 FilterChip components render with correct labels (Requirement 3.4)
    - Test clicking unselected chip adds tag and updates list (Requirement 5.1)
    - Test clicking selected chip removes tag and updates list (Requirement 5.2)
    - Test fallback message when position unavailable (Requirements 3.7, 4.2)
    - Test empty-state when no venues match (Requirement 3.3)
    - Test filter update completes within 500ms interaction budget (Requirement 5.1)
    - _Requirements: 3.3, 3.4, 3.7, 4.2, 5.1, 5.2_

- [ ] 6. Checkpoint — Verify all components
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Integration and Wiring
  - [ ] 7.1 Wire Food Web and Dining Tab into the app navigation
    - Add Food Web view as a navigable tab/route in the app
    - Add Dining Tab as a navigable tab/route in the app
    - Pass `exhibits` data from `mandai.js` to `FoodWebSimulator`
    - Pass `dining` data from `mandai.js` to `DiningTab`
    - Ensure LocationProvider context wraps Dining Tab (already provided by Phase 1)
    - _Requirements: 1.1, 3.1_

  - [ ]* 7.2 Write integration tests (`src/components/__tests__/FoodWebSimulator.test.ts` and `src/components/__tests__/DiningTab.test.ts`)
    - Test: open Food Web → click node → activate collapse → verify dimming + impact text → deactivate → verify restore (Requirements 2.1, 2.3, 2.5)
    - Test: open Dining Tab → select multiple filters → verify AND narrowing → deselect all → full list returns (Requirements 3.2, 3.5, 5.1–5.4)
    - Test: position change re-sorts dining venues (Requirements 3.6, 4.3)
    - _Requirements: 2.1, 2.3, 2.5, 3.2, 3.5, 3.6, 4.3, 5.1–5.4_

- [ ] 8. Final Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All engine modules are pure functions (no React dependency) for easy testing
- Phase 1 infrastructure (Vitest, fast-check, LocationProvider, haversine util) is assumed to exist

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "2.3"] },
    { "id": 2, "tasks": ["4.1", "4.2", "5.1"] },
    { "id": 3, "tasks": ["4.3", "5.2"] },
    { "id": 4, "tasks": ["4.4", "5.3"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["7.2"] }
  ]
}
```
