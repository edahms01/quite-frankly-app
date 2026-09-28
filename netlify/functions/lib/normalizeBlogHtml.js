// Normalizes Squarespace blog-post HTML once, at write time (backfill script
// and poller both call this before writing column I) — never at render time.
// Pure function: no network access, no DOM library dependency (none is
// already a project dependency, and regex-based tag handling is sufficient
// for the narrow, known shapes Squarespace's export actually produces).
//
// Rules (Global Constraints):
// - copy `data-src` -> `src` on <img> (lazyload placeholders)
// - rewrite protocol-relative `//...` to `https://...`
// - strip <script>/<style>/<noscript> entirely
// - replace video embeds (`data-html` attrs / iframes) with a plain "Watch
//   video" link to the source URL when one can be extracted, else drop them

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

function decodeEntities(str) {
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
    const src = extractAttrValue(decoded, 'src');
    return src ? watchVideoLink(src) : '';
  });

  result = result.replace(IFRAME_RE, (match) => {
    videoEmbedCount++;
    const src = extractAttrValue(match, 'src');
    return src ? watchVideoLink(src) : '';
  });

  result = result.replace(IMG_TAG_RE, (tag) => {
    const dataSrc = extractAttrValue(tag, 'data-src');
    if (dataSrc === null) return tag;
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

  return { html: result, videoEmbedCount };
}
