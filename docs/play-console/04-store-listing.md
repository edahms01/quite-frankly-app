# 4. Main store listing

Rules applied (Google Play metadata policy): no price or promo words, no ALL CAPS, no emoji or symbol spam, no "best / #1 / top", no references to other apps or stores, no unverifiable claims, no claim that the listing is operated by Frank. Nothing about donations, Patreon, support links or Culture Club. Checked by script: no `donat`, `patreon`, `support`, `culture club`, `sponsor`, `paypal`, `free`, `best`, `subscribe`, `crypto` in the text files; no emoji. The only all-caps word is "LTD" inside the approved ownership notice.

| Field | Paste / choose | Limit |
|---|---|---|
| **App name** | **`Quite Frankly`** (13 / 30). Decided by Eric 2026-10-30. Same as the installed app name | 30 |
| **Short description** | `listing/short-description.txt`: "Watch, listen and read the Quite Frankly show, with alerts for new episodes." (76 / 80) | 80 |
| **Full description** | `listing/full-description.txt` (2078 / 4000). Includes "This app is fan-built and independent. It is not run by Frank." (true today, matches the in-app bug-report screen), the AskFrankie AI disclosure, and the approved ownership notice word for word (the same string as `src/config/legal.js`) | 4000 |
| **App or game** | App | |
| **Category** | **Entertainment**. Alternative: Music & Audio. Do **not** pick News & Magazines (triggers the news declaration and policy for news content) | |
| **Tags** (up to 5; pick from the list the Console offers) | Podcasts, Video player, Entertainment, Live streaming, Talk shows (use the closest ones that exist) | 5 |
| **Contact email** | hello@dahms.io | |
| **Website** | https://dahms.io (developer site). Do **not** use quitefrankly.tv (Frank's site shows membership pages and is not the developer's) | |
| **Phone** | leave empty | |
| **Default language** | English (United States) or English (United Kingdom): match the text spelling (the text is neutral) | |
| **Free or paid** | **Free** (cannot be changed later). No in-app purchases, no ads | |
| **Privacy policy** | https://quite-frankly-app.netlify.app/privacy.html | |

## Notes
- Brand risk (kept on purpose): "Quite Frankly" is the show's name, so a listing with that exact title can be read as implying the show runs the app. Eric decided to keep the title and to **keep** the sentence "This app is fan-built and independent. It is not run by Frank." in the full description because it lowers the impersonation risk. Do not add "used with permission" anywhere (title, description or ownership notice) unless Eric says so.
- "Shop" is described as links to partner shops with purchases on the partners' sites; there is no purchase flow in the app. Remove that paragraph if you prefer not to mention shops.
- Screenshot captions are not needed; graphics are in `06-graphics.md`.
