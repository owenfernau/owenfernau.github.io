const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC_DIR = path.join(ROOT, 'map', 'notes-src');
const OUT_DIR = path.join(ROOT, 'map', 'notes');
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'map', 'notes-template.html'), 'utf8');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: match[2] };
}

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
}

function renderInline(text, titleMap) {
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => `<img src="${src}" alt="${alt}">`);
  text = text.replace(/\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g, (_, slug, section, label) => {
    slug = slug.trim();
    const href = section ? `${slug}.html#${slugify(section)}` : `${slug}.html`;
    const display = label ? label.trim() : (titleMap[slug] || slug);
    return `<a href="${href}">${display}</a>`;
  });
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  return text;
}

function renderBlock(block, titleMap) {
  const trimmed = block.trim();

  if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) return '<hr>';

  const lines = trimmed.split('\n');

  const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
  if (heading && lines.length === 1) {
    const level = heading[1].length + 1;
    const text = heading[2].trim();
    const id = slugify(text);
    return `<h${level} id="${id}">${renderInline(text, titleMap)}</h${level}>`;
  }

  if (lines.every(l => /^[-*]\s+/.test(l.trim()))) {
    const items = lines.map(l => `<li>${renderInline(l.trim().replace(/^[-*]\s+/, ''), titleMap)}</li>`).join('\n');
    return `<ul>\n${items}\n</ul>`;
  }

  if (lines.every(l => /^\d+\.\s+/.test(l.trim()))) {
    const items = lines.map(l => `<li>${renderInline(l.trim().replace(/^\d+\.\s+/, ''), titleMap)}</li>`).join('\n');
    return `<ol>\n${items}\n</ol>`;
  }

  if (lines.every(l => l.trim().startsWith('>'))) {
    const text = lines.map(l => l.trim().replace(/^>\s?/, '')).join(' ');
    return `<blockquote>${renderInline(text, titleMap)}</blockquote>`;
  }

  const text = lines.join(' ').trim();
  return `<p>${renderInline(text, titleMap)}</p>`;
}

function extractLinks(body, titleMap) {
  const links = new Set();
  const re = /\[\[([^\]|#]+)/g;
  let m;
  while ((m = re.exec(body))) {
    const slug = m[1].trim();
    if (titleMap[slug]) links.add(slug);
  }
  return [...links];
}

function markdownToHtml(body, titleMap) {
  return body.split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean)
    .map(b => renderBlock(b, titleMap))
    .join('\n\n');
}

function main() {
  const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.md'));

  const titleMap = {};
  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const { meta } = parseFrontmatter(fs.readFileSync(path.join(SRC_DIR, file), 'utf8'));
    titleMap[slug] = meta.title || slug;
  }

  const manifest = {};
  const backlinks = {};
  for (const slug of Object.keys(titleMap)) backlinks[slug] = new Set();

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const { meta, body } = parseFrontmatter(fs.readFileSync(path.join(SRC_DIR, file), 'utf8'));
    const title = meta.title || slug;
    const html = markdownToHtml(body, titleMap);
    const page = TEMPLATE.replace(/\{\{TITLE\}\}/g, title).replace('{{CONTENT}}', html);
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.html`), page);

    const links = extractLinks(body, titleMap);
    for (const link of links) backlinks[link].add(slug);
    manifest[slug] = { title, links };
  }

  for (const slug of Object.keys(manifest)) {
    manifest[slug].backlinks = [...backlinks[slug]];
  }

  const now = new Date();
  const generatedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  manifest._meta = { generatedAt };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`Built ${files.length} map note(s).`);
}

main();
