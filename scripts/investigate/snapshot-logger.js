#!/usr/bin/env node
// Polls Pilled's public API for Frank's live state; appends JSONL + change events.
// Usage: node snapshot-logger.js [--start-at HH:MM (America/New_York)] [--once]
const fs = require('fs');
const path = require('path');

const API = 'https://pilled-lqs-api.pilled.net';
const FRANK_ID = 27724;
const TZ = 'America/New_York';
const INTERVAL_MS = 60_000;
const WAIT_CHECK_MS = 30_000;
const FLIPSIDE_EARLIEST = [20, 55];
const FLIPSIDE_DEADLINE = [22, 0];
const ABSOLUTE_STOP = [0, 30];
const RUN_AFTER_FLIPSIDE_MS = 2 * 60 * 60 * 1000;
const SNAP_OUT = path.join(__dirname, 'snapshots.jsonl');
const EVENT_OUT = path.join(__dirname, 'events.log');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const etFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

function etParts(ms) {
  const p = Object.fromEntries(etFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}

// Instant for a wall-clock time in America/New_York (day may overflow; Date.UTC normalizes it).
function etToInstant(y, mo, d, h, mi) {
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let t = wall;
  for (let i = 0; i < 2; i++) {
    const q = etParts(t);
    t = wall - (Date.UTC(q.y, q.mo - 1, q.d, q.h, q.mi, q.s) - t);
  }
  return t;
}

function etDayInstant(refMs, [h, mi], dayOffset = 0) {
  const p = etParts(refMs);
  return etToInstant(p.y, p.mo, p.d + dayOffset, h, mi);
}

function fmtEt(ms) {
  const p = etParts(ms);
  const pad = (n) => String(n).padStart(2, '0');
  const abbr = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'short' })
    .formatToParts(new Date(ms)).find((x) => x.type === 'timeZoneName').value;
  return `${p.y}-${pad(p.mo)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}:${pad(p.s)} ${abbr}`;
}

const fmtLocal = (ms) => new Date(ms).toLocaleString('en-US', { hour12: false, timeZoneName: 'short' });
const stamp = (ms) => ({ ts: new Date(ms).toISOString(), tsET: fmtEt(ms) });

async function getJson(p) {
  const res = await fetch(`${API}/${p}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${p} -> HTTP ${res.status}`);
  return res.json();
}

const slimTopic = (t) => t && {
  topicID: t.topicID,
  topicName: t.topicName,
  isLive: t.isLive,
  isLiveNow: t.isLiveNow,
  createDateTime: t.createDateTime,
  liveEventDateTime: t.liveEventDateTime,
  durationInSeconds: t.proofs?.[0]?.blobResponse?.durationInSeconds ?? null,
  views: t.topicFacts?.views ?? t.views ?? null,
  liveViews: t.topicFacts?.liveViews ?? t.liveViews ?? null,
};

async function snapshot(nowMs) {
  const snap = stamp(nowMs);
  const [foxhole, videos] = await Promise.allSettled([
    getJson('user/getFoxholeStreamersPorted/'),
    getJson(`topic/getUserVideos/${FRANK_ID}/0?filter=recent&search=undefined`),
  ]);
  if (foxhole.status === 'fulfilled') {
    const frank = foxhole.value.find((s) => s.userID === FRANK_ID);
    snap.foxhole = { streamerCount: foxhole.value.length, frankListed: !!frank, frankTopic: slimTopic(frank?.topic) };
  } else {
    snap.foxholeError = String(foxhole.reason);
  }
  if (videos.status === 'fulfilled') {
    snap.newestTopics = videos.value.slice(0, 3).map(slimTopic);
  } else {
    snap.videosError = String(videos.reason);
  }
  return snap;
}

// Reduce a snapshot to the fields we watch; null when both endpoints failed.
function watchState(snap) {
  if (snap.foxholeError && snap.videosError) return null;
  const listed = snap.foxhole ? snap.foxhole.frankListed : null;
  const newest = snap.newestTopics?.[0];
  const fromList = snap.foxhole?.frankTopic;
  const isLiveNow = !!(fromList?.isLiveNow || newest?.isLiveNow);
  const liveTopicId = fromList?.isLiveNow ? fromList.topicID : newest?.isLiveNow ? newest.topicID : null;
  return { listed, isLiveNow, newestTopicId: newest?.topicID ?? null, liveTopicId };
}

