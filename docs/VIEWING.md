# Mandai Echoes — how to open it

Three ways in, depending on what you have. Any of them shows the whole app.

---

## 1. Open the live link (easiest)

**https://tuikxcode.github.io/AWS-Cloud-Hackathon/**

Works on a phone or a laptop, nothing to install. This is the same build as the file below.

---

## 2. Open the file from this Drive folder (no internet needed)

`mandai-echoes.html` in this folder is the entire app in one file — all the code, styling
and artwork inlined.

1. Click the file, then **Download** (Google Drive cannot preview or run an HTML file, so
   it has to come down to your machine first).
2. Double-click the downloaded file. It opens in your browser and runs.

No install, no Node, no internet. Everything works offline except the photo-recognition
model behind **Take Photo**, which fetches its weights the first time.

> If your browser opens it as text instead of a page, right-click → **Open with** → your
> browser.

---

## 3. Run it from source

```bash
git clone https://github.com/TuiKXCode/AWS-Cloud-Hackathon.git
cd AWS-Cloud-Hackathon
npm install
npm run dev
```

Needs Node 18+. Opens on <http://localhost:5173>.

---

## A two-minute tour

The app opens on **Nearby Exhibit**. Everything follows the **Demo location** dropdown at
the top, so you can walk the whole reserve without moving.

| Tab | What to try |
|---|---|
| **Nearby Exhibit** | Pick *Malayan Tiger Enclosure*. The card follows: conservation status, a fun fact, feeding times. |
| **Facilities** | Restrooms, nursing room, water refill — sorted nearest-first with a landmark to walk toward. |
| **Food Web** | **Click a node first**, then *Simulate Ecosystem Collapse*. Try removing **bamboo groves** and watch the Giant Panda react. |
| **Dining** | Filter venues by Halal / Vegetarian / Air-Conditioned / Kid-Friendly. |
| **Collection · My Animals** | Animals you have photographed, and the sprites generated from those photos. |
| **Kitchen** | The restaurant game. Animals order food matching their **real diet**. Tap a **＋** counter to send the chef for an ingredient, tap the animal, then **SERVE**. |

**The thread tying it together** is the progress bar at the top: 140 points, 20 for each
exhibit you photograph plus whatever the kitchen earns. Fill it and a redemption voucher
appears with a generated code.

**On a phone** the Kitchen opens fullscreen, because the board needs the whole screen.
*Exit fullscreen* goes back to the tabs.

---

## Notes for judges

- **No backend.** No server, no database, no accounts. Everything runs in the browser and
  saves to `localStorage` under one key. Closing the tab keeps your progress; a private
  window starts clean.
- **Location** is real HTML5 geolocation with a simulator override, so the app can be
  demoed anywhere. If you decline the permission prompt it falls back gracefully — that
  notice is expected, not an error.
- **Take Photo** needs a secure origin (the live link or `localhost`). Recognition runs
  fully on-device via TensorFlow.js; photos never leave the browser.
- **Starting over:** the Kitchen briefing has *Start over from Day 1*. To wipe everything,
  open a private window.
- **The animal photographs** are from Wikimedia Commons and are all public domain, CC0 or
  CC BY — no share-alike. Photographers and source links are credited in
  `public/sprites/heads/CREDITS.md` in the repository.
