# Requirements Document

## Introduction

This feature implements Phase 6 of the Mandai Wildlife Reserve visitor app: Sprite Generation. Each animal a visitor has collected during Phase 4 (checkpoint-photo-capture) is turned into a personalized "sprite" — the visitor's own captured photo, cropped into a circular head, composited onto pre-made placeholder body art for that exhibit. The composited sprite is generated in the browser with the Canvas API, stored back onto the collected entry so it survives refreshes, and shown in a simple "My Collected Animals" gallery that serves as a visual checkpoint confirming compositing works.

This feature depends on Phase 4 (checkpoint-photo-capture), which is implemented. Phase 4 persists a collection of tagged animals in `localStorage` under the key `collectedAnimals`; each entry (a Collected_Record) contains the captured photo as a data URL (`photo`), the tagged exhibit id (`exhibitId`), how the exhibit was recognized (`recognizedVia`), and a capture timestamp (`timestamp`). This feature reads that collection, reuses each exhibit's `spriteBodyAsset` (a per-exhibit placeholder body-art PNG served from the app's `public/` directory, e.g. `/sprites/bodies/pygmy-hippo-body.png`), and extends each Collected_Record with a new `spriteDataUrl` field holding the composited image.

Sprite generation is lazy and automatic: when the app loads a Collected_Record that has no `spriteDataUrl`, the System generates one from the record's existing photo without requiring the visitor to re-take the photo. Generation is idempotent (a record that already has a `spriteDataUrl` is not regenerated) and must not block the interface while processing many entries. When compositing cannot be completed, the System degrades gracefully to the exhibit's body art alone, and then to a neutral placeholder, so a broken image is never shown.

## Glossary

- **System**: The sprite-generation module of the Mandai visitor web application.
- **Capture_Module**: The implemented Phase 4 checkpoint-photo-capture feature that produces and persists Collected_Animals. Treated as an implemented dependency.
- **Collected_Animals**: The persisted collection of tagged records stored in `localStorage` under the key `collectedAnimals`, established by the Capture_Module.
- **Collected_Record**: A single entry in Collected_Animals containing the captured photo data URL (`photo`), the tagged exhibit id (`exhibitId`), the recognition method (`recognizedVia`), and a capture timestamp (`timestamp`); extended by this feature with a Sprite_Data_Url (`spriteDataUrl`).
- **Captured_Photo**: The visitor's photo stored on a Collected_Record as the `photo` data URL.
- **Exhibit**: A record in the exhibits dataset (`mandai.js`) describing a Mandai animal.
- **Sprite_Body_Asset**: The per-exhibit placeholder body-art image referenced by an Exhibit's `spriteBodyAsset` path (e.g. `/sprites/bodies/pygmy-hippo-body.png`), served from the application's `public/` directory.
- **Head_Position**: The fixed location and diameter, defined relative to the Sprite_Body_Asset, at which the Circular_Head is drawn onto the body art.
- **Circular_Head**: The Captured_Photo cropped to a circle for compositing at the Head_Position.
- **Composited_Sprite**: The image produced by drawing the Sprite_Body_Asset and then the Circular_Head at the Head_Position onto a canvas.
- **Sprite_Data_Url**: The Composited_Sprite exported from the canvas as a data URL and stored on the Collected_Record as `spriteDataUrl`.
- **Sprite_Generation**: The process of producing a Sprite_Data_Url for a Collected_Record from its Captured_Photo and the corresponding Exhibit's Sprite_Body_Asset.
- **Compositing_Failure**: Any condition that prevents producing a Composited_Sprite, including a Captured_Photo that cannot be decoded, a Sprite_Body_Asset that cannot be loaded, or a canvas drawing or export error.
- **Body_Only_Fallback**: The display of an Exhibit's Sprite_Body_Asset alone, without the Circular_Head, used when a Composited_Sprite cannot be produced.
- **Placeholder_Fallback**: A neutral placeholder image shown when neither a Composited_Sprite nor the Body_Only_Fallback can be displayed.
- **Gallery_View**: The "My Collected Animals" screen that lists a sprite for each Collected_Record.

## Requirements

### Requirement 1: Lazy Automatic Sprite Generation

**User Story:** As a visitor, I want my collected animals to become personalized sprites automatically, so that I see my sprites without re-taking any photos.

#### Acceptance Criteria

1. WHEN the application loads a Collected_Record that lacks a Sprite_Data_Url, THE System SHALL generate a Sprite_Data_Url for that Collected_Record from the record's existing Captured_Photo and the corresponding Exhibit's Sprite_Body_Asset without requiring the visitor to capture a new photo.
2. WHEN the System generates a Sprite_Data_Url for a Collected_Record, THE System SHALL derive the Circular_Head from that record's existing Captured_Photo.
3. IF a Collected_Record's `exhibitId` does not correspond to any Exhibit in the exhibits dataset, THEN THE System SHALL skip Sprite_Generation for that Collected_Record and SHALL leave the record's Sprite_Data_Url absent.

### Requirement 2: Circular Crop and Compositing

