# 4. Main store listing

Rules applied (Google Play metadata policy): no price or promo words, no ALL CAPS, no emoji or symbol spam, no "best / #1 / top", no references to other apps or stores, no unverifiable claims, no claim that the listing is operated by Frank. Nothing about donations, Patreon, support links or Culture Club. Checked by script: no `donat`, `patreon`, `support`, `culture club`, `sponsor`, `paypal`, `free`, `best`, `subscribe`, `crypto` in the text files; no emoji. The only all-caps word is "LTD" inside the approved ownership notice.

| Field | Paste / choose | Limit |
|---|---|---|
| **App name** | **Decision (Eric).** Until Frank's written permission is confirmed use `Quite Frankly Fan App` (21 / 30). With permission: `Quite Frankly` (13 / 30). The installed app name stays "Quite Frankly" either way; only the Play title changes | 30 |
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
- The title / brand risk: "Quite Frankly" is the show's name. A listing titled exactly that, with the show's name in the package, can be read as implying the show runs the app. That is why the description says it is fan-built and independent, and why I recommend the `Fan App` title until Frank's permission is in writing. Once you have the permission, say so and I will switch the title and soften the sentence (the ownership notice itself says "used with permission" may be added only when you say so).
- "Shop" is described as links to partner shops with purchases on the partners' sites; there is no purchase flow in the app. Remove that paragraph if you prefer not to mention shops.
- Screenshot captions are not needed; graphics are in `06-graphics.md`.
