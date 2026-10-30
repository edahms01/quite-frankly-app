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
| `06-graphics.md` | Store listing graphics (feature graphic + 8 screenshots included) |
| `07-submission-checklist.md` | The order to do it in, who does each step |

## Decisions (Eric, 2026-10-30)
1. **Title** `Quite Frankly`; keep "fan-built, independent, not run by Frank"; no "used with permission" (`04`).
2. **Data safety**: YouTube, Spotify and Bandcamp embedded players are **shared**; Netlify, Expo push, Anthropic and Voyage AI are service providers, not shared (`01`).
3. **Developer account** is an Organization account: no closed-test requirement (`07`).
4. **Bug-report retention**: automatic 6-month delete is a separate PR, dry-run only until Eric enables it (`01`).
5. **Graphics**: `feature-graphic-1024x500.png` and `screenshots/` are included (`06`).
