// Local-only dev server for editing /map notes in the browser.
// Serves the site exactly like GitHub Pages, plus a save endpoint that
// writes to map/notes-src/*.md and rebuilds. Never deployed.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { addLink, reorderLinks, removeLink } = require('./add-map-node');

// best-effort <title> fetch for links added without one; falls back to the
// bare URL if the page can't be reached or has no title tag.
function fetchPageTitle(url) {
  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    let req;
    try {
      req = (url.startsWith('https:') ? https : http).get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000,
      }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          fetchPageTitle(new URL(res.headers.location, url).href).then(finish);
          return;
        }
        let html = '';
        res.on('data', chunk => {
          html += chunk;
          const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          if (m) {
            finish(m[1].replace(/\s+/g, ' ').trim());
            req.destroy();
          } else if (html.length > 100000) {
            finish(url);
            req.destroy();
          }
        });
        res.on('end', () => finish(url));
      });
      req.on('error', () => finish(url));
      req.on('timeout', () => { req.destroy(); finish(url); });
    } catch {
      finish(url);
    }
  });
}

const ROOT = __dirname;
const SRC_DIR = path.join(ROOT, 'publicnotes', 'notes-src');
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

  if (req.method === 'POST' && req.url === '/api/add-link') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        let { title, url } = JSON.parse(body);
        if (!url || typeof url !== 'string') {
          res.writeHead(400).end('bad request');
          return;
        }
        if (!title || typeof title !== 'string') {
          title = await fetchPageTitle(url.trim());
        }
        const id = addLink(title, url);
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true, id }));
      } catch (err) {
        res.writeHead(500).end(String(err));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/reorder-links') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { order } = JSON.parse(body);
        if (!Array.isArray(order)) {
          res.writeHead(400).end('bad request');
          return;
        }
        reorderLinks(order);
        res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
      } catch (err) {
        res.writeHead(500).end(String(err));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/delete-link') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { id } = JSON.parse(body);
        if (!id || typeof id !== 'string') {
          res.writeHead(400).end('bad request');
          return;
        }
        removeLink(id);
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
  if (reqPath === '/') reqPath = '/publicnotes.html';
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
  console.log(`Map dev server running at http://localhost:${PORT}/publicnotes.html`);
});
