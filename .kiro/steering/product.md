Mandai Echoes is a single-page web app that helps Mandai Wildlife Reserve visitors (Singapore) learn why the animals they're seeing matter — conservation status, ecosystem role — while also solving the boring logistics of a zoo visit (nearest restroom, nearest food, walking directions). Visitors also play a light gamification layer: photographing animals at checkpoints to "collect" them, earning progress toward a redeemable prize, and (in a later phase) using those collected animals as characters in a food-crafting mini-game.

Primary user: a visitor walking around the reserve with a phone. Secondary user: a presenter demoing the app to judges/stakeholders without physically walking around — hence the location simulator.

Explicit non-goals (do NOT build these unless asked later):

No backend/database, no user accounts, no auth — all game/photo state lives in the browser (localStorage)
No real GPS-verified production accuracy — this is a demo-grade geolocation experience
No real animal audio recordings (copyright) — synthesized/placeholder audio only
No payment, ticketing, or booking flows
No native mobile app — responsive web only
No server-side or cloud-hosted ML — recognition runs entirely client-side
No uploading or storing user photos anywhere off-device