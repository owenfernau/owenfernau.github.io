const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.css':  'text/css',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.mp4':  'video/mp4',
};

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

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
