# 1. Data safety form

Source of truth: `netlify/public/privacy.html` (live at https://quite-frankly-app.netlify.app/privacy.html, last updated 29 October 2026) and the code on `main`. The answers match it. Google's rule used throughout: **sending data to a service provider that only processes it for you (Expo push, Google FCM, Netlify hosting, Anthropic / Voyage AI for AskFrankie answers) is "collected", not "shared".**

## Overview questions (the Console's first screen)
| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS only; release builds block cleartext, verified) |
| Which account creation methods does your app support? | **None** (no accounts, no sign-in) |
| Do you provide a way for users to request that their data is deleted? | **Yes, by email (hello@dahms.io); no accounts.** Do not paste `delete-account.html` (it only serves people who signed in on an earlier test version). If the Console insists on a link, use the privacy page, `https://quite-frankly-app.netlify.app/privacy.html`. Free-text: "No accounts. Bug reports and push registrations can be deleted on request by emailing hello@dahms.io." |
| Committed to follow the Play Families Policy? | **No** (app is 13+, not for children) |
| Independent security review? | **No** |

## Data types (tick exactly these; everything else = not collected)
| Category > type | Collected | Shared | Optional? | Purposes | Why / what exactly |
|---|---|---|---|---|---|
| **Device or other IDs** | Yes | **Yes** (embedded players only; see "Shared vs service providers" below) | Required | **Collected purposes: App functionality; Developer communications; Fraud prevention, security and compliance.** **Shared purposes: App functionality only** (the embedded players) | (a) Expo push token, sent to our server only if the user allows notifications; (b) Firebase installation ID created by Firebase Cloud Messaging (no Analytics, no ads SDK); (c) AskFrankie stores a one-way scrambled (HMAC) network address per question to limit abuse. Not linked to a person; not used for ads |
| **App activity > Other user-generated content** | Yes | No | Optional | App functionality | Text of bug reports / feature requests (Settings > Report a Bug) and the optional AskFrankie questions (AI chat). AskFrankie questions go to Anthropic and Voyage AI as service providers (consent box before the first question) |
| **Photos and videos > Photos** | Yes | No | Optional | App functionality | One optional screenshot the user picks with the system Photo Picker and attaches to a bug report |
| **App info and performance > Diagnostics** | Yes | No | Optional | App functionality; Analytics | A short device string sent with a bug report (`android <version> / Quite Frankly 1.0.0`) |

**Not collected (leave unticked):** location, personal info (name, **email**, address, phone, user IDs), financial info, health and fitness, messages, audio, files and docs, calendar, contacts, web browsing, crash logs. The app has no sign-in, so no email is collected; the earlier test accounts (if any) are removable on request.

## Shared vs service providers (decided by Eric 2026-10-30)
**SHARED = Yes**, on *Device or other IDs*: the **YouTube, Spotify and Bandcamp embedded players**. They load inside the app in WebViews and receive the device's network address and browser details directly, and they handle that data under their own policies. This is what `privacy.html` says ("they handle your data under their own policies"). In the Console: recipient type "third party", purpose **App functionality** (playing the embedded content). SoundCloud, Twitch, Rumble and SpeakPipe only open in the browser tab (the browser, not the app, talks to them): not app-shared, but they are named in `privacy.html`.

**NOT shared (service providers acting on our behalf)**, so they are "collected", not "shared" under Google's definition:
- **Netlify**: hosts our servers and the small database for push registrations, bug reports and AskFrankie data. It only stores and serves what we send it.
- **Expo push service (with Google FCM / Apple APNs)**: only delivers the notifications we ask it to send; the push token is used for nothing else.
- **Anthropic and Voyage AI**: process an AskFrankie question to write and search an answer, under the user's explicit consent box, and only for that request.

Why the difference: the embedded players receive data because the user's device talks to them for their own purposes; the three above receive data only to do a job for us.

## Retention and deletion (free-text where asked)
- Push registration: kept until the device unregisters or the user asks for deletion (email).
- Bug reports and screenshots: kept up to 6 months, then deleted. The automatic delete is built in PR #66 (`bug-report-retention`, daily). **It deletes nothing until Eric sets `BUG_RETENTION_ENABLED=true`**; enable it before launch so the policy statement is true (0 reports are old enough today).
- AskFrankie guest questions: erased automatically after 90 days (AskFrankie privacy notice, https://askfrankie.netlify.app/privacy.html).

## Cross-checks (all verified on the v8 build)
- No advertising ID: `AD_ID` absent from the merged manifest. No analytics SDK. No tracking.
- Permissions that explain the data: `POST_NOTIFICATIONS` (push), `INTERNET`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED` (notification scheduling), `MODIFY_AUDIO_SETTINGS`, `VIBRATE`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `READ/WRITE_EXTERNAL_STORAGE` (maxSdk 32, from the image picker; on Android 13+ the system Photo Picker is used, no media permission), `com.google.android.c2dm.permission.RECEIVE` (FCM). Not present: microphone, camera, location, contacts.
