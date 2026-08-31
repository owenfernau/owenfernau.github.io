const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const MAP_HTML = path.join(ROOT, 'publicnotes.html');
const SRC_DIR = path.join(ROOT, 'publicnotes', 'notes-src');
const TREE_PATH = path.join(ROOT, 'publicnotes', 'tree.json');

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// finds the index of the closing tag (e.g. </li> or </ul>) matching the
// opening tag that starts at `openIdx`.
function findMatchingClose(html, openIdx, tagName) {
  const tagRe = new RegExp(`<${tagName}(?:[\\s>]|$)|</${tagName}>`, 'g');
  tagRe.lastIndex = openIdx;
  let depth = 0;
  let m;
  while ((m = tagRe.exec(html))) {
    if (m[0].startsWith('</')) {
      depth--;
      if (depth === 0) return m.index;
    } else {
      depth++;
    }
  }
  throw new Error(`no matching close found for <${tagName}> at ${openIdx}`);
}

function uniqueSlug(label) {
  const slug = slugify(label);
  if (!slug) throw new Error('label must contain letters or numbers');
  let unique = slug, n = 2;
  while (fs.existsSync(path.join(SRC_DIR, `${unique}.md`))) {
    unique = `${slug}-${n++}`;
  }
  return unique;
}

function writeStub(slug, label) {
  fs.writeFileSync(
    path.join(SRC_DIR, `${slug}.md`),
    `---\ntitle: ${label}\n---\n\n*Notes coming soon.*\n`
  );
}

// ---- topic tree (publicnotes/tree.json) ----
// The hierarchy shown on publicnotes.html lives here as JSON; the page builds
// its hidden #tree-data list from this file at load. Everything below edits
// the JSON, never the markup.

function readTree() {
  return JSON.parse(fs.readFileSync(TREE_PATH, 'utf8'));
}

function writeTree(tree) {
  fs.writeFileSync(TREE_PATH, JSON.stringify(tree, null, 2) + '\n');
}

// finds `slug` anywhere in the tree, returning the node plus the array it
// sits in, so callers can splice it out or insert beside it.
function locate(tree, slug) {
  function walk(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].slug === slug) return { node: nodes[i], siblings: nodes, index: i };
      if (nodes[i].children) {
        const found = walk(nodes[i].children);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(tree);
}

// the child array a new node should join. A null/empty parentSlug means the
// top level.
function childList(tree, parentSlug) {
  if (!parentSlug) return tree;
  const found = locate(tree, parentSlug);
  if (!found) throw new Error(`parent slug not found: ${parentSlug}`);
  if (!found.node.children) found.node.children = [];
  return found.node.children;
}

function containsSlug(node, slug) {
  return (node.children || []).some(child => child.slug === slug || containsSlug(child, slug));
}

// drops `children: []` left behind by a move or delete, so the file stays
// close to what a person would have typed.
function pruneEmpty(nodes) {
  for (const node of nodes) {
    if (!node.children) continue;
    pruneEmpty(node.children);
    if (!node.children.length) delete node.children;
  }
}

function subtreeSlugs(node) {
  const slugs = [node.slug];
  (node.children || []).forEach(child => { slugs.push(...subtreeSlugs(child)); });
  return slugs;
}

// adds `slug` to the tree under `parentSlug`, without touching the note file.
// Used both by addNode (which also writes a fresh stub) and by
// attachExistingNote (which expects the note file to already exist).
function insertNode(parentSlug, slug, label) {
  const tree = readTree();
  if (locate(tree, slug)) throw new Error(`slug already in the tree: ${slug}`);
  childList(tree, parentSlug).push({ slug, label });
  writeTree(tree);
}

