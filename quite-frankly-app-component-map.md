# Quite Frankly — Component & Data Source Map

Companion to `quite-frankly-app-plan.md` (decisions/reasoning) — this doc is the flat reference: every screen, what it does, where it's reached from, where it goes, and what data feeds it. Built for handoff, not for reading top to bottom.

## Data source legend

| Code | Source | Notes |
|---|---|---|
| `YT-RSS` | YouTube RSS feed | Free, no API key, caps at 15 items. Powers Home's "Most Recent" and Watch's grid (14 shown). |
| `YT-API` | YouTube Data API | Metered/quota'd — live-detection polling only, not used for anything else. |
| `SC-RSS` | SoundCloud RSS feed | No native pagination — backend caches/parses it, app paginates against the cache. Powers Listen. |
| `SHEET-AUDIO` | Shared Google Sheet, "audio history" tab | Long-term archive, not read by the app — for future projects (transcription, clip-finding). Two URL columns, published vs. resolved. |
| `SHEET-SHOP` | Shared Google Sheet, "Shop & Affiliates" tab | Frank/Eric-editable. Powers Shop's two sections. |
| `SHEET-BUGS` | Shared Google Sheet, "Bug Reports" tab | Write-only from the app (Netlify function appends a row). |
| `CALENDAR` | Frank's digital calendar | Source not yet confirmed — best case a public ICS feed, fallback a manual sheet. Powers Calendar. |
| `SQSP` | Squarespace Commerce | Native checkout loads Frank's real page in-WebView. Future: merchant-API membership lookup (deprioritized). |
| `BANDCAMP` | Bandcamp official embed | Album ID `1087783863`, same one already live in QF OS. |
| `STATIC` | Hardcoded in-app | URLs/copy baked in, no live source. |
| `NONE` | — | No external data. |

## Screens

| Screen | Purpose | Reached from | Links to / actions | Data feeding it | Notes |
|---|---|---|---|---|---|
| **Onboarding — Welcome** | First-launch intro, value prop | App launch (first open only) | → Notifications; Skip → Home | `NONE` | 1 of 3 onboarding steps |
| **Onboarding — Notifications** | Soft-ask before the real OS permission dialog | Welcome | → Email (either button); triggers native permission prompt on "Enable" | `NONE` | 2 of 3 |
| **Onboarding — Email** | Light sign-in — email only, no password | Notifications | → Home (either button) | Submits email to backend | 3 of 3. Code-entry step after this isn't built yet. Copy nudges members to use their subscription email for future verification. |
| **Home** | Launcher hub — status + every destination one tap away | App open (post-onboarding); Home tab | → Watch, Listen, Members Only, Community, Shop, Calendar, Writing, Band, Account (avatar) | `YT-API` (live status), `YT-RSS` (Most Recent card) | Fixed layout, no scroll by design |
| **Watch** | Live status, platform links, video grid, audio entry | Home card; Watch tab; Home's "Next Show"/Most Recent | → per-video: Video Player; platform pills (external: YouTube/Rumble/Twitch/Pilled); Listen; "View more on YouTube" (external) | `YT-API` (live status), `YT-RSS` (grid, 14 shown) | WebView embeds need explicit Referer header — see plan doc |
| **Video Player** | In-app playback of a finished YouTube upload | Any video tap on Watch | "Watch on YouTube" (external), Share, back → Watch | `YT-RSS` (video ID/title), video itself via `youtube.com/embed/` | Never used for live streams — VOD only |
| **Listen** | Podcast episode list | Home card; Watch's "Listen instead" | Tap episode → plays via persistent mini-player (docks above tab bar app-wide); Load More | `SC-RSS` (backend cache, not `audio history` — see below) | Mini-player is the actual playback surface, not a separate screen |
| **Members Only** | Culture Club browsing — join CTA, event preview | Home card ("Members Only"); Members Only tab | Join → Subscription; every member-content row → external quitefrankly.tv login | `STATIC` (v1) | No in-app unlock logic yet — everything member-gated routes externally |
| **Community** | Social links + events | Home card | External: Discord, Telegram, X, Instagram, Tumblr, Forum; Main Event row | `STATIC` | |
| **Shop** | Real stores + affiliate codes | Home card | Each row → external store/affiliate URL | `SHEET-SHOP` | Two sections: Shop (4 stores) and Affiliates (10 codes) |
| **Calendar** | Weekly Sun–Sat schedule, regular show + Culture Club unified | Home card | back → Home | `CALENDAR` | Source TBD — open item with Frank |
| **Writing** | Blog, Newsletter Archive, Guest Appearances | Home card | Blog (external), Newsletter Archive (external); Guest Appearances not live | `STATIC` | Guest Appearances is a future monetization slot, not built |
| **Band** | Frank's band content | Home card | Bandcamp embed itself | `BANDCAMP` | Wireframe shows a styled mockup — this tool can't load real external iframes, but the real app would use the genuine embed |
| **Account** | Profile/settings hub | Avatar icon, any main screen | → Subscription, Notifications, Donation, Report a Bug; Sign Out | User profile data (once real account exists) | |
| **Donation** | One-time support options — no subscription | Account | External: PayPal, Amazon Storefront; tap-to-copy: BTC, XRP addresses | `STATIC` | Mail address shown as plain text, not a link |
| **Subscription** | Choose how to subscribe | Account; Members Only's Join button | Quite Frankly → Checkout (in-app sheet); Patreon/SubscribeStar → external (OS-level open, not WebView) | `NONE` | Patreon/SubscribeStar use OS-level open so Universal Links/App Links can hand off to their native apps |
| **Subscription Checkout** | Native sign-up, in-app sheet | Subscription's "Continue with Quite Frankly" | → Confirmed (on submit); Done → back to Subscription | `SQSP` (live page loaded in-WebView) | System browser chrome (SFSafariViewController/Custom Tabs), not embedded WebView — needed for autofill/security |
| **Subscription Confirmed** | Post-purchase confirmation | Checkout, after URL leaves the checkout page | → Home | `NONE` | Detection is "URL changed," not an exact confirmation-page match — see plan doc for the edge case |
| **Notifications (settings)** | Alert toggles | Account | Toggles only, no navigation | User preference state | Live Alerts, New Video Alerts, Culture Club Reminders (Shorts folded into New Video, no separate toggle) |
| **Report a Bug** | Bug report form | Account | Submits to backend; back → Account | Writes to `SHEET-BUGS` | Intro blurb clarifies it's fan-run, not Frank's own support line |

