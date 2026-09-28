# Quite Frankly Mobile App — Project Context for Claude Code

## What this is
Native-feeling iOS/Android mobile app for the *Quite Frankly* podcast (quitefrankly.tv), hosted by Frank. Built in React Native. Distinct from **QuiteFranklyOS** (the existing Win98-themed desktop web portal, separate project/repo) — this is the mobile companion, with live-show alerts, video/audio browsing, and Culture Club membership access as the core value props.

---

## Key links
- **Wireframes** (interactive, all 20 screens wired with real navigation): https://claude.ai/artifact/TCXi4rB8DcD1NuLAFEMwXq
- **Design System** (colors, type, components, brand assets — banner + jester avatar): https://claude.ai/artifact/SM9ZjiDwh76L8oRRsCyezw
- **Live data sheet** (Shop & Affiliates / Bug Reports / `youtube rss` / `audio history`): https://docs.google.com/spreadsheets/d/1hSUIK7bpNtwALYjKZBPOHRSynryRiDWRRe8TOtHV4Vs/edit
- **Full decision log**: `quite-frankly-app-plan.md` (reasoning behind every product call — read this when a decision seems unexplained)
- **Screen/data reference**: `quite-frankly-app-component-map.md` (every screen's purpose, links, data source, plus the sheet's read/write mechanics)
- **Frontend prep**: `quite-frankly-app-frontend-prep.md` (design tokens, nav architecture)
- **Theme file**: `theme.js` — drop into repo, import rather than hardcoding colors/spacing
- **Header logo asset**: `quite-frankly-logo-final.png` — the actual composited "QUITE FRANKLY" wordmark + jester, real PNG (1720×404, transparent bg) matching exactly what's base64-embedded in `Home.dc.html`'s header. Use this file, not a recreation — display at a fixed height with the header row's `align-items: flex-end` (see plan doc, "Header wordmark" section, for why: the jester's hat fills the top half of the image and the letters fill the bottom half, so bottom-aligning against the full image is what lines the header's account-avatar circle up with the letters). **If any other file in this folder starts with `quite-frankly-combined-logo` or `quite-frankly-letters/jester-cutout`, it's an earlier intermediate version — superseded, don't use it.**

---

## Tech stack
- **React Native**, via **Expo with dev client** (decided in Phase 1) — audio playback requires native linking, so Expo+dev-client was chosen for the added `expo-font` and EAS Build path (relevant to Phase 8) at no real cost.
- **Audio**: `expo-audio` **~57.0.5** — handles background playback, lock-screen controls, and audio history (see AudioPlayerContext.js).
- **Navigation**: bottom tab navigator + per-tab stacks + one modal screen (see below).
- **Styling**: `theme.js` — RN StyleSheet objects, not CSS. Shadows are platform-specific (see file comments); the gold "glow" effect needs a border fallback on Android since `elevation` can't carry color.
- **Fonts**: Bebas Neue (display/hero only) + Inter (everything else) — not system fonts, loaded via `@expo-google-fonts/bebas-neue` + `@expo-google-fonts/inter` and `expo-font`'s `useFonts` (see `App.js`), not raw bundled `.ttf` files.

---

## Navigation architecture
- **Root**: Onboarding stack (first-launch only, skippable) → Main App, never returns after first completion.
- **Main App**: Bottom tabs — Home, Watch, Culture Club.
  - Home stack: Home → Shop, Community, Writing, Band, Calendar, Listen
  - Watch stack: Watch → Video Player, Listen
  - Culture Club stack: Culture Club → Subscription
