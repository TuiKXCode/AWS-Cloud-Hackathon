# Implementation Plan: Audio Polish

## Overview

Phase 3 adds optional audio and visual polish enhancements to the existing Mandai Wildlife Reserve visitor app. Implementation follows a bottom-up approach: standalone AudioEngine module first, then utility hooks, visual components, the SoundTrigger button, error boundary, and finally integration composition wiring everything together around existing Phase 1/2 components. All code is TypeScript with React components using Tailwind CSS exclusively for animations.

## Tasks

- [ ] 1. Implement AudioEngine module
  - [ ] 1.1 Create the `AudioEngine` class in `src/audio/AudioEngine.ts`
    - Implement the `AudioEngineOptions` and `AudioEngineState` interfaces
    - Implement `playForExhibit(exhibitName)` with speechSynthesis as primary, oscillator as fallback
    - Implement the `isPlaying` guard to ignore duplicate requests
    - Implement `stop()` for cleanup
    - Implement static `isSupported()` method to detect browser API availability
    - Implement deterministic frequency derivation from exhibit name (hash modulo range, 200–800 Hz)
    - Implement 500ms timeout for speechSynthesis `onstart` — cancel and fall back to oscillator if exceeded
    - All errors caught and logged via `console.warn` — never reject the promise
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 1.2 Write unit tests for `AudioEngine` in `src/audio/__tests__/AudioEngine.test.ts`
    - Mock `window.speechSynthesis` and `AudioContext`/`OscillatorNode`
    - Test: `playForExhibit()` resolves within 500ms when speechSynthesis fires `onstart`
    - Test: Falls back to oscillator when speechSynthesis is unavailable
    - Test: Speech utterance uses exhibit name with default voice/rate/pitch
    - Test: Oscillator frequency is between 200–800 Hz, duration 200–1000ms
    - Test: Duplicate call while playing is ignored
    - Test: Both APIs unavailable logs warning and takes no action
    - Test: Failed playback resets state to idle
    - Test: speechSynthesis timeout triggers fallback
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.5_

- [ ] 2. Implement utility hooks
  - [ ] 2.1 Create `useReducedMotion` hook in `src/hooks/useReducedMotion.ts`
    - Evaluate `window.matchMedia('(prefers-reduced-motion: reduce)')` on mount
    - Subscribe to `change` events for runtime toggling
    - Return `true` if reduced motion is preferred, `false` otherwise
    - Default to `false` if `matchMedia` is unavailable
    - _Requirements: 3.5, 4.5_

  - [ ] 2.2 Create `useAudioEngine` hook in `src/hooks/useAudioEngine.ts`
    - Provide a singleton `AudioEngine` instance
    - Return `null` if `AudioEngine.isSupported()` returns both APIs unavailable
    - Call `audioEngine.stop()` on component unmount for cleanup
    - _Requirements: 1.6, 5.4_

  - [ ]* 2.3 Write unit tests for hooks in `src/hooks/__tests__/useReducedMotion.test.ts` and `src/hooks/__tests__/useAudioEngine.test.ts`
    - Mock `window.matchMedia` for reduced motion tests
    - Test: returns true when reduced motion is enabled
    - Test: responds to runtime media query changes
    - Test: `useAudioEngine` returns null when no APIs available
    - Test: `useAudioEngine` returns an AudioEngine instance when APIs are supported
    - _Requirements: 3.5, 4.5, 1.6, 5.4_

- [ ] 3. Implement visual polish components
  - [ ] 3.1 Create `RadarRing` component in `src/components/RadarRing.tsx`
    - Render a circular `<div>` with Tailwind `animate-ping`, `rounded-full`, `bg-green-400/30`
    - Position behind card content with lower z-index (`z-[-1]`)
    - Constrain size: min 48px, max 50% of card's smallest dimension
    - Conditionally render only when `visible` prop is true (remove from DOM when false)
    - Omit `animate-ping` when `useReducedMotion()` returns true
    - No third-party animation libraries
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.2 Create `CardTransitionWrapper` component in `src/components/CardTransitionWrapper.tsx`
    - Slide-in from below: `translate-y-full` → `translate-y-0` with `transition-all duration-300`
    - Content change fade: `opacity-0` → `opacity-100` over 300ms when `contentKey` changes
    - Complete all transitions within 500ms
    - Skip all transitions when `useReducedMotion()` returns true (apply final state directly)
    - No third-party animation libraries
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.3 Create `FoodWebFadeWrapper` component in `src/components/FoodWebFadeWrapper.tsx`
    - Fade-in: `opacity-0` → `opacity-100` with `transition-opacity duration-[400ms]` for entering nodes
    - Fade-out: `opacity-100` → `opacity-0` over 400ms, remove from DOM after transition completes
    - Handle interruption: start new transition from current opacity value
    - Set `duration-[0ms]` when `useReducedMotion()` returns true
    - Use `transitionend` event with setTimeout backup (500ms) for DOM removal
    - No third-party animation libraries
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 3.4 Write unit tests for visual components
    - Create `src/components/__tests__/RadarRing.test.ts`: verify animate-ping class, z-index, size constraints, DOM removal when hidden, reduced motion behavior
    - Create `src/components/__tests__/CardTransitionWrapper.test.ts`: verify slide-in classes, content fade, transition timing, reduced motion bypass
    - Create `src/components/__tests__/FoodWebFadeWrapper.test.ts`: verify fade-in/out classes, DOM removal after fade-out, interruption handling, reduced motion
    - _Requirements: 2.1–2.5, 3.1–3.5, 4.1–4.5_

