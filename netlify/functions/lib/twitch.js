// Twitch's stream.online event.type distinguishes an original live broadcast
// from a pre-loaded/scheduled one: 'live' is a real ongoing broadcast;
// 'playlist'/'watchparty'/'premiere'/'rerun' are pre-loaded content played on
// a schedule and are never treated as a real "Frank just went live" moment.
export function isGenuineLiveEvent(event) {
  return event?.type === 'live';
}

// Same dedupe shape as lib/idempotency.js's filterNewByKey, specialized to a
// single candidate id against a small persisted list of already-processed
// Twitch stream ids (so a retried/duplicate webhook delivery for the same
// stream doesn't re-send the push).
export function isNewStreamId(processedIds, streamId) {
  return !processedIds.includes(streamId);
}
