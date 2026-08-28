# Mandai Echoes — Product Requirements Document (PRD)

> Single-page web app that helps Mandai Wildlife Reserve (Singapore) visitors learn why
> the animals they see matter — conservation status and ecosystem role — while solving
> the everyday logistics of a zoo visit (nearest restroom, food, walking directions).
> A light gamification layer lets visitors photograph animals at checkpoints to "collect"
> them, earn progress toward a redeemable prize, and (later) use collected animals as
> characters in a food-crafting mini-game.

---

## 1. Product Overview

### Vision
Turn a walk around the reserve into an interactive, educational, lightly gamified
experience — delivered as a demo-grade single-page web app with no backend.

### Users
- **Primary user:** a visitor walking around the reserve with a phone.
- **Secondary user:** a presenter demoing the app to judges/stakeholders without
  physically walking around — served by the Demo Location Simulator.

### Explicit non-goals (do NOT build unless asked later)
- No backend/database, no user accounts, no auth — all game/photo state lives in the
  browser (localStorage).
- No real GPS-verified production accuracy — demo-grade geolocation only.
- No real animal audio recordings (copyright) — synthesized/placeholder audio only.
- No payment, ticketing, or booking flows.
- No native mobile app — responsive web only.
- No server-side or cloud-hosted ML — recognition runs entirely client-side.
- No uploading or storing user photos anywhere off-device.

---

## 2. Tech Constraints

- React (Vite), functional components + hooks only, no class components.
- Tailwind CSS for all styling — no separate CSS files, no CSS-in-JS libraries.
- `lucide-react` for icons.
- State: React Context or `useState`/`useReducer` only — no Redux/Zustand unless the
  app genuinely outgrows it.
- Single-page app, tab-based navigation (no router — use local state for active tab).
- All static reference data imported from one `src/data/mandaiData.js` file (schema in
  §3) — the schema is fixed; do not redesign it.
- All runtime/player state (collected animals, points, photos) persists to localStorage
  under a single namespaced key (`mandaiEchoes.playerState`) — do not invent additional
  storage mechanisms.
- Geolocation: HTML5 `navigator.geolocation`, with a manual override dropdown
  ("Demo Location Simulator") that takes priority over real GPS when selected.
- Photo capture: `<input type="file" accept="image/*" capture="environment">` — NOT a
  custom `getUserMedia` live camera view. Deliberate scope cut; do not build a viewfinder.
- Animal recognition: TensorFlow.js + a pretrained MobileNet (ImageNet) model loaded
  client-side. Map ImageNet output labels to exhibit IDs via a lookup table (§3). Do not
  train or fine-tune a custom model.
- Image compositing (sprite heads): plain Canvas API (`CanvasRenderingContext2D`), no
  image-editing library.
- Mobile-first responsive layout that also looks correct at desktop width.

---

## 3. Data Schema (fixed — do not redesign)

### Static reference data — `src/data/mandaiData.js`

```js
// src/data/mandaiData.js

export const exhibits = [
  {
    id: "pygmy-hippo",
    name: "Pygmy Hippopotamus",
    lat: 1.4043, lng: 103.7930,
    iucnStatus: "Endangered", // Least Concern | Vulnerable | Endangered | Critically Endangered
    funFact: "...",
    feedingTimes: ["10:30", "15:30"],
    diet: "Herbivore",
    dietTags: ["fruit", "leaves"],           // used later by the tycoon game to match food items
    trophicRole: "Primary Consumer",
    dependsOn: ["riverine plants"],          // producers
    predatorOf: [],                          // it's prey, not predator
    ecosystemImpactIfRemoved: "...",
    imagenetLabels: ["hippopotamus", "hippo"], // which MobileNet/ImageNet labels count as a match
    spriteBodyAsset: "/sprites/bodies/pygmy-hippo-body.png", // pre-made body art, head swapped in
    points: 20                               // points on first successful checkpoint capture
  }
  // ...Malayan Tiger, Giant Panda, Asian Elephant, Flamingos — same shape.
  // imagenetLabels for the others (verify exact class names against the loaded model):
  //   Malayan Tiger  -> ["tiger"]
  //   Giant Panda    -> ["giant panda", "panda"]
  //   Asian Elephant -> ["Indian elephant", "African elephant"] (closest available classes)
  //   Flamingo       -> ["flamingo"]
];

export const facilities = [
  {
    id: "restroom-1",
    type: "restroom", // restroom | nursing | accessible | water-refill
    name: "...",
    lat: 0, lng: 0,
    nearestLandmark: "Giant Panda Enclosure"
  }
];

export const dining = [
  {
    id: "ah-meng",
    name: "Ah Meng Restaurant",
    lat: 0, lng: 0,
    tags: ["halal", "vegetarian", "air-conditioned", "kid-friendly"], // filter chips match these
    hours: "10:00–18:00",
    topPicks: ["...", "..."]
  }
];

export const demoLocations = [
  { label: "Pygmy Hippo Enclosure", lat: 1.4043, lng: 103.7930 },
  { label: "Night Safari Entrance", lat: 0, lng: 0 }
  // one per exhibit + a couple of landmark points
];

export const questlineConfig = {
  totalPointsToComplete: 100,   // sum of all 5 exhibits' `points` = 100
  prizeLabel: "Free scoop at Ah Meng Restaurant" // shown on the redemption voucher
};
```

