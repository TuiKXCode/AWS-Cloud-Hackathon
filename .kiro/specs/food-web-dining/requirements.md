# Requirements Document

## Introduction

Phase 2 of the Mandai Wildlife Reserve visitor app introduces two new features: a Trophic Food Web Simulator that visualizes ecological relationships between exhibits, and a Dining tab that helps visitors find food venues filtered by dietary and amenity preferences. Both features build on the existing data model in `mandai.js` and the Phase 1 location engine.

## Glossary

- **Food_Web_Simulator**: The interactive node diagram component that visualizes trophic relationships (producer → primary consumer → apex predator) using the `trophicRole`, `dependsOn`, and `predatorOf` fields from the exhibits data.
- **Ecosystem_Collapse_Toggle**: A UI toggle control that activates a simulation mode where a selected node is visually removed from the food web, revealing cascading ecosystem impact.
- **Dining_Tab**: The tab view that lists dining venues from the `dining` array, supporting tag-based filtering and distance-based sorting.
- **Filter_Chip**: A selectable UI chip representing a dining venue tag (e.g., Halal, Vegetarian, Air-Conditioned, Kid-Friendly) used to narrow the venue list.
- **Trophic_Node**: A visual element in the food web representing a single exhibit or producer, positioned according to its `trophicRole` (Producer, Primary Consumer, or Apex Predator).
- **Location_Engine**: The Phase 1 subsystem that provides the visitor's current geolocation, used for computing distance to dining venues.
- **System**: The Mandai Wildlife Reserve visitor application.

## Requirements

### Requirement 1: Render Trophic Food Web Diagram

**User Story:** As a visitor, I want to see a visual food web diagram of the wildlife exhibits, so that I can understand the ecological relationships between species at Mandai.

#### Acceptance Criteria

1. WHEN the user navigates to the Food Web view, THE Food_Web_Simulator SHALL render a node diagram within 2 seconds, displaying one Trophic_Node per exhibit and one Trophic_Node per unique producer listed in `dependsOn` fields.
2. THE Food_Web_Simulator SHALL arrange Trophic_Nodes into three trophic levels: Producers at the bottom, Primary Consumers in the middle, and Apex Predators at the top.
3. WHEN two exhibits have a trophic dependency (via `dependsOn` or `predatorOf`), THE Food_Web_Simulator SHALL draw a directed edge pointing in the direction of energy flow — from the consumed node (producer or prey) to the consumer node (predator or dependent).
4. THE Food_Web_Simulator SHALL derive all node and edge data exclusively from the existing `trophicRole`, `dependsOn`, and `predatorOf` fields in the exhibits array without requiring additional data modeling.
5. IF an exhibit's `trophicRole` value does not match one of the three defined levels (Producer, Primary Consumer, Apex Predator), THEN THE Food_Web_Simulator SHALL omit that exhibit from the diagram and display a warning indicator stating that one or more exhibits could not be classified.
6. IF the exhibits array contains no trophic relationships (all `dependsOn` and `predatorOf` arrays are empty), THEN THE Food_Web_Simulator SHALL display an empty-state message indicating that no ecological relationships are available to visualize.

### Requirement 2: Simulate Ecosystem Collapse

**User Story:** As a visitor, I want to simulate what happens when a species is removed from the ecosystem, so that I can understand how interconnected wildlife survival is.

#### Acceptance Criteria

1. WHEN the user toggles "Simulate Ecosystem Collapse" on a selected Trophic_Node, THE System SHALL reduce the selected node's opacity to 0.3 and display the `ecosystemImpactIfRemoved` text for every exhibit whose `dependsOn` array includes the removed node's trophic identifier.
2. THE System SHALL apply the dimming effect using a CSS opacity transition with a duration of 400 milliseconds, without a physics or animation engine.
3. WHEN the user deactivates the Ecosystem_Collapse_Toggle, THE System SHALL restore all dimmed nodes to full opacity (1.0) using the same 400-millisecond CSS transition.
4. IF the removed Trophic_Node has no exhibits that list it in their `dependsOn` array, THEN THE System SHALL dim only the selected node and display a message indicating no dependent species were found in the dataset.
5. WHILE the Ecosystem_Collapse_Toggle is active, THE System SHALL continue displaying the impact text and dimmed state until the user deactivates the toggle or selects a different Trophic_Node.

### Requirement 3: Dining Tab with Tag Filtering

**User Story:** As a visitor, I want to filter dining options by dietary needs and amenities, so that I can quickly find a suitable place to eat.

#### Acceptance Criteria

1. WHEN the user opens the Dining_Tab, THE System SHALL display all venues from the `dining` array sorted by ascending Haversine_Distance in meters (rounded to the nearest whole meter) from the visitor's Current_Position using the Location_Engine, showing each venue's name, distance, operating hours, and tags.
2. WHEN the user selects one or more Filter_Chips on the Dining_Tab, THE System SHALL show only venues whose tags include all selected filters (AND logic), maintaining sort order by ascending distance.
3. WHEN no venues match the selected filters, THE System SHALL display an empty state message indicating that no dining options match the current filter selection.
4. THE System SHALL provide Filter_Chips for the following tags: Halal, Vegetarian, Air-Conditioned, and Kid-Friendly.
5. WHEN the user deselects all active Filter_Chips, THE System SHALL display the full unfiltered list of venues sorted by ascending distance.
6. WHEN the Current_Position changes while the Dining_Tab is open, THE System SHALL re-sort the venue list and update all displayed distances to reflect the new position.
7. IF the Current_Position is unavailable when the Dining_Tab is opened, THEN THE System SHALL display a message indicating that location is required to show nearby dining options and SHALL not display distance or sorting until a position is established.

### Requirement 4: Dining Venue Distance Sorting

**User Story:** As a visitor, I want dining options sorted by proximity to my current location, so that I can find the nearest place to eat.

#### Acceptance Criteria

1. WHILE the visitor's location is available from the Location_Engine, THE Dining_Tab SHALL sort venues in ascending order of Haversine_Distance in meters from the visitor's current position and SHALL display each venue's name, distance rounded to the nearest whole meter, dietary tags, and operating hours.
2. IF the Location_Engine is unable to determine the visitor's position, THEN THE System SHALL display dining venues in dataset order and show a notice indicating that distance sorting is unavailable.
3. WHEN the Current_Position changes while the Dining_Tab is displayed, THE Dining_Tab SHALL re-sort the list and update all displayed distances to reflect the new position within 1 second.
4. IF two or more dining venues share the same distance from the visitor's position, THEN THE Dining_Tab SHALL preserve their relative dataset order among tied entries.

### Requirement 5: Filter Chip Interaction

**User Story:** As a visitor, I want to toggle multiple filter chips on and off, so that I can combine or relax my dining preferences.

#### Acceptance Criteria

1. WHEN the user taps a Filter_Chip that is not selected, THE System SHALL add that tag to the active filter set, visually indicate the chip as selected, and update the venue list within 500 milliseconds.
2. WHEN the user taps a Filter_Chip that is already selected, THE System SHALL remove that tag from the active filter set, visually indicate the chip as unselected, and update the displayed venue list within 500 milliseconds.
3. WHEN no Filter_Chips are selected, THE System SHALL display all dining venues without tag filtering.
4. WHEN multiple Filter_Chips are selected, THE System SHALL display only dining venues whose tags contain ALL of the selected tags (AND logic), so that selecting more chips narrows the results.