function diffEvents(prev, cur) {
  const out = [];
  if (prev.listed !== null && cur.listed !== null && prev.listed !== cur.listed) out.push(`frankListed ${prev.listed} -> ${cur.listed}`);
  if (prev.isLiveNow !== cur.isLiveNow) out.push(`isLiveNow ${prev.isLiveNow} -> ${cur.isLiveNow}`);
  if (prev.newestTopicId !== cur.newestTopicId && cur.newestTopicId !== null) out.push(`newestTopicId ${prev.newestTopicId} -> ${cur.newestTopicId}`);
  return out;
}

// FlipSide start: after the earliest ET time, Frank goes not-live -> live, or a different live topic id appears.
function isFlipSideStart(prev, cur, nowMs, earliestMs) {
  if (nowMs < earliestMs || !cur.isLiveNow) return false;
  return !prev.isLiveNow || (cur.liveTopicId !== null && cur.liveTopicId !== prev.liveTopicId);
}

function logEvent(nowMs, text) {
  const s = stamp(nowMs);
  const line = `${s.ts} | ${s.tsET} | ${text}`;
  fs.appendFileSync(EVENT_OUT, line + '\n');
  console.log(line);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitUntil(targetMs) {
  console.log(`Waiting until ${fmtEt(targetMs)} (${fmtLocal(targetMs)} local)`);
  while (Date.now() < targetMs) await sleep(Math.min(WAIT_CHECK_MS, Math.max(1000, targetMs - Date.now())));
}

function parseStartAt(argv) {
  const i = argv.indexOf('--start-at');
  if (i === -1) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(argv[i + 1] || '');
  if (!m || +m[1] > 23 || +m[2] > 59) throw new Error('--start-at needs HH:MM (24h, America/New_York)');
  return [+m[1], +m[2]];
}

async function main() {
  const argv = process.argv.slice(2);
  const once = argv.includes('--once');
  const startAt = parseStartAt(argv);

  if (startAt) {
    const target = etDayInstant(Date.now(), startAt);
    if (target > Date.now()) await waitUntil(target);
    else console.log(`${fmtEt(target)} already passed today, starting now`);
  }

  const startMs = Date.now();
  const earliestMs = etDayInstant(startMs, FLIPSIDE_EARLIEST);
  const deadlineMs = etDayInstant(startMs, FLIPSIDE_DEADLINE);
  let absStopMs = etDayInstant(startMs, ABSOLUTE_STOP);
  if (absStopMs <= startMs) absStopMs = etDayInstant(startMs, ABSOLUTE_STOP, 1);
  console.log(`Logging. FlipSide window opens ${fmtEt(earliestMs)}, no-start stop ${fmtEt(deadlineMs)}, absolute stop ${fmtEt(absStopMs)}`);

  let prev = null;
  let stopAtMs = null;
  for (;;) {
    const nowMs = Date.now();
    const snap = await snapshot(nowMs);
    fs.appendFileSync(SNAP_OUT, JSON.stringify(snap) + '\n');
    const cur = watchState(snap);
    if (cur) {
      if (!prev) {
        logEvent(nowMs, `INIT listed=${cur.listed} isLiveNow=${cur.isLiveNow} newestTopicId=${cur.newestTopicId} liveTopicId=${cur.liveTopicId}`);
      } else {
        for (const e of diffEvents(prev, cur)) logEvent(nowMs, `CHANGE ${e}`);
        if (stopAtMs === null && isFlipSideStart(prev, cur, nowMs, earliestMs)) {
          stopAtMs = nowMs + RUN_AFTER_FLIPSIDE_MS;
          logEvent(nowMs, `FLIPSIDE_START liveTopicId=${cur.liveTopicId}; stopping ${fmtEt(stopAtMs)}`);
        }
      }
      prev = cur;
    } else {
      logEvent(nowMs, 'ERROR both endpoints failed');
    }
    if (once) return;

    const after = Date.now();
    if (after >= absStopMs) { logEvent(after, 'STOP absolute stop reached'); return; }
    if (stopAtMs !== null && after >= stopAtMs) { logEvent(after, 'STOP 2h after FlipSide start'); return; }
    if (stopAtMs === null && after >= deadlineMs) { logEvent(after, 'STOP no FlipSide start by deadline'); return; }
    await sleep(INTERVAL_MS);
  }
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
} else {
  module.exports = { etToInstant, etDayInstant, fmtEt, isFlipSideStart, diffEvents, watchState };
}
