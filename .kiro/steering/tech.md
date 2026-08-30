React (Vite), functional components + hooks only, no class components
Tailwind CSS for all styling — no separate CSS files, no CSS-in-JS libraries
lucide-react for icons
State: React Context or useState/useReducer only — no Redux/Zustand unless the app genuinely outgrows it
Single-page app, tab-based navigation (no router needed — use local state for active tab)
All static reference data is imported from one src/data/mandaiData.js file (schema below) — do not let the agent redesign this schema
All runtime/player state (collected animals, points, photos) persists to localStorage under a single namespaced key — do not let the agent invent additional storage mechanisms
Geolocation: HTML5 navigator.geolocation, with a manual override dropdown ("Demo Location Simulator") that visually and functionally takes priority over real GPS when selected
Photo capture: <input type="file" accept="image/*" capture="environment"> — NOT a custom getUserMedia live camera view. This is a deliberate scope cut to keep Phase 4 cheap; do not let the agent build a live viewfinder.
Animal recognition: TensorFlow.js + a pretrained MobileNet (ImageNet) model loaded client-side. Map ImageNet output labels to exhibit IDs via a small lookup table (given below) — do not train or fine-tune a custom model.
Image compositing (sprite heads): plain Canvas API (CanvasRenderingContext2D), no image-editing library
Mobile-first responsive layout, but must also look correct at desktop width