**User Story:** As a visitor, I want my photo shown as the animal's head on its body, so that each sprite feels like my own capture.

#### Acceptance Criteria

1. WHEN the System performs Sprite_Generation for a Collected_Record, THE System SHALL crop the Captured_Photo to a Circular_Head using the Canvas API, using a centered square region whose side length equals the smaller of the Captured_Photo's width and height.
2. IF the Captured_Photo has a width or height of zero pixels, THEN THE System SHALL abort Sprite_Generation, retain the Collected_Record without a Composited_Sprite, and return an error indication that the photo dimensions are invalid.
3. WHEN the System performs Sprite_Generation for a Collected_Record, THE System SHALL draw the Exhibit's Sprite_Body_Asset onto a canvas and THEN draw the Circular_Head at the Head_Position over the Sprite_Body_Asset.
4. WHEN the System has drawn the Composited_Sprite onto the canvas, THE System SHALL export the canvas contents to a Sprite_Data_Url.
5. THE System SHALL draw the Circular_Head at the same fixed Head_Position for every Sprite_Generation, where Head_Position is defined as a center offset and diameter expressed as fractions of the Sprite_Body_Asset dimensions, such that identical inputs produce a byte-identical Sprite_Data_Url.
6. IF the Sprite_Body_Asset fails to load within 5 seconds, THEN THE System SHALL abort Sprite_Generation, retain the Collected_Record without a Composited_Sprite, and return an error indication that the body asset is unavailable.

### Requirement 3: Sprite Persistence

**User Story:** As a visitor, I want my generated sprites to stay saved, so that they survive refreshing or reopening the app and are generated only once.

#### Acceptance Criteria

1. WHEN the System produces a Sprite_Data_Url for a Collected_Record, THE System SHALL store the Sprite_Data_Url on that Collected_Record as `spriteDataUrl` in Collected_Animals in `localStorage`.
2. WHEN the application loads a Collected_Record that already has a Sprite_Data_Url, THE System SHALL use the existing Sprite_Data_Url and SHALL NOT regenerate it.
3. IF writing an updated Collected_Record with its Sprite_Data_Url to `localStorage` fails, THEN THE System SHALL retain the generated Sprite_Data_Url in the in-memory collection and SHALL continue displaying the Composited_Sprite without discarding any previously collected records.
4. THE System SHALL preserve each Collected_Record's existing `photo`, `exhibitId`, `recognizedVia`, and `timestamp` fields when adding or updating the Sprite_Data_Url.

### Requirement 4: Compositing Failure Fallback

**User Story:** As a visitor, I want a sensible image even when my photo cannot be processed, so that I never see a broken image in my collection.

#### Acceptance Criteria

1. WHEN a collectedAnimals entry lacks a spriteDataUrl, THE SYSTEM SHALL generate one automatically the next time the app loads that entry, without requiring the user to re-take the photo.
2. WHEN compositing fails (e.g., corrupted image data), THE SYSTEM SHALL fall back to displaying the exhibit's body art alone rather than a broken image.
3. IF the Exhibit's Sprite_Body_Asset also cannot be loaded (within a bounded load timeout) for the Body_Only_Fallback, THEN THE System SHALL display the Placeholder_Fallback rather than a broken image.
4. WHEN a Compositing_Failure occurs during Sprite_Generation, THE System SHALL leave the Collected_Record's Sprite_Data_Url absent so that generation is reattempted on a subsequent load, up to a bounded number of reattempts per record so generation cannot loop indefinitely.

### Requirement 5: My Collected Animals Gallery

**User Story:** As a visitor, I want a gallery of my collected animals, so that I can confirm my sprites were created and see them together.

#### Acceptance Criteria

1. WHEN the visitor opens the Gallery_View, THE System SHALL display one sprite entry for each Collected_Record in Collected_Animals.
2. WHERE a Collected_Record has a Sprite_Data_Url, THE System SHALL display that Composited_Sprite in the Gallery_View for that record.
3. WHERE a Collected_Record has no Sprite_Data_Url after Sprite_Generation was attempted, THE System SHALL display the Body_Only_Fallback, or the Placeholder_Fallback when the Sprite_Body_Asset cannot be loaded, for that record in the Gallery_View.
4. IF Collected_Animals contains zero Collected_Records, THEN THE System SHALL present the Gallery_View with an indication that no animals have been collected.

### Requirement 6: Non-Blocking Generation

**User Story:** As a visitor with many collected animals, I want the app to stay responsive while sprites are generated, so that browsing my collection is never frozen.

#### Acceptance Criteria

1. WHILE the System is generating Sprite_Data_Urls for Collected_Records that lack them, THE System SHALL keep the Gallery_View responsive to visitor interaction rather than blocking until all generation completes.
2. WHEN Collected_Animals contains multiple Collected_Records lacking Sprite_Data_Urls, THE System SHALL generate each missing Sprite_Data_Url independently so that a Compositing_Failure for one Collected_Record does not prevent Sprite_Generation for the others.
3. WHEN a Sprite_Data_Url becomes available for a Collected_Record, THE System SHALL update that record's entry in the Gallery_View to show its Composited_Sprite.
