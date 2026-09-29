#!/usr/bin/env node
// Read-only audit: do Frank's YouTube comments with a Pilled link predict a FlipSide?
// Usage: YOUTUBE_LIVE_STATUS_API_KEY=... node comment-audit.js [--out DIR] [--vods 100] [--quota-cap 1500]
const fs = require('fs');
const os = require('os');
const path = require('path');

const KEY = process.env.YOUTUBE_LIVE_STATUS_API_KEY;
const FRANK_CHANNEL = 'UCtB5nbKHYsX8EGIk9cOevaQ';
const UPLOADS = 'UUtB5nbKHYsX8EGIk9cOevaQ';
const FRANK_PILLED_ID = 27724;
const KNOWN_VIDEO = 'HUAb5E2JuEo';
const KNOWN_TOPIC = 1525298;
const YT = 'https://www.googleapis.com/youtube/v3';
const PILLED = 'https://pilled-lqs-api.pilled.net';
const PILLED_DELAY_MS = 2000;
const TZ = 'America/New_York';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const arg = (name, def) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : def; };
const OUT_DIR = arg('--out', path.join(os.tmpdir(), 'qf-comment-audit'));
const VOD_COUNT = +arg('--vods', 100);
const QUOTA_CAP = +arg('--quota-cap', 1500);
fs.mkdirSync(OUT_DIR, { recursive: true });
const CACHE_FILE = path.join(OUT_DIR, 'cache.json');
const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};
const saveCache = () => fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));

let quotaUsed = 0;
const quotaByEndpoint = {};

class FatalKeyError extends Error {}
class QuotaCapError extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- time helpers (America/New_York) ----
const etFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hourCycle: 'h23', weekday: 'short',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
});
function et(iso) {
  if (!iso) return null;
  const p = Object.fromEntries(etFmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  const dowMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    text: `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} ${p.timeZoneName}`,
    date: `${p.year}-${p.month}-${p.day}`,
    dow: p.weekday,
    dowNum: dowMap[p.weekday],
    minutes: +p.hour * 60 + +p.minute,
  };
}
// Evening key: ET date of (instant - 6h), so 00:00-06:00 ET belongs to the previous evening.
const eveningKey = (iso) => et(new Date(new Date(iso).getTime() - 6 * 3600 * 1000).toISOString()).date;