// renames a topic in place. The slug never changes, so every [[wikilink]]
// and note URL pointing at it keeps working; only the display label and the
// note's frontmatter title move.
function renameNode(slug, label) {
  label = label.trim();
  if (!label) throw new Error('label required');

  const tree = readTree();
  const found = locate(tree, slug);
  if (!found) throw new Error(`slug not found in the tree: ${slug}`);
  found.node.label = label;
  writeTree(tree);

  const notePath = path.join(SRC_DIR, `${slug}.md`);
  if (fs.existsSync(notePath)) {
    const raw = fs.readFileSync(notePath, 'utf8');
    const fm = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
    if (fm && /^title:\s*.*$/m.test(fm[0])) {
      const updated = fm[0].replace(/^title:\s*.*$/m, `title: ${label}`);
      fs.writeFileSync(notePath, updated + raw.slice(fm[0].length));
    }
  }
}

// moves a topic (with its children) under `parentSlug`, landing directly
// above `beforeSlug` or at the end when that's null.
function moveNode(slug, parentSlug, beforeSlug) {
  const tree = readTree();
  const found = locate(tree, slug);
  if (!found) throw new Error(`slug not found in the tree: ${slug}`);
  if (parentSlug === slug || (parentSlug && containsSlug(found.node, parentSlug))) {
    throw new Error('a topic cannot be moved under itself');
  }

  found.siblings.splice(found.index, 1);
  const siblings = childList(tree, parentSlug);
  const at = beforeSlug ? siblings.findIndex(n => n.slug === beforeSlug) : -1;
  if (at === -1) siblings.push(found.node);
  else siblings.splice(at, 0, found.node);

  pruneEmpty(tree);
  writeTree(tree);
}

// detaches a topic and its children from the tree. The notes-src markdown is
// deliberately left on disk, so a mistaken delete loses nothing but placement.
function removeNode(slug) {
  const tree = readTree();
  const found = locate(tree, slug);
  if (!found) throw new Error(`slug not found in the tree: ${slug}`);
  found.siblings.splice(found.index, 1);
  pruneEmpty(tree);
  writeTree(tree);
  return subtreeSlugs(found.node);
}

function addNode(parentSlug, label) {
  label = label.trim();
  if (!label) throw new Error('label required');

  const slug = uniqueSlug(label);
  insertNode(parentSlug, slug, label);
  writeStub(slug, label);

  return slug;
}

// attaches a note that's already been drafted in notes-src/<slug>.md to the
// tree under parentSlug, without overwriting the existing note content.
function attachExistingNote(parentSlug, slug, label) {
  label = label.trim();
  if (!label) throw new Error('label required');
  if (!fs.existsSync(path.join(SRC_DIR, `${slug}.md`))) {
    throw new Error(`note file not found for slug: ${slug}`);
  }
  insertNode(parentSlug, slug, label);
  return slug;
}

function resourceLinksBounds(html) {
  const ulOpen = html.indexOf('<ul class="bio-list" id="resource-links">');
  if (ulOpen === -1) throw new Error('resource-links section not found');
  const ulOpenEnd = html.indexOf('>', ulOpen) + 1;
  const ulClose = findMatchingClose(html, ulOpen, 'ul');
  return { ulOpen, ulOpenEnd, ulClose };
}

// parses the direct <li data-id="..."> children of the resource-links <ul>
// into ordered {id, liHtml} entries, ignoring anything without a data-id
// (the client-injected "Checked" li never lands in the static file).
function parseLinkLis(html, ulOpenEnd, ulClose) {
  const liRe = /<li data-id="([^"]+)">[\s\S]*?<\/li>/g;
  liRe.lastIndex = ulOpenEnd;
  const lis = [];
  let m;
  while ((m = liRe.exec(html)) && m.index < ulClose) {
    lis.push({ id: m[1], html: m[0] });
  }
  return lis;
}

