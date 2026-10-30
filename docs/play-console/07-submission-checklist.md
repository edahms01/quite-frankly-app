# 7. What you do in the console, in order

**ERIC** = only you can do it. **READY** = prepared in this pack or in the repo. **CHECK** = verify first.

## Before you open the Console
- [ ] **ERIC / CHECK** Frank's written permission for the name and logo (decides the title in `04`).
- [ ] **ERIC / CHECK** Firebase Android API key restrictions in Google Cloud (package `tv.quitefrankly.app` + SHA-1, FCM / Installations APIs only). Upload key SHA-1: `50:A3:B4:93:4D:85:66:B1:DC:E9:40:0F:78:28:70:C3:09:08:00:27`. After the first upload also add the **Play App Signing** SHA-1 (step 9).
- [x] **READY** FCM V1 service-account key is set in EAS (production profile). A real push reached an emulator.
- [ ] **ERIC / CHECK** App-site publish is current (privacy page is live; the paid-Substack push change and anything else on the app site must be published before launch). Production flags: `accounts` off, `onboarding` off, `askfrankie_enabled` on, `websiteLink` on.
- [ ] **ERIC / CHECK** Developer account type. A **personal** account created after Nov 2023 must run a **closed test with at least 12 opted-in testers for 14 continuous days** before it can apply for production. An **organization** account (DahmsIO LTD, verified) does not. Check Console > Dashboard.
- [ ] **ERIC** Decide the open items: the embedded-players data-safety answer (`01`), the 6-month bug-report deletion promise (`01`), the feature graphic (`06`).
- [x] **READY** AAB: `~/Desktop/Claude/qf-builds/quite-frankly-v8-production.aab` (versionCode 8, signed with the upload key, manifest and 16 KB checks pass). Each new upload needs a higher versionCode.

## In the Console
1. **ERIC** Create app: name (title from `04`), default language, **App**, **Free**, accept the declarations (policies, US export laws).
2. **ERIC** Dashboard > Set up your app: fill **App access, Ads, Content rating (`02`), Target audience (`05`), News app, Data safety (`01`), Government, Financial, Health, Foreground service (`03`, needs the video)**, then **Privacy policy URL**. Text for each is in this pack.
3. **ERIC** Main store listing: paste `listing/short-description.txt` and `listing/full-description.txt`, upload the 512 icon, the feature graphic and 4 to 8 screenshots (`06`), set category, tags, contact email, website.
4. **ERIC** Test and release > **Testing > Internal testing** > create release > **upload the v8 AAB** > accept **Play App Signing** (default) > save and roll out. Add yourself and testers by email in the testers tab.
5. **ERIC** Install from the internal-testing link on a **real device** and smoke-test it (Listen background audio, push, AskFrankie, Home link). This is the first test of the Play-signed build.
6. **ERIC** Test and release > **App integrity > App signing**: read the **App signing key SHA-1** and add it to the Firebase / Google Cloud key restriction (step above).
7. **ERIC** Open the **Pre-launch report** (appears some hours after the first upload): fix anything it flags as a crash. Accessibility and device-compatibility warnings are advisory.
8. **ERIC (only if the account is personal)** Run a **closed test** with 12+ testers for 14 days, then apply for production access in the Dashboard.
9. **ERIC** Production: **Create new release** from the same AAB (or a newer versionCode), release notes, review the summary.
10. **ERIC** Before you send it for review: **Publishing overview > Managed publishing ON** so approval does not auto-publish. Choose a **staged rollout** (suggest 20% first, then raise) when you start the rollout.
11. **ERIC** Send for review. First-time apps typically take several days, sometimes longer. Answer any policy emails from the Console, not by email.
12. **ERIC** When approved, with managed publishing on, press **Publish**. Watch Android vitals and the crash rate for 48 hours before raising the rollout.

## Not in the Console (mine, when you ask)
Feature graphic, store screenshots from the v8 APK, the 30-second foreground-service video, a rebuild if anything changes (needs a new versionCode; the local `eas build --local` route works).