// ---- YouTube API with disk cache + quota accounting ----
async function yt(endpoint, params) {
  const url = new URL(`${YT}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const cacheKey = url.toString();
  if (cache[cacheKey]) return cache[cacheKey];
  if (quotaUsed + 1 > QUOTA_CAP) throw new QuotaCapError(`quota cap ${QUOTA_CAP} reached`);
  url.searchParams.set('key', KEY);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  quotaUsed += 1;
  quotaByEndpoint[endpoint] = (quotaByEndpoint[endpoint] || 0) + 1;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason || `http${res.status}`;
    if (['keyInvalid', 'ipRefererBlocked', 'accessNotConfigured', 'quotaExceeded', 'dailyLimitExceeded'].includes(reason)) {
      throw new FatalKeyError(`YouTube API refused the request: ${reason} (${body?.error?.message || res.status})`);
    }
    const result = { error: { reason, status: res.status, message: body?.error?.message } };
    cache[cacheKey] = result;
    saveCache();
    return result;
  }
  cache[cacheKey] = body;
  saveCache();
  return body;
}

// ---- Step 1: last N livestream VODs ----
async function getVods() {
  const vods = [];
  let pageToken;
  do {
    const pl = await yt('playlistItems', { part: 'contentDetails', playlistId: UPLOADS, maxResults: 50, ...(pageToken && { pageToken }) });
    const ids = pl.items.map((i) => i.contentDetails.videoId);
    const vd = await yt('videos', { part: 'liveStreamingDetails,snippet', id: ids.join(',') });
    for (const v of vd.items) {
      const start = v.liveStreamingDetails?.actualStartTime;
      if (!start) continue;
      vods.push({ id: v.id, title: v.snippet.title, startUtc: start, startEt: et(start).text, endUtc: v.liveStreamingDetails.actualEndTime || null });
    }
    pageToken = pl.nextPageToken;
  } while (pageToken && vods.length < VOD_COUNT);
  vods.sort((a, b) => b.startUtc.localeCompare(a.startUtc));
  return vods.slice(0, VOD_COUNT);
}

// ---- Step 2: Frank's comments containing pilled.net ----
function extractLinks(html) {
  const decoded = (html || '').replace(/&amp;/g, '&').replace(/&#39;/g, "'");
  const urls = new Set();
  for (const m of decoded.matchAll(/href="([^"]*pilled\.net[^"]*)"/gi)) urls.add(m[1]);
  for (const m of decoded.matchAll(/(?:https?:\/\/)?(?:[\w-]+\.)?pilled\.net[^\s<"']*/gi)) urls.add(m[0]);
  const topicIds = new Set();
  for (const u of urls) {
    for (const m of u.matchAll(/topic-detail\/(\d+)/g)) topicIds.add(+m[1]);
    for (const m of u.matchAll(/[?&]topic=(\d+)/g)) topicIds.add(+m[1]);
  }
  return { urls: [...urls], topicIds: [...topicIds] };
}

function commentHit(c, video, isReply, parentId) {
  const s = c.snippet;
  if (s.authorChannelId?.value !== FRANK_CHANNEL) return null;
  if (!/pilled\.net/i.test(s.textDisplay || '')) return null;
  const links = extractLinks(s.textDisplay);
  return {
    commentId: c.id,
    videoId: video.id,
    videoTitle: video.title,
    publishedAt: s.publishedAt,
    publishedEt: et(s.publishedAt).text,
    kind: isReply ? 'reply' : 'top-level',
    parentId: parentId || null,
    urls: links.urls,
    topicIds: links.topicIds,
    text: (s.textDisplay || '').replace(/<[^>]*>/g, '').slice(0, 160),
  };
}

async function scanVideo(video, searchTerms) {
  const hits = [];
  let disabled = null;
  let pageToken;
  let threadsSeen = 0;
  do {
    const params = { part: 'snippet,replies', videoId: video.id, maxResults: 100, order: 'time', textFormat: 'html', ...(searchTerms && { searchTerms }), ...(pageToken && { pageToken }) };
    const r = await yt('commentThreads', params);
    if (r.error) {
      if (r.error.reason === 'commentsDisabled') disabled = 'commentsDisabled';
      else disabled = r.error.reason;
      break;
    }
    for (const t of r.items) {
      threadsSeen += 1;
      const top = t.snippet.topLevelComment;
      const h = commentHit(top, video, false);
      if (h) hits.push(h);
      let replies = t.replies?.comments || [];
      if (t.snippet.totalReplyCount > replies.length) {
        replies = [];
        let rt;
        do {
          const rr = await yt('comments', { part: 'snippet', parentId: top.id, maxResults: 100, textFormat: 'html', ...(rt && { pageToken: rt }) });
          if (rr.error) break;
          replies.push(...rr.items);
          rt = rr.nextPageToken;
        } while (rt);
      }
      for (const rp of replies) {
        const rh = commentHit(rp, video, true, top.id);
        if (rh) hits.push(rh);
      }
    }
    pageToken = r.nextPageToken;
  } while (pageToken);
  return { hits, disabled, threadsSeen };
}

// ---- Step 3: Pilled topic history ----
async function pilledPage(page) {
  const key = `pilled:${page}`;
  if (cache[key]) return cache[key];
  await sleep(PILLED_DELAY_MS);
  const res = await fetch(`${PILLED}/topic/getUserVideos/${FRANK_PILLED_ID}/${page}?filter=recent&search=undefined`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`pilled page ${page}: HTTP ${res.status}`);
  const rows = (await res.json()).map((t) => ({
    topicID: t.topicID,
    title: (t.topicName || '').replace(/&amp;/g, '&'),
    liveEventDateTime: t.liveEventDateTime || null,
    createDateTime: t.createDateTime || null,
    duration: t.proofs?.[0]?.blobResponse?.durationInSeconds ?? null,
  }));
  cache[key] = rows;
  saveCache();
  return rows;
}

async function getPilledTopics(earliestUtc) {
  const cutoff = new Date(earliestUtc).getTime() - 2 * 86400000;
  const topics = [];
  for (let page = 0; page < 80; page++) {
    const rows = await pilledPage(page);
    if (!rows.length) break;
    topics.push(...rows);
    const dated = rows.map((r) => r.liveEventDateTime || r.createDateTime).filter(Boolean);
    if (dated.length && Math.min(...dated.map((d) => new Date(d).getTime())) < cutoff) break;
  }
  return topics.filter((t) => new Date(t.liveEventDateTime || t.createDateTime || 0).getTime() >= cutoff);
}

function classifyTopic(t) {
  if (!t.liveEventDateTime) return { cls: 'exception', why: 'no liveEventDateTime' };
  const e = et(t.liveEventDateTime);
  const inWindow = e.minutes >= 20 * 60 + 45;
  if (e.dowNum <= 5 && inWindow) return { cls: 'flipside', e };
  if (e.dowNum >= 6 && inWindow) return { cls: 'exception', why: 'weekend late-night', e };
  if (e.minutes < 6 * 60) return { cls: 'exception', why: 'after midnight ET', e };
  return { cls: 'other', e };
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

async function main() {
  if (!KEY) { console.error('YOUTUBE_LIVE_STATUS_API_KEY not set'); process.exit(2); }
  const result = { generatedAt: new Date().toISOString() };

  const vods = await getVods();
  result.vods = vods;
  console.log(`VODs: ${vods.length} (${vods.at(-1)?.startEt} .. ${vods[0]?.startEt}), quota ${quotaUsed}`);

  // Validate searchTerms on the known case.
  const known = vods.find((v) => v.id === KNOWN_VIDEO) || { id: KNOWN_VIDEO, title: '(known video)' };
  const viaSearch = await scanVideo(known, 'pilled.net');
  const viaFull = await scanVideo(known, null);
  const knownSearchHit = viaSearch.hits.some((h) => h.topicIds.includes(KNOWN_TOPIC));
  const knownFullHit = viaFull.hits.some((h) => h.topicIds.includes(KNOWN_TOPIC));
  const searchIds = new Set(viaSearch.hits.map((h) => h.commentId));
  const searchMissesSome = viaFull.hits.some((h) => !searchIds.has(h.commentId));
  result.validation = {
    video: KNOWN_VIDEO,
    fullScanThreads: viaFull.threadsSeen,
    searchHits: viaSearch.hits.length,
    fullHits: viaFull.hits.length,
    knownTopicFoundBySearch: knownSearchHit,
    knownTopicFoundByFullScan: knownFullHit,
    searchMissesSome,
    hitsFull: viaFull.hits,
  };
  const useSearch = knownSearchHit && !searchMissesSome;
  result.method = useSearch ? 'searchTerms=pilled.net' : 'full paging (order=time) + replies';
  console.log(`Validation: search hit=${knownSearchHit} full hit=${knownFullHit} misses=${searchMissesSome} -> ${result.method}, quota ${quotaUsed}`);

  const comments = [];
  const noComments = [];
  const errors = [];
  let truncated = null;
  try {
    for (const v of vods) {
      const r = await scanVideo(v, useSearch ? 'pilled.net' : null);
      if (r.disabled) noComments.push({ videoId: v.id, title: v.title, reason: r.disabled });
      comments.push(...r.hits);
      process.stdout.write('.');
    }
  } catch (e) {
    if (e instanceof QuotaCapError) truncated = e.message; else throw e;
  }
  console.log(`\nComments with pilled.net from Frank: ${comments.length}, quota ${quotaUsed}`);
  result.comments = comments;
  result.commentsDisabledVideos = noComments;
  result.truncated = truncated;
  result.errors = errors;

  const topics = await getPilledTopics(vods.at(-1).startUtc);
  const enriched = topics.map((t) => ({ ...t, ...classifyTopic(t) }));
  result.topics = enriched;

  const byId = new Map(enriched.map((t) => [t.topicID, t]));
  const flips = enriched.filter((t) => t.cls === 'flipside');

  // Join: by topic id first; same evening only when the comment names no topic we know.
  for (const c of comments) {
    const known = c.topicIds.map((id) => byId.get(id)).filter(Boolean);
    if (known.length) {
      c.joinedBy = 'topic-id';
      c.topics = known.map((t) => ({ topicID: t.topicID, cls: t.cls, title: t.title }));
      c.flipsideTopicId = known.find((t) => t.cls === 'flipside')?.topicID ?? null;
    } else {
      const ev = eveningKey(c.publishedAt);
      const same = flips.filter((t) => eveningKey(t.liveEventDateTime) === ev);
      c.joinedBy = c.topicIds.length ? 'evening (topic id not in history)' : 'evening (no topic id)';
      c.topics = [];
      c.flipsideTopicId = same[0]?.topicID ?? null;
    }
  }

  const rows = flips.map((f) => {
    const mine = comments
      .filter((c) => c.flipsideTopicId === f.topicID)
      .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
    const first = mine[0];
    return {
      topicID: f.topicID,
      title: f.title,
      liveEventUtc: f.liveEventDateTime,
      liveEventEt: f.e.text,
      dow: f.e.dow,
      commentFound: !!first,
      commentPublishedAt: first?.publishedAt ?? null,
      commentPublishedEt: first?.publishedEt ?? null,
      kind: first?.kind ?? null,
      joinedBy: first?.joinedBy ?? null,
      leadMinutes: first ? Math.round((new Date(f.liveEventDateTime) - new Date(first.publishedAt)) / 60000) : null,
    };
  });
  result.flipsideRows = rows;

  const withComment = rows.filter((r) => r.commentFound);
  const leads = withComment.map((r) => r.leadMinutes);
  const linkComments = comments.length;
  const linkOnFlipside = comments.filter((c) => c.flipsideTopicId).length;
  result.stats = {
    flipsides: rows.length,
    flipsidesWithComment: withComment.length,
    recall: rows.length ? withComment.length / rows.length : null,
    pilledLinkComments: linkComments,
    commentsForAFlipside: linkOnFlipside,
    precision: linkComments ? linkOnFlipside / linkComments : null,
    leadMin: leads.length ? Math.min(...leads) : null,
    leadMedian: leads.length ? median(leads) : null,
    leadMax: leads.length ? Math.max(...leads) : null,
    commentsBeforeLiveEvent: leads.filter((l) => l > 0).length,
    commentsAfterLiveEvent: leads.filter((l) => l <= 0).length,
    byDow: {},
  };
  for (const r of rows) {
    const d = (result.stats.byDow[r.dow] ||= { flipsides: 0, withComment: 0 });
    d.flipsides += 1;
    if (r.commentFound) d.withComment += 1;
  }
  // Proxy analysis: the FlipSide runs inside the 7pm show's own Pilled topic, after the YouTube stream ends.
  const inShowSlot = (t) => t.e && t.e.dowNum <= 5 && t.e.minutes >= 18 * 60 + 30 && t.e.minutes <= 19 * 60 + 30;
  const nights = [];
  for (const t of enriched.filter((x) => x.cls === 'other' && x.liveEventDateTime && inShowSlot(x))) {
    const vod = vods.find((v) => v.endUtc && et(v.startUtc).date === t.e.date && Math.abs(et(v.startUtc).minutes - t.e.minutes) <= 30);
    if (!vod || t.duration == null) continue;
    const ytSec = (new Date(vod.endUtc) - new Date(vod.startUtc)) / 1000;
    const extraSec = t.duration - ytSec;
    const linked = comments.filter((c) => c.topicIds.includes(t.topicID)).sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
    const first = linked[0];
    const seek = first ? +(first.urls.map((u) => /[?&]time=(\d+)/.exec(u)?.[1]).find(Boolean) || NaN) : NaN;
    nights.push({
      date: t.e.date, dow: t.e.dow, topicID: t.topicID, title: t.title,
      pilledDurSec: t.duration, youtubeDurSec: Math.round(ytSec), extraSec: Math.round(extraSec),
      flipsideProxy: extraSec >= 900,
      youtubeEndUtc: vod.endUtc,
      commentFound: !!first,
      commentPublishedUtc: first?.publishedAt ?? null,
      commentPublishedEt: first?.publishedEt ?? null,
      commentKind: first?.kind ?? null,
      seekSec: Number.isFinite(seek) ? seek : null,
      impliedFlipsideStartUtc: Number.isFinite(seek) ? new Date(new Date(t.liveEventDateTime).getTime() + seek * 1000).toISOString() : null,
      minutesAfterYoutubeEnd: first ? Math.round((new Date(first.publishedAt) - new Date(vod.endUtc)) / 60000) : null,
      minutesAfterPilledEnd: first ? Math.round((new Date(first.publishedAt) - (new Date(t.liveEventDateTime).getTime() + t.duration * 1000)) / 60000) : null,
    });
  }
  const proxyNights = nights.filter((n) => n.flipsideProxy);
  result.nights = nights;
  result.proxyStats = {
    showNightsMatched: nights.length,
    flipsideNightsByDurationProxy: proxyNights.length,
    nightsWithLinkComment: proxyNights.filter((n) => n.commentFound).length,
    recall: proxyNights.length ? proxyNights.filter((n) => n.commentFound).length / proxyNights.length : null,
    linkCommentsOnNonProxyNights: nights.filter((n) => !n.flipsideProxy && n.commentFound).length,
    commentsNotOnAnyMatchedNight: comments.filter((c) => !nights.some((n) => c.topicIds.includes(n.topicID))).length,
    medianExtraMinutes: proxyNights.length ? Math.round(median(proxyNights.map((n) => n.extraSec)) / 60) : null,
    minExtraMinutes: proxyNights.length ? Math.round(Math.min(...proxyNights.map((n) => n.extraSec)) / 60) : null,
  };
  result.nonFlipsideComments = comments.filter((c) => !c.flipsideTopicId);
  result.exceptions = enriched.filter((t) => t.cls === 'exception');
  result.quota = { used: quotaUsed, cap: QUOTA_CAP, byEndpoint: quotaByEndpoint };

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ method: result.method, stats: result.stats, proxyStats: result.proxyStats, quota: result.quota, truncated }, null, 2));
  console.log(`Results: ${path.join(OUT_DIR, 'results.json')}`);
}

main().catch((e) => {
  if (e instanceof FatalKeyError) { console.error(`STOP: ${e.message}`); console.error(`Quota used: ${quotaUsed}`); process.exit(3); }
  console.error(e); process.exit(1);
});
