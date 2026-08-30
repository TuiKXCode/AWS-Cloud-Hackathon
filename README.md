# Mandai Echoes

A single-page web app for visitors to **Mandai Wildlife Reserve, Singapore**. It tells you
why the animal in front of you matters — conservation status and ecosystem role — while
solving the everyday logistics of a zoo visit, and wraps the whole thing in a light game:
photograph animals at checkpoints to collect them, earn a redeemable prize, then cook for
them in a restaurant mini-game.

Runs entirely in the browser. No backend, no accounts, no cloud calls — all state lives in
`localStorage`. See [`docs/PRD-mandai-echoes.md`](docs/PRD-mandai-echoes.md) for the full spec.

- **Repository:** https://github.com/TuiKXCode/AWS-Cloud-Hackathon
- **Visibility:** Public (anyone can read; only invited collaborators can push)

**Jump to: [Run it](#running-the-app) · [Demo script](#demoing-it) · [Troubleshooting the app](#troubleshooting-the-app)**

---

## Running the app

You need **Node 18+** (20+ recommended). Check with `node -v`.

```bash
git clone https://github.com/TuiKXCode/AWS-Cloud-Hackathon.git
cd AWS-Cloud-Hackathon
npm install
npm run dev
```

Open the URL it prints — <http://localhost:5173>. That is the whole setup; there is
nothing to configure, no `.env`, no AWS credentials.

### All the commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on <http://localhost:5173>, hot reload. **Localhost only.** |
| `npm run dev:lan` | Same, but reachable from your phone on the same Wi-Fi — see below |
| `npm run build` | Type-check and build the production bundle into `dist/` |
| `npm run preview` | Serve the built `dist/` locally — use this to check the real build |
| `npm test` | Run the test suite once (321 tests) |
| `npm run test:watch` | Re-run tests as you edit |

`npm run dev` deliberately binds to localhost only. Vite 5 carries a known advisory
(GHSA-67mh-4wv8-2f99) where any site you visit can talk to your dev server, so exposing it
to the network is opt-in via `dev:lan`.

### Showing it on a phone

```bash
npm run dev:lan
```

Vite prints a **Network** URL like `http://192.168.1.42:5173`. Open that on a phone on the
same Wi-Fi. If it does not load, your firewall is blocking port 5173 — on Windows, allow
Node through on Private networks.

> **Expect geolocation and the camera to be blocked over a LAN address.** Browsers only
> grant those on a secure origin (HTTPS, or localhost). The app is built for this: it falls
> back to a default location and the **Demo location** dropdown drives everything, which is
> how you should demo it anyway. Nothing breaks — you just cannot take a real photo.
>
> To exercise the camera and real GPS, either open it on `localhost` on the machine itself,
> or put the built `dist/` behind any HTTPS host.

---

## Demoing it

The app opens on the **Nearby Exhibit** tab. Everything is driven by the **Demo location**
dropdown at the top — you never need to physically move.

1. **Nearby Exhibit** — pick *Malayan Tiger Enclosure* from the dropdown. The card follows
   the location: conservation status, a fun fact, feeding times. Tap the sound button for
   an audio cue, and **Take Photo** to collect the animal (needs a secure origin, see above).
2. **Facilities** — restrooms, nursing room, water refill, sorted nearest-first with
   distances and a landmark to walk toward.
3. **Food Web** — the trophic diagram. **Select a node first**, then press *Simulate
   Ecosystem Collapse*: the node dims and everything that depends on it shows what its loss
   would mean. Try removing **bamboo groves** to see the Giant Panda react.
4. **Dining** — filter venues by Halal / Vegetarian / Air-Conditioned / Kid-Friendly.
5. **Collection / My Animals** — what you have photographed, and the generated sprites.
6. **Kitchen** — *Ah Meng's Kitchen*, the restaurant game. Animals order food matching their
   real diet. Tap a **＋** counter to send the chef for an ingredient, tap the animal you are
   feeding, then **SERVE**. Points from a finished day feed the same questline bar at the top.

**Progress bar and the prize.** The bar tracks progress toward 140 points — 20 per exhibit
photographed, plus whatever the game earns. Hit 140 and a redemption voucher appears with a
generated code.

**On a phone**, the Kitchen tab opens straight into fullscreen, because the board needs the
whole screen to be playable. *Exit fullscreen* returns to the tabs. On a desktop it stays
inline.

### Resetting between demos

All progress lives under a single `localStorage` key, `mandaiEchoes.playerState`.

- **Restart the restaurant only:** the game's briefing screen has *Start over from Day 1*.
  Photographed animals and their points survive.
- **Wipe everything:** open DevTools console and run
  ```js
  localStorage.removeItem('mandaiEchoes.playerState'); location.reload();
  ```
  A private/incognito window is the quickest way to demo from a clean slate.

---

## Troubleshooting the app

**Blank page after `npm run dev`** — you are probably on Node 16. `node -v` must be 18+.

**`npm install` fails** — delete `node_modules` and `package-lock.json`, then `npm install`
again. If you only want a reproducible install, use `npm ci`.

**The game opens on Day 3 (or any day but 1)** — that is your saved progress; the run
persists on purpose. Use *Start over from Day 1* on the briefing screen.

**"Location permission was not granted"** — expected when you decline the browser prompt or
open the app over a LAN address. Use the **Demo location** dropdown; everything works.

**Take Photo does nothing** — the camera needs a secure origin. Use `localhost` or HTTPS.
The photo flow also falls back to tagging the nearest exhibit if recognition is unsure, so
it never dead-ends during a demo.

**Port 5173 already in use** — something else is running. `npm run dev -- --port 5174`.

---

## Contributor setup (repo access and Kiro)

Everything below is about getting *push* access and setting up the Kiro IDE. If you only
want to run the app, you are done — see [Running the app](#running-the-app).

### 1. Getting access

You can *read and clone* this repo without an invite because it is public. To **push**
you need to be added as a collaborator.

Send your GitHub username to the repo owner (@TuiKXCode). You will get an email
invitation — accept it, or go to
<https://github.com/TuiKXCode/AWS-Cloud-Hackathon/invitations> and click **Accept invitation**.

---

### 2. Install Kiro

Download and install Kiro for your OS from <https://kiro.dev/downloads>, then launch it.

---

### 3. Sign in to Kiro

On first launch Kiro asks you to sign in. Pick any of:

| Option | Use when |
|---|---|
| **GitHub** | Easiest — reuses your existing GitHub account |
| **Google** | You prefer a Google identity |
| **AWS Builder ID** | Free personal AWS identity, no AWS account needed |
| **Organization (IAM Identity Center)** | Your company issued you a start URL + region |

A browser window opens, you approve, and it hands you back to the IDE.

> **Important:** signing in to *Kiro* with GitHub authenticates the **IDE product**.
> It does **not** by itself give `git` permission to push to this repo. Do step 4 as well.

---

### 4. Authenticate GitHub for git operations

Kiro is built on Code OSS, so it has the same built-in Git and GitHub integration as
VS Code. Pick **one** of the three options below.

#### Option A — Built-in GitHub sign-in (recommended, no tokens to manage)

1. Open the **Accounts** icon at the bottom of the left activity bar (the person icon).
2. Choose **Sign in with GitHub** (or click **Sign in** when Kiro prompts you the first
   time you run a Git command).
3. Your browser opens `github.com/login/oauth/authorize`. Click **Authorize**.
4. The browser hands control back to Kiro. The Accounts icon now shows your GitHub username.

Kiro stores the credential in your OS keychain (Windows Credential Manager / macOS
Keychain / libsecret) and reuses it for clone, fetch, pull and push.

#### Option B — GitHub CLI

Works well if you already live in a terminal.

```bash
# install: https://cli.github.com
gh auth login
```

Answer the prompts:

- **What account do you want to log into?** → `GitHub.com`
- **What is your preferred protocol?** → `HTTPS`
- **Authenticate Git with your GitHub credentials?** → `Yes`  ← do not skip this
- **How would you like to authenticate?** → `Login with a web browser`

Copy the one-time code shown, press Enter, paste it in the browser, authorize.

Verify:

```bash
gh auth status
```

#### Option C — Personal Access Token (fallback)

Use this if the browser flow is blocked on your machine.

1. Go to <https://github.com/settings/tokens> → **Generate new token (classic)**.
2. Note: `Kiro — AWS Cloud Hackathon`. Expiration: 90 days.
3. Scopes: tick **`repo`** (and **`workflow`** if you will touch GitHub Actions).
4. **Generate token** and copy it — GitHub shows it only once.
5. The first time you `git push`, enter your **GitHub username** as the username and
   **paste the token as the password**.

Cache it so you only type it once:

```bash
git config --global credential.helper manager     # Windows
git config --global credential.helper osxkeychain # macOS
```

---

### 5. Clone the repository in Kiro

#### From the Kiro UI

1. **File → Open Folder** is *not* what you want — instead open the Source Control view
   (`Ctrl+Shift+G`, or `Cmd+Shift+G` on macOS).
2. Click **Clone Repository**.
3. Paste:
   ```
   https://github.com/TuiKXCode/AWS-Cloud-Hackathon.git
   ```
   (Or click **Clone from GitHub** and pick `TuiKXCode/AWS-Cloud-Hackathon` from the list —
   this appears once you have done step 4 Option A.)
4. Choose a local folder, e.g. `~/projects`.
5. When it finishes, click **Open** in the notification.

The Command Palette route works too: `Ctrl+Shift+P` → **Git: Clone**.

#### From a terminal

```bash
git clone https://github.com/TuiKXCode/AWS-Cloud-Hackathon.git
cd AWS-Cloud-Hackathon
```

Then in Kiro: **File → Open Folder** and select `AWS-Cloud-Hackathon`.

#### Confirm it worked

```bash
git remote -v            # should print the TuiKXCode/AWS-Cloud-Hackathon URL twice
git status               # should print "On branch main ... nothing to commit"
```

---

### 6. Set your git identity

Do this once per machine, or your commits will be attributed to the wrong person:

```bash
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```

Use the email that is on your GitHub account (or your GitHub `noreply` address from
<https://github.com/settings/emails>) so commits link back to your profile.

---

### 7. Day-to-day workflow

Please **do not commit straight to `main`.** Branch, push, open a PR.

```bash
git checkout main
git pull                              # always start from latest
git checkout -b yourname/what-youre-doing

# ... work ...

git add .
git commit -m "Add Lambda handler for image upload"
git push -u origin yourname/what-youre-doing
```

Then open a Pull Request: `gh pr create --fill`, or use the link GitHub prints in the
terminal, or the Source Control view in Kiro.

---

### Troubleshooting git and Kiro

**`remote: Permission to TuiKXCode/AWS-Cloud-Hackathon.git denied`**
You have not accepted the collaborator invite, or git is using the wrong account.
Check with `gh auth status`. On Windows, clear the stale entry: Control Panel →
Credential Manager → Windows Credentials → remove `git:https://github.com`, then push again.

**Kiro's browser sign-in never returns to the IDE**
Close Kiro fully and reopen it, then retry. If your browser blocks the `kiro://`
handoff, use Option B or C above instead.

**`fatal: not a git repository`**
You opened a parent folder. Open the `AWS-Cloud-Hackathon` folder itself.

**Pushed to the wrong GitHub account**
`gh auth switch` toggles between accounts the CLI knows about.

---

## Never commit these

AWS access keys, `.env` files, `*.pem`, or `credentials`. They are covered by
`.gitignore` — keep it that way. Use IAM roles or `aws configure` locally, and GitHub
Actions secrets for CI. This repository is **public**: anything pushed here is visible
to the world and is scraped by bots within minutes.
