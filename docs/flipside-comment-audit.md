# FlipSide comment audit

Date: 2026-09-29. Read-only audit. Script: `scripts/investigate/comment-audit.js`. No app code changed.

## Verdict

**No, Frank's YouTube comments cannot gate a FlipSide.** In his last 100 livestream VODs (2026-06-06 to 2026-09-28) he left only **4** comments with a pilled.net link. All four are FlipSide recaps posted **after** the FlipSide, never before. Use the Pilled live flag instead (see Recommendation).

## Key finding: a FlipSide is not its own Pilled topic

The audit's first assumption (a FlipSide is a separate late-evening Pilled topic) does not hold. The FlipSide runs **inside the same Pilled live topic as the 7pm show**, after the YouTube stream ends:

- Sep 21: the linked topic 1525298 is the 7pm show. Its link carries `?time=7089`. Topic `liveEventDateTime` 23:00Z plus 7089 s is 00:58:09Z. The YouTube stream ended 00:56:33Z. The Pilled topic ran 10,053 s in total, about 50 minutes longer than YouTube.
- The same pattern holds on the other three comments (implied FlipSide start within 1 to 6 minutes of the YouTube end).
- Across 59 matched weeknight shows, Pilled's topic outlasts the YouTube stream by 17 to 58 minutes (median 40) on **56 of 59 nights**. Only 3 nights (Jul 13, Jul 20, Aug 3) lack a meaningful extension. So a FlipSide happens on roughly every weeknight Mon to Thu (this is inferred from durations, not from watching each one). No Friday show matched a YouTube VOD, so Fridays are not counted.

Consequence for detection: on a FlipSide night Frank never goes "not-live to live" on Pilled, and no new live topic ID appears. Pilled simply stays live while YouTube goes offline. `snapshot-logger.js`'s FlipSide-start trigger (not-live to live, or a new live topic ID after 8:55pm ET) will not fire. Its 10:00pm ET failsafe will end the run, which still captures the full window (the extension ends about 9:40 to 9:50pm ET).

## Method

- **VODs:** 100 livestreams from the uploads playlist `UUtB5nbKHYsX8EGIk9cOevaQ`, filtered to `liveStreamingDetails.actualStartTime`. Range 2026-06-06 20:02 EDT to 2026-09-28 18:59 EDT.
- **Comments:** `commentThreads.list` with `searchTerms=pilled.net`, `part=snippet,replies`, `order=time`, filtered to `authorChannelId UCtB5nbKHYsX8EGIk9cOevaQ`, with extra `comments.list` calls when a thread had more replies than were embedded. Validated first on the known case (video `HUAb5E2JuEo`, Sep 21): `searchTerms` found the Frank comment with topic 1525298, and a full scan of all 34 threads found the same single hit, so `searchTerms` was used for the rest. This was validated on one video only.
- **Comments disabled:** none of the 100 videos.
- **Pilled history:** `topic/getUserVideos/27724/<page>`, unauthenticated, one request per 2 s, back to 2026-06-05 (92 topics).
- **Candidate rule from the brief:** Mon to Fri, 20:45 to 23:59 ET, not the 19:00 slot. 4 topics matched. 8 exceptions: 6 weekend late-night streams (Saturday Night Lounge and similar), 2 topics without a `liveEventDateTime`.
- **Quota used:** 110 of 1,500 units (playlistItems 4, videos 4, commentThreads 101, comments 1). A later rerun used 0 (cached).

## The 4 candidates from the brief's rule (separate late topics)

| Date (ET) | Topic | Title | Comment found | Lead time | Top-level or reply |
|---|---|---|---|---|---|
| Tue 2026-09-22 21:25 | 1527491 | THE AK SHOW - LATE NIGHT CHILLFEST | N | n/a | n/a |
| Tue 2026-09-15 22:15 | 1518683 | QFTV After Hours! Tuesday Night! | N | n/a | n/a |
| Thu 2026-07-30 22:00 | 1469176 | AFTER HOURS: House of Numbers | N | n/a | n/a |
| Fri 2026-07-17 21:00 | 1455485 | [FILM CLUB Watch Party] Idiocracy (2006) | N | n/a | n/a |

