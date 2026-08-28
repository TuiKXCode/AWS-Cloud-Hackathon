# How we work together

Four people, one repo, not much time. The rules below exist for one reason: so we
never lose an hour to a merge conflict or a broken `main`.

---

## 1. The one principle

**Split by file ownership, not by task.**

The single biggest time sink in a team hackathon is four people editing the same
files. So we carve the repo into lanes, give each lane one owner, and stay out of
each other's directories. Tasks can overlap; *files* must not.

---

## 2. The four lanes

| Lane | Owns | Responsible for |
|---|---|---|
| **Infra** | `infra/` | CDK/SAM/Terraform, IAM roles, deploy pipeline, the demo environment |
| **Backend** | `backend/` | Lambda handlers, API Gateway, business logic |
| **Data / AI** | `data/` | DynamoDB & S3 schema, Bedrock or ML integration, seed data |
| **Frontend / Demo** | `frontend/` | UI, and — do not skip this — the demo script and slides |

Adjust the names to whatever we're actually building, but **keep one owner per
directory.** Write the owners here on day one:

```
Infra           → @
Backend         → @
Data / AI       → @
Frontend / Demo → @
```

Need to change a file outside your lane? Ping the owner in chat, or pair on it.
Don't silently edit it.

---

## 3. Agree the contracts in hour one

Before anyone writes real code, the four of us sit down for 30 minutes and write
down the **interfaces between the lanes**:

- API endpoints — path, method, request shape, response shape
- Database table names, partition/sort keys, item shape
- Environment variable names
- The AWS region (pick one, write it down)

Commit that to `docs/contracts.md`. It doesn't have to be right — it has to be
**agreed**, so all four lanes can build in parallel against it instead of waiting
on each other.

**Then mock everything across a boundary.** If the API isn't ready, the frontend
codes against a hardcoded JSON fixture. Nobody sits idle waiting for someone else's
endpoint.

---

## 4. Branching and PRs

`main` must always run. It is what we demo from.

```bash
git checkout main
git pull                              # ALWAYS start here
git checkout -b yourname/short-thing

# ...work...

git add .
git commit -m "Add presigned S3 upload URL endpoint"
git push -u origin yourname/short-thing
gh pr create --fill
```

Rules:

- **Branch names:** `yourname/what-it-does` — e.g. `kaixiang/bedrock-summariser`
- **Branch lifetime: hours, not days.** A branch older than half a day is a merge
  conflict waiting to happen. Ship small.
- **Never push directly to `main`.** It's protected; the push will be rejected.
- **Squash-merge** your PR. Keeps history readable.
- **Delete the branch** after merge.
- **Push at least every 90 minutes.** Work sitting on a laptop is work nobody else
  can see, build on, or recover if your machine dies.

### Do we need review approvals?

No — `main` requires a PR, but **not an approval**, so you're never blocked waiting
for a sleeping teammate. Self-merge once it works. But:

> If your PR touches someone else's lane, tag them and wait for a thumbs up.

---

## 5. When things conflict

```bash
git pull --rebase origin main     # replay your work on top of latest main
# fix the conflicted files, then:
git add .
git rebase --continue
git push --force-with-lease       # your own branch only, never main
```

- **Lock files** (`package-lock.json`, `poetry.lock`): don't hand-merge them. Take
  `main`'s version, re-run `npm install` / `poetry lock`, commit the result.
- **Stuck for more than 10 minutes?** Stop. Copy your changed files somewhere safe,
  branch fresh off `main`, paste them back. A hackathon is not the place for git
  archaeology.

---

## 6. AWS-specific traps

- **Never commit credentials.** No access keys, no `.env`, no `*.pem`. They're in
  `.gitignore` — keep them there. This repo is public and bots scrape it within
  minutes. If you leak a key, [rotate it immediately](https://console.aws.amazon.com/iam)
  and tell the team.
- **Never commit state.** `*.tfstate`, `cdk.out/`, `.aws-sam/` are gitignored. Terraform
  state in git will corrupt and it will cost us hours.
- **Name your dev resources uniquely.** Four people deploying `hackathon-api` to one
  account will clobber each other. Prefix with your name:
  `${USER}-hackathon-api`. Keep one clean shared stack for the demo.
- **One region.** Agree it in `docs/contracts.md`. Half the team in `us-east-1` and
  half in `ap-southeast-1` is a debugging nightmare.
- **Config via `.env.example`.** Commit the example with dummy values; everyone
  copies it to their own `.env`, which stays local.

---

## 7. Commit messages

Present tense, says what changed:

```
Add presigned S3 upload URL endpoint
Fix Lambda timeout on large image uploads
```

Not `update`, `fix stuff`, `asdf`.

---

## 8. Rhythm

- **Kickoff:** lanes assigned, contracts written, everyone pushed one commit
- **Every ~3 hours:** 5-minute standup — what you did, what's next, what's blocking
- **Halfway:** hard checkpoint. Cut scope now, not at the end. An impressive demo of
  three features beats a broken demo of six.
- **Last 2 hours:** feature freeze. Only bugfixes, the demo script, and the deck.

---

## 9. Before you start — checklist

- [ ] Accepted the collaborator invite
- [ ] Kiro installed, GitHub authenticated (see [README](README.md) steps 2–4)
- [ ] Repo cloned, `git remote -v` looks right
- [ ] `git config user.name` / `user.email` set
- [ ] Your lane assigned and written in section 2
- [ ] AWS access working — `aws sts get-caller-identity` returns something
- [ ] Pushed one throwaway commit through a PR, so you've done the loop once
