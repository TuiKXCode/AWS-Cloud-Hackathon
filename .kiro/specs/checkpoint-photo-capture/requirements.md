# Requirements Document

## Introduction

This feature implements Phase 4 of the Mandai Wildlife Reserve visitor app: Checkpoint Photo Capture & Animal Recognition. When a visitor is within range of an exhibit, the app lets the visitor take a photo of the animal using the device's native camera. The captured image is classified on-device with a MobileNet model and matched against each exhibit's `imagenetLabels`. When classification is inconclusive, the app falls back to tagging the exhibit the visitor is currently nearest to, so a live demo never dead-ends. On a successful tag, the app shows the exhibit's fun fact, diet, and IUCN status, awards the exhibit's points exactly once per exhibit, and persists the record to `localStorage` so progress survives a page refresh.

This feature depends on Phase 1 (location-aware-exhibit-discovery). Phase 1 is implemented and exposes `nearestExhibit`, `currentPosition`, and `status` through the `LocationProvider` context. This feature reuses that location state to gate the capture action and to drive the location-fallback path, and it reuses exhibit data (`funFact`, `diet`, `iucnStatus`, `points`, `imagenetLabels`) from the exhibits dataset.

## Glossary

- **System**: The checkpoint photo capture and animal recognition module of the Mandai visitor web application.
- **Location_Provider**: The Phase 1 context that exposes the visitor's `currentPosition`, the `nearestExhibit`, and a location `status`. Treated as an implemented dependency.
- **Nearest_Exhibit**: The exhibit the Location_Provider currently reports as closest to the visitor, or null when no exhibit is within the In_Range_Radius.
- **In_Range_Radius**: The distance threshold (500 meters, matching Phase 1's Reasonable_Radius) within which an exhibit is considered eligible for capture.
- **In_Range**: The state in which the Location_Provider reports a non-null Nearest_Exhibit within the In_Range_Radius.
- **Nearby_Exhibit_Card**: The Phase 1 UI component displaying the Nearest_Exhibit, extended by this feature to host the Take_Photo action.
- **Take_Photo_Action**: The capture trigger presented on the Nearby_Exhibit_Card that opens the device's native camera.
- **Native_Camera_Input**: An HTML file input element (`<input type="file" accept="image/*" capture="environment">`) used to capture an image via the device's native camera, without any custom camera preview UI.
- **Captured_Image**: The image file produced by the Native_Camera_Input.
- **Classifier**: The client-side MobileNet model (TensorFlow.js) that runs in the browser and produces ranked predicted labels for a Captured_Image.
- **Predicted_Labels**: The ranked list of label-and-confidence pairs the Classifier produces for a Captured_Image.
- **Imagenet_Labels**: The per-exhibit array of ImageNet class-label strings that count as a match for that exhibit (e.g., `["hippopotamus", "hippo"]`, `["tiger"]`, `["giant panda", "panda"]`).
- **Confidence_Threshold**: The configurable minimum confidence value a matching Predicted_Label must meet or exceed for a classifier match to be accepted, expressed on a 0.0 to 1.0 scale with a default value of 0.6.
- **Current_Position**: The visitor's current geographic coordinates as reported by the Location_Provider (Phase 1's `currentPosition`).
- **Reasonable_Radius**: Phase 1's distance threshold (500 meters) within which an exhibit is considered near the Current_Position; equivalent to the In_Range_Radius used by this feature.
- **Haversine_Distance**: The great-circle distance between the Current_Position and an exhibit's coordinates, computed via the haversine formula as established in Phase 1.
- **Recognition_Method**: How an exhibit was tagged, recorded as `recognizedVia` with value `"classifier"` (matched via the Classifier) or `"location-fallback"` (matched via the Nearest_Exhibit).
- **Location_Fallback**: The path in which the System tags the Captured_Image to the Nearest_Exhibit because no classifier match met the Confidence_Threshold.
- **Result_Screen**: The UI shown after a successful tag, displaying the tagged exhibit's fun fact, diet, and IUCN status.
- **Collected_Animals**: The persisted collection of tagged records stored in `localStorage` under the key `collectedAnimals`.
- **Collected_Record**: A single entry in Collected_Animals containing the photo reference, exhibit id, Recognition_Method, and timestamp.
- **Player_Total**: The visitor's accumulated points across all collected exhibits.

## Requirements

