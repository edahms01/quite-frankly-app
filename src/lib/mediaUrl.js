// Release builds (target SDK 36) refuse cleartext http:// traffic ("CLEARTEXT communication to <host> not permitted by network security policy").
// Episode audio URLs are tracker wrappers around an http:// address: https://chrt.fm/track/CE2636/http://feeds.soundcloud.com/...
// chrt.fm 302-redirects to the inner address AS WRITTEN, so an inner http:// ends in a blocked cleartext hop and Android plays nothing.
// Writing the inner address as https:// keeps the chrt.fm tracking: chrt.fm -> https feeds.soundcloud.com -> https cf-media.sndcdn.com (checked 2026-10-29).
// Pure (no React), node --test covers it. Never touches anything that is not an http:// scheme.

/** http:// -> https:// at the start, and for the address wrapped inside a tracker URL (".../track/<id>/http://host/..."). */
export function upgradeToHttps(url) {
  if (typeof url !== 'string') return url;
  return url
    .replace(/^http:\/\//i, 'https://')
    .replace(/(\/)http:\/\//gi, '$1https://');
}
