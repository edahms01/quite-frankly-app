# Play Console answer pack (first submission)

Written 2026-10-30 for the app as it is on `main` from `a30c2b5` on (this pack was written against `90dc131`, versionCode 8): no donation / membership / Culture Club UI, guest-only AskFrankie, push notifications, background audio, YouTube / Spotify / Bandcamp embeds, no accounts, no ads. Answers are in the order the Console asks. **Nothing here has been entered in the Play Console.**

## What already existed
Only `store-icon-512.png` (512x512, opaque; the new jester icon). No other file in `docs/play-console/` or `docs/play-store/` on `main`, and none on any branch or PR. Older store-form text lives inside `CLAUDE.md` ("Ready-to-paste: Google Play Data safety", review notes); this pack replaces and corrects it for the current build.

## Files
| File | Console section |
|---|---|
| `01-data-safety.md` | App content > Data safety |
| `02-content-rating.md` | App content > Content rating (IARC) |
| `03-foreground-service.md` | App content > Foreground service permissions (text + 30 s video shot list) |
| `04-store-listing.md` + `listing/*.txt` | Grow > Store presence > Main store listing |
| `05-app-content.md` | App content: privacy policy, app access, ads, target audience, news, government, financial, health, other |
| `06-graphics.md` | Store listing graphics + what to capture from the v8 APK |
| `07-submission-checklist.md` | The order to do it in, who does each step |

## Decisions that are Eric's (also marked inline)
1. **App title** while Frank's written permission is pending (`04`).
2. **Data safety: declare the embedded players as "shared"?** Recommended yes (`01`).
3. **Developer account type** (personal vs organization) decides whether a 14-day closed test is required before production (`07`).
4. **Bug-report retention**: the policy promises deletion after 6 months but nothing deletes them automatically yet (`01`).
