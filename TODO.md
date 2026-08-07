# Site TODO

- [ ] Add "Graph" (AI community-matching project) to the Projects section of index.html — needs a decision on what to link (live demo variant, repo, or text-only blurb)
- [ ] Comments/chat on the mind map notes — let people easily leave a note on what's written. Options considered: giscus (free, GitHub-account login), Disqus (broader login, ad-supported), custom no-login form (frictionless but needs a real backend)
- [x] Mind map (/map treemap) needs a different visualization for mobile — done: accordion list below 600px width
- [ ] Add more articles to the Work section (The Defiant "select articles" list in index.html)
- [ ] Auto-title on add-link (map-server.js fetchPageTitle) falls back to junk on bot-blocked sites (e.g. WSJ returns a JS-challenge page titled just "wsj.com") — needs a better fallback, e.g. deriving a readable title from the URL slug when the fetched title looks bogus or the response isn't a real 200

## Usability audit (Aug 7 2026, quick pass — not exhaustive)

- [ ] notes.html appears to be an orphaned/dead page — not linked from index.html anymore (index links to publicnotes.html instead), and it duplicates the same two essays already listed under index.html's Projects section. Probably safe to delete, but confirm nothing else links to it first.
- [ ] index.html's single long `.bio-list` mixes Work, Projects, Context, and a ~30-item book list into one flat expandable list — no section-level navigation (e.g. no jump-to-Projects link), so the page reads as one long scroll. Worth considering whether Context/book-list belongs on a separate page.
- [ ] No `<meta name="description">` or Open Graph tags (og:title/og:description/og:image) on any page — links shared to Slack/Twitter/iMessage will preview poorly (just a bare URL or generic title).
- [ ] Page `<title>` tags are inconsistent/generic — index.html and notes.html are both just "Owen"; publicnotes.html is "Map". Individual note pages do this well already (e.g. "Finance — AI Map"), worth matching that pattern site-wide.
- [ ] publicnotes.html's desktop treemap has no legend/instructions on first load — unclear to a first-time visitor that boxes are clickable/expandable without hovering or guessing.