Recall under this rule: **0 / 4**. These are extra one-off streams, not the nightly FlipSide, and none had a link comment.

## The 4 Pilled-link comments (all top-level, none are replies)

| Comment published (ET) | Video | Topic linked | Show night | Seek offset | Minutes after YouTube end | Minutes after Pilled end |
|---|---|---|---|---|---|---|
| Mon 2026-09-21 22:23 | HUAb5E2JuEo | 1525298 | Mon 9/21 | 7089 s | +87 | +36 |
| Thu 2026-08-27 22:12 | a5RXeclWfHs | 1495967 | Thu 8/27 | 7367 s | +77 | +32 |
| Thu 2026-08-27 10:45 | GOXVdVT7pII | 1494802 | Wed 8/26 | 7578 s | +822 | +789 |
| Wed 2026-08-26 10:31 | M6sn1Sc4Fu0 | 1494065 | Tue 8/25 | 7641 s | +805 | +746 |

Comment text on the last three: "Thursday Night's Flipside: ...", "Here's last night's Flipside, where we watched the short doc on The Brooklyn Bridge: ...", "here's the flipside: ALS, Music, Frank's vicious abuse of a chatgpt ai agent, and more... ..." The Sep 21 comment leads with a Culture Club plug and includes the link.

## Metrics

- **Recall (FlipSide nights with a link comment / all FlipSide nights):** 4 / 56 = **7%** (56 FlipSide nights inferred from the duration proxy). Under the brief's literal rule: 0 / 4.
- **Precision (link comments that belong to a FlipSide / all link comments):** **4 / 4 = 100%** by content (each links a show topic at a seek offset within 1 to 6 minutes of the YouTube end). Under the brief's literal rule: 0 / 4, because none link a separate late topic. Non-FlipSide Pilled-link comments: **none**.
- **Lead time:** none positive. The comment is always **after** Pilled's FlipSide start: 77 to 87 minutes after the YouTube end on the same night (32 to 36 minutes after Pilled's stream ended, so after the FlipSide was over), or about 13 hours later the next morning. Lead is therefore negative on every night: -822 (min), -446 (median), -77 (max) minutes relative to the YouTube end.
- **Before or after Pilled's `liveEventDateTime`:** all four are after. Two are after the whole Pilled stream ended.
- **Day of week:** comments fell on show nights Tue 8/25, Wed 8/26, Thu 8/27 and Mon 9/21. FlipSide nights by weekday in range: Mon 12 of 15 shows, Tue 16, Wed 14, Thu 14. Comments came in a run of three consecutive nights in late August and once in September, nothing on Sep 22 to 28. No weekday pattern; it looks like an occasional habit, not a routine.

## Recommendation

**Not usable as a gate.** Recall is 7%, and every comment lands after the FlipSide.

Use the Pilled flag as the gate. Proposed rule for a weeknight (Mon to Thu):

1. The YouTube live status for the 7pm show is not live (stream ended, roughly 8:55 to 9:05pm ET), and
2. `getFoxholeStreamersPorted` lists userID 27724 with `topic.isLiveNow: true` (or the newest topic from `getUserVideos/27724/0` has `isLiveNow: true`), and the live topic is the same one as the show.

That state means "FlipSide in progress". It lasted 17 to 58 minutes (median 40) across the last 56 nights. The two signals come from independent sources, so a Pilled dropout or a YouTube lag alone will not trigger it. The `?time=` value in a later Frank comment can add a deep link to the FlipSide start for past nights, but it should not drive the alert.

Caveat: the Pilled flag has still not been watched flipping during a real FlipSide. `snapshot-logger.js` (start it at 6:45pm ET) will confirm that `isLiveNow` stays true after the YouTube stream ends.

## Limits of this audit

- The FlipSide-night count comes from a duration proxy (Pilled topic longer than the YouTube stream by 15 minutes or more), not from a list of confirmed FlipSides.
- Only comments were searched. Frank might post the Pilled link in live chat, a pinned comment on another platform or the video description, none of which this audit covers.
- `searchTerms` was validated on one video. A full scan was not run on the other 99, so a comment that `searchTerms` fails to match (odd URL formatting) would be missed.
- Comments deleted by Frank are not visible.
