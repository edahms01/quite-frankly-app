// Normalizes Squarespace blog-post HTML once, at write time (backfill script
// and poller both call this before writing to Blobs) — never at render
// time. The video-embed/data-src/protocol-relative passes below are regex —
// narrow, known Squarespace shapes, already reviewed. The final pass
// (stripToWhitelist) is a real HTML parser (htmlparser2 + dom-serializer —
// both already transitive deps of react-native-render-html, no new
// install), not regex: it removes Microsoft-Word-paste bloat (`<w:...>`,
// `<m:...>`, `<o:...>`, `<xml>` blocks — confirmed root cause of a real
// 245k-char outlier post, 2026-09-28) that a regex pass can't safely target
// without risking real content.
//
// Rules (Global Constraints + 2026-09-28 whitelist-strip follow-up):
// - copy `data-src` -> `src` on <img> (lazyload placeholders)
// - rewrite protocol-relative `//...` to `https://...`
// - strip <script>/<style>/<noscript> entirely
// - replace video embeds (`data-html` attrs / iframes) with a plain "Watch
//   video" link to the source URL when one can be extracted, else drop them
// - whitelist-strip the result to only the tags RenderHtml actually uses,
//   dropping class/style/id/data-* everywhere, all HTML comments (catches
//   Word's mso conditional blocks), and any office-namespace element
//   (`w:`/`m:`/`o:`/etc. — any tag name containing ":") entirely, along
//   with its contents

import { parseDocument } from 'htmlparser2';
import render from 'dom-serializer';

const SCRIPT_STYLE_NOSCRIPT_RE = /<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi;

// Squarespace's video block: a wrapper element (commonly a <div>) carrying
// the real embed markup HTML-entity-encoded inside a `data-html` attribute,
// e.g. <div class="sqs-block-video" data-html="&lt;iframe src=&quot;...&quot;&gt;...&lt;/iframe&gt;"></div>.
// Assumes no nested element of the *same* tag name inside the wrapper (true
// for every real Squarespace video-block shape, which is a leaf element) --
// a deliberate, documented simplification rather than a full HTML parser.
const DATA_HTML_EMBED_RE = /<([a-zA-Z][\w-]*)\b[^>]*\bdata-html\s*=\s*(?:"[^"]*"|'[^']*')[^>]*>[\s\S]*?<\/\1>/gi;

// Bare <iframe> embeds not wrapped in a data-html block -- either
// self-closing or a normal open/close pair.
const IFRAME_RE = /<iframe\b[^>]*?(?:\/>|>[\s\S]*?<\/iframe>)/gi;

const IMG_TAG_RE = /<img\b[^>]*>/gi;

