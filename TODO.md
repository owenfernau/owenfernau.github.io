# Site TODO

- [ ] Add "Graph" (AI community-matching project) to the Projects section of index.html — needs a decision on what to link (live demo variant, repo, or text-only blurb)
- [ ] Comments/chat on the mind map notes — let people easily leave a note on what's written. Options considered: giscus (free, GitHub-account login), Disqus (broader login, ad-supported), custom no-login form (frictionless but needs a real backend)
- [x] Mind map (/map treemap) needs a different visualization for mobile — done: accordion list below 600px width
- [ ] Add more articles to the Work section (The Defiant "select articles" list in index.html)
- [ ] Auto-title on add-link (map-server.js fetchPageTitle) falls back to junk on bot-blocked sites (e.g. WSJ returns a JS-challenge page titled just "wsj.com") — needs a better fallback, e.g. deriving a readable title from the URL slug when the fetched title looks bogus or the response isn't a real 200
