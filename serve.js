const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PORT = 3001;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.css':  'text/css',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
};

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        fs.writeFileSync(path.join(ROOT, 'nodes.json'), JSON.stringify(data, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/save-note') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { slug, content } = JSON.parse(body);
        if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('invalid slug');

        const srcPath = path.join(ROOT, 'map', 'notes-src', `${slug}.md`);
        const raw = fs.readFileSync(srcPath, 'utf8');
        const match = raw.match(/^---\r?\n([\s\S]*?\r?\n)---\r?\n/);
        const frontmatter = match ? match[0] : '---\ntitle: ' + slug + '\n---\n';
        fs.writeFileSync(srcPath, frontmatter + '\n' + content.trim() + '\n');

        execFileSync('node', ['build-map-notes.js'], { cwd: ROOT });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  const pathname = req.url.split('?')[0];
  const filePath = path.join(ROOT, pathname === '/' ? 'map.html' : pathname);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log(`\n  map editor → http://localhost:${PORT}\n`);
});
