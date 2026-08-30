# Requirements Document

## Introduction

This feature implements the core interaction loop for Mandai Wildlife Reserve's visitor app: as a visitor's location changes (real GPS or simulated), the system identifies the nearest exhibit, displays contextual information about it, and helps the visitor find nearby facilities. The goal is to prove the fundamental loop — location changes → nearest exhibit updates → user learns something — using data from `mandaiData.js`.

## Glossary

- **System**: The location-aware exhibit discovery module of the Mandai visitor web application.
- **Location_Engine**: The subsystem responsible for computing Haversine distances between the current position and all exhibits/facilities, and determining the nearest exhibit.
- **Demo_Location_Simulator**: A persistent UI dropdown that lists all entries from `demoLocations` and, when a selection is made, overrides GPS coordinates with the selected location's lat/lng.
- **Nearby_Exhibit_Card**: A UI component that displays contextual information (name, IUCN badge, fun fact, feeding times) about the nearest exhibit to the user's current position.
- **Facilities_Tab**: A UI view listing all facilities sorted by ascending distance from the user's current position.
- **Current_Position**: The user's active coordinates, sourced from either browser geolocation or the Demo Location Simulator override.
- **Haversine_Distance**: The great-circle distance between two geographic coordinate pairs, computed using the Haversine formula.
- **IUCN_Badge**: A color-coded visual indicator representing an exhibit's conservation status (Least Concern, Vulnerable, Endangered, Critically Endangered).
- **Reasonable_Radius**: A configurable distance threshold (default 500 meters) beyond which no exhibit is considered "nearby."

## Requirements

### Requirement 1: Location Engine — Distance Computation

**User Story:** As a visitor, I want the app to know how far I am from each exhibit, so that it can show me the most relevant one.

#### Acceptance Criteria

1. WHEN a Current_Position with a valid latitude (between -90 and 90) and longitude (between -180 and 180) is available, THE Location_Engine SHALL compute the Haversine_Distance in metres from that position to every exhibit in the exhibits dataset.
2. WHEN distances have been computed, THE Location_Engine SHALL identify the exhibit with the smallest Haversine_Distance as the nearest exhibit; IF two or more exhibits share the same smallest distance, THEN THE Location_Engine SHALL select the one that appears first in the exhibits dataset order.
3. THE Location_Engine SHALL accept coordinates in decimal-degree format from either browser geolocation or the Demo_Location_Simulator as the Current_Position.
4. WHEN the Current_Position changes by at least 5 metres from the previously computed position, THE Location_Engine SHALL recompute all distances and re-determine the nearest exhibit.
5. IF the Current_Position is unavailable or contains values outside the valid latitude/longitude ranges, THEN THE Location_Engine SHALL withhold distance results and indicate that the position is unknown.

### Requirement 2: Demo Location Simulator

**User Story:** As a developer or demo presenter, I want a persistent location simulator, so that I can test location-dependent views without physically being at the reserve.

#### Acceptance Criteria

1. THE System SHALL display the Demo_Location_Simulator as a sticky dropdown that remains visible regardless of scroll position or active view.
2. THE Demo_Location_Simulator SHALL list all entries from the `demoLocations` dataset, displaying each entry's label.
3. WHEN the user selects a location from the Demo_Location_Simulator, THE System SHALL recalculate the nearest exhibit and update the Nearby_Exhibit_Card within 1 second.
4. WHEN a demo location is selected, THE Demo_Location_Simulator SHALL override the browser geolocation coordinates with the selected entry's lat and lng values.
5. WHEN a demo location is selected, THE Demo_Location_Simulator SHALL update every location-dependent view (Nearby_Exhibit_Card, Facilities_Tab) within 1 second.
6. WHILE no demo location has been selected, THE Demo_Location_Simulator SHALL display a placeholder label "Select a location" and THE System SHALL use the browser's real geolocation coordinates for all location-dependent views.
7. WHEN the user navigates between views or tabs within the application, THE Demo_Location_Simulator SHALL retain the previously selected location and THE System SHALL continue using the corresponding lat and lng values until the user selects a different entry or refreshes the page.

### Requirement 3: Nearby Exhibit Card

**User Story:** As a visitor, I want to see interesting information about the closest exhibit, so that I can learn something new as I explore.

#### Acceptance Criteria

1. WHEN a nearest exhibit has been determined within 500 meters of the visitor's position, THE System SHALL display the Nearby_Exhibit_Card showing the exhibit's name, IUCN_Badge, fun fact, and feeding times.
2. THE System SHALL color-code the IUCN_Badge according to conservation status: green for Least Concern, yellow for Vulnerable, orange for Endangered, red for Critically Endangered.
3. WHEN the nearest exhibit changes, THE System SHALL update the Nearby_Exhibit_Card to reflect the new nearest exhibit's information within 1 second of detecting the change.
4. WHEN no exhibit is within 500 meters of the visitor's position, THE System SHALL display a fallback state ("no exhibit nearby") rather than an empty or broken card.
5. IF an exhibit's feeding times data is unavailable, THEN THE System SHALL display the Nearby_Exhibit_Card with the remaining fields and show a placeholder message in place of feeding times.

### Requirement 4: Facilities Tab

**User Story:** As a visitor, I want to find the nearest restroom or water refill station, so that I can access facilities without wandering far.

#### Acceptance Criteria

1. WHEN the user opens the Facilities tab, THE System SHALL display all facilities of types restroom, nursing, accessible, and water-refill sorted by ascending Haversine_Distance in meters from the user's current simulated or real position.
2. THE System SHALL display each facility entry with the facility name, type, distance rounded to the nearest whole meter, and a landmark-relative direction indicating the nearest landmark (e.g., "45m toward Giant Panda Enclosure").
3. WHEN the Current_Position changes, THE Facilities_Tab SHALL re-sort the list and update all displayed distances to reflect the new position.
4. IF the user's current position is unavailable when the Facilities tab is opened, THEN THE System SHALL display a message indicating that location is required to show nearby facilities and SHALL not display distance or sorting until a position is established.

### Requirement 5: Geolocation Fallback

**User Story:** As a visitor who has denied location permissions, I want the app to still function, so that I can explore exhibit information without being blocked by an error.

#### Acceptance Criteria

1. IF browser geolocation permission is denied or the geolocation request fails for any reason (timeout, position unavailable), THEN THE System SHALL fall back to the first demo location rather than showing an error state.
2. WHEN the System falls back to the first demo location, THE System SHALL populate the Current_Position with the lat and lng of the first entry in the `demoLocations` dataset.
3. WHEN the System falls back to the first demo location, THE Demo_Location_Simulator SHALL set the dropdown selection to the first entry in the `demoLocations` dataset.
4. WHEN the System falls back to the first demo location, THE System SHALL display a notification indicating that location permission was not granted and a default location is being used.
