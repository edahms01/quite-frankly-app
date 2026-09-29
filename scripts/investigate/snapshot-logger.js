#!/usr/bin/env node
// Polls Pilled's public API for Frank's live state; appends JSONL. Usage: node snapshot-logger.js [--once]
const fs = require('fs');
const path = require('path');

const API = 'https://pilled-lqs-api.pilled.net';
const FRANK_ID = 27724;
const INTERVAL_MS = 60_000;
const MAX_RUNTIME_MS = 4 * 60 * 60 * 1000;
const OUT = path.join(__dirname, 'snapshots.jsonl');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

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

async function snapshot() {
  const snap = { ts: new Date().toISOString() };
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

async function main() {
  const once = process.argv.includes('--once');
  const stopAt = Date.now() + MAX_RUNTIME_MS;
  do {
    const snap = await snapshot();
    fs.appendFileSync(OUT, JSON.stringify(snap) + '\n');
    console.log(`${snap.ts} frankListed=${snap.foxhole?.frankListed} newest=${snap.newestTopics?.[0]?.topicID} live=${snap.newestTopics?.[0]?.isLiveNow}`);
    if (once) return;
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  } while (Date.now() < stopAt);
  console.log('Reached 4h limit, stopping.');
}

main().catch((e) => { console.error(e); process.exit(1); });
