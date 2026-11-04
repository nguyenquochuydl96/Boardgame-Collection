---
name: ai-builder-app-export
description: "Export an AI-builder app locally, then keep building it."
version: 1.1.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [ai-studio, lovable, vite, react, migration, verification, screenshot, handoff, layout]
    related_skills: [dogfood, github, plan]
---

# Taking an AI-builder app out and continuing it locally

## When to Use

Load this when the user says any of: "mình build app trên Google AI Studio / Lovable / v0 /
Bolt", "chuyển app về đây build tiếp", "clone repo này về sửa", or sends a GitHub link (or a
ZIP) of an app that was generated in a hosted AI builder and wants it developed further in
this workspace. Also load it when **resuming work on an app that already lives under
`~/projects`** ("tiếp tục build app này", "vào thư mục đó build tiếp") — the resume path is
§6 plus §7. And load it when a Vite/React project here fails to install or needs a
visual/layout smoke check before you report progress.

Apps generated in hosted builders (Google AI Studio Build mode, Lovable, v0, Bolt) are
real Vite/React projects trapped in the builder sandbox. Moving them into a Hermes
workspace is a short, well-defined sequence — but every step has a silent-failure mode
that makes the work look finished when it is not. Run the whole sequence before
telling the user it works.

## 1. Get the code out

**Route A — GitHub two-way sync (preferred; gives a stable home and future pull path).**

AI Studio Build: **Settings (gear, top-right) → GitHub tab → Sign in → fill repo name →
Create GitHub repository → then click `Stage and commit all changes`**.

> **Pitfall — linking is not pushing.** Creating/linking the repo writes only the
> default AI Studio README as "Initial commit". If the clone contains just `README.md`
> and no `package.json`, the commit step never ran. Tell the user to reopen the same app,
> Settings → GitHub → **Stage and commit all changes**, and afterwards just `git pull`
> in the clone you already have — do not ask for a new link, do not re-clone.

Lovable/v0/Bolt: export to GitHub from the project menu, then same pull path.

**Route B — ZIP.** Download → *Download as ZIP* → user sends the file into chat → unzip.

Clone once into a stable path and reuse it:

```bash
mkdir -p ~/projects && cd ~/projects
git clone <repo-url>          # then `git pull` for every later batch of changes
```

## 2. Install

Vite/React exports from AI Studio commonly fail `npm install` with an `ERESOLVE`
peer conflict: the export pins `esbuild ^0.25` while Vite 8 requires `^0.27+`.
AI Studio's own runtime uses bun, which tolerates this, so the export ships broken for npm.

```bash
npm install --no-audit --no-fund --legacy-peer-deps
```

Bumping `esbuild` to the version Vite wants is the cleaner fix if the user will keep the
repo; `--legacy-peer-deps` is the fast path for a first look.

## 3. Audit what the app actually is before claiming anything

Never report capabilities from `metadata.json` alone. AI Studio writes capability flags
(such as a server-side Gemini flag) that the generated source may never use:

```bash
grep -rn "@google/genai\|GEMINI_API_KEY\|process.env" src/ index.html vite.config.ts
cat metadata.json; cat .env.example
```

If nothing imports the AI SDK, say plainly that no API key is needed and no per-call
cost applies — do not tell the user to set `GEMINI_API_KEY` "just in case".
When the SDK *is* used, the key must live in `.env` on the server side; the built app
reads `GEMINI_API_KEY` from its environment.

## 4. Verify — typecheck, build, serve, then look at it

```bash
npx tsc --noEmit          # typecheck (script is usually "lint")
npm run build             # real production build
```

Start the dev server with a **tracked** background process — Hermes rejects
`nohup`/`setsid`/`disown` wrappers in foreground commands:

```
terminal(command="cd ~/projects/<app> && npm run dev", background=true)
terminal(command="sleep 6; curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3000/")
```

**Screenshot a localhost app without the browser tool.** `browser_exec` refuses
loopback/private addresses, so capture with the Playwright-bundled Chromium instead.
Use the PNG as the image you send the user — not as your evidence for layout claims
(see §7):