### Requirement 1: Capture Trigger Gating

**User Story:** As a visitor standing near an exhibit, I want a Take Photo action on the exhibit card, so that I can photograph the animal only when I'm actually in range.

#### Acceptance Criteria

1. WHILE the Location_Provider reports a non-null Nearest_Exhibit whose Haversine_Distance is less than or equal to the In_Range_Radius (default 500 meters, inclusive), THE System SHALL display the Take_Photo_Action on the Nearby_Exhibit_Card in an enabled state within 1 second of the reported position update.
2. WHILE the Location_Provider reports no Nearest_Exhibit within the In_Range_Radius (default 500 meters, inclusive) or reports the position as unknown, THE System SHALL present the Take_Photo_Action on the Nearby_Exhibit_Card in a disabled state within 1 second of the reported position update.
3. WHEN the visitor activates the Take_Photo_Action while the Location_Provider reports a non-null Nearest_Exhibit within the In_Range_Radius, THE System SHALL open the Native_Camera_Input.
4. THE System SHALL derive the In_Range state solely from the Location_Provider's most recently reported Nearest_Exhibit and its Haversine_Distance relative to the In_Range_Radius.
5. WHEN the visitor activates the Take_Photo_Action, THE System SHALL treat the Nearest_Exhibit reported by the Location_Provider at the moment of activation as the exhibit for that capture.
6. IF the visitor activates the Take_Photo_Action while the Location_Provider reports no Nearest_Exhibit within the In_Range_Radius or reports the position as unknown, THEN THE System SHALL not open the Native_Camera_Input and SHALL keep the Take_Photo_Action in a disabled state, retaining the Nearby_Exhibit_Card contents unchanged.
7. IF the Native_Camera_Input cannot be opened (device has no camera or camera permission is denied), THEN THE System SHALL display a message indicating the camera is unavailable and SHALL retain the Nearby_Exhibit_Card contents unchanged.

### Requirement 2: Native Camera Capture

**User Story:** As a visitor, I want the app to open my phone's camera directly, so that I can take a photo without learning a custom camera interface.

#### Acceptance Criteria

1. WHEN the Take_Photo_Action is activated, THE System SHALL invoke a Native_Camera_Input configured with `accept="image/*"` and `capture="environment"`.
2. THE System SHALL capture images exclusively through the Native_Camera_Input and SHALL NOT render a custom camera preview interface.
3. WHEN the Native_Camera_Input returns an image file, THE System SHALL accept that file as the Captured_Image for classification.
4. IF the visitor closes the Native_Camera_Input without producing an image file, THEN THE System SHALL return to the Nearby_Exhibit_Card without creating a Collected_Record.

### Requirement 3: Client-Side Classification

**User Story:** As a visitor, I want the app to recognize the animal in my photo, so that the photo is tagged to the correct exhibit automatically.

#### Acceptance Criteria

1. WHEN a Captured_Image is available, THE System SHALL submit the Captured_Image to the Classifier and obtain Predicted_Labels.
2. WHEN Predicted_Labels are available, THE System SHALL identify the highest-confidence Predicted_Label whose label string exactly matches (case-insensitive) one of the label strings in any exhibit's Imagenet_Labels, and IF two or more matching Predicted_Labels share the same highest confidence value, THEN THE System SHALL select the match belonging to the exhibit that appears first in the exhibits dataset order.
3. IF a matching Predicted_Label has a confidence value, on the 0.0 to 1.0 scale, at or above the Confidence_Threshold, THEN THE System SHALL tag the Captured_Image to the exhibit whose Imagenet_Labels contains that label and SHALL set the Recognition_Method to `"classifier"`.
4. IF the Classifier cannot be loaded or the Captured_Image cannot be classified, THEN THE System SHALL treat the classification as producing no matching Predicted_Label so that tagging proceeds via Location_Fallback without displaying a failure state.
5. THE System SHALL run the Classifier in the browser and SHALL NOT transmit the Captured_Image to an external service for classification.

### Requirement 4: Confidence Fallback

**User Story:** As a demo presenter, I want the app to always tag some exhibit even when recognition fails, so that the flow never dead-ends during a live demonstration.

#### Acceptance Criteria