function addLink(title, url) {
  title = title.trim();
  url = url.trim();
  if (!title || !url) throw new Error('title and url required');

  const html = fs.readFileSync(MAP_HTML, 'utf8');
  const { ulOpenEnd } = resourceLinksBounds(html);
  const lineStart = html.indexOf('\n', ulOpenEnd) + 1;
  const nextLine = html.slice(lineStart, html.indexOf('\n', lineStart) + 1);
  const indent = nextLine.match(/^\t*/)[0];

  const id = 'l-' + Date.now();
  const newLi = `${indent}<li data-id="${id}"> <a href="${escapeHtml(url)}" target="_blank">${escapeHtml(title)}</a></li>\n`;
  fs.writeFileSync(MAP_HTML, html.slice(0, lineStart) + newLi + html.slice(lineStart));

  const nodesPath = path.join(ROOT, 'nodes.json');
  const nodes = JSON.parse(fs.readFileSync(nodesPath, 'utf8'));
  if (!nodes.links) nodes.links = [];
  nodes.links.unshift({ id, title, url });
  fs.writeFileSync(nodesPath, JSON.stringify(nodes, null, 2));

  return id;
}

// rewrites the resource-links <li>s into the given id order. ids not found
// in `order` keep their existing relative order, appended at the end.
function reorderLinks(order) {
  const html = fs.readFileSync(MAP_HTML, 'utf8');
  const { ulOpenEnd, ulClose } = resourceLinksBounds(html);
  const lis = parseLinkLis(html, ulOpenEnd, ulClose);

  const byId = new Map(lis.map(li => [li.id, li]));
  const ordered = order.map(id => byId.get(id)).filter(Boolean);
  const orderedIds = new Set(ordered.map(li => li.id));
  for (const li of lis) {
    if (!orderedIds.has(li.id)) ordered.push(li);
  }

  const listStart = lis.length ? html.indexOf(lis[0].html, ulOpenEnd) : ulOpenEnd;
  const listEnd = lis.length
    ? html.indexOf(lis[lis.length - 1].html, ulOpenEnd) + lis[lis.length - 1].html.length
    : ulOpenEnd;
  const lineStart = html.lastIndexOf('\n', listStart) + 1;
  const indent = html.slice(lineStart, listStart);

  const newBlock = ordered.map(li => li.html).join(`\n${indent}`);
  const newHtml = html.slice(0, listStart) + newBlock + html.slice(listEnd);
  fs.writeFileSync(MAP_HTML, newHtml);

  const nodesPath = path.join(ROOT, 'nodes.json');
  const nodes = JSON.parse(fs.readFileSync(nodesPath, 'utf8'));
  if (Array.isArray(nodes.links)) {
    const jsonById = new Map(nodes.links.map(l => [l.id, l]));
    const reorderedJson = order.map(id => jsonById.get(id)).filter(Boolean);
    const seen = new Set(reorderedJson.map(l => l.id));
    for (const l of nodes.links) {
      if (!seen.has(l.id)) reorderedJson.push(l);
    }
    nodes.links = reorderedJson;
    fs.writeFileSync(nodesPath, JSON.stringify(nodes, null, 2));
  }
}

function removeLink(id) {
  const html = fs.readFileSync(MAP_HTML, 'utf8');
  const { ulOpenEnd, ulClose } = resourceLinksBounds(html);
  const lis = parseLinkLis(html, ulOpenEnd, ulClose);
  const target = lis.find(li => li.id === id);
  if (!target) throw new Error(`link not found: ${id}`);

  const liStart = html.indexOf(target.html, ulOpenEnd);
  const liEnd = liStart + target.html.length;
  const lineStart = html.lastIndexOf('\n', liStart) + 1;
  const lineEnd = html.indexOf('\n', liEnd) + 1;
  fs.writeFileSync(MAP_HTML, html.slice(0, lineStart) + html.slice(lineEnd));

  const nodesPath = path.join(ROOT, 'nodes.json');
  const nodes = JSON.parse(fs.readFileSync(nodesPath, 'utf8'));
  if (Array.isArray(nodes.links)) {
    nodes.links = nodes.links.filter(l => l.id !== id);
    fs.writeFileSync(nodesPath, JSON.stringify(nodes, null, 2));
  }
}

module.exports = {
  addNode, attachExistingNote, renameNode, moveNode, removeNode, readTree,
  addLink, reorderLinks, removeLink, slugify, uniqueSlug,
};
