// Pure helpers for the Read > Substack list (no React, no native modules, so node --test can run them).

/**
 * Launch rule (Eric, 2026-10-29): the app never shows a paid post, so there is no "Paid" tag, no teaser and no "Subscribe to Read" button to look broken.
 * Anything the server marks `paid` is dropped from the list; a missing/other audience (free posts) is kept.
 */
export function listablePosts(posts) {
  return Array.isArray(posts) ? posts.filter((p) => p && p.audience !== 'paid') : [];
}
