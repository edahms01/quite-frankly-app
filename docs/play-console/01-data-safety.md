# 1. Data safety form

Source of truth: `netlify/public/privacy.html` (live at https://quite-frankly-app.netlify.app/privacy.html, last updated 29 October 2026) and the code on `main`. The answers match it. Google's rule used throughout: **sending data to a service provider that only processes it for you (Expo push, Google FCM, Netlify hosting, Anthropic / Voyage AI for AskFrankie answers) is "collected", not "shared".**

## Overview questions (the Console's first screen)
| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS only; release builds block cleartext, verified) |
| Which account creation methods does your app support? | **None** (no accounts, no sign-in) |
| Do you provide a way for users to request that their data is deleted? | **Yes**. URL to paste: `https://quite-frankly-app.netlify.app/delete-account.html`; also hello@dahms.io. Say in the free-text: "No accounts. Bug reports and push registrations can be deleted on request by email." |
| Committed to follow the Play Families Policy? | **No** (app is 13+, not for children) |
| Independent security review? | **No** |

## Data types (tick exactly these; everything else = not collected)
| Category > type | Collected | Shared | Optional? | Purposes | Why / what exactly |
|---|---|---|---|---|---|
| **Device or other IDs** | Yes | Yes (see "Embedded players" below) | Required | App functionality; Fraud prevention, security and compliance | (a) Expo push token, sent to our server only if the user allows notifications; (b) Firebase installation ID created by Firebase Cloud Messaging (no Analytics, no ads SDK); (c) AskFrankie stores a one-way scrambled (HMAC) network address per question to limit abuse. Not linked to a person; not used for ads |
| **App activity > Other user-generated content** | Yes | No | Optional | App functionality | Text of bug reports / feature requests (Settings > Report a Bug) and the optional AskFrankie questions (AI chat). AskFrankie questions go to Anthropic and Voyage AI as service providers (consent box before the first question) |
| **Photos and videos > Photos** | Yes | No | Optional | App functionality | One optional screenshot the user picks with the system Photo Picker and attaches to a bug report |
| **App info and performance > Diagnostics** | Yes | No | Optional | App functionality | A short device string sent with a bug report (`android <version> / Quite Frankly 1.0.0`) |

**Not collected (leave unticked):** location, personal info (name, **email**, address, phone, user IDs), financial info, health and fitness, messages, audio, files and docs, calendar, contacts, web browsing, crash logs. The app has no sign-in, so no email is collected; the earlier test accounts (if any) are removable on request.

## Embedded players (decision for Eric; recommendation: declare)
YouTube, Spotify and Bandcamp load inside the app in WebViews, and SoundCloud / Twitch / Rumble / SpeakPipe open in the browser tab. These sites receive the device's network address and browser details directly. Google may treat that as data "shared" by the app. **Recommended (conservative, matches `privacy.html` "they handle your data under their own policies"):** on *Device or other IDs* answer **Shared: Yes**, recipient type "third party", purpose **App functionality** (playing the embedded content). The alternative (answer No) is the lower-disclosure option and carries a mismatch risk if reviewed. Apple's equivalent answer is in `CLAUDE.md`.

## Retention and deletion (free-text where asked)
- Push registration: kept until the device unregisters or the user asks for deletion (email).
- Bug reports and screenshots: kept up to 6 months, then deleted. **Open item: nothing deletes them automatically yet** (`CLAUDE.md` release-prep 8a). Either build the purge job before launch or reword `privacy.html`.
- AskFrankie guest questions: erased automatically after 90 days (AskFrankie privacy notice, https://askfrankie.netlify.app/privacy.html).

## Cross-checks (all verified on the v8 build)
- No advertising ID: `AD_ID` absent from the merged manifest. No analytics SDK. No tracking.
- Permissions that explain the data: `POST_NOTIFICATIONS` (push), `INTERNET`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED` (notification scheduling), `MODIFY_AUDIO_SETTINGS`, `VIBRATE`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `READ/WRITE_EXTERNAL_STORAGE` (maxSdk 32, from the image picker; on Android 13+ the system Photo Picker is used, no media permission), `com.google.android.c2dm.permission.RECEIVE` (FCM). Not present: microphone, camera, location, contacts.