// Exported for reuse on plain-text fields (title, author) sourced directly
// from Squarespace's JSON, which come HTML-entity-encoded (e.g. "Pena v VDH
// Lawsuit &amp; How to Follow") the same way body HTML attribute values do
// -- confirmed live against real posts, not just body markup.
export function decodeEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Lookbehind requires whitespace (or the tag's opening "<name") immediately
// before the attribute name -- NOT just a word boundary (`\b`), which would
// also match "src" inside "data-src" (the "-" -> "s" transition is itself a
// word boundary) and silently corrupt the data-src->src rewrite below.
function extractAttrValue(tagOrMarkup, attrName) {
  const re = new RegExp(`(?<=[\\s<])${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i');
  const match = tagOrMarkup.match(re);
  if (!match) return null;
  return match[1] !== undefined ? match[1] : match[2];
}

function watchVideoLink(url) {
  return `<p><a href="${escapeAttr(url)}">Watch video</a></p>`;
}

// --- Whitelist strip (real parser, 2026-09-28) --------------------------
//
// Keeps only the tags react-native-render-html actually styles/renders for
// this app (Task 6's tagsStyles / defaults), unwraps everything else
// (keeping its text/children -- this is what "collapses wrapper divs/spans"
// in practice, since div/span/font/etc. are never in the keep-list, so
// they're always unwrapped whether empty or not), and removes a small set
// of tags ENTIRELY (tag + all descendant content): script/style/noscript
// (belt-and-suspenders, the regex pass above already removes these),
// head/meta/link/title/xml (not real body content), and any tag whose name
// contains ":" -- Microsoft Word/Office XML namespace elements
// (w:WordDocument, m:oMath, o:p, v:shape, etc.) always take this form and
// their "content" is Word's internal style/schema data, not article prose.
// HTML comments (mso conditional blocks live here) are dropped outright.
const REMOVE_ENTIRELY_TAGS = new Set(['script', 'style', 'noscript', 'head', 'meta', 'link', 'title', 'xml']);

const KEEP_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'img',
  'ul', 'ol', 'li', 'blockquote',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
]);

// Only these tags keep any attributes at all; every other kept tag is
// serialized bare (class/style/id/data-* and anything else all dropped,
// "everywhere", per spec).
const ATTR_WHITELIST = {
  a: ['href'],
  img: ['src', 'alt', 'width', 'height'],
};

// Tags allowed to be legitimately content-free -- never pruned as "empty".
const VOID_OK_EMPTY = new Set(['br', 'hr', 'img', 'td', 'th']);

function isOfficeNamespaceTag(name) {
  return name.includes(':');
}

function hasContent(node) {
  if (node.type === 'text') return node.data.trim() !== '';
  if (node.type === 'tag') {
    if (node.name === 'img' || node.name === 'br' || node.name === 'hr') return true;
    return (node.children || []).some(hasContent);
  }
  return false;
}

function pruneAttribs(node) {
  const allowed = ATTR_WHITELIST[node.name];
  const attribs = {};
  if (allowed) {
    for (const attr of allowed) {
      if (node.attribs && node.attribs[attr] !== undefined) {
        attribs[attr] = node.attribs[attr];
      }
    }
  }
  node.attribs = attribs;
}

// Recursively whitelist-filters a list of sibling parser nodes, returning
// the new list. Mutates the surviving nodes' own `attribs`/`children`
// in place (cheaper and avoids reconstructing domhandler-internal shape)
// rather than building fresh node objects.
function filterNodes(nodes) {
  const out = [];
  for (const node of nodes) {
    if (node.type === 'comment' || node.type === 'directive' || node.type === 'cdata') {
      continue; // strip all HTML comments (catches Word's mso conditional blocks) and doctype/PI/cdata noise
    }
    if (node.type === 'text') {
      out.push(node);
      continue;
    }
    if (node.type === 'script' || node.type === 'style') {
      continue; // htmlparser2 tags these with their own node.type, not 'tag'
    }
    if (node.type !== 'tag') {
      continue;
    }
    const name = node.name;
    if (REMOVE_ENTIRELY_TAGS.has(name) || isOfficeNamespaceTag(name)) {
      continue; // remove entirely, including all descendant content
    }
    node.children = filterNodes(node.children || []);
    if (!KEEP_TAGS.has(name)) {
      out.push(...node.children); // unwrap: splice children in place of this wrapper
      continue;
    }
    pruneAttribs(node);
    if (!VOID_OK_EMPTY.has(name) && !hasContent(node)) {
      continue; // prune empty p/li/blockquote/h1-6/figure/figcaption/ul/ol/table/etc.
    }
    out.push(node);
  }
  return out;
}

// Parses `html` with a real parser and re-serializes only the whitelisted
// tags/attributes. `encodeEntities: 'utf8'` escapes just the 5 XML-significant
// characters (&<>"') and leaves other UTF-8 text (accents, emoji) as raw
// bytes rather than numeric entities -- correct either way, but meaningfully
// smaller output for non-ASCII-heavy posts.
function stripToWhitelist(html) {
  if (typeof html !== 'string' || html.length === 0) return html || '';
  const doc = parseDocument(html);
  const filtered = filterNodes(doc.children || []);
  return render(filtered, { encodeEntities: 'utf8' });
}

// Returns { html, videoEmbedCount }. videoEmbedCount counts every video
// embed found (replaced with a link OR dropped), for the backfill's
// dry-run report -- it is not just the count of successfully-linked ones.
export function normalizeBlogHtml(html) {
  if (typeof html !== 'string' || html.length === 0) {
    return { html: html || '', videoEmbedCount: 0 };
  }

  let videoEmbedCount = 0;
  let result = html;

  result = result.replace(SCRIPT_STYLE_NOSCRIPT_RE, '');

  result = result.replace(DATA_HTML_EMBED_RE, (match) => {
    videoEmbedCount++;
    const raw = extractAttrValue(match, 'data-html');
    const decoded = raw ? decodeEntities(raw) : '';
    // extractAttrValue returns the src value exactly as it appears in the
    // decoded inner markup -- i.e. still HTML-attribute-escaped once
    // (e.g. a literal "&" is "&amp;" there, same as in any ordinary HTML
    // attribute). decodeEntities it to get the real URL before it's
    // re-escaped (once) by watchVideoLink -- otherwise an already-escaped
    // "&amp;" gets escaped again into "&amp;amp;".
    const srcRaw = extractAttrValue(decoded, 'src');
    const src = srcRaw ? decodeEntities(srcRaw) : null;
    return src ? watchVideoLink(src) : '';
  });

  result = result.replace(IFRAME_RE, (match) => {
    videoEmbedCount++;
    // Same reasoning as above: extractAttrValue's result is already
    // attribute-escaped text from the source markup, not the real URL.
    const srcRaw = extractAttrValue(match, 'src');
    const src = srcRaw ? decodeEntities(srcRaw) : null;
    return src ? watchVideoLink(src) : '';
  });

  result = result.replace(IMG_TAG_RE, (tag) => {
    const dataSrcRaw = extractAttrValue(tag, 'data-src');
    if (dataSrcRaw === null) return tag;
    // Decode before re-escaping into the new src= attribute -- same
    // already-escaped-once-already reasoning as the video embed paths above.
    const dataSrc = decodeEntities(dataSrcRaw);
    if (/(?<=[\s])src\s*=\s*(?:"[^"]*"|'[^']*')/i.test(tag)) {
      return tag.replace(/(?<=[\s])src\s*=\s*(?:"[^"]*"|'[^']*')/i, `src="${escapeAttr(dataSrc)}"`);
    }
    return tag.replace(/^<img\b/i, `<img src="${escapeAttr(dataSrc)}"`);
  });

  // Lookbehind (not `\b`) for the same reason as extractAttrValue above --
  // avoids also matching "src" inside a leftover "data-src" attribute.
  result = result
    .replace(/(?<=[\s])(src|href)(\s*=\s*)"\/\//gi, '$1$2"https://')
    .replace(/(?<=[\s])(src|href)(\s*=\s*)'\/\//gi, "$1$2'https://");

  result = stripToWhitelist(result);

  return { html: result, videoEmbedCount };
}
