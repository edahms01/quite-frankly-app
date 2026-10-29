// Set the Charge on Jam: Bandcamp's own embedded player, in its one-row "small" layout (art, play/pause, title, "bc" mark).
// The large and medium layouts carry a footer with "buy" and "share" links; the small layout has neither (checked in the iOS simulator, 2026-10-29,
// against size=large / minimal=true / medium / artwork=small, which all keep the footer). Its title and "bc" mark still link to the album page,
// which is a store page, so the WebView may only ever show the player itself: every other navigation is refused.
// Pure (no React) so node --test can cover it.
export const BANDCAMP_ALBUM_ID = '1087783863';
export const BANDCAMP_EMBED_PREFIX = 'https://bandcamp.com/EmbeddedPlayer/';
export const BANDCAMP_EMBED_URL = `${BANDCAMP_EMBED_PREFIX}album=${BANDCAMP_ALBUM_ID}/size=small/bgcol=1E1B1F/linkcol=C9974A/transparent=true/`;
// Bandcamp's documented height for size=small.
export const BANDCAMP_EMBED_HEIGHT = 42;

/** true only for the embedded player document itself (and blank/about frames); a tap on the title, "bc" mark or any link is refused. */
export function allowBandcampNavigation(url) {
  if (typeof url !== 'string') return false;
  return url.startsWith(BANDCAMP_EMBED_PREFIX) || url === 'about:blank';
}