- **Global stack** (reached via avatar icon from any tab): Account → Subscription, Notifications, Donation, Report a Bug
- **Modal**: Subscription Checkout (system-browser sheet, not a push)
- **Persistent overlay**: Listen mini-player, docks above tab bar app-wide once playing, lives outside the nav stack
- **Bottom tab bar height/centering** (`MainTabNavigator.js`) — `@react-navigation/bottom-tabs`' own automatic height/safe-area math was leaving icons+labels stranded near the top of a much taller bar instead of centered. Confirmed live on iOS Simulator by measuring the actual rendered pixel gaps (not guessed): a first attempt (small `paddingTop`) only moved the gap from 12pt/36pt (top/bottom) to 32pt/16pt — **`paddingTop` pushes content down and eats directly into the bottom gap; `paddingBottom` has no independent effect** (content is top-anchored in the bar's padded box, `paddingBottom` doesn't pull it down). The library also adds ~8pt of its own unremovable top margin on top of whatever `paddingTop` is set to. Current values (`paddingTop: spacing.md`, `paddingBottom: insets.bottom`) measured to a ~24pt/24pt split, confirmed near-pixel-perfect via cropped/trimmed screenshot comparison. If this ever needs retuning (e.g. after a `@react-navigation` upgrade changes that hidden margin), adjust `paddingTop` only, then re-measure — don't assume `paddingBottom` does anything on iOS. `paddingHorizontal: spacing.md` on the same `tabBarStyle` insets the whole 4-tab row from both screen edges equally, so the leftmost (Home) and rightmost (Culture Club) tabs' content don't sit flush against the edge — added after Culture Club's longer label read as crowding the right edge. Measured on-device: icon row margins are symmetric (~155px each side), but the two labels' margins aren't equal (Home ~145px, Culture Club ~100px) — that gap is inherent to "Culture Club" being a much longer string with less centering slack in its slot, not a padding bug; don't try to force it symmetric via padding alone.

---

## Component conventions

- **Page layout standard**, app-wide across sub-pages (`Shop`, `Community`, `Writing`, `Subscription`/Become a Sponsor, `DonateToApp`, `Account`, `CultureClub`, `Watch` — anywhere a page has a `body` container stacking multiple `<Section>`s or top-level cards): the gap **between distinct sections/cards** is `spacing.xl` (32px, `theme.js`) — not `spacing.lg`, bumped up from 24px for more breathing room. Keep it in `body`'s own `gap`, separate from `Section`'s internal label-to-content gap (`spacing.md`, fixed in `Section.js` itself). `Calendar`'s `ScheduleTeaser` day-cards are a deliberate exception (see below) — don't pull them up to this standard, and don't quietly drop other pages back down to `spacing.lg` either. `Watch` is a partial exception: its `body.gap` is still `spacing.xl` between `platformRow` and the video grid, but the "Become a Sponsor" button lives in `BackHeader`'s `children` slot rather than as a page section, and `platformRow` has no `<Section>` label — accepted as-is (2026-09-27), not something to retrofit into the `<Section>` pattern.