```bash
CHROME=$(find ~/.cache/ms-playwright -path "*chrome-linux/chrome" -type f | head -1)
"$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=1440,1000 --virtual-time-budget=6000 \
  --screenshot=/tmp/app.png http://127.0.0.1:3000/
```

Ignore the Vulkan/dbus lines on stderr; the screenshot path is what matters.

**Check whether the user can actually open it.** If they expect a URL on their own
machine, test the public path and say so honestly:

```bash
curl -s --max-time 8 https://api.ipify.org
curl -s -o /dev/null -m 8 -w 'public -> HTTP %{http_code}\n' http://<public-ip>:<port>
```

`HTTP 000` means the port is firewalled. Do not hand over a dead URL — offer
screenshots after each change, or set up a tunnel/temporary public serve.

## 5. Report and hand over the loop

- Send the screenshot so the user sees the same pixels you judged: `MEDIA:/tmp/app.png`.
- Report **what real output proved**: typecheck result, build line, HTTP code, module count.
  Never "should work" — say it built and rendered, or say where it stopped.
- Name the defects you spotted while looking (overflow past the viewport, ellipsis
  truncation, washed-out text) even though the user did not ask — it is free value and
  it is what makes the screenshot worth sending.
- Offer one recommended next step, not a menu of five.

## 6. Resume from the repo's own notes

A repo that was handed off before usually carries notes at the root — `HANDOFF.md`,
`.hermes.md`, `AGENTS.md`, `CLAUDE.md`. Read them **before** touching code: they hold
the install quirk, the agreed architecture, the open defects and the decisions already
settled. Re-deriving that from the source costs a session and re-litigates choices the
user already made.

Update that same file at the end of every work block: verified state (with the numbers
that proved it), what is still open, and which decisions are locked. A future session
that reads it should be able to continue without asking.

## 7. Verify layout by MEASUREMENT, not by eye

A vision model reading a screenshot is a **hypothesis generator, not evidence**. On a
1440px dark-theme UI it misreads small Vietnamese text, invents labels that are not in
the DOM, and reports bugs that do not exist — confidently, and with plausible detail.
Worse, it cannot tell you *how far* an element overflows or *which* elements disagree.
So: measure the live DOM over CDP, then use the screenshot only as the human-facing
picture.

```bash
CHROME=$(find ~/.cache/ms-playwright -path "*chrome-linux/chrome" -type f | head -1)
# probe: prints JSON from a JS expression, optional --click / --shot / --width
python3 ~/.hermes/skills/software-development/ai-builder-app-export/scripts/cdp_probe.py \
  'http://127.0.0.1:3000/' \
  'return JSON.stringify({vw:innerWidth, sw:document.documentElement.scrollWidth});' \
  --width 1440 --height 1000 --wait 4 --shot /tmp/app.png
```

The probes that actually settle layout arguments:

| Question | Probe |
|---|---|
| Does anything overflow horizontally? | `document.documentElement.scrollWidth` vs `innerWidth`; also map `getBoundingClientRect().right > innerWidth` over `body *` |
| Is text being clipped with `...`? | map `el.scrollWidth > el.clientWidth + 1` over the text nodes you care about (0 results = no truncation) |
| Are cards/rows the same height and aligned? | map `getBoundingClientRect()` to `{x,y,w,h}` and compare — identical `w`/`h` and repeated `y` = a real grid |
| Does it fit inside its container? | compare the child row's `x..right` against the parent plank/frame rect |
| Is another view/state broken? | `--click "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Tab')).click()"` then re-measure |

Run the overflow probe at **several widths** (1440 / 1280 / 1024 / 900 / 768) — flex rows that
fit at the design width routinely overflow one breakpoint below it, and a single-width
check certifies the bug as fixed.

`references/css-layout-bug-patterns.md` lists the CSS causes behind the usual reports
(truncation, overflow, misaligned shelves) so you can go straight to the guilty class.

## 8. Data Source & Spreadsheet Sync Integration