Kiro fills in real/plausible coordinates and content for placeholders — but the shape
above is fixed. `imagenetLabels` values must be verified against whichever MobileNet
build is actually loaded, since exact class-name strings vary by model version.

### Runtime player state (localStorage key: `mandaiEchoes.playerState`)

```js
// not in mandaiData.js — this is player state
{
  points: 0,
  collectedAnimals: [
    {
      exhibitId: "pygmy-hippo",
      photoDataUrl: "data:image/jpeg;base64,...",
      spriteDataUrl: "data:image/png;base64,...", // composited head-on-body, filled in Phase 6
      recognizedVia: "classifier" | "location-fallback",
      capturedAt: "2026-08-28T10:15:00Z"
    }
  ],
  voucherRedeemed: false
}
```

---

## 4. Phased Delivery Plan

Each phase is specced and built independently. Review requirements → design → tasks,
approve each, implement, verify it runs — **then** start the next phase. Do not combine
phases into one spec session.

### Phase 1 — MVP
**Goal:** prove the core loop — location changes, nearest exhibit updates, user learns something.

Features:
1. **Location engine:** Haversine distance from current position (real GPS or simulator
   override) to every exhibit; determines nearest.
2. **Demo Location Simulator:** sticky, always-visible dropdown listing all
   `demoLocations`; selecting one overrides GPS and instantly updates location-dependent views.
3. **Nearby Exhibit Card:** nearest exhibit's name, color-coded IUCN badge, fun fact, feeding times.
4. **Facilities tab:** facilities sorted nearest-to-farthest by distance, with distance
   in meters and a simple text direction (e.g., "45m toward Giant Panda Enclosure").

Acceptance criteria (EARS):
- WHEN the user selects a location from the Demo Location Simulator, THE SYSTEM SHALL
  recalculate the nearest exhibit and update the Nearby Exhibit Card within 1 second.
- WHEN no exhibit is within a reasonable radius, THE SYSTEM SHALL display a fallback
  state ("no exhibit nearby") rather than an empty or broken card.
- WHEN the user opens the Facilities tab, THE SYSTEM SHALL sort all facilities by
  ascending distance from the current simulated/real position.
- IF browser geolocation permission is denied, THEN THE SYSTEM SHALL fall back to the
  first demo location by default rather than showing an error state.

### Phase 2 — Food Web + Dining
1. **Trophic Food Web Simulator:** simple node diagram (producer → primary consumer →
   apex predator) built from `trophicRole`/`dependsOn` — no new data modeling.
2. **"Simulate Ecosystem Collapse" toggle:** dims the removed node, shows
   `ecosystemImpactIfRemoved` text for connected nodes. CSS opacity/transition-based
   only — no physics/animation engine.
3. **Dining tab:** dining list filtered by tag chips (Halal, Vegetarian, Air-Conditioned,
   Kid-Friendly), sorted by distance like Facilities.

Acceptance criteria (EARS):
- WHEN the user toggles "Simulate Ecosystem Collapse", THE SYSTEM SHALL visually dim the
  selected node and display impact text for every node listed as dependent on it.
- WHEN the user selects one or more filter chips on the Dining tab, THE SYSTEM SHALL show
  only venues whose tags include all selected filters.
- WHEN no venues match the selected filters, THE SYSTEM SHALL show an explicit empty
  state, not a blank list.

### Phase 3 — Audio + Polish (optional)
1. Simulated animal sound trigger: Web Speech API (`speechSynthesis`) or a short Web
   Audio oscillator tone as placeholder — explicitly not real recordings.
2. Visual polish: pulsing radar ring on the Nearby Exhibit Card, card slide-in
   transitions, food-web fade effects — Tailwind transition utilities only, no animation library.

Acceptance criteria (EARS):
- WHEN the user presses the sound trigger, THE SYSTEM SHALL play a placeholder audio cue
  within 500ms or fail silently with a console warning — it SHALL NOT block the UI.

### Phase 4 — Checkpoint Photo Capture & Animal Recognition
**Depends on:** Phase 1 (location engine determines which checkpoint the user is at).

Features:
1. **Capture trigger:** "Take Photo" action on the Nearby Exhibit Card, enabled only
   when within range of an exhibit (real GPS or simulator).
2. **File-input capture:** native camera via
   `<input type="file" accept="image/*" capture="environment">`; no custom preview UI.
