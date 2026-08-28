# AWS Cloud Hackathon

Shared workspace for our AWS Cloud Hackathon project.

- **Repository:** https://github.com/TuiKXCode/AWS-Cloud-Hackathon
- **Visibility:** Public (anyone can read; only invited collaborators can push)

---

## 1. Getting access

You can *read and clone* this repo without an invite because it is public. To **push**
you need to be added as a collaborator.

Send your GitHub username to the repo owner (@TuiKXCode). You will get an email
invitation — accept it, or go to
<https://github.com/TuiKXCode/AWS-Cloud-Hackathon/invitations> and click **Accept invitation**.

---

## 2. Install Kiro

Download and install Kiro for your OS from <https://kiro.dev/downloads>, then launch it.

---

## 3. Sign in to Kiro

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

## 4. Authenticate GitHub for git operations

Kiro is built on Code OSS, so it has the same built-in Git and GitHub integration as
VS Code. Pick **one** of the three options below.

### Option A — Built-in GitHub sign-in (recommended, no tokens to manage)

1. Open the **Accounts** icon at the bottom of the left activity bar (the person icon).
2. Choose **Sign in with GitHub** (or click **Sign in** when Kiro prompts you the first
   time you run a Git command).
3. Your browser opens `github.com/login/oauth/authorize`. Click **Authorize**.
4. The browser hands control back to Kiro. The Accounts icon now shows your GitHub username.

Kiro stores the credential in your OS keychain (Windows Credential Manager / macOS
Keychain / libsecret) and reuses it for clone, fetch, pull and push.

### Option B — GitHub CLI

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

### Option C — Personal Access Token (fallback)

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

## 5. Clone the repository in Kiro

### From the Kiro UI

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

### From a terminal

```bash
git clone https://github.com/TuiKXCode/AWS-Cloud-Hackathon.git
cd AWS-Cloud-Hackathon
```

Then in Kiro: **File → Open Folder** and select `AWS-Cloud-Hackathon`.

### Confirm it worked

```bash
git remote -v            # should print the TuiKXCode/AWS-Cloud-Hackathon URL twice
git status               # should print "On branch main ... nothing to commit"
```

---

## 6. Set your git identity

Do this once per machine, or your commits will be attributed to the wrong person:

```bash
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```

Use the email that is on your GitHub account (or your GitHub `noreply` address from
<https://github.com/settings/emails>) so commits link back to your profile.

---

## 7. Day-to-day workflow

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

## Troubleshooting

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
