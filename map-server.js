// Local-only dev server for editing /map notes in the browser.
// Serves the site exactly like GitHub Pages, plus a save endpoint that
// writes to map/notes-src/*.md and rebuilds. Never deployed.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const SRC_DIR = path.join(ROOT, 'map', 'notes-src');
const PORT = 8080;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};

function isSafeSlug(slug) {
  return typeof slug === 'string' && /^[a-z0-9-]+$/.test(slug);
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/save-note') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { slug, content } = JSON.parse(body);
        if (!isSafeSlug(slug) || typeof content !== 'string') {
          res.writeHead(400).end('bad request');
          return;
        }
        const filePath = path.join(SRC_DIR, `${slug}.md`);
        if (!fs.existsSync(filePath)) {
          res.writeHead(404).end('unknown note');
          return;
        }
        fs.writeFileSync(filePath, content);
        execFileSync('node', ['build-map-notes.js'], { cwd: ROOT, stdio: 'inherit' });
        res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
      } catch (err) {
        res.writeHead(500).end(String(err));
      }
    });
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405).end('method not allowed');
    return;
  }

  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/map.html';
  const filePath = path.normalize(path.join(ROOT, reqPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404).end('not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Map dev server running at http://localhost:${PORT}/map.html`);
});
