# Requirements Document

## Introduction

This feature implements Phase 3 (optional polish phase) for the Mandai Wildlife Reserve visitor app. It adds two enhancement layers on top of existing Phase 1 (Nearby Exhibit Card) and Phase 2 (Food Web / Dining) components: placeholder animal sound triggers using browser-native audio APIs, and visual polish using Tailwind CSS transition utilities. The entire phase is optional and intended only if development credits and time remain. All audio is placeholder-only (Web Speech API or Web Audio oscillator); no real animal recordings are used. All animations use Tailwind transition utilities exclusively — no third-party animation libraries.

## Glossary

- **System**: The audio-polish module of the Mandai visitor web application.
- **Sound_Trigger**: A UI control (button or tap target) on the Nearby Exhibit Card that initiates playback of a placeholder audio cue for the currently displayed exhibit.
- **Audio_Engine**: The subsystem responsible for generating placeholder audio cues using either the Web Speech API (`speechSynthesis`) or the Web Audio API (oscillator tone). It does not load or play recorded audio files.
- **Radar_Ring**: A pulsing circular visual indicator rendered on the Nearby Exhibit Card to draw attention when an exhibit is nearby, animated using Tailwind CSS transition and animation utilities.
- **Card_Transition**: A slide-in animation applied when the Nearby Exhibit Card appears or changes content, implemented with Tailwind transition utilities.
- **FoodWeb_Fade**: A fade-in/fade-out effect applied to food-web relationship lines and nodes when they appear or disappear, implemented with Tailwind transition utilities.
- **Nearby_Exhibit_Card**: The existing Phase 1 UI component displaying information about the nearest exhibit (name, IUCN badge, fun fact, feeding times).
- **Food_Web_View**: The existing Phase 2 UI component displaying trophic relationships between species.

## Requirements

### Requirement 1: Placeholder Animal Sound Trigger

**User Story:** As a visitor, I want to hear a placeholder sound when I tap the sound button on an exhibit card, so that I get audio feedback that makes the experience more engaging.

#### Acceptance Criteria

1. WHEN the user presses the Sound_Trigger, THE Audio_Engine SHALL initiate placeholder audio playback asynchronously and produce audible output within 500 milliseconds of the press event.
2. IF the Audio_Engine fails to produce audio within 500 milliseconds of the press event (due to API error or timeout), THEN THE Audio_Engine SHALL log a warning to the browser console and SHALL NOT prevent or delay any other user interactions.
3. THE Audio_Engine SHALL attempt placeholder audio generation using the Web Speech API (`speechSynthesis`) as the primary method; IF `speechSynthesis` is unavailable or fails to start, THEN THE Audio_Engine SHALL fall back to the Web Audio API oscillator tone.
4. WHEN the Audio_Engine plays a cue using the Web Speech API, THE Audio_Engine SHALL use the exhibit's name as the utterance text with the browser's default voice, rate, and pitch settings.
5. WHEN the Audio_Engine plays a cue using the Web Audio API, THE Audio_Engine SHALL generate a sine-wave oscillator tone at a frequency between 200 Hz and 800 Hz, with a duration between 200 milliseconds and 1000 milliseconds, and stop playback automatically after the tone duration elapses.
6. IF the Web Speech API and the Web Audio API are both unavailable in the user's browser, THEN THE Audio_Engine SHALL log a warning to the console and take no further action — the Audio_Engine SHALL NOT display an error dialog or block user interaction.
7. IF an audio cue is already playing when the user presses the Sound_Trigger again, THEN THE Audio_Engine SHALL ignore the duplicate request until the current cue completes.
8. WHILE the Nearby_Exhibit_Card is displaying an exhibit (nearest exhibit is within 500 metres), THE System SHALL display the Sound_Trigger button on the Nearby_Exhibit_Card; WHEN no exhibit is within 500 metres (fallback state), THE System SHALL hide the Sound_Trigger button.

### Requirement 2: Radar Ring Pulse Animation

**User Story:** As a visitor, I want a visual pulse on the exhibit card when I'm near an exhibit, so that my attention is drawn to the card without reading text.

#### Acceptance Criteria