## Sheet interaction patterns

Schema (columns, tabs) was defined above; this is the missing piece — how reads and writes actually happen, and what triggers each.

**Shop & Affiliates — read-only, no auth needed**
- Publish the tab to the web as CSV (Google Sheets: File → Share → Publish to web → select tab → CSV). Gives a public, stable CSV URL fetchable with a plain HTTP GET — no API key, no service account.
- App fetches and caches locally. Refresh once per app launch — this content changes rarely, no need for anything more frequent.
- If the fetch fails (offline, sheet temporarily down), fall back to the last cached copy rather than showing an empty Shop screen.

**Bug Reports — write-only, needs real auth**
- Never read by the app — purely a destination log Eric/Frank open directly in Sheets.
- Writing needs the Google Sheets API v4 (the publish-to-web trick only works for reading), authenticated via a service account. The service account's JSON key lives as a Netlify environment variable — never bundled into the app itself, since that would expose write credentials to anyone who decompiles it.
- Flow: user submits Report a Bug → app calls a Netlify serverless function (server-side, holds the credential) → function appends one row via the Sheets API. The app never talks to Google directly for this.

**`youtube rss` and `audio history` — write-only, same auth pattern as Bug Reports**
- Same service account + Sheets API v4 mechanism, but the trigger isn't a user action — it's the same backend polling job that already has to run for Home's "Most Recent" card, Watch's grid, and Listen's pagination cache.
- After that job does its normal work (updating the app's own cache), it also appends a row to `youtube rss` (new videos) or `audio history` (new podcast episodes) as a side effect — one job, two purposes, not two separate jobs to maintain.
- Needs an idempotency check before appending: look up whether this Video ID (or this episode's Audio File URL) already has a row, skip if so. Without this, a job polling every few minutes would create a duplicate row every cycle it still sees the same current episode.

## Open items this map surfaces

- **Calendar's real source** — need to ask Frank what he actually uses (ICS-capable calendar vs. manual).
- **SoundCloud feed URL** — get directly from Frank's SoundCloud account (Settings → Content tab), not guessable.
- **Shop & Bug Reports sheet** — one shared Google Sheet, separate tabs, not yet created.
- **Member-unlocked states** — every "member" screen only shows the non-member view; real auth (deprioritized) would add a second state to each.

## External link reference

Every real outbound URL, confirmed from quitefrankly.tv itself. ✅ wired into the wireframe already; the rest listed for dev reference.

### Site pages (quitefrankly.tv)
| Page | URL |
|---|---|
| Home | https://www.quitefrankly.tv/ |
| About | https://www.quitefrankly.tv/about |
| Blog | https://www.quitefrankly.tv/blog |
| Newsletter Archives | https://www.quitefrankly.tv/newsletter-archives |
| Articles | https://www.quitefrankly.tv/articles |
| Forum | https://quitefranklyforum.vbulletin.net/forum/quite-frankly-forum |
| Members Only (content) | https://www.quitefrankly.tv/quite-frankly-members-only |
| Member Lounge | https://www.quitefrankly.tv/member-lounge |
| Patron Account Login | https://www.quitefrankly.tv/account/login |
| Culture Club Archive | https://www.quitefrankly.tv/culture-club-archive |
| Main Event / Live Events | https://www.quitefrankly.tv/the-quite-frankly-live-events |
| Native subscribe (product page) | https://www.quitefrankly.tv/patrons-products/quite-frankly-at-your-service |
| Sponsor / Culture Club landing | https://www.quitefrankly.tv/sponsor |
| Affiliates (source page) | https://www.quitefrankly.tv/affiliates |
| Contact | https://www.quitefrankly.tv/contact |

### Social ✅
| Platform | URL |
|---|---|
| X / Twitter | http://twitter.com/QuiteFranklyTV |
| Tumblr | http://stonedandstudying.tumblr.com |
| Instagram | https://www.instagram.com/quitefranklyofficial/ |
| YouTube (main) | https://www.youtube.com/channel/UCtB5nbKHYsX8EGIk9cOevaQ |
| YouTube (Zedalza, band) | https://www.youtube.com/user/ZedalzaFilms |
| Apple Podcasts | http://apple.co/2dMURMq |
| Twitch | https://www.twitch.tv/quitefranklylive |
| Rumble | https://rumble.com/c/QuiteFrankly |
| Pilled/Foxhole embed | https://pilled.net/foxhole/27724/iframe?theme=black |
| Discord | ✅ https://discord.gg/yzzqnGgzEv (server ID `1249214370290995200`) — set to never expire |
| Telegram | ✅ https://t.me/quitefranklytv |

### Shop ✅
| Store | URL |
|---|---|
| Apparel (Rise Attire) | https://riseattireusa.com/intl/quitefrankly/ |
| Coffee Revolution | https://www.coffeerevolution.shop/category/quite-frankly |
| Keto Brainz | https://ketobrainz.com/pages/quite-frankly-tv-podcast |
| Gold & Silver (Wise Wolf) | https://quitefrankly.gold/ |

### Affiliates ✅
| Partner | URL | Code |
|---|---|---|
| Keto Brainz | https://ketobrainz.com/pages/quite-frankly-tv-podcast | FRANKLY (15%) |
| Wise Wolf Gold & Silver | https://quitefrankly.gold | mention "Quite Frankly" |
| Coffee Revolution | https://www.coffeerevolution.shop/category/quite-frankly | free ship $50+ |
| Patriot Protect | http://patriot-protect.com/ | FRANKLY (15%) |
| Blue Monster Prep | https://bluemonsterprep.com | FRANKLY (free ship) |
| Pluck | https://eatpluck.com/discount/SUMMER?redirect=%2Fproducts%2Fpluck-superfood-seasoning-master | (discount link, no code) |
| Cultivate Elevate | https://cultivateelevate.com/?ref=quitefrankly | Frankly10 |
| **J Gulinello — Health Reclamation Project** *(newly found, not yet in Shop wireframe)* | https://www.HealthReclamationProject.com | none |
| YesCacao | https://www.yescacao.com | FRANKLY |
| Apex Water | https://www.apex-water.com/frankly/ | mention "Victoria" |
| Flip City Magazine | https://flip-city-magazine.myshopify.com?rs_ref=4kksofoy | FRANKLY (10%) |
| Farmalogical Bone Broth | https://farmalogical.com | FRANKLY (15%) |

### Donation ✅ (new)
| Option | URL / value |
|---|---|
| PayPal (one-time tip) | http://www.paypal.me/QuiteFranklyLive |
| Amazon Storefront | https://amazon.com/shop/quitefranklyofficial |
| Bitcoin | `bc1q97w5aazjf7pjjl50n42kdmj9pqyn5zndwh3lng` |
| XRP | `rnES2vQV6d2jLpavzf7y97XD4AfK1MjePu` |
| Mail | Quite Frankly, 222 Purchase Street, #105, Rye, NY 10580 (shown as text, not a link) |

All found in a real episode's show notes (`spotify-all` tab, FrankClips sheet) — none of these were previously represented anywhere in the app.

### Membership platforms ✅
| Platform | URL |
|---|---|
| Patreon | https://www.patreon.com/QuiteFrankly |
| SubscribeStar | https://www.subscribestar.com/quitefrankly |

### Writing ✅
Blog and Newsletter Archive use the site page URLs above.

### Band
Bandcamp album ID `1087783863` (already confirmed, see plan doc) — no separate URL needed, it's an embed parameter.