1. IF no Predicted_Label produced by the Classifier for the Captured_Image has a Confidence value at or above the Confidence_Threshold (a value between 0.0 and 1.0, default 0.6), THEN THE System SHALL tag the Captured_Image to the Nearest_Exhibit via Location_Fallback rather than displaying a failure state, provided at least one exhibit is within the Reasonable_Radius (default 500 metres) of the Current_Position.
2. WHEN the System tags the Captured_Image via Location_Fallback, THE System SHALL set the Recognition_Method to `"location-fallback"`.
3. WHEN the visitor captures a photo while at least one exhibit is within the Reasonable_Radius (default 500 metres) of the Current_Position, THE System SHALL display the Captured_Image tagged to an exhibit within 3 seconds of the capture, regardless of whether the tag results from the Classifier or from Location_Fallback.
4. IF the Classifier throws an error or the recognition model fails to load, THEN THE System SHALL tag the Captured_Image to the Nearest_Exhibit via Location_Fallback, set the Recognition_Method to `"location-fallback"`, and display an indication that recognition was unavailable, rather than displaying a failure state.
5. IF no exhibit is within the Reasonable_Radius (default 500 metres) of the Current_Position when Location_Fallback is attempted, THEN THE System SHALL display a message indicating that no exhibit could be tagged and SHALL retain the Captured_Image without discarding it.

### Requirement 5: Points Award With Deduplication

**User Story:** As a visitor progressing through the questline, I want each exhibit to award points once, so that the game rewards discovery rather than repeated photos of the same animal.

#### Acceptance Criteria

1. WHEN an exhibit is tagged for the first time (its id is not present among the exhibit ids in Collected_Animals), THE System SHALL create a Collected_Record and add that exhibit's points value to the Player_Total exactly once.
2. WHEN an exhibit whose id already appears in Collected_Animals is tagged again, THE System SHALL create the new Collected_Record and SHALL leave the Player_Total unchanged.
3. THE System SHALL determine whether an exhibit has already awarded points by exact match of the tagged exhibit's id against the exhibit ids present in Collected_Animals.
4. IF a tagged exhibit's points value is missing or outside the range 0 to 999,999, THEN THE System SHALL create the Collected_Record without changing the Player_Total and SHALL surface an indication that no points were awarded.

### Requirement 6: Result Screen

**User Story:** As a visitor who just photographed an animal, I want to see facts about it, so that I learn something each time I make a capture.

#### Acceptance Criteria

1. WHEN a Captured_Image is tagged to an exhibit, THE System SHALL display the Result_Screen showing the tagged exhibit's fun fact, diet, and IUCN status sourced from the exhibits dataset.
2. WHEN the Result_Screen is displayed for a first-time tag, THE System SHALL indicate the points awarded for that exhibit.
3. WHEN the Result_Screen is displayed for an exhibit that was tagged via Location_Fallback, THE System SHALL present the tagged exhibit's information using the same fields as a classifier-tagged result.

### Requirement 7: Record Persistence

**User Story:** As a visitor, I want my captured animals to stay saved, so that my collection and progress survive closing or refreshing the app.

#### Acceptance Criteria

1. WHEN a Captured_Image is tagged, THE System SHALL append a Collected_Record containing the photo reference, the tagged exhibit id, the Recognition_Method, and a capture timestamp expressed as milliseconds since the Unix epoch to Collected_Animals in `localStorage`, and upon a successful write THE System SHALL display the Result_Screen.
2. IF writing the Collected_Record to `localStorage` fails, THEN THE System SHALL retain the newly captured record in the in-memory collection, SHALL present an indication that saving did not complete, and SHALL still display the Result_Screen without discarding any previously collected records.
3. WHEN the application loads, THE System SHALL read Collected_Animals from `localStorage`, SHALL restore each valid Collected_Record, and SHALL set the Player_Total equal to the sum of points for the distinct exhibits among the restored valid Collected_Records.
4. IF Collected_Animals in `localStorage` is absent or cannot be parsed as a whole, THEN THE System SHALL initialize Collected_Animals as an empty collection containing zero records and SHALL set the Player_Total to zero.
5. IF an individual Collected_Record read from `localStorage` is missing the photo reference, tagged exhibit id, Recognition_Method, or capture timestamp, THEN THE System SHALL exclude that record from Collected_Animals and SHALL exclude it from the Player_Total.
6. THE System SHALL record the Recognition_Method in each Collected_Record as either `"classifier"` or `"location-fallback"`.
