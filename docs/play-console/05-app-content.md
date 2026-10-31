# 5. App content declarations (Console: Policy > App content)

| Section | Answer |
|---|---|
| **Privacy policy** | `https://quite-frankly-app.netlify.app/privacy.html` (live, 200, updated 29 Oct 2026, includes the YouTube API Services paragraph and "live, new video, new Substack post") |
| **App access** | **All functionality is available without special access.** No login, no accounts, no demo credentials. AskFrankie asks for an AI-processing consent tick on first use, it needs no sign-in. Add this note if there is a free-text box: "Open Home > Ask, tick the consent box, then ask a question." |
| **Ads** | **No, my app does not contain ads** |
| **Content rating** | see `02-content-rating.md` (expect Teen) |
| **Target audience and content** | Age groups: **13-15, 16-17, 18 and over**. Do **not** select any group under 13. "Could your app appeal to children?" **No** (talk show; no child-directed design; the app's own age notice is 13+, AskFrankie 18+). Not in the Families programme |
| **News apps** | **No, my app is not a news app** (commentary podcast and video show; a Substack / blog reader is not a news publisher declaration) |
| **COVID-19 contact tracing / status apps** | No |
| **Data safety** | see `01-data-safety.md` |
| **Government apps** | **No** |
| **Financial features** | **My app doesn't provide any financial features** (no payments, wallets, loans, crypto; the crypto addresses were removed in PR #60) |
| **Health** | **My app does not have any health features**. No Health Connect, no health content, no medical claims |
| **Advertising ID** | Does the app use an advertising ID? **No** (`AD_ID` is absent from the merged manifest) |
| **Foreground service permissions** | see `03-foreground-service.md` |
| **Photo and video permissions** | Not applicable: the app declares no `READ_MEDIA_*` permission (it uses the system Photo Picker; `READ_EXTERNAL_STORAGE` is capped at Android 12L) |
| **Data deletion / account deletion** | **No account-deletion URL is needed**: the app has no accounts, no sign-in and no account creation (answer "No" to account creation in Data safety). Data deletion is by email (hello@dahms.io), see the answer in `01`. Do not enter `delete-account.html` |
| **Exact alarms / full-screen intents / VPN / accessibility / SMS / call log / all-files access** | Not used. Nothing to declare |
| **Target API level** | 36 (current requirement met). 16 KB page-size compatible (checked on the v8 AAB) |