When building or syncing apps that consume external data sources (such as Google Sheets CSV exports):
- **Flexible Column Mapping**: Build resilient column identification that inspects header labels case-insensitively and handles alternative names (e.g. mapping both `Authenticity` and `Cabinet` columns to internal categories like Real vs Fake).
- **Non-destructive Parsing**: Never assume fixed column indices; always scan header rows and map columns dynamically so user-created sheets retain their custom structure without data loss.
- **Language Consistency**: Ensure default templates, CSV export samples, and UI text strictly adhere to the user's preferred language (English-only across UI elements and sample fixtures).
- **Client-Side OAuth Token Auto-Refresh (401 Handling)**: Wrap Google API calls (Sheets/Drive) to catch `401 Unauthorized` responses. On expiry, automatically trigger re-auth (`googleSignIn`) to refresh the token and retry the operation once without losing local user state.
- **Optimistic Updates for External Sync**: When pushing records to external APIs, update the local UI state immediately (`syncing: true`), perform the background sync asynchronously, and provide clear 3-state sync indicators (`syncing`, `synced`, `pending`) so the app feels instantaneous and responsive.

## 9. Handing the app back to the builder (round-trip)

The user will ask some version of: *"if I keep building in AI Studio, will it have your
changes?"* The honest answer is **no, not by itself** — and saying otherwise wastes their
evening.

**Why:** an AI Studio Build app's state lives in Google's cloud. Two-way GitHub sync is
supported, but the pull direction is *manual*. Commits pushed from outside are invisible
to the app until the user explicitly re-imports; reopening it shows the stale cloud copy.

**The pull path that works (official flow):**

1. Build page → click **`+`** at the lower-left of the prompt box → **Import from GitHub**.
2. Pick the repo from the account list, or paste its URL → **Import repository**.
3. AI Studio detects the framework, imports the code, and builds the app.
4. A banner appears with **Sync to GitHub** → in the GitHub settings dialog choose
   **Force push to `<repo>`**.

> **Pitfall — step 4 is a force push, and it is required.** AI Studio rewrites some files
to make the project compatible/buildable in its own environment, so it cannot fast-forward.
Consequence: **GitHub now carries AI Studio's version.** The moment this happens the
builder becomes the source of truth, and a local clone that keeps editing without syncing
will produce a divergence that reads like "my work vanished".

**Ongoing sync afterwards:** ⚙️ (top settings toolbar) → **GitHub** tab → **Push Changes** /
**Pull Changes**. It reports one of four states: In Sync / AI Studio Changes Ready / Remote
Changes Ready / Both Changed (diff view for conflicts).

**No-token fallback:** Code tab → upload a **ZIP** of the workspace; it replaces only the
files that changed. Cheap way to hand over a batch of local edits without touching git.

Before telling the user to import, and before any force push happens:

- **Push the local commits to GitHub first and write down the SHA.** After the force push
the only route back to your work is `git reset --hard <sha>` — say it in the handover.
- If the local machine cannot push (no credential installed), fix that first; a repo that
  is `ahead N` with an unauthenticated remote means the builder will never see the work.
  See the `github-auth` skill for the fine-grained-token scope trap.
- A build failure right after import is an import artifact, not your code — the pushed SHA
  is the fallback. Say that out loud so the user does not conclude the app is broken.

## Standing rules

- **A visual finding is not done until it is measured.** "Fixed" means the probe returns
the new numbers, quoted in the report; a screenshot that is better is not proof.
- **The workspace is the source of truth only while the builder is not syncing back.**
  Edit files here and keep the AI builder read-only — but when the user *does* import into
  the builder and force pushes, the builder takes over: re-sync with
  `git fetch && git reset --hard origin/main` before touching a file again (§8).
- **Verify before declaring.** Import "complete" means: install exit 0, typecheck clean,
  build succeeded, dev server returned 200, and a screenshot was captured for the user.
  A *layout fix* is complete only when a CDP probe returns the corrected numbers (§7).
- Keep the clone at a stable path (`~/projects/<repo>`) so later sessions resume with
  `git pull` instead of a fresh clone.
