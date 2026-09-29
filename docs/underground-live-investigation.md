# Underground / after-hours live detection: investigation

Date: 2026-09-29. Investigation only. No app code, Netlify functions, Sheets or env vars were changed.

## Summary

Pilled's web app is a JavaScript shell over a **public, unauthenticated JSON API** at `https://pilled-lqs-api.pilled.net`. The `foxhole/27724/iframe` embed does not loop a "live" feed. It shows Frank's newest topic, which is a finished replay when he is offline (`isLive:false`). Two plain GET endpoints give a reliable "is Frank live now" signal, and the same endpoints distinguish the 7pm show, the morning B-Sides and after-hours streams by scheduled time. No login, cookie or token was needed for any endpoint below.

Frank's Pilled user: `userID 27724`, `userName QuiteFranklyTV`.
YouTube channel: `UCtB5nbKHYsX8EGIk9cOevaQ`.

## Endpoints found (all unauthenticated, HTTP 200 with a plain curl and a normal browser User-Agent)

| Endpoint (base `https://pilled-lqs-api.pilled.net`) | Returns | Use |
|---|---|---|
| `GET /user/getFoxholeStreamersPorted/` | Array of every streamer live right now (58 at test time), each with `userID`, `userName` and `topic{topicID,isLive,isLiveNow,createDateTime,liveEventDateTime,topicFacts{liveViews,views,...}}` | **Best "live now" flag.** Frank is present in the array only while streaming. At test time (offline) he was absent. |
| `GET /topic/getUserVideos/27724/{page}?filter=recent&search=undefined` | Frank's topics, newest first (page 0 = newest). Same fields as above plus `proofs[0].blobResponse.durationInSeconds` and the video URLs | Newest topic, its title, scheduled start, live flag and duration. Lists history (used for the schedule analysis below). |
| `GET /topic/getTopicByTopicIDNew/{topicID}` | One topic: `topicName`, `topicID`, `createDateTime`, `liveEventDateTime`, `isLive`, `isLiveNow`, `isStream`, `topicFacts`, `topicGuid` | Poll a single known topic cheaply. |
| `GET /user/getUserByUsername/QuiteFranklyTV` | Profile, `isFoxholeStreamer:true`, banner, bio | Maps username to `userID`. |
| `GET /comment/listAllCommentsByTopicID/{topicID}`, `GET /topic/getTopicCommentsByTopicThreadID/{threadID}/0?filter=top` | Topic chat and comments | Not needed for detection. |
| `wss://pilled-socket.pilled.net/socket.io/` (Socket.IO v4) | Realtime chat and stream events | Not investigated further. Realtime push, but a persistent socket does not suit a Netlify function. |

Other endpoints seen loading (ads, stickers, gold pills, `token/login`, `createViewer`, Stripe and Google Pay) are not relevant. `token/check` and `token/login` are called by the page automatically. Nothing above needed them.

`legacy.pilled.net` serves the same Angular shell (HTTP 200, about 53 KB, `<app-root>` with no server-rendered content). It is not easier to parse and calls the same API. There is no separate legacy topic page worth using.

### Redacted sample: live flag

Sample from `getFoxholeStreamersPorted` for a live streamer:

```json
{
  "userID": 190731,
  "userName": "<streamer>",
  "topic": {
    "topicID": 1534867,
    "createDateTime": "2026-09-29T14:04:49.349Z",
    "isLive": true,
    "isLiveNow": true,
    "liveEventDateTime": "2026-09-29T16:00:00.000Z",
    "topicFacts": { "liveViews": 3, "views": 6, "isStream": true }
  }
}
```

Sample from `getUserVideos/27724/0` for Frank's finished 7pm show:

```json
{
  "topicID": 1533895,
  "topicName": "QUITE FRANKLY LIVE | Murder Soap Operas, Chris Hansen & Other Strange Turns",
  "isLive": false,
  "isLiveNow": false,
  "createDateTime": "2026-09-28T17:39:20.675Z",
  "liveEventDateTime": "2026-09-28T23:00:00.000Z",
  "durationInSeconds": 9210
}
```

## What the topic in the shared link is

