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

---

## Component conventions

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

## Known open items
- **Calendar's real source** — need to ask Frank (ICS-capable calendar vs. manual).
- **EAS project linkage** — done (`app.json` has `extra.eas.projectId`, `eas.json` configured with dev/preview/production build profiles + submit config). Unblocks real push tokens (`getExpoPushTokenAsync`) for live device testing. Expo's push service (`expo-notifications`) is integrated.
- **Member-unlocked states** — every "member" screen currently shows only the non-member view; real membership verification (Squarespace Commerce API lookup) is deprioritized, comes after core app ships.
- **SubscriptionCheckout has no post-purchase confirmation screen** — `TRUST_ANY_CLOSE_AS_COMPLETE` (the Phase 6 decision to treat any checkout-sheet dismissal as a completed purchase) was reverted — it was falsely claiming success on every dismissal, not just real ones. `SubscriptionConfirmed` screen removed; closing the checkout sheet now just returns to the Subscription screen, no claim of success either way. Checkout provider (Squarespace) still gives no redirect signal to distinguish "completed" from "backed out," so a real confirmation screen needs either Squarespace dashboard access to configure a post-purchase redirect (`quitefrankly://checkout-complete`, already coded as `REDIRECT_URL` in `SubscriptionCheckout.js` but nothing fires it) or real membership verification. Deferred alongside "Member-unlocked states."
- ~~**OTP code-entry screen** — Onboarding collects email; the verification step after it isn't designed yet.~~ Stale — `CodeEntry.js` is fully built (6-digit input, resend cooldown, lockout, error states) and `send-code`/`verify-code`/`lib/otp.js` are live in production, confirmed working end-to-end 2026-09-27 (Resend email + Netlify Blobs session tokens). `Email.js` now also validates the address format client-side before calling `send-code` and surfaces the server's actual error message instead of a generic one.
- **Old-Android network fetches fail despite browser working** — on a real Android 8.0 device, Watch/Listen showed "Unable to load videos" / no audio, while the same backend URL opened fine in the phone's browser and `curl` confirmed the API is healthy. Cause: the device's system-level cert trust store (used by the app's network layer) is frozen at its last security patch, while Chrome/WebView maintain their own independently-updated trust store — a known divergence on old, unpatched Android. Accepted limitation (will not fix) — treat as a device-age issue, not a code bug. Re-test on current Android device if it resurfaces.

---

## Eric's preferences
- Direct, short answers; minimal explanatory prose; copy-paste-ready outputs.
- Surgical edits over full-file rewrites where practical.
- Run `node --check` and verify div/bracket balance after edits, where applicable.
- Cost-benefit discipline — flag when a fix is disproportionate to what the product actually needs, rather than defaulting to the "more correct" but heavier option.
- **Android/iOS QA**: never run both emulators concurrently — starves the
  host, causes ANRs/phantom reloads. Alternate platforms. Boot Android with
  `-gpu swiftshader_indirect -memory 1536` (not `-gpu auto`), and kill stale
  gradle/kotlin daemons first if instability resurfaces.
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
