const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const MAP_HTML = path.join(ROOT, 'map.html');
const SRC_DIR = path.join(ROOT, 'map', 'notes-src');

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// scans from the start of html to find the start index of the <li> that
// directly encloses position `pos`, by tracking a stack of open <li> tags.
function findEnclosingLi(html, pos) {
  const tagRe = /<li(?:[\s>]|$)|<\/li>/g;
  const stack = [];
  let m;
  while ((m = tagRe.exec(html))) {
    if (m.index >= pos) break;
    if (m[0].startsWith('</')) stack.pop();
    else stack.push(m.index);
  }
  return stack[stack.length - 1];
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

// inserts a <li> for `slug` under `parentSlug` in map.html, without touching
// the note file. Used both by addNode (which also writes a fresh stub) and
// by attachExistingNote (which expects the note file to already exist).
function insertNodeLi(parentSlug, slug, label) {
  const html = fs.readFileSync(MAP_HTML, 'utf8');

  const titleTag = `<span class="node-title" data-slug="${parentSlug}">`;
  const titleStart = html.indexOf(titleTag);
  if (titleStart === -1) throw new Error(`parent slug not found: ${parentSlug}`);
  const titleSpanEnd = html.indexOf('</span>', titleStart) + '</span>'.length;

  const liStart = findEnclosingLi(html, titleStart);
  const liEnd = findMatchingClose(html, liStart, 'li');

  const safeLabel = escapeHtml(label);
  let newHtml;

  const subListOpen = html.indexOf('<ul class="sub-list"', titleSpanEnd);
  if (subListOpen !== -1 && subListOpen < liEnd) {
    // parent already has children -> append a new sibling <li>
    const ulClose = findMatchingClose(html, subListOpen, 'ul');
    const lineStart = html.lastIndexOf('\n', ulClose) + 1;
    const indent = html.slice(lineStart, ulClose);
    const newLi = `${indent}<li> <span class="node-title" data-slug="${slug}">${safeLabel}</span></li>\n`;
    newHtml = html.slice(0, lineStart) + newLi + html.slice(lineStart);
  } else {
    // leaf -> convert into an expandable parent with a fresh sub-list
    const lineStart = html.lastIndexOf('\n', liStart) + 1;
    const indent = html.slice(lineStart, liStart);
    if (html.slice(liStart, liStart + 4) !== '<li>') {
      throw new Error('expected leaf <li> to add children under');
    }
    const subListBlock =
      `\n${indent}\t<ul class="sub-list">\n` +
      `${indent}\t\t<li> <span class="node-title" data-slug="${slug}">${safeLabel}</span></li>\n` +
      `${indent}\t</ul>\n${indent}`;
    newHtml =
      html.slice(0, liStart) +
      '<li class="expandable"> <span class="arrow"></span>' +
      html.slice(liStart + 4, liEnd) +
      subListBlock +
      html.slice(liEnd);
  }

  fs.writeFileSync(MAP_HTML, newHtml);
}

function addNode(parentSlug, label) {
  label = label.trim();
  if (!label) throw new Error('label required');

  const slug = uniqueSlug(label);
  insertNodeLi(parentSlug, slug, label);
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
  insertNodeLi(parentSlug, slug, label);
  return slug;
}

function addLink(title, url) {
  title = title.trim();
  url = url.trim();
  if (!title || !url) throw new Error('title and url required');

  const html = fs.readFileSync(MAP_HTML, 'utf8');

  const ulOpen = html.indexOf('<ul class="bio-list" id="resource-links">');
  if (ulOpen === -1) throw new Error('resource-links section not found');
  const ulClose = findMatchingClose(html, ulOpen, 'ul');
  const lineStart = html.lastIndexOf('\n', ulClose) + 1;
  const indent = html.slice(lineStart, ulClose);

  const newLi = `${indent}<li> <a href="${escapeHtml(url)}" target="_blank">${escapeHtml(title)}</a></li>\n`;
  fs.writeFileSync(MAP_HTML, html.slice(0, lineStart) + newLi + html.slice(lineStart));

  const nodesPath = path.join(ROOT, 'nodes.json');
  const nodes = JSON.parse(fs.readFileSync(nodesPath, 'utf8'));
  if (!nodes.links) nodes.links = [];
  nodes.links.push({ id: 'l-' + Date.now(), title, url });
  fs.writeFileSync(nodesPath, JSON.stringify(nodes, null, 2));
}

module.exports = { addNode, attachExistingNote, addLink, slugify, uniqueSlug };