3. **Client-side classification:** run the captured image through MobileNet; compare top
   predicted labels against each exhibit's `imagenetLabels`.
4. **Confidence fallback:** if no exhibit's labels appear above a defined threshold,
   auto-tag the photo to the currently nearest exhibit (`recognizedVia: "location-fallback"`)
   so the flow never dead-ends during a live demo.
5. **Result screen:** on successful tag, show the exhibit's fun fact, diet, and IUCN
   status (reuse Phase 1 data), save the record to `collectedAnimals`, and award points
   for that exhibit exactly once (no farming by re-photographing).

Acceptance criteria (EARS):
- WHEN the user captures a photo while within range of an exhibit, THE SYSTEM SHALL
  attempt classification and, regardless of outcome, tag the photo to an exhibit within 3 seconds.
- IF the classifier's top match confidence is below the defined threshold, THEN THE
  SYSTEM SHALL fall back to tagging the nearest exhibit rather than showing a failure state.
- WHEN an exhibit is successfully tagged for the first time, THE SYSTEM SHALL add its
  points value to the player's total exactly once; subsequent photos of an
  already-collected exhibit SHALL NOT add further points.
- WHEN a photo is tagged, THE SYSTEM SHALL persist the record (photo, exhibit id,
  recognition method, timestamp) to localStorage immediately, so state survives a refresh.

### Phase 5 — Questline Progress System
**Depends on:** Phase 4 (needs points and `collectedAnimals`).

Features:
1. **Progress bar:** persistent UI showing `points / questlineConfig.totalPointsToComplete`.
2. **Completion state:** when points reach the total, unlock a "Redemption Voucher"
   screen showing `questlineConfig.prizeLabel` and a client-generated code (e.g., derived
   from a timestamp — no server validation).
3. **Redeemed flag:** a "Mark as redeemed" action sets `voucherRedeemed: true` so the
   voucher screen doesn't re-trigger every visit.

Acceptance criteria (EARS):
- WHEN the player's points total changes, THE SYSTEM SHALL update the progress bar to
  reflect the new total without a page reload.
- WHEN points reach `totalPointsToComplete`, THE SYSTEM SHALL display the redemption
  voucher screen automatically.
- WHEN the user marks the voucher as redeemed, THE SYSTEM SHALL persist that state and
  SHALL NOT show the voucher screen again on subsequent visits within the same browser.

### Phase 6 — Sprite Generation
**Depends on:** Phase 4 (captured photo per collected animal) and pre-made body art
assets (placeholder body PNGs per exhibit, referenced by `spriteBodyAsset`).

Features:
1. For each `collectedAnimals` entry, crop the captured photo into a circle (Canvas API)
   and composite it onto the exhibit's `spriteBodyAsset` at a fixed head position.
2. Store the composited image as `spriteDataUrl` on that `collectedAnimals` entry.
3. Add a "My Collected Animals" gallery view showing each composited sprite.

Acceptance criteria (EARS):
- WHEN a `collectedAnimals` entry lacks a `spriteDataUrl`, THE SYSTEM SHALL generate one
  automatically the next time the app loads that entry, without re-taking the photo.
- WHEN compositing fails (e.g., corrupted image data), THE SYSTEM SHALL fall back to
  displaying the exhibit's body art alone rather than a broken image.

### Phase 7 — Tycoon Game (STUB ONLY — do not build yet)
Do not create a Kiro spec for this phase yet. Game mechanics ("craft food matching each
animal's diet") are not designed in enough detail to produce reliable requirements.

Locked-in now so Phase 7 plugs in cleanly later:
- **Inputs:** `collectedAnimals` (each with a `spriteDataUrl` for the customer's head)
  and each exhibit's `dietTags` (e.g., `["fruit", "leaves"]`) to determine which food
  items satisfy which customer.
- **Output:** a points value per completed order, fed back into the same points total
  used by the Phase 5 questline bar — the game contributes to, not replaces, existing progress.
- **Non-negotiables:** 2D, no backend, localStorage only, no new state-management library.

When ready to spec Phase 7, document: customer queue/spawn logic, specific food items and
which `dietTags` each satisfies, the crafting interaction (drag-drop / click-sequence /
timed), scoring/mistake rules, and win/lose or session-length conditions — then it becomes
a normal Kiro spec.

---

## 5. Per-Phase Kiro Spec Instructions (verbatim)

> Build Phase [N] of Mandai Echoes as described in the attached brief. Use the data
> schema exactly as given — do not redesign it. Generate requirements.md from the
> acceptance criteria provided, then design.md, then tasks.md. Keep the task list minimal:
> one task per feature listed, not per sub-component. Wait for my approval after each of
> requirements, design, and tasks before proceeding to implementation. Do not implement
> or scaffold any part of Phase 7 (the tycoon game) — treat it as out of scope for this session.