1. WHILE a nearest exhibit is displayed on the Nearby_Exhibit_Card, THE System SHALL render the Radar_Ring as a circular element positioned behind the card content using Tailwind CSS's `animate-ping` utility class to produce a repeating outward-pulse effect.
2. THE Radar_Ring SHALL use only Tailwind CSS built-in utility classes (e.g., `animate-ping`, `animate-pulse`, `transition-*`, `duration-*`, `scale-*`) — the System SHALL NOT import or use any third-party animation library (including but not limited to framer-motion, GSAP, react-spring, or Animate.css).
3. WHEN the Nearby_Exhibit_Card transitions to the "no exhibit nearby" fallback state, THE System SHALL immediately remove the Radar_Ring element from the visible layout so that no pulsing indicator is rendered while the fallback state is active.
4. THE Radar_Ring SHALL be rendered at a lower z-index than the exhibit name, IUCN badge, fun fact, and feeding times content, ensuring that all text and badge elements remain fully visible and interactive above the ring.
5. THE Radar_Ring SHALL have a minimum rendered width and height of 48px and a maximum rendered width and height no greater than 50% of the Nearby_Exhibit_Card's smallest dimension, so that the pulse is noticeable without extending beyond the card boundary.

### Requirement 3: Card Slide-In Transitions

**User Story:** As a visitor, I want the exhibit card to slide in smoothly when it appears or updates, so that the interface feels polished and responsive.

#### Acceptance Criteria

1. WHEN the Nearby_Exhibit_Card appears (transitions from the "no exhibit nearby" state to showing an exhibit), THE System SHALL apply a vertical slide-in transition from below using Tailwind CSS transition utilities (`translate-y`, `transition-transform`, `duration-300`), moving the card from fully off-screen (translated 100% downward) to its final position.
2. WHEN the nearest exhibit changes and the Nearby_Exhibit_Card updates its content, THE System SHALL apply an opacity fade transition (from 0 to 1) using Tailwind CSS transition utilities to indicate the content change, completing within 300 milliseconds.
3. THE Card_Transition SHALL use only Tailwind CSS utility classes — the System SHALL NOT import or use any third-party animation library.
4. THE Card_Transition SHALL complete within 500 milliseconds so that the exhibit information is readable without perceptible delay.
5. IF the user's browser has `prefers-reduced-motion: reduce` enabled, THEN THE System SHALL disable all card transitions (both the slide-in and the content-change fade) and display the card immediately without animation.

### Requirement 4: Food Web Fade Effects

**User Story:** As a visitor, I want food-web relationships to fade in and out smoothly, so that the visualization feels natural and easy to follow.

#### Acceptance Criteria

1. WHEN a food-web relationship node or connection line is added to the Food_Web_View (due to data load, filter change, or user interaction), THE System SHALL apply a fade-in effect transitioning element opacity from 0 to 1 using Tailwind CSS transition utilities (e.g., `opacity-0` to `opacity-100`, `transition-opacity`) with a duration of 400 milliseconds.
2. WHEN a food-web relationship node or connection line is removed from the Food_Web_View (due to filter change or user interaction), THE System SHALL apply a fade-out effect transitioning element opacity from 1 to 0 over 400 milliseconds, and SHALL remove the element from the DOM only after the fade-out transition completes.
3. THE System SHALL use only Tailwind CSS utility classes for FoodWeb_Fade effects — THE System SHALL NOT import or use any third-party animation library.
4. IF a fade-in or fade-out transition is interrupted by the opposite action (e.g., element is removed during fade-in, or re-added during fade-out), THEN THE System SHALL begin the new transition from the element's current opacity value without delay.
5. IF the user's browser has `prefers-reduced-motion: reduce` enabled, THEN THE System SHALL set transition duration to 0 milliseconds, showing or hiding elements without visible animation.

### Requirement 5: Non-Blocking and Graceful Degradation

**User Story:** As a visitor, I want the app to remain responsive even if audio or animations fail, so that core features (exhibit info, food web, facilities) are never impaired by polish features.

#### Acceptance Criteria

1. IF any audio or animation operation throws an exception during playback, transition, or initialization, THEN THE System SHALL catch the exception, log a warning to the console using `console.warn`, and continue rendering all core views (Nearby_Exhibit_Card, Food_Web_View, Facilities_Tab, Demo_Location_Simulator) and responding to user interactions without interruption or displaying error messages to the user.
2. THE System SHALL NOT display modal dialogs, toast notifications, or inline error messages to the user for any failure originating from the audio-polish module.
3. WHILE audio is playing or transitions are animating, THE System SHALL keep all interactive controls (Sound_Trigger, navigation tabs, Demo_Location_Simulator, facility list) responding to tap or click input within 200 milliseconds.
4. IF the audio-polish module fails to initialize (missing API support, script error), THEN THE System SHALL render the Nearby_Exhibit_Card and Food_Web_View without Sound_Trigger, Radar_Ring, Card_Transition, or FoodWeb_Fade — reverting to Phase 1 and Phase 2 baseline appearance — and SHALL log a `console.warn` message indicating which capability is unavailable.
5. IF audio playback fails after successfully starting (network interruption, decode error), THEN THE System SHALL stop the failed audio operation silently and SHALL leave the Sound_Trigger control in its default idle state ready for the next user interaction.