`https://pilled.net/topic-detail/1525298?time=7089` redirects to `/foxhole/QuiteFranklyTV?topic=1525298&time=7089`. Topic 1525298 is the **completed** 2026-09-21 show ("A Familiar Rabbit Hole: Predators in High Places", `isLive:false`, 10053 s long). `?time=7089` is a seek offset in seconds into that replay. The player showed "Current Time 1:58:52 / Duration 2:47:33", so the link was a replay. Each stream gets its own topic ID, created hours before the stream (the 7pm show's topic is created about 5.5 hours ahead, around 17:30Z for a 23:00Z start), so **topic creation does not mean "live now"**. Use `isLiveNow`.

## Frank's schedule from history (`liveEventDateTime`, UTC; ET is UTC-4 in summer)

- Morning: `14:30Z` (10:30am ET), titled "B-SIDES | ..." (weekdays).
- Main show: `23:00Z` (7pm ET), titled "QUITE FRANKLY LIVE | ...", about 9,000 to 10,500 s.
- After-hours or extra streams (irregular, titles vary): "QFTV After Hours! Tuesday Night!" (topic 1518683, `liveEventDateTime` 2026-09-16T02:15Z, i.e. Tue 9/15 10:15pm ET, 14,273 s), "THE AK SHOW - LATE NIGHT CHILLFEST" (2026-09-23T01:25Z, 23,711 s), "SATURDAY NIGHT LOUNGE | ..." (Sat nights about 01:00Z to 02:45Z), "AFTER HOURS: House of Numbers" (2026-07-31T02:00Z). Roughly one or two a week, not nightly, and the title has no fixed pattern.

So an after-hours stream cannot be identified by title. It can be identified by timing: a Frank topic with `isLiveNow:true` whose `liveEventDateTime` is not `14:30Z` or `23:00Z`, or Frank being live after the main show has ended.

## Candidate signals

| Signal | Tells us | Latency and cost | Verdict |
|---|---|---|---|
| **A. Frank in `getFoxholeStreamersPorted` with `topic.isLiveNow:true`** | Live now, any kind (show, B-Sides, after-hours) | One GET per poll, no quota, about 60 s at the poll interval | **Best.** Absent means offline. Needs confirmation during a real live window (see the tonight test). |
| **B. Newest topic from `getUserVideos/27724/0` has `isLiveNow:true`** | Live now, plus title and scheduled time to classify it | One GET per poll | Equivalent to A. Also gives `topicID`, so the app can link straight to the topic. Good cross-check. |
| **C. New topic appears with `liveEventDateTime` in the future** | Planned, not yet live (scheduled) | Same GET | Planned-vs-live signal. Topics are created hours ahead, so a future `liveEventDateTime` with `isLiveNow:false` means "scheduled". |
| **D. `isLive:false` on the newest topic** | Finished or replay | Same GET | Replay signal. |
| **E. Frank's YouTube comment containing a `pilled.net` link** | Frank announced a Pilled stream | commentThreads.list costs 1 quota unit per call | **Not usable.** See below. |

### YouTube comment check (step 5)

Key: `YOUTUBE_LIVE_STATUS_API_KEY`, read from the Netlify site env (it is not in the local `.env`). Checked the three most recent 7pm-show videos with `commentThreads.list` (1 unit per call, `maxResults=100`, `order=time`), filtered to `authorChannelId == UCtB5nbKHYsX8EGIk9cOevaQ`.

- `_9C5KaRuXyk` (Sep 28 show): 17 top-level comments, none from Frank.
- `qprGyS7QIss` (Sep 24 show): none from Frank.
- `HUAb5E2JuEo` (Sep 21 show): one comment from Frank (a Culture Club membership plug), **no `pilled.net` link**.

Frank's own comments are retrievable by the API, but no pilled.net link was present in any of the sampled videos. Posting delay could not be measured. YouTube is not a dependable signal for after-hours streams.

## Detection designs, ranked

1. **Server-side poll of `getFoxholeStreamersPorted` (Signal A), cross-checked with `getUserVideos/27724/0` (Signal B).** Live if Frank's entry is present and `topic.isLiveNow === true`. Classify with `liveEventDateTime`: `23:00Z` is the main show, `14:30Z` is B-Sides, anything else is after-hours. Run from a scheduled Netlify function with a Blobs cache of about 30 to 60 s so app clients never hit Pilled directly. Most reliable, no quota, no auth.
2. **`getUserVideos` only (Signal B/C/D).** Same data from one call, and it also yields the topic ID for a deep link. Use if the foxhole list proves unreliable for Frank.
3. **Socket.IO subscription.** Lowest latency, but needs a long-lived connection, so it is a poor fit for Netlify. Not recommended.
4. **YouTube comments (Signal E).** Not recommended (see above).

## Risks

- **Unofficial, undocumented API.** Pilled can change field names, add auth or block server-side traffic at any time. Build a fail-closed default ("not live") and log parse failures.
- **Terms of service** for Pilled were not reviewed. Polling at 1 request per minute with a normal User-Agent is low load, but check the ToS and consider asking Pilled or Frank's team whether an official integration exists.
- **Not yet verified during a live Frank stream.** All data above was captured while Frank was offline (Tuesday 12pm ET). Whether `isLiveNow` flips promptly and whether Frank appears in the foxhole list while live is inferred from other streamers' rows and from historical topics, not observed for Frank.
- `isLive` versus `isLiveNow`: both were `true` for every currently-live streamer. Whether they ever differ (for example while a stream is scheduled but not started, or just after it ends) is unknown until the logger captures a transition.
- `getUserVideos` sometimes has topics with a blank `liveEventDateTime` and duration (for example 1478221, 1448977). Treat missing fields as "unknown", not live.

## Tonight's capture

`scripts/investigate/snapshot-logger.js` polls both endpoints every 60 s for at most 4 hours and appends timestamped JSONL to `scripts/investigate/snapshots.jsonl` (gitignored, as are the HARs). Run at 6:45pm ET on a weeknight:

```
cd /Users/eric/Desktop/Claude/quite-frankly-mobile-app && node scripts/investigate/snapshot-logger.js
```

`--once` writes a single snapshot and exits. Look in the output for the moment Frank appears in `foxhole.frankListed`, when `newestTopics[0].isLiveNow` flips, and how each changes at the end of the 7pm show and at any after-hours start.