- **Card taxonomy** (standardized 2026-09-27, after an audit of every card/tile/pill/row across the app found real drift between visually-identical patterns — see below for what got fixed). Six distinct families, each with one shape:
  - **Icon Tile** (icon + short label, centered, in a grid) — `DestinationCard` (`src/components/DestinationCard.js`): `radius.md`, `backgroundColor: surfaceCard`, `paddingVertical: spacing.lg`, icon↔label `gap: spacing.sm`, icon size `24`, `shadows.sm`, label `fontSize.md`/`inkPrimary`/centered. One shared component, not a per-screen copy — Community.js used to have its own near-duplicate (`IconTile`, icon size `22`, no `shadows.sm` gap consistency); it now renders `DestinationCard` directly with `style={{flex: 1}}` (its 3-up row can't use the default `width: '47%'`, which is sized for 2-up wrapping grids). `fixedHeight` is now unused app-wide (removed 2026-09-28) — every `DestinationCard` usage (Home, Community, Writing, Shop's store grid) renders at natural compact height, matching Home's original look exactly. It existed for labels that can genuinely vary in length enough to wrap (Shop's live sheet-driven store names, Writing's "Newsletter Archive"), but in practice those labels fit on one line at the card's actual width, so the reserved 2-line box was only ever adding dead space under the label — confirmed on-device (iOS Simulator) for Writing first, then removed from Shop.js too since it's the same `DestinationCard` component/grid shape. If a future store name is ever long enough to actually wrap, that card will just be taller than its row-mate — accepted tradeoff over reintroducing reserved dead space for every card to guard a case that hasn't happened. Icon-tile grids use `gap: spacing.md` between cards, always — this was `spacing.sm` in Community and DonateToApp's crypto/tip rows before the audit, now consistent everywhere (`Home`'s grid, `Shop`'s grid, `CryptoCardGrid`, `Community`'s `row`, `Subscription`'s `platformRow`, `DonateToApp`'s `tipGrid`). **Not** in this shared-component list: `GameTray.js`'s grid `tile` (Games feature, Phase 9) is a deliberate one-off variant of the same Icon Tile shape, not folded into `DestinationCard` and not an accidental duplicate — it uses `surfaceGround` (not `surfaceCard`) and drops `shadows.sm`, specifically for contrast against the tray's own `surfaceCard`-backed sheet, which `DestinationCard` assumes it's sitting directly on a `surfaceGround` page background. If this ever needs auditing again, treat it as an intentional exception, not drift.
  - **Small Link Card** (label only, sometimes an icon, in a 2-to-4-up wrapping or fixed-flex grid, opens an external link or nav action) — `Subscription.js`'s `platformCard` (Patreon/SubscribeStar) and `gridCard` (PayPal/Amazon), `DonateToApp.js`'s `tipCard` (Cash App/Revolut/Monzo/Wise). All three: `radius.md`, `backgroundColor: surfaceCard`, `padding: spacing.md` (plain shorthand — `gridCard` used to split it unevenly into `paddingVertical: md`/`paddingHorizontal: sm`, `tipCard` used to have no horizontal padding at all; both now match `platformCard`'s shorthand), label `fontSize.md`/`inkPrimary`/`semiBold`. Width is deliberately *not* unified: `platformCard` uses `flex: 1` (always exactly 2 items, no wrap); `gridCard`/`tipCard` use `width: '47%'` (wrapping grids of 3+ items) — this is a real functional difference, not drift. Deliberately no `shadows.sm` on this family (unlike Icon Tile) — if that ever needs to change, do it as its own visible decision, not folded into a spacing tweak.
  - **List Row** (single-column, full-width, repeating list item) — `ExternalRow.js` (Shop's Affiliates list), `Account.js`'s `row`/`signOutRow`, `NotificationsSettings.js`'s `row`, `Community.js`'s `eventRow`. All: `radius.md`, `backgroundColor: surfaceCard`, `padding: spacing.md` (uniform, all sides), **no** `shadows.sm` — already consistent app-wide; the lack of shadow here is the correct standard for this family (repeating rows in a list read as noisy with individual shadows stacked), not an oversight like the padding drift found in the other families.
  - **Pill** (rounded, content-width, link-out chip) — `Watch.js`'s `platformPill` (YouTube/Rumble/Twitch/Pilled) is currently the only instance: `radius.lg` (20, not `radius.md`), no `shadows.sm`, `fontSize.base` (13, one step down from every card family's `fontSize.md`) — all three are intentional, distinguishing it as a lighter/chippier shape from the square-ish Icon Tile/Small Link Card families. If a second pill-shaped element is ever added, match these three values, not a Small Link Card's.
  - **Hero/CTA Card** (single, full-width, high-emphasis) — `Subscription.js`'s `qfCard` ("Sponsor Frank Directly": no fill, `accentGold` border only) and `Home.js`'s `mostRecentCard` (filled `surfaceCard`, `shadows.sm`, no border) are intentionally different from each other (a CTA-you-can-tap vs. an info card) — don't converge them. `qfCard`'s avatar circle now uses `borderRadius: radius.lg` (was a hardcoded `20`, which is the same number — pure token cleanup, no visual change). Circular avatars sized by half their own width/height (`Account.js`'s 56×56/`radius: 28`, `platformIcon`'s 40×40) are a different case from a card's corner-rounding choice — leave those as computed hardcoded values, don't force them onto the `sm`/`md`/`lg` corner-radius scale.
  - **Gold CTA Button** (full-width, unfilled `surfaceCard` bg, `accentGold` border, gold centered label — the "Become a Sponsor" button) — `sponsorButton`/`sponsorButtonText` in `Home.js`, `Watch.js`, `Listen.js`, `VideoPlayer.js` (which adds a contextual `marginTop`), plus `CultureClub.js`'s `actionCard`/`actionCardText` (same button, different label text, "join Culture Club" framing). Not previously documented as its own family, found during a 2026-09-28 audit. Standard: `radius.md`, `borderWidth: 1`/`accentGold`, `paddingVertical: spacing.sm`, `paddingHorizontal: spacing.md`, label `fontSize.md`/`accentGold`/`semiBold`. `paddingHorizontal` was missing from the four non-CultureClub instances until 2026-09-28 (`actionCard` already had it) — added everywhere to standardize, since it's the actual typical padding for a full-width centered-text CTA and guards long labels from touching the border; didn't matter visually on current short labels, but locks in the shape for future ones.
  - Small hardcoded values intentionally **not** tokenized, app-wide: tiny badge `paddingVertical: 2` (below the smallest `spacing` token, used consistently for pill-shaped micro-badges like `recommendedBadge`/`ExternalRow`'s badge/`ScheduleTeaser`'s `todayBadge`) and per-instance icon-size props (`size={16}`/`size={18}` etc. on lucide icons) — these are fine as-is, don't chase them into tokens.

- **CryptoCard** (`src/components/CryptoCard.js`) — two size tiers, chosen automatically from `fields.length`, no `size` prop:
  - **Regular** (1 unlabeled field) — single row: ticker, address, Copy inline. Standard for any coin with one address.
  - **Large** (2+ fields) — ticker header, then one row per field below it, each independently copyable, no max field count. Covers two distinct cases off the same `fields` array (no separate prop/branch):
    - **Multiple addresses** (USDT, USDC) — one field per blockchain, each with its own gold bullet and its address indented below.
    - **One address + a tag/code the coin requires** (XRP's destination tag) — the address is its own bulleted field as usual; the tag is a second field with `bullet: false`. Use this for any future coin needing a memo/tag/extra number alongside a single address.
  - Used on Become a Sponsor (`Subscription.js`, BTC/XRP — both Regular) and Donate to App (`DonateToApp.js`, BTC/SOL/ETH/DOGE as Regular; XRP/USDT/USDC as Large).
  - **Standing rules — both sizes were built to match each other and the page's other cards. If you touch spacing, keep these true:**
    - *Card size*: Regular and Large are the same height and have the same padding-to-text ratio as the page's other button-style cards (PayPal, Amazon, tip apps) — `cryptoCardRegular.paddingVertical` and `cryptoCardLarge.paddingVertical` both equal `gridCard`/`tipCard`'s. Keep the two crypto-card values equal to each other if either changes.
    - *Title/ticker column*: Regular's ticker and Large's header ("USDT", "XRP", etc.) sit in the same vertical column card-to-card. Regular's comes from `singleFieldRow.paddingLeft`; Large's from `largeCardTitle.paddingLeft`.
    - *Address column*: Regular's address and Large's per-field addresses sit in the same vertical column, one column right of the title column. Regular's comes from `singleFieldRow.paddingLeft` + `singleFieldTitle.width` + its `gap`; Large's `fieldRow.paddingLeft` is set to land in that same spot (see `TITLE_COLUMN_WIDTH` in the file, shared by both).
    - *Label/bullet column* (Large only): each field's label (with its gold bullet, or a hidden one via `bullet: false`) sits about halfway between the title column and the address column — `labelRow.marginLeft` pulls it in from the address column's inset. The bullet's layout space is always reserved (hidden via `color: 'transparent'`, never by omitting the node), so a hidden-bullet label still lines up with a visible-bullet label above it.
    - *Copy button*: Large's Copy badge is bottom-aligned (`fieldRow.alignItems: 'flex-end'`) so it lines up with the address line, not the label line, per field.
  - Don't fix a misalignment on one size by changing the other size's own styles — adjust the side that's actually off, using the shared constants/values above.

- **ScheduleTeaser** (`src/components/ScheduleTeaser.js`) — shared by `Calendar.js` (full `WEEK`) and `CultureClub.js` (`WEEK` filtered to `club: true` days). `mockSchedule.js` only holds weekday abbreviation/title/time/period/club/extra — it does **not** hold literal dates. Each card's full date header (e.g. "Monday, September 28, 2026") is computed at render time in `ScheduleTeaser.js` for whichever week is currently on screen, so the placeholder never goes stale — don't hardcode a date into `mockSchedule.js`. A show's optional `extra` note (e.g. a guest) renders inline on the same line as `time`, not its own line, so every card stays a fixed 2-line body regardless of whether `extra` is present — keep it that way rather than reintroducing a 3rd line. Cards are intentionally compact (`spacing.sm`/`xs`, not `md`) specifically so Calendar's full 7-day week fits one screen without scrolling — don't loosen this back toward the app's normal `spacing.xl` between-sections standard. **Color convention (decided 2026-09-27):** gold (`accentGold`) reads as visual noise when it's repeated across every card, so it's used sparingly here — club-day border/icon, the "Culture Club" legend dot, today's card border, and the inline Guest-name highlight are all `inkPrimary` (white) instead. The one deliberate exception is `todayBadge` (the "TODAY" pill itself, fill + text) — that one stays gold, Eric's explicit call. If a new highlight need comes up in this component, default to white, not gold. The `note` prop (e.g. the "message Frank" blurb) renders **after** the week grid, not before — `note`'s own `marginTop` (not `marginBottom`) assumes it's trailing content.

- **VideoTypePill** (`src/components/VideoTypePill.js`) — colored pill showing a video's `contentType` (`'short'|'video'|'live'`, from `poll-youtube.js`'s `classifyVideo()`; `'live'` displays as "Stream"). Renders `null` for a missing/unrecognized type rather than guessing — don't add a default label. Colors (`typeShort`/`typeVideo`/`typeStream` in `theme.js`) are deliberately distinct from `brandRed`/`accentGold`, which already carry meaning elsewhere — don't reuse those for this. Used on Watch's grid (`VideoCard`, absolute-positioned bottom-right of the thumbnail) and Video Player (inline in `actionsRow`, left of "Watch on YouTube"). `contentType` reaches the app via the archive (`qf-youtube-archive`, written by `poll-youtube.js`) → `get-youtube-episodes.js` → `Watch.js` → `VideoPlayer.js` (`route.params.video`) — see the Watch/YT-ARCHIVE note below; if a new video source is ever added to Watch, it needs its own `contentType` wiring through that same archive path or the pill will just silently not show.

- **Watch's video grid reads from the archive, not the RSS-poll cache** (`Watch.js`, `get-youtube-episodes.js`, `netlify/functions/poll-youtube.js`) — decided 2026-09-27 after concluding the previous split (top grid rebuilt from a separate RSS-cache blob every 15-min poll, rest paginated from the archive, bridged by an `offset = gridItems.length + 1` hack) was unnecessary complexity: a video that's already in the archive should always load from there, not be re-derived from RSS. Now: `poll-youtube.js`'s RSS poll has exactly two jobs — keep Home's `mostRecent` cache fresh, and discover+classify+archive brand-new videos (`mergeVideosById` keeps the archive sorted freshest-first, so archive-only pagination from offset 0 is already correct). Watch.js has no `gridItems` concept anymore; it's a single-source paginated list (`get-youtube-episodes.js`, offset 0 = the initial page), matching `Listen.js`'s pattern exactly. Known accepted tradeoff: a video deleted/unlisted on YouTube will keep showing in Watch until the archive gets its own removal-detection (not built) — decided acceptable for now, not a blocker.

## Splash screen
- The native (OS-level) splash logo is sized/positioned to match `Welcome.js`'s onboarding wordmark (280x66pt, centered horizontally, `centerY` offset -69pt above true center) — not `expo-splash-screen`'s own default (a ~100x100pt box, dead-center).
- `expo-splash-screen`'s config plugin deliberately finalizes `ios/<Project>/SplashScreen.storyboard` as the last mod in its own mod category (see its `withIosSplashScreen.js`: "no other ios.splashScreenStoryboard mods can be added after this"), and a companion `withDangerousMod`-based config plugin runs in an earlier phase and gets overwritten — a config plugin cannot patch this after the fact.
- Fix instead lives in `scripts/fix-splash-screen.js`, a plain post-prebuild script that patches the already-generated `ios/.../SplashScreenLogo.imageset` (swaps in the pre-sized PNGs from `assets/splash-wordmark/`) and `SplashScreen.storyboard` (adds explicit width/height constraints — intrinsic content size alone was not respected — and the `centerY` constant) directly on disk. Idempotent; safe to re-run.
- **Whenever `ios/` is regenerated** (`expo prebuild`, `--clean`, or a fresh clone), this fix is lost unless reapplied. Locally, use `npm run prebuild:ios` (chains `expo prebuild --platform ios` + the fix script) instead of raw `expo prebuild`. For EAS Build, `eas.json`'s `prebuildCommand` on every profile (development/preview/production) is set to `expo prebuild && node scripts/fix-splash-screen.js`, overriding EAS's default bare `expo prebuild` — confirmed via `@expo/eas-json`'s schema that this is a real, supported build-profile field, but **not yet verified against a real EAS build** (only inspected the schema/wiring locally, no cloud build was run). Deferred to Eric's final pre-App-Store-submission testing pass — check the splash screen specifically on that build.
- **Android is untouched, deliberately** — Android 12+'s SplashScreen API (`Theme.SplashScreen` / `windowSplashScreenAnimatedIcon`, see `android/app/src/main/res/values/styles.xml`) is icon-based, not a freely-positioned view like iOS's storyboard: it expects a roughly square icon (288x288dp baseline, scaled per density) in a fixed circular/square mask. The wide wordmark banner (1720:404) doesn't fit that model — forcing it in would mean either clipping/squishing it or swapping to a different (e.g. square jester-head-only) mark, which is a real design decision, not a size tweak. Decided to leave Android on its default generated icon rather than take that on.
- **iOS Simulator caches a launch-image snapshot per bundle ID that does NOT reliably invalidate on plain reinstalls** (`simctl uninstall`+`install`, or even overwriting the same install) — confirmed by testing (a diagnostic bright-green background change didn't appear until a full `xcrun simctl erase <device>` + reboot). If a splash change doesn't seem to take effect after rebuilding, erase the simulator before concluding the build/script is broken.

## Data sources
| Source | Mechanism | Auth |
|---|---|---|
| YouTube videos | Free RSS feed (`/feeds/videos.xml?channel_id=...`, caps at 15) + YouTube Data API for live-status polling | API key for Data API only |
| Podcast episodes | SoundCloud RSS, no native pagination — backend caches it, app paginates against the cache | None to read |
| Shop & Affiliates | Google Sheet tab, published-to-web as CSV | None — public CSV fetch |
| Bug Reports, `youtube rss`, `audio history` | Google Sheets API v4, write-only from backend | Service account (JSON key held server-side only, Netlify env var) |
| Show schedule | Frank's real calendar — **source not yet confirmed**, get from Frank before building Calendar's real data layer |
| Native subscription checkout | Squarespace Commerce, loaded live in a system-browser sheet | None (just loading Frank's real page) |

Full detail, including idempotency requirements for the write-only sheet tabs, is in `quite-frankly-app-component-map.md`.

---

## Build phases
1. **Scaffold** — RN init, core deps (`expo-audio`, `@react-navigation`, font linking), `theme.js` in place, folder structure.
2. **Static shell** — all 20 screens built to match the wireframes exactly, full navigation wired, no real data yet. Gives a clickable app to sanity-check against the canvas before backend complexity starts.
3. **Read-only data** — wire Home/Watch (YouTube RSS + live polling), Shop (CSV fetch), Onboarding email capture (storage only, no verification yet).
4. **Backend functions** (Netlify) — Bug Report writer, video-polling job (writes `youtube rss`, triggers Home/Watch refresh), SoundCloud polling/caching job (powers Listen, writes `audio history`).
5. **Audio player** — `expo-audio` wired to Listen's episode list, persistent mini-player, background playback and lock-screen controls.
6. **Subscription flow** — native checkout modal, Patreon/SubscribeStar external opens.
7. **Notifications** ✅ — Expo push service (register-push-device.js, `qf-push-tokens` Blobs store), real toggle persistence in NotificationsSettings.js, live-alert and new-video-alert triggers wired to twitch-webhook.js/poll-youtube.js. Culture Club Reminders has preference storage only, no trigger (no data source yet).
8. **Polish** — icon/splash asset replacement, shared loading/error/empty state components + app-wide offline detection (screen-level gap fixes across Home/Watch/Listen/Shop), CLAUDE.md cleanup.

---

## QA and deploy process
QA is risk-based and lean: live dry-run + diff for data work, one smoke pass on worst-case items, one real deploy, exceptions-only reports. After one failed fix-and-retest loop, stop and ask. Merges to main do not auto-deploy: after merge, trigger a production deploy manually (`netlify api createSiteBuild`) and confirm changed functions are live.

## Known open items
- **Calendar's real source** — need to ask Frank (ICS-capable calendar vs. manual).
- **EAS project linkage** — done (`app.json` has `extra.eas.projectId`, `eas.json` configured with dev/preview/production build profiles + submit config). Unblocks real push tokens (`getExpoPushTokenAsync`) for live device testing. Expo's push service (`expo-notifications`) is integrated.
- **Member-unlocked states** — every "member" screen currently shows only the non-member view; real membership verification (Squarespace Commerce API lookup) is deprioritized, comes after core app ships.
- **SubscriptionCheckout has no post-purchase confirmation screen** — `TRUST_ANY_CLOSE_AS_COMPLETE` (the Phase 6 decision to treat any checkout-sheet dismissal as a completed purchase) was reverted — it was falsely claiming success on every dismissal, not just real ones. `SubscriptionConfirmed` screen removed; closing the checkout sheet now just returns to the Subscription screen, no claim of success either way. Checkout provider (Squarespace) still gives no redirect signal to distinguish "completed" from "backed out," so a real confirmation screen needs either Squarespace dashboard access to configure a post-purchase redirect (`quitefrankly://checkout-complete`, already coded as `REDIRECT_URL` in `SubscriptionCheckout.js` but nothing fires it) or real membership verification. Deferred alongside "Member-unlocked states."
- ~~**OTP code-entry screen** — Onboarding collects email; the verification step after it isn't designed yet.~~ Stale — `CodeEntry.js` is fully built (6-digit input, resend cooldown, lockout, error states) and `send-code`/`verify-code`/`lib/otp.js` are live in production, confirmed working end-to-end 2026-09-27 (Resend email + Netlify Blobs session tokens). `Email.js` now also validates the address format client-side before calling `send-code` and surfaces the server's actual error message instead of a generic one.
- **Old-Android network fetches fail despite browser working** — on a real Android 8.0 device, Watch/Listen showed "Unable to load videos" / no audio, while the same backend URL opened fine in the phone's browser and `curl` confirmed the API is healthy. Cause: the device's system-level cert trust store (used by the app's network layer) is frozen at its last security patch, while Chrome/WebView maintain their own independently-updated trust store — a known divergence on old, unpatched Android. Accepted limitation (will not fix) — treat as a device-age issue, not a code bug. Re-test on current Android device if it resurfaces.
- **Games: fullscreen-pause bridge doesn't fire for either platform's real fullscreen mechanism** — `VideoEmbed.js`'s injected JS (used by `VideoPlayer.js` to hide/pause the floating game window during video fullscreen) only listens for the DOM Fullscreen API (`fullscreenchange`/`webkitfullscreenchange` on `document`). Confirmed via live on-device testing (Android emulator, Phase 9 fix wave): opened Snake, triggered the video's own fullscreen control in portrait (no rotation), held it ~5-6s, exited via back button — Snake's tick kept running the whole time and died ("Game Over") despite `hidden` supposedly being true. Root cause: `allowsFullscreenVideo` (from the earlier Android-fullscreen-video-fix) makes Android's WebView enter its own native `WebChromeClient.onShowCustomView` fullscreen — a separate native surface, not the page's DOM Fullscreen API — which structurally cannot fire the listened-for event. (An earlier-seeming pass of this behavior almost certainly hid the window via the *other* half of `hidden = isLandscape || isFullscreen` — the device rotating as a side effect of going fullscreen — not via the bridge actually working.) iOS has the analogous gap: WKWebView's `video.webkitEnterFullscreen()` fires `webkitbeginfullscreen`/`webkitendfullscreen` on the `<video>` element, not `document`, so it's also never listened for. Net effect: on both platforms, the game can keep ticking (and losing) invisibly during real fullscreen — not a compliance/video-overlap risk (the native fullscreen player still covers the whole app, and the window still correctly avoids the video whenever it IS visible), just a real gap in "game pauses across fullscreen." `WebChromeClient.onShowCustomView`/`onHideCustomView` aren't exposed through `react-native-webview`'s documented JS API, so a real fix needs its own detection mechanism — scoped as a follow-up task, not attempted in this fix wave, per this repo's existing precedent of scoping deep WebView-fullscreen-detection work separately.
- **Games: shared shuffle/status-bar util not extracted** — Snake/Minesweeper/Solitaire/MemoryMatch (`src/games/`) each independently implement their own Fisher-Yates shuffle and near-identical status-bar/board-container styling. A shared `src/games/shared.js` (a `shuffle()` util + a `GameStatusBar` component) would remove the duplication if this ever needs revisiting — not extracted now (2026-09-27 fix wave) since the actual game logic per file is genuinely different and premature abstraction wasn't worth it for a 4-file scope.

---

## Git hygiene
- Branch from `origin/main`, and merge `origin/main` into a feature branch before opening its PR — other chats/branches push small updates to main in parallel, so a branch that's been open a while can drift behind. Never resolve a merge conflict by blindly taking one whole side's version of a file; reconcile so both sides' changes survive.
- Create worktrees OUTSIDE the repo folder (e.g. `../qf-worktrees/<name>`), not nested inside it (e.g. `.claude/worktrees/<name>`). A worktree nested inside the main checkout breaks `netlify dev`'s function-folder discovery — it walks up looking for a directory-type `.git` (a worktree's `.git` is a file, a gitdir pointer) and lands on the enclosing main checkout instead, silently serving that checkout's `netlify/functions/` instead of the worktree's own. `netlify status`/`netlify link` report the correct (worktree) project root; only function loading is affected. Confirmed 2026-09-28 debugging why `get-newsletter-items.js` 404'd locally despite existing in the worktree.

## Eric's preferences
- Direct, short answers; minimal explanatory prose; copy-paste-ready outputs.
- Surgical edits over full-file rewrites where practical.
- Run `node --check` and verify div/bracket balance after edits, where applicable.
- Cost-benefit discipline — flag when a fix is disproportionate to what the product actually needs, rather than defaulting to the "more correct" but heavier option.
- **Android/iOS QA**: never run both emulators concurrently — starves the
  host, causes ANRs/phantom reloads. Alternate platforms. Boot Android with
  `-gpu swiftshader_indirect -memory 1536` (not `-gpu auto`), and kill stale
  gradle/kotlin daemons first if instability resurfaces. `-memory 1536` is
  guest RAM only — the host-side qemu process uses well more than that
  (`swiftshader_indirect` is software GPU rendering, itself heavy), so also
  stop Metro/`netlify dev` while the emulator boots and the native app
  installs, restarting them only once that's done, and never run a Gradle
  build at the same time as the emulator either (confirmed 2026-09-28: a
  disk-full Gradle failure and an OOM-crashed emulator both traced back to
  everything running at once). If the emulator becomes persistently
  unresponsive ("System UI isn't responding" loops that don't clear), it's
  faster to `adb emu kill` and relaunch with `-no-snapshot-load` (cold
  boot) than to keep waiting — confirmed this fixes it, likely a corrupted
  snapshot from an earlier crash. A `gradlew assembleDebug`
  "No space left on device" failure is a real full-disk issue on this
  machine, not a code problem — check `df -h /` first; `~/.gradle/caches`,
  Xcode DerivedData, and the Homebrew cache are all safe to clear and
  regenerate.
- **Dev-client testing**: the dev-tools floating button overlaps the
  top-right corner in every screen (same spot as the avatar button),
  blocking taps there. Workaround: temporarily point RootNavigator's
  entry route at the screen you need to reach, verify, then revert and
  confirm via `git status` before committing anything else.
- **Android build: JDK version matters.** `npx expo run:android` needs
  `JAVA_HOME` set explicitly — without it, `gradlew` fails immediately
  ("Unable to locate a Java Runtime"), and if that failure is piped
  through `tail` or similar, the masked exit code can look like success.
  With `JAVA_HOME` pointed at Android Studio's bundled JBR (Java 25 as
  of this writing), the build gets further but fails at
  `configureCMakeDebug` with `IllegalStateException: WARNING: A
  restricted method in java.lang.System has been called` — a JDK 24+
  "restricted native method" stderr line from the prefab/CMake step
  that AGP's error scanner misreads as fatal. Fix: use JDK 21 instead
  (`brew install openjdk@21`, then
  `export JAVA_HOME="/opt/homebrew/opt/openjdk@21"`) for Android builds
  on this machine.
- **Dev-client stuck on "Searching for development servers" / fails
  loading from a `100.x.x.x` address**: Metro is advertising the VPN's
  interface IP (Tailscale-range) instead of localhost, and the Simulator
  can't route to it — same root cause as the known VPN-blocks-loopback
  issue elsewhere in this file. Fix: kill the stale Metro on 8081
  (`lsof -i :8081`, `kill -9 <pid>`), restart it (`npx expo start --ios`),
  then force the dev client onto localhost directly instead of waiting
  for auto-discovery:
  `xcrun simctl openurl <device> "exp+quite-frankly://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"`.