- [ ] 4. Implement SoundTrigger component
  - [ ] 4.1 Create `SoundTrigger` component in `src/components/SoundTrigger.tsx`
    - Render a button with speaker icon and `aria-label="Play exhibit sound"`
    - Visible only when `exhibitName` is non-null (exhibit within 500m)
    - On click, call `audioEngine.playForExhibit(exhibitName)`
    - Show pulsing visual state (`animate-pulse`) while audio is playing
    - Do not render if `AudioEngine.isSupported()` returns both APIs unavailable
    - _Requirements: 1.1, 1.7, 1.8_

  - [ ]* 4.2 Write unit tests for `SoundTrigger` in `src/components/__tests__/SoundTrigger.test.ts`
    - Test: button visible when exhibit within 500m, hidden otherwise
    - Test: click calls `playForExhibit` with exhibit name
    - Test: button shows playing state during playback
    - Test: component not rendered when no audio APIs available
    - Test: controls remain responsive during playback
    - _Requirements: 1.8, 5.3_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement error boundary and graceful degradation
  - [ ] 6.1 Create `AudioPolishBoundary` component in `src/components/AudioPolishBoundary.tsx`
    - Implement React error boundary (`getDerivedStateFromError`, `componentDidCatch`)
    - On error: log warning via `console.warn`, render children without Phase 3 enhancements
    - Accept `fallback` prop for custom fallback rendering
    - Never display modal dialogs, toasts, or error messages to the user
    - _Requirements: 5.1, 5.2, 5.4_

  - [ ]* 6.2 Write unit tests for `AudioPolishBoundary` in `src/components/__tests__/AudioPolishBoundary.test.ts`
    - Test: catches errors from child components, renders fallback
    - Test: logs warning via console.warn on error
    - Test: no modal/toast/error displayed to user
    - Test: Phase 1/2 components render in baseline state when module fails
    - _Requirements: 5.1, 5.2, 5.4_

- [ ] 7. Integration composition and wiring
  - [ ] 7.1 Wire Phase 3 wrappers into `ExploreView` (or equivalent layout component)
    - Wrap `NearbyExhibitCard` with `CardTransitionWrapper`
    - Add `RadarRing` behind card content
    - Add `SoundTrigger` button to card area
    - Wrap `FoodWebSimulator` with `FoodWebFadeWrapper`
    - Wrap entire Phase 3 section with `AudioPolishBoundary`
    - Connect `useLocationContext()` for nearestExhibit data
    - Connect `useAudioEngine()` and `useReducedMotion()` hooks
    - _Requirements: 1.8, 2.1, 2.3, 3.1, 4.1, 5.4_

  - [ ]* 7.2 Write integration tests in `src/components/__tests__/AudioPolishIntegration.test.ts`
    - Test: Exhibit comes into range → card slides in → radar ring appears → sound trigger visible
    - Test: Tap sound trigger → audio plays → tap again ignored → audio ends → trigger idle
    - Test: Exhibit changes → card content fades → new info displayed
    - Test: Reduced motion enabled → no animations, instant display
    - Test: Food web filter change → exiting nodes fade out → new nodes fade in
    - Test: Both audio APIs unavailable → sound trigger not rendered → card still works
    - Test: AudioEngine throws → app remains responsive
    - _Requirements: 1.1, 1.7, 1.8, 2.1, 3.1, 3.2, 3.5, 4.1, 4.2, 4.5, 5.1, 5.3, 5.4_

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- No property-based tests are included — the design document explains why PBT does not apply to this feature (side-effect-only operations, CSS-class-driven rendering, deterministic state machine with small input space)
- All animations use Tailwind CSS utilities exclusively — no third-party animation libraries
- Phase 3 wraps/augments Phase 1 and Phase 2 components without modifying their internals
- If Phase 3 fails to load, Phase 1/2 components continue working unchanged

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "2.3"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "4.1"] },
    { "id": 3, "tasks": ["3.4", "4.2", "6.1"] },
    { "id": 4, "tasks": ["6.2", "7.1"] },
    { "id": 5, "tasks": ["7.2"] }
  ]
}
```
