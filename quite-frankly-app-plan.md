# Quite Frankly — Mobile App Project Plan

Living doc. Add to as decisions get made — don't wait for a "final" pass.

## Links & Channels
- YouTube (main): youtube.com/channel/UCtB5nbKHYsX8EGIk9cOevaQ
- YouTube (Zedalza, Frank's band): youtube.com/user/ZedalzaFilms
- Twitch: twitch.tv/quitefranklylive
- Rumble: rumble.com/c/QuiteFrankly
- Pilled/Foxhole (multistream embed): pilled.net/foxhole/27724/iframe?theme=black
- Design System artifact: https://claude.ai/artifact/SM9ZjiDwh76L8oRRsCyezw
- Wireframes artifact: https://claude.ai/artifact/TCXi4rB8DcD1NuLAFEMwXq
- Component & data source map: `quite-frankly-app-component-map.md` (separate file — every screen's purpose, links, and data source, for dev handoff)
- Frontend prep: `quite-frankly-app-frontend-prep.md` (separate file — design tokens and navigation architecture, framework-agnostic; framework choice still open)

## Core goals
1. Fix YouTube's bad notifications — live-start and new video/Short alerts.
2. Surface Culture Club (paid membership) events as a locked/teased carrot for non-members, without needing real per-member auth yet.

## Nav structure
4 tabs: Home, Watch, Members Only, More.

## Home — decided
- Status strip: "Next show / Live now," links to Watch. **Hidden for now (Sep 22 update)**: the "not live" state guessed a static "Weekdays 7:00 PM ET," which isn't reliable without real calendar data — see Calendar section below. Markup is left in place in `Home.dc.html` (wrapped in an HTML comment) rather than deleted, so it's a one-line restore once Schedule has a real feed. The "LIVE NOW" half of this card doesn't actually depend on calendar data (it's YouTube API live status), but the two states share one card, so both are hidden together for now rather than splitting them apart.
- "Most Recent Show" video card — thumbnail + play-button styling, clicks out to the YouTube video page. Auto-updates via the same RSS/WebSub polling used for new-video notifications. **Thumbnail sizing, decided (Sep 22)**: standard 16:9 video ratio, not the earlier squat ~3.24:1 crop — sized to the card's actual content width (350px, from the 390px frame minus 20px side padding), giving a fixed `height: 197px` (350 × 9/16). Fixed pixel value rather than CSS `aspect-ratio`, matching this file's fixed-mockup convention (390×844, not a fluid/responsive layout) and sidestepping any doubt about `aspect-ratio` support in whatever renders these `.dc.html` pages. If Code builds this responsively (real device widths vary), the ratio to preserve is 16:9, not the 197px figure itself.
- Below that: 2x2 grid of square icon cards, no subtitles. Order: Watch, Culture Club, Shop, Community.
- YouTube channel link removed from Home — lives under Watch instead.
- Feed/list view (v1 of Home) scrapped in favor of the above.

## Watch — not yet designed
Placeholder only. Current thinking pre-redesign: live status + platform link-out row (YouTube/Rumble/Twitch/Pilled) + latest videos grid + Zedalza section. Revisit once Home is locked.

## Culture Club — decided
- No tier-comparison table — paid tiers don't unlock different perks yet.
- Events shown as locked rows for non-members ("MEMBERS" tag), unlocked + join-link visible for members.
- Rotating password gates the **live event join links only**, not the members' blog content.
- Frank multistreams to all platforms simultaneously as normal practice — one "live" signal can be treated as a proxy for "live everywhere."

## User Accounts — light, email-based (new direction)
Frank has no real per-user accounts on the site (hence the shared Members Only password). Introducing a light account in this app, scoped to native subscribers only for now:
- **Sign-in flow**: email in → one-time code sent to that email → user enters code. No password to manage.
- **Verification order matters for privacy**: always confirm the person owns the email (the code) *before* checking/revealing membership status for it. Never accept a bare email and just report back whether it's a subscriber — that's an email-enumeration risk (lets someone probe who's a member).
- **Backend check**: Frank's native checkout runs on Squarespace Commerce (confirmed from the checkout screenshot — not Patreon). Squarespace has a merchant-side Commerce API (Orders/Profiles/Transactions, API-key auth) — no customer-facing "sign in with Squarespace." So the app's backend calls that API with Frank's key to match the verified email against subscription orders. Exactly how "active subscriber" is derived from the API isn't confirmed from docs alone — needs Frank's real API key to nail down.
- **Scope**: this only covers Frank's direct/native subscribers. Patreon/SubscribeStar subscribers won't match by email here — separate integration if wanted later.
- **Privacy**: pull only what's needed per lookup (match + tier for that one email) — don't bulk-sync Frank's whole customer list into the app's own database. Frank's site privacy policy should disclose this use (verifying membership for a companion app). If any EU/UK subscribers, GDPR applies — in practice means minimal data, clear notice, reasonable security; US state laws (CCPA etc.) usually have size thresholds this project likely won't hit yet. Frank is the data controller here — his call/policy, the app just acts on his behalf. (Not legal advice — worth a real lawyer's sign-off before shipping if this goes further.)
- **Status: deprioritized** — complex enough to come back to later, rest of the app comes first.
- **Session rules (decided)**: the one-time code is only for initial sign-in, not every open — app stores a session token on-device after that. Default: indefinite session until explicit logout, silent token refresh in background, only re-prompt on logout / new device / revoked token. No in-app payment (everything routes to quitefrankly.tv), so a long session carries low stakes.

## Subscription screen — decided
Three options, no in-app payment: Quite Frankly (native Squarespace checkout), Patreon, SubscribeStar.
- **Patreon & SubscribeStar**: open via the OS-level "open URL" API (not an in-app WebView) — iOS Universal Links / Android App Links handle the app-vs-browser decision automatically at the OS level. If the app is installed and registered, it opens; otherwise it falls back to the browser. No per-service conditional logic needed. Caveat: this handoff is known to get suppressed when launched from *inside* a WebView (seen with social apps' in-app browsers) — as long as we launch it as a real external open and not embed it, it should behave normally.
- SubscribeStar having a native app at all is unconfirmed from public sources (conflicting/low-quality results) — doesn't matter for implementation since the OS-level approach handles "no app" gracefully either way.
- **Quite Frankly (native)**: load Frank's existing Squarespace checkout in an in-app WebView. It's already responsive/mobile-friendly — no separate "mobile version" to build.

## Card pattern — decided
Square icon cards (Home-style) for destination/browsing grids — Home, and now Shop's "Shop" section (2x2 grid). Long rows for utility/reference lists — Account, Notifications, and Shop's "Affiliates" section (it's a lookup list with codes, not places to browse to).

## Band — decided (new, 6th Home card)
Home's placeholder 6th card is now "Band," going to a page for Frank's drumming/band stuff. Starts with a Bandcamp player for Set the Charge (album ID `1087783863` — same one already embedded and working in QF OS). Bandcamp's official embed is a static iframe, not something platform-specific like YouTube Live — same mechanism, same album, so this is easy, arguably easier than the video work already scoped. Note: the wireframe tool itself can't load arbitrary external iframes in its preview, so the Band screen shows a styled mockup of the player, not a live embed — the real app would use the genuine iframe.

## Icons — decided
Replaced the placeholder star (Members Only) with a proper crown icon, pulled from Lucide (open-source icon set, MIT-style license, built for exactly this — not a brand logo situation like Patreon/SubscribeStar) so it actually matches our stroke-based icon language instead of being hand-approximated.

## More tab — removed, open question
Deleted the More page entirely per request. Its last two items move/resolve as follows: Blog & Newsletter Archive already live under Writing. Main Event has nowhere to live now — not decided where it goes. The bottom nav's "More" tab still points at the (now-deleted) page until the navbar itself gets redesigned — known dangling link, not fixed yet, since navbar is explicitly a separate not-yet-discussed topic.

## Schedule — tried and reverted
Built, then pulled back — parked as a future-version item, not decided against. Watch reverted to its prior state (no "See full schedule" link). Revisit once there's a real need or a real calendar source from Frank.

## Calendar — rebuilt as a weekly view (Sun–Sat)
Unified single-source model: since it's replicating Frank's own calendar, Culture Club items aren't a separate section anymore — they're just entries that land on whatever day they fall, same as the regular show. Each day card shows title, time, a time-of-day icon (sun-variant for day, moon for evening), and room for optional extra info (demoed with a Guest Name line on Wednesday). Added: a "TODAY" marker on the current day, and a small color-coded legend (neutral = regular show, gold = Culture Club) so the two are distinguishable at a glance without needing separate headers. Week auto-refreshes rather than being manually browseable — no prev/next controls built, since that wasn't asked for.
- **Blank-state fallback, decided (Sep 22)**: this full weekly-view design is real work worth keeping for once a real calendar source exists (see Show Schedule below — still waiting on Frank), so it isn't deleted. Instead, `Schedule.dc.html`'s visible body is a placeholder message: *"If you'd like to see a show calendar, message Frank and ask him to start using a digital calendar for show times. And we can link it in the app."* The full day-list design sits underneath it in the same file inside a `display: none` wrapper (not an HTML comment — the day-list markup already has its own per-day HTML comments, e.g. `<!-- SUN — Morning Stream -->`, and HTML comments can't nest). Restore by deleting the placeholder block and the `display:none` wrapper around the real design once there's a feed to point it at.

## Navbar — decided: 3 tabs, not 4
Dropped to Home / Watch / Members Only. Reasoning: everything "More" used to aggregate (Shop, Community, Writing, Band) is already one tap from Home's card grid, and Account/Settings is one tap from the avatar — there's no genuine 4th destination left to justify a tab, and forcing one back in just recreates the catch-all "More" problem we just eliminated. Main Event (orphaned when More was deleted) now lives under Community's new "EVENTS" section instead.

## Members Only content — decided: link out only, never embedded
Confirmed not on YouTube, so no embed path applies at all (not even the harder live-YouTube case). Unlocked events link out to wherever Frank actually hosts them (likely Zoom or a private link, matching the rotating-password mechanic) — same pattern as Patreon/SubscribeStar, external open, no in-app player attempted. Still need to ask Frank what platform this actually is — separate open question from Show Schedule (that's *when*, this is *how*).
- **v1 fallback, decided**: since real membership verification is deprioritized, the "Link your account" teaser is no longer a SOON placeholder — it's now a real, working link out to quitefrankly.tv's own Members Only login. The three event rows now do the same (tap → same site login) rather than trying to gate/unlock per-event in-app. Everything Members Only routes to the website for now.

## QA framework for phase briefs
Every phase brief includes a QA section, run before Code reports the phase done — not a general "looks good," a specific pass/fail per item. Principles: verify against source docs (wireframes, component map, theme.js), not general judgment; check regression against earlier phases, since an 8-phase build means later work can quietly break earlier work; call out platform parity explicitly for React Native (iOS/Android can silently diverge — shadows already confirmed to); and for phases with many similar units of work (e.g. Phase 2's 19 screens), QA in sub-phase checkpoints (every 4-5 screens) rather than one pass at the end, so a bad pattern gets caught before it's been repeated across all of them. Basis for this was Eric's QA process on the Dirigo Bid System rebuild — specifics of that process weren't available to draw from directly, so this is a reasoned default, open to correction.

## Header wordmark — decided (final)
Real asset now, not a font recreation: the actual banner's "QUITE FRANKLY" letters (color-extracted from `qf-banner-v2.png`) composited with the actual jester photo (background-removed via rembg), matching the original banner's layout. Replaces the earlier CSS text-stroke approach entirely — no more font/weight guessing. This is the official version, used as the Home header image.
- **Sizing/layout, decided**: source composite is 1720×404 (jester's hat occupies the top half, "QUITE FRANKLY" letters occupy exactly the bottom half — letters bounding box starts at 50% of the image height and runs to the bottom edge). Displayed header image height: 62px. Header row padding: `6px 20px 12px 20px` (deliberately asymmetric — less top padding than bottom, since the jester's hat needs to sit close to the header's top edge with no dead space above it). The account avatar circle (top-right, links to Account) is bottom-aligned with the logo image (`align-items: flex-end` on the header row, not `center`) and sized to 31px — because the letters occupy the bottom half of a 62px-tall image (≈31px), bottom-aligning a ~31px circle against the full image box lines it up with the letters' vertical position and matches their height, without needing separate markup for just the letter portion of the composite.

## Onboarding — decided (new)
First-launch flow, three screens: Welcome (brand/value-prop, "Get Started") → Notifications (soft-ask for the real OS permission dialog) → Email (light sign-in — no password, just email for a future one-time code). Skippable at every step, no account required to use the app. The Email screen includes a guidance note — "If you're a Member, try to use the email address you use for your subscription" — so members naturally give the right email now, setting up for real membership verification once that's built, without requiring it today. Scope note: this screen only collects the email; the actual code-entry step isn't built yet.

## Audio player — decided (new)
Confirmed the podcast exists as a real, actively syndicated show (Apple Podcasts, Spotify, 1,000+ episodes) — genuine content to build on, not hypothetical.
- **Library pick**: `react-native-track-player`, but pinned to **V4** (Apache-2.0, free) — V5 went commercially licensed for commercial use, and V4 already has everything a simple player needs (background playback, lock-screen/notification controls). Decision pending final framework choice; if not React Native, the native equivalents are iOS `AVPlayer`/`MPNowPlayingInfoCenter` or Android `Media3`/ExoPlayer — same capability, more native glue code.
- **UI placement**: entry point is a "Listen instead" link on Watch (audio is a format alternative to the video content, not a standalone Home destination). Leads to its own `Listen` page with an episode list sourced from the podcast RSS feed directly — not trying to 1:1-match YouTube videos to podcast episodes, that's a data problem for later. Once something's playing, a persistent mini-player bar docks above the bottom tab bar app-wide (standard pattern — Spotify/Apple Podcasts), tap to expand to a full player.
- **Feed source, confirmed**: Frank's SoundCloud RSS feed (already in the existing FrankClips stack) — findable in his SoundCloud account under Settings → Content tab. Every podcast directory (Apple, Spotify, etc.) is just a separate consumer of that same feed, so Spotify isn't a data source we need directly. Exception: if Frank ever records Spotify-exclusive bonus content (via Spotify for Podcasters, not pushed through the main feed), that wouldn't be in this feed and isn't accessible to us — worth a quick check with him, not assumed.
- **Pagination, decided**: RSS itself doesn't paginate — the raw feed returns everything at once, so a backend job fetches/caches it periodically (same polling pattern as elsewhere here) and the app paginates against that cached copy, never the raw feed directly. Initial load: ~20 most recent episodes, then a "Load More" button (not auto-infinite-scroll — simpler, avoids scroll-listener/duplicate-fetch complexity for v1). Different shape than Watch's video grid: Watch's 14-cap comes from YouTube's free RSS itself only returning 15 (an external ceiling); SoundCloud's feed has no equivalent cap, so this is open-ended pagination, not a fixed show-everything-available list.

## Watch — decided
- Grid shows the last 14 videos (even rows, 7×2) from the free RSS feed — its own ceiling, no Data API quota risk. Some will be Shorts; 14 gives enough full-length episodes to still be worth browsing even after Shorts mix in.
- Tap a thumbnail → plays in-app (embedded YouTube player), not a deep-link out — built as a generic player screen (`VideoPlayer.dc.html`) all grid taps route to for wireframe purposes.
- Confirmed compliant per YouTube's own "Required Minimum Functionality" doc for mobile/WebView embeds — real technical requirement, not just a nice-to-have: a WebView doesn't auto-send the HTTP Referer header like a browser does, so it must be set manually (via `baseUrl` if using a bundled local HTML wrapper, or an explicit Referer header on the WebView load call). Can't strip standard player controls/branding once playing, can't cache/download the video. No rule against showing many thumbnails — only the live *player* is policy-sensitive, not a grid of static thumbnails.
- Below the grid: a "View more on YouTube" long card, linking out to the channel.

## Watch — partial progress (still not fully designed)
Platform pills (YouTube/Rumble/Twitch/Pilled) moved out of the not-live card to their own row below it. Removed the Zedalza/"Also from Frank" section — good idea, but unnecessary complexity for v1.

## Writing — decided (new)
New Home destination: Blog, Newsletter Archive (both real, existing site content), and Guest Appearances (SOON-tagged, not yet real) — a possible future slot for guest writers or sponsored partner content that Frank could charge for directly or bundle into ad-partnership deals. Supersedes/absorbs the earlier looser "Reading area" idea from the fun-ideas list.
- **Home layout — reverted to 2x3 grid.** First tried Writing as a full-width row below the 2x2 grid; rejected — went back to a 6-card grid instead: Watch, Members Only, Shop, Community, Writing, and a 6th slot as an empty grayed/dashed placeholder card (no label, just a "···" icon) for whatever gets added next.

## Shop & Community — decided (now separate pages, linked from Home's cards)
- **Shop**: two sections — "Shop" (real storefronts: Apparel, Coffee Revolution, Keto Brainz, Gold & Silver) and "Affiliates" (all 10 discount-code partners from quitefrankly.tv/affiliates, no longer truncated).
- **Community**: card grid — Discord, Telegram, X, Instagram, Tumblr, Forum.
- **More** (remaining tab content): pulled Shop/Affiliates/Forum/Follow out since they moved. Left with just Blog & Newsletter Archive and Main Event — thin for a whole tab. **Open question**: leave as-is, fold something back in, or rethink the More tab entirely.

## Content/data architecture — decided: one main Google Sheet, multiple tabs
Four tabs, confirmed: **Shop & Affiliates** (Category/Name/URL/Code/Note, pre-filled with all 16 real rows), **Bug Reports** (write-only log from the app, template only), **`youtube rss`** (write-only from the video-polling function — feeds Home/Watch *and* the Make.com transcription pipeline, replacing the broken YouTube RSS Listener scenario; named and columned to match the existing `youtube rss` tab already in Eric's FrankClips sheet — Episode Title / YouTube URL / ID / Type — minus "In Episodes Sheet," which cross-referenced a tab that doesn't exist in this separate sheet), and **`audio history`** (Episode Title / Published Date / Audio File URL (Published) / Feed URL / Description — both come from the same RSS item at different stages: the feed's published link, wrapped in a Chartable tracking redirect in Frank's real feed, vs. that link resolved through to the real file). Calendar is **not** a tab — confirmed to come from Frank's real digital calendar instead. Distinction that matters: `audio history` is a long-term archive for *other* future projects (transcription, clip-finding), not what the Listen page reads — Listen's own pagination still needs a proper backend cache regardless, since a spreadsheet isn't the right tool for that specific read pattern even though it's exactly right as a growing archive. Starter workbook built with all four tabs (`quite-frankly-app-data-sheet.xlsx`), kept **completely separate** from FrankClips (an already-live 13-tab production pipeline — too risky to touch). **Live now**: https://docs.google.com/spreadsheets/d/1hSUIK7bpNtwALYjKZBPOHRSynryRiDWRRe8TOtHV4Vs/edit — uploaded to Drive, converted to native Sheets, and shared with the service account set up for write access (see Sheet interaction patterns in the component map for the read/write mechanics).

## FrankClips sheet scan — findings
Scanned Eric's existing FrankClips spreadsheet (13 tabs: `rss poll`, `tscripts`, `clipsuggest`, `namingconventions`, `youtube rss`, `clips archive`, `allclipsuggests`, `discordclip`, `gdocshistory`, `llama-all`, `assembly all`, `rsshistory`, `spotify-all`) at Eric's request, to find naming conventions and cross-check links. Confirmed the SoundCloud audio URL format from real `rss poll` rows. Reading an actual episode's show notes (`spotify-all` tab) also surfaced: the real Telegram link (now wired in), a stale Discord link that didn't match the one Eric had on hand (Eric confirmed the correct, non-expiring one — now wired in), a real affiliate (Farmalogical Bone Broth) not listed on the site's own `/affiliates` page, and four support options (PayPal, Amazon Storefront, BTC, XRP tip addresses) that weren't represented anywhere in the app.

## Donation — decided (new)
New section under Account, for one-time support (no subscription): PayPal tip, Amazon Storefront (external links), Bitcoin and XRP addresses (tap-to-copy), and Frank's P.O. Box shown as plain text for mail. All sourced from the FrankClips scan above, not previously in the plan.

## Report a Bug — decided
Simple form (what's wrong / description / optional screenshot) under Account. Submissions do **not** go to a personal email — a Netlify function appends each one as a row to the shared Google Sheet's bug-report tab (title, description, screenshot link, timestamp, device/app version). Gives a running, searchable log instead of inbox clutter; a Slack/Discord ping on new rows is a possible later add-on, not needed for v1.

## Shop & Affiliates content source — decided: Google Sheet
Right now the Shop/Affiliates lists are hardcoded in the wireframe. Frank needs to be able to update them himself without any dev work — add/remove a store, change a code, etc.
- **Decided: a Google Sheet.** Columns: Category (Shop/Affiliate) / Name / URL / Code / Note. Frank edits it like any spreadsheet — no new tool to learn. Publish it as a read-only CSV feed (File → Share → Publish to web), and the app polls/caches it periodically, same pattern as the video-RSS polling elsewhere in this plan. Zero API keys or OAuth needed for a read-only public sheet. Also reuses infra Eric already has deep experience with (Make.com + Sheets).
- Considered and passed on: Airtable/Notion database (nicer editing UI, but a new tool for Frank to learn) and a hand-edited JSON file like FrankClips' `announcements.json` (keeps Eric in the loop for every change instead of letting Frank self-serve — defeats the point).

## Video embedding — confirmed feasible
- Finished/uploaded videos (including last night's show, once the live recording lands on the channel) embed via standard `youtube.com/embed/VIDEO_ID` iframe. No API key needed for playback.
- Confirmed live on QF's channel — embedding is enabled (tested with a real video ID).
- Mobile: WebView loading that URL, or a wrapper lib (`react-native-youtube-iframe`).
- Plays still count as real YouTube views/watch-time — doesn't undercut the "help Frank get seen" goal.
- Live streams are a different, harder problem (see below) — this only covers video-on-demand.

## Data pipeline tie-in
- Feasible: the same video-polling function driving Home's "Most Recent" card can also write each new video (title, ID, thumbnail, published date) to a Google Sheet via the Sheets API — becomes a new source for the Make.com transcription/AskFrankie pipeline. Could directly replace the currently-broken "YouTube RSS Listener" Make scenario rather than living alongside it.

## Show Schedule
- Assumption, confirmed: Calendar comes from Frank's real digital calendar (ICS feed), **not** a Google Sheet — the manual-sheet fallback discussed earlier is dropped. Still need to confirm what calendar tool Frank actually uses.
- Open question: need to find out what Frank actually uses.

## Notifications — feasibility notes
- **New video/Short posted:** easy — YouTube WebSub (PubSubHubbub), free, near-real-time push to a hosted callback. Same infra also drives the "Most Recent Show" auto-update on Home. **Decided: Shorts get no separate alert or detection logic — treated as regular videos.** Distinguishing a Short from a regular upload means parsing the URL/metadata, which is complexity with no real payoff here; one "New Video Alerts" toggle covers both.
- **Live-start:** harder — WebSub doesn't fire on live-start, only upload/edit. Requires polling the Data API (`search.list` eventType=live, or `liveBroadcasts.list`), tightly scoped to the actual show window to avoid burning quota.
- **Twitch:** has a real live webhook (EventSub `stream.online`) — better than YouTube here, worth wiring directly.
- Rumble/Pilled: no public live-status API — treat a YouTube/Twitch live signal as a proxy for "live everywhere" since Frank multistreams.

## Open questions
- App name/identity: staying under the existing Quite Frankly brand (confirmed).
- Real per-member auth for Culture Club: deferred — v1 is a manually-updated unlock flag, same pattern as `announcements.json` in FrankClips. v2 could plug into the Supabase/Patreon/SubscribeStar OAuth architecture already sketched for AudienceOS.
- Jester-bell icon glyph and skyline silhouette: referenced in the design system but not yet built as real icon assets.

## Additional / fun ideas — not priority
Concepts pulled from or inspired by QF OS. Not being built now — just captured so they don't get lost.
- Embed the Bandcamp player so users can listen to Frank's band Set the Charge (QF OS already has a working Bandcamp embed, album ID `1087783863`, to reference).
- Nostalgic simple games (Snake, Minesweeper, etc.) like QF OS has.
- A "Reading" area — surfaces content from Frank's close partners/colleagues (e.g. J Gulinello's Substack) combined with Frank's own written blog. Distinct from Community (Forum, Discord, Telegram). Concept only, not designed yet.
