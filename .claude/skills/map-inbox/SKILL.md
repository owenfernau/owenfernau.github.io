---
name: map-inbox
description: Process raw material dropped in map/inbox/ into the /map digital garden — drafts notes, proposes placement, and asks for approval before touching the live tree. Use when the user says "process the inbox", "check the inbox", or similar for the map project.
---

# Map inbox pipeline

Owen drops anything into `map/inbox/` with zero formatting effort — a screenshot, pasted article text, a URL, a raw typed thought, a PDF. This skill turns that into drafted, properly-placed content in the `/map` digital garden, with Owen approving placement before anything goes live.

Background on the project: [[project_idea_map]] and [[project_map_visualization_direction]] in memory (read them if available — they explain why this pipeline exists and the current map.html architecture).

## Step 1 — find the work

List files in `map/inbox/` (ignore `map/inbox/processed/`). If empty, say so and stop.

## Step 2 — read each item

- Text/markdown files: read directly.
- Screenshots/images: view them (vision) and extract the relevant content/claim.
- A file containing just a URL: fetch it.
- PDFs: read them.

## Step 3 — triage each item into exactly one outcome

Look at the existing tree in `map.html` (the `data-slug` values) and the existing notes in `map/notes-src/*.md` before deciding. Pick whichever of these three is the best fit — don't default to "new node":

1. **New node** — this is a genuinely new concept that doesn't fit inside an existing note's argument. Needs its own slug, its own `notes-src/<slug>.md`, and a tree placement under a sensible existing parent slug.
2. **Append to an existing note** — this is elaboration, a supporting fact, or a specific instance of something that already exists as a node. Becomes one more short paragraph in that note's `.md` body, no new tree entry.
3. **Just a link** — a citation/reference with no argument of its own. Either inline inside a relevant existing note's body (as `[text](url)`), or in the flat `Links` sidebar section if it's not tied to any one note.

For (1) or (2), also propose `[[slug]]` wikilinks to existing notes where there's a real connection (not decorative — only if the connection is actually true).

## Step 4 — draft, but do not attach yet

- New node: write `map/notes-src/<slug>.md` with `---\ntitle: <Label>\n---\n\n<body>` frontmatter. Match the existing terse, fragment style (look at `ai-capability.md` or `finance.md` for tone — short standalone observations, not essay prose). Do NOT call `add-map-node.js` yet — an unattached note file is the draft state.
- Append: don't edit the existing `.md` file yet — hold the draft paragraph to show Owen first.
- Link-only: hold the proposed link and its target location.

## Step 5 — present for approval

One line per item: what it is, which outcome you picked and why, proposed parent/target slug, proposed wikilinks. Wait for Owen to approve or redirect before writing anything that touches `map.html` or existing note files.

## Step 6 — on approval, execute

- New node: call `attachExistingNote(parentSlug, slug, label)` from `add-map-node.js` (it expects the note file to already exist — it will NOT overwrite it, unlike `addNode()` which is for the live "+ add sub-note" UI button). Then run `node build-map-notes.js`.
- Append: append the paragraph to the target note's `.md` body (and add the proposed `[[wikilink]]`s inline if relevant), then run `node build-map-notes.js`.
- Link-only inline: edit the target note's `.md` body to include the link.
- Link-only sidebar: call `addLink(title, url)` from `add-map-node.js`.

## Step 7 — clean up

Move the processed inbox file into `map/inbox/processed/`. Confirm what changed with a short summary.

## Notes

- Never invent a parent slug — it must already exist as a `data-slug` in `map.html`, or have just been created by this same run.
- `attachExistingNote` throws if the note file doesn't exist yet — always draft the file first (step 4) before attaching (step 6).
- This pipeline does not commit or push — that's a separate, explicit step per [[feedback_no_git_push]].
