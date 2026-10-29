# QF app: payment / donation / outbound-link audit (Google Play + Apple)

Date: 2026-10-29. Audit only: no code, flags, sheets, Blobs, builds or merges were touched. Read against `origin/main` @ `aa74b10` (after #58). **PR #59 (Play readiness) is NOT merged and was not touched**; where it matters this report says what #59 adds.
Evidence = repo source, the live production functions the app calls (read-only GETs), the published Shop sheet CSV (public, the app fetches it), live public web pages, and the current policy pages. Web-page contents were summarised by a fetch tool; JS-only pages (Bandcamp embed, Pilled, Cultivate Elevate) could not be read statically and are marked UNVERIFIED.

---

## 1. Policy text (fetched 2026-10-29; short quotes only)

### Google Play
| Source | What it says | Use here |
|---|---|---|
| [Developer Program Policy > Payments](https://support.google.com/googleplay/android-developer/answer/9858738), section 2 | Apps charging for in-app features "must use Google Play's billing system for those transactions unless Section 3, 8, or 9 applies." | Subscriptions / memberships / digital perks must go through Play Billing |
| same, section 3 (exemptions) | Billing is not used for physical goods and services; "peer-to-peer payments, online auctions, and tax exempt donations" | Physical goods are fine; donations are exempt **only if tax exempt or peer-to-peer** |
| same, **section 4** | Apps "may not lead users to a payment method other than Google Play's billing system", including "In-app webviews, buttons, links, messaging, advertisements, or other calls to action" | The core rule. Covers links **and messaging** |
| same, sections 8 and 9 | Alternative billing / external links are allowed only in eligible countries and only if enrolled in a programme | Not enrolled; the app ships worldwide |
| [Understanding the Payments policy (FAQ)](https://support.google.com/googleplay/android-developer/answer/10281818) | A tip/contribution where "100% ... goes to the creator" and no digital content or perks are granted is treated as peer-to-peer (billing not required). Also: developers may not lead users to another payment method by "directly linking to a webpage that could lead to an alternate payment method". Subscription services are listed as billing-required; physical goods and services are not. Account/privacy/help links that do not lead to payment methods are allowed. | **Eric's premise ("no donations/tips at all") is stricter than the text**: a no-perks tip that goes 100% to the creator may qualify as peer-to-peer. Whether that fits here is Open Question 1 |
| [External content links programme (US)](https://support.google.com/googleplay/android-developer/answer/16470497) | US-only; enrolment + approval; the link "must inform the user about the destination page and its purpose"; fees and reporting (per its 22 Jul 2026 update, fees apply from 1 Oct 2026) | An option for US users only; not worldwide; costs fees |
| [External payments (Japan)](https://support.google.com/googleplay/android-developer/answer/16787536) | Japan only; closed to new enrolments after 30 Sep 2026, discontinued 31 Mar 2027 | Irrelevant |
| [Financial Services](https://support.google.com/googleplay/android-developer/answer/9876821) | Scope: "the management or investment of money and cryptocurrencies, including personalized advice"; any app with financial features must complete the Financial features declaration. Precious metals, wallet addresses and linking to outside sellers are **not mentioned** | Displaying BTC/XRP addresses and a gold-dealer link are not clearly in scope; not clearly out either |
| [Health Content and Services](https://support.google.com/googleplay/android-developer/answer/16679511) | Play "doesn't allow apps that promote or sell unapproved substances" and lists "False or misleading health claims"; "Don't facilitate the sale of unapproved pharmaceuticals or supplements"; health misinformation. Linking out / affiliate links are **not addressed** | Supplement affiliates and AI answers about supplements are a content-policy question, not a billing one |

No "last updated" date is shown on any of these pages (footer "©2026 Google").

### Apple App Review Guidelines ([developer.apple.com/app-store/review/guidelines](https://developer.apple.com/app-store/review/guidelines/); no revision date on the page)
| Section | What it says | Use here |
|---|---|---|
| 3.1.1 | Unlocking features/functionality must use IAP; "Apps may use in-app purchase currencies to enable customers to 'tip' the developer or digital content providers in the app." | Tips: IAP is the in-app route |
| **3.1.1(a)** Link to Other Purchase Methods | Entitlements are for links to purchase digital content; "These entitlements are not required for developers to include buttons, external links, or other calls to action in their United States storefront apps." Elsewhere, apps and metadata "may not include buttons, external links, or other calls to action." | **Eric is right for the US storefront**; non-US storefronts must not carry them |
| 3.1.2 | Subscription rules (ongoing value, clear description of price) | Applies to Culture Club-type memberships if sold in-app |
| 3.1.3 | Apps in that section "cannot, within the app, encourage users to use a purchasing method other than in-app purchase, except for apps on the United States storefront" | Same US exception |
| 3.1.3(a) Reader apps | Existing customers may access previously purchased content; an informational link needs the External Link Account Entitlement, "not required" in the US storefront | The "Already a Supporter? Log in" link is closest to this |
| 3.1.3(e) | Goods and services used outside the app: use other methods (card, Apple Pay) | Physical goods (shop, merch) |
| 3.2.1(vi)/(vii), 3.2.2(iv) | Only approved nonprofits fundraise in-app; gifts must be optional with 100% to the receiver; otherwise "may only collect funds outside of the app, such as via Safari or SMS" | Donation/tip links are not covered by a nonprofit exception here |

**US legal status (web search, May 2026; not Apple's page): treat as unsettled.** Apple was reported not to be charging a commission on US link-out purchases; the Ninth Circuit let a commission be set again and remanded to the district court; Apple petitioned the Supreme Court. Sources: [MacRumors, 29 Apr 2026](https://www.macrumors.com/2026/04/29/epic-games-wins-reversal-app-store-fee-battle/), [9to5Mac, 21 May 2026](https://9to5mac.com/2026/05/21/apple-seeks-supreme-court-review-of-contempt-finding-and-injunction-scope-in-epic-games-case/). The guideline page lists **no disclosure or format requirements** for US external links.

---

## 2. Current gating on `main`

Production flag blob (read via the fixed `set-flag.mjs`): `askfrankie_enabled` ON, `askfrankie_linked_login` ON; everything else absent (= off). `cultureClub` OFF, `accounts` OFF, `onboarding` OFF.

**`main` has NO Android payment gating at all.** Android sees exactly what iOS sees. PR #59 adds `androidMonthlySupport` (default OFF, remote-switchable) which hides **only** the "Monthly Support" section of Support the Show (Squarespace card, RECOMMENDED badge, Patreon, SubscribeStar) and the "$5/month" line on the checkout. Everything else in the inventory below stays visible on Android even with #59.

---

## 3. Inventory

Risk key: Google = against Payments section 4 / sections 2-3; Apple = against 3.1.1 / 3.1.3 (non-US storefront; the US storefront is permitted by 3.1.1(a) unless noted). "Android today" = on `main`; "(#59)" = what changes with #59.

### 3a. Static (in the app bundle)

| # | Where | Screen | Label shown | Destination | Opens how | Category | Android today | iOS today | Google | Apple |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 | `src/components/SponsorButton.js`; used `Home.js:151`, `Watch.js:139` (BackHeader child), `Listen.js:162` (BackHeader child), `VideoPlayer.js:191` | Home, Watch, Listen, Video Player | gold **"Support the Show"** | in-app screen Subscription (S3-S7) | in-app navigation | donation/membership CTA | Y (4 main screens) | Y | **HIGH** (s.4 "buttons ... calls to action"; leads to S3-S7) | HIGH non-US |
| S2 | `Account.js:15` | Settings | "Support the Show" row | Subscription | in-app | donation/membership CTA | Y | Y | HIGH | HIGH non-US |
| S3 | `Subscription.js:36-60` | Support the Show | **"Support Frank Directly"** card, RECOMMENDED badge | `SubscriptionCheckout` modal ("Plans start at $5/month.") then `WebBrowser.openAuthSessionAsync` to `quitefrankly.tv/patrons-products/quite-frankly-at-your-service` | in-app auth session (Custom Tab) | **membership-subscription** (page: $5 to $1000 "every month"; perks = raffles, private streams, band practices; "Subscribe" button) | Y (hidden with #59) | Y | **HIGH** (s.2 subscription; s.4) | HIGH non-US |
| S4 | `Subscription.js:10-20,54-70` | Support the Show | **Patreon**, **SubscribeStar** | `patreon.com/QuiteFrankly`, `subscribestar.com/quitefrankly` | external (`Linking.openURL`, hands off to their apps) | membership-subscription | Y (hidden with #59) | Y | **HIGH** | HIGH non-US |
| S5 | `Subscription.js:23,75-86` | Support the Show > "One-Time Donation" | **PayPal** | `paypal.me/QuiteFranklyLive` (http in code; https in #59) | external | donation-tip | Y (**not gated even with #59**) | Y | **HIGH to MED**: s.4, but see FAQ peer-to-peer tip text (Open Question 1) | MED-HIGH non-US (tip links; 3.1.1 tips via IAP; 3.2.2(iv)) |
| S6 | same | same | **Amazon** | `amazon.com/shop/quitefranklyofficial` (Frank's Amazon storefront) | external | affiliate / physical goods, **mislabelled under "One-Time Donation"** | Y | Y | LOW as a shop link, but its placement under "Donation" muddies it | LOW |
| S7 | `Subscription.js:25-26,83-84`, `CryptoCard.js` | same | **BTC** `bc1q97w5...`, **XRP** `rnES2v...` (copy cards) | no link; displays receive addresses | n/a | donation-tip (crypto) | Y | Y | MED (messaging calling for payment; not a payment method Google controls; Financial Services policy silent on displaying addresses) | MED (3.1.1 mentions cryptocurrencies only as an unlock mechanism) |
| S8 | `Subscription.js:88-93` | same | "Mail": "send letters, cards, or small gifts to" a PO address | none | n/a | other (mail address) | Y | Y | LOW | LOW |
| S9 | `src/screens/account/DonateToApp.js` (registered `AccountStackNavigator.js:18`, **nothing navigates to it**) | unreachable | Cash App, Revolut, Monzo, Wise tip links + ETH/SOL/BTC/DOGE addresses, with a "TODO(Eric): swap these" comment | `cash.app/$edahms33`, `revolut.me/edahms`, `monzo.me/ericdahms7`, `wise.com/pay/me/ericd1472` | would be external | donation-tip **to the app developer** | not reachable, but the strings ship in the AAB | not reachable | MED (HIGH if ever wired: a developer tip jar is not tax exempt) | MED |
| S10 | `src/screens/members/CultureClub.js:27-45` (whole tab hidden while `cultureClub` is OFF, as in production) | Culture Club tab | **"Support the Show to Join Culture Club"**; **"Already a Supporter? Log in to QuiteFrankly.TV to access the Culture Club."** | S3 / `quitefrankly.tv/quite-frankly-members-only` (anonymous fetch returns HTTP 401) | in-app browser | join CTA + existing-member login | N while flag off | N while flag off | HIGH if turned on (join CTA) / LOW (login) | HIGH non-US / OK (reader-style login, 3.1.3(a)) |
| S11 | `Article.js:175-190,298`; `WritingSubstack.js:42-56` | Read > Substack, paid post | "Paid" pill + **"Subscribe to Read"** | the post URL on `quitefranklyofficial.substack.com` (Substack paywall) | `openOutbound` (browser) | **membership-subscription** (paid newsletter) | Y | Y | **HIGH** (s.2 content subscription; s.4 button) | HIGH non-US |
| S12 | `Community.js:14-30,64-70` | Connect | Discord, Telegram, Forum (in-app); Substack, Instagram, X, Tumblr, YouTube, Truth (follow); Events row "Main Event . Oct 23, 2027" | `discord.gg`, `t.me`, vBulletin forum, `substack.com` home, etc.; Events -> `quitefrankly.tv/the-quite-frankly-live-events` | in-app / external | social-follow; info | Y | Y | LOW (social pages carry their own subscribe buttons; Substack home has subscribe CTAs: LOW-MED). Events page: "ticket information to come", no sales yet | LOW |
| S13 | `Watch.js:18-23`, `VideoPlayer.js:43-44,179` | Watch, Video Player | YouTube, Rumble, Twitch, Pilled (in-app); "Watch on YouTube" | channel pages | external / in-app | social-follow | Y | Y | LOW (destinations have Join/Subscribe buttons: platform pages, not our CTA) | LOW |
| S14 | `Listen.js:33-41` | Listen | Apple, Spotify, SoundCloud, Deezer, Audible; copy RSS | podcast listings | external | social/listen | Y | Y | LOW | LOW |
| S15 | `Music.js:7-16` | Jam | **Bandcamp embed** (album 1087783863) + Spotify embed, "Open in Spotify" | embeds | WebView | other digital (music for sale) | Y | Y | **UNVERIFIED, likely MED**: Bandcamp embeds normally show a "Buy" link for a purchasable album; the embed is JS-only so I could not read it statically. **Needs an on-device check** | same |
| S16 | `PhoneLines.js:16` | Call | Leave a Voicemail (SpeakPipe); call-in number | `speakpipe.com/QuiteFrankly`; `tel:` | Custom Tab / dialer | other | Y | Y | LOW | LOW |
| S17 | `Shop.js:16-` | Shop | rows from the sheet (3b) | per row | external (`Linking`) unless `inAppBrowser` | physical-goods shop / affiliate / **mixed** | Y | Y | see 3b | see 3b |
| S18 | `privacy.html` (app site) | Settings > Privacy Policy | sentence naming "Patreon, SubscribeStar, PayPal, Amazon" as sites the app links to | text | in-app browser | info | Y | Y | LOW (must be updated if Android drops them) | LOW |

### 3b. Runtime-fed content

| # | Source | Screen | What is there | Opens how | Category | Android | iOS | Google | Apple |
|---|---|---|---|---|---|---|---|---|---|
| R1 | YouTube episode **descriptions** via `get-youtube-episodes`; rendered `VideoPlayer.js:196-206` (plain `<Text>`, first 10 lines shown, "Show more") | Video Player (every video) | **25 of the 50 newest descriptions carry the full support block** (older ones do not): "Join The Culture Club - Keep Quite Frankly Independent: https://www.quitefrankly.tv/sponsor", "One-Time Tip: https://www.paypal.me/QuiteFranklyLive", Amazon storefront, merch, "Gold & Silver: https://quitefrankly.gold", mail address; 21 also mention BTC/XRP. In **23 of the 50 the payment/CTA text sits inside the collapsed 10-line preview**, i.e. visible without tapping "Show more" | **Text only** (URLs are not tappable in RN `<Text>`; selectable text could be copied) | **messaging** to join/tip | Y | Y | **HIGH** (s.4 lists "messaging ... or other calls to action"; it is text, not a link, but the wording is an explicit call to join/tip, on the main video page, and Frank can add it to any new video) | MED-HIGH non-US |
| R2 | SoundCloud episode descriptions via `get-soundcloud-episodes`; `FullPlayer.js:89` renders `currentTrack.description` | Full Player | The app shows the **short, truncated `description`** (about 280 chars; 45 of 50 end in "..."); only 1 of 50 mentions Patreon; none carries a PayPal/crypto line. **But the same objects carry `descriptionFull` (untruncated), and 48 of 50 of those contain the PayPal tip line and most the BTC/XRP text.** It is in the data, just not rendered | text | messaging | Y | Y | LOW today; **HIGH the day anything renders `descriptionFull`**, so the sanitiser must cover both fields | LOW today |
| R3 | Home "Most Recent" feed (`get-youtube-feed`) | Home | title/thumbnail only in the UI (description is carried but not shown) | in-app video | info | Y | Y | LOW | LOW |
| R4 | Shop sheet (3b) | Shop | 15 rows | external | mixed | Y | Y | see 3b | see 3b |
| R5 | Blog posts (`get-blog-posts`), Newsletter items (`get-newsletter-items`) | Read > Blog / Newsletter | Sample of 20 each: **no payment terms found**. HTML body links open in the in-app browser (`Article.js:86`, `BulletinViewer.js:99-117`); future posts can contain anything | in-app browser | info | Y | Y | LOW now, **unbounded** (author-controlled HTML) | same |
| R6 | Substack feed (`get-substack-posts`, 1 post at time of audit) | Read > Substack | paid posts show teaser + S11 | browser | membership-subscription | Y | Y | HIGH (S11) | HIGH non-US |
| R7 | Push payloads (`twitch-webhook.js:105`, `poll-youtube.js:216`, `poll-substack.js:47,130`) | notification | "Quite Frankly is live", "New video from Quite Frankly" + title, "New from Frank on Substack" + title | tap opens app | info | Y | Y | LOW (titles only; unmoderated) | LOW |
| R8 | **AskFrankie in the WebView (`?app=1`)** | Home > Ask | Page hides menu (sponsor ships, shop), footer and Research-more in app mode (`html.app .mn{display:none}`). Remaining: AI answers (text; the sampled answer on nattokinase discusses "Keto Brains products Frank sells" and health claims), source links **"Open Page" / "Open Replay"** to arbitrary web results or YouTube, Terms/Privacy | links open in the in-app browser (`classifyRequest`) | AI content | Y | Y | LOW for payments; **MED for Health Content** (AI answers about supplements; "false or misleading health claims") | MED (AI + health) |
| R9 | Culture Club content / calendar | Culture Club tab (flag off), Schedule page | static mock schedule; club days shown as normal shows while the flag is off | n/a | info | Schedule Y | Y | LOW | LOW |

### 3c. Shop and Affiliates sheet: classification of all 15 live rows

(Published CSV, columns Category/Name/URL/Code/Note; promo codes omitted here.) A row is "not clearly physical" if it sells a digital service, subscription or program.

| Row | Category | What the destination is | Physical vs digital | Other restricted-content flag | Android action |
|---|---|---|---|---|---|
| Rise Attire | Shop | apparel | physical | none | keep |
| Coffee Revolution (Shop + Affiliate) | both | coffee | physical | none | keep |
| Keto Brainz (Shop + Affiliate) | both | "Nootropic Creamer" | physical | **supplement / health claims** (Play Health Content) | keep or hide: Eric's call (Q3) |
| Wise Wolf Gold & Silver (`quitefrankly.gold`) (Shop + Affiliate) | both | "how to buy precious metals and hedge against economic uncertainty" | physical bullion but **investment framing** | **financial-adjacent** (Play Financial Services is silent on precious metals; not a Billing issue) | hide on Android (Q3) |
| **Patriot Protect** | Affiliate ("15% off any plan") | "opt-out services ... removing personal data from people-search sites" | **digital service, recurring plans** | none | **hide on Android** (Payments: digital subscription sold outside Play) |
| Pluck | Affiliate | spices with "organ-based nutrition" | physical | health claims (low) | keep |
| **Cultivate Elevate** | Affiliate | **UNVERIFIED** (page not readable by my fetch; promo code only) | unknown | unknown | Eric to classify |
| **J Gulinello - Health Reclamation Project** | Affiliate | "personalized health and wellness programs, educational resources, and community support" | **digital program / membership** | health claims | **hide on Android** |
| YesCacao | Affiliate | cacao | physical | none | keep |
| Apex Water | Affiliate | water-treatment products | physical | health claims (low) | keep |
| **Flip City Magazine** | Affiliate ("10% off subscriptions") | "independent American satire magazine ... in print and digital" | **subscription, includes digital** | none | hide on Android, or keep only if print-only |
| Farmalogical Bone Broth | Affiliate | food | physical | none | keep |

Not clearly physical: **Patriot Protect, Health Reclamation Project, Flip City Magazine** (digital/subscription), plus **Cultivate Elevate** (unknown). The quitefrankly.tv home page promotes the same four shop partners.

### 3d. Store assets
No Play listing drafts exist yet (`docs/play-store/` is not created; Stage D not started). Existing screenshots (`docs/ui-alignment/*`) are internal. **Warning for Stage D:** Home, Watch, Listen and Video Player all show the gold "Support the Show" button at the top; screenshots of those screens would carry it unless the Android gate lands first. Listing text must also not mention donations or memberships.

---

## 4. Culture Club: how it works

- **Buying**: not in the app. The Culture Club tab (hidden in production) and `SponsorButton` lead to the Subscription screen, then to the Squarespace patron page (S3), or the website's `/sponsor` (the website's "Culture Club" nav item and "Become a Patron" both point there; descriptions also say "Join The Culture Club" with that URL). Patreon/SubscribeStar are alternates (S4).
- **What a non-member sees**: the join CTA (S10), "Plans start at $5/month" (S3), the Support buttons on four screens, and the description messaging (R1).
- **Existing members**: the app has no member state and no accounts (accounts are off everywhere). "Already a Supporter? Log in" just opens the website login gate in a browser. Nothing in the app is unlocked by membership, so there is **no in-app entitlement to protect**: the member benefits live on the website.
- **Separation**: "access for existing members" (one login link: S10 second card) is the only part that is not steering; Apple 3.1.3(a) and Google's consumption-only wording make that link the least risky. Everything else on the page is steering.
- **Sizing**: the cheap fix is to show only the login link on Android (S). A real in-app join flow would be Play Billing subscriptions plus server-side entitlement plus accounts that were just switched off (XL, not recommended).

---

## 5. In-app browser targets

| Target | Landing page | Primary purpose |
|---|---|---|
| `quitefrankly.tv/patrons-products/quite-frankly-at-your-service` (S3) | Squarespace subscription page: tiers Lincoln $5 ... All American $1000 "every month", "Subscribe" button | **payment** |
| `quitefrankly.tv/quite-frankly-members-only` (S10) | login gate (401 to an anonymous fetch) | members' login (not payment) |
| `quitefrankly.tv/the-quite-frankly-live-events` (S12) | "Save the Date" Oct 23, 2027, travel info; no tickets yet | information (site chrome has "Become a Patron") |
| `quitefrankly.tv/` (home) and `/about` (**the proposal's target**) | **Both are commercial pages.** Home nav/footer: "Culture Club" (to `/sponsor`), **"Become a Patron"** (to `/sponsor`), "Patron Account Login", "Members Only", "Shop", "Cart 0", "Sign In / My Account", "Affiliates"; no prices. `/about`: bio, schedule, guests, and **"Become a Patron" is "the main support call to action"** | mixed: general site, but one tap from payment on every page |
| Article/Bulletin body links (R5), Forum (vBulletin), Pilled | author-controlled / third-party | info |
| Bandcamp embed (S15) | JS app, UNVERIFIED | probably a "buy" link |

---

## 6. The proposal, evaluated

### 6.1 Android hard gate (platform check, not remotely switchable, code stays)
Reasonable and recommended. Because Google's rule is about links **and messaging**, the gate has to cover more than the Support screen. Everything below must be touched (all by `Platform.OS === 'android'` in one pure helper, e.g. `src/lib/androidPolicy.js`, so one file is the switch):

| What | Files | Layout effect when removed |
|---|---|---|
| Gold "Support the Show" buttons | `SponsorButton.js` (render null on Android) -> `Home.js:151`, `VideoPlayer.js:191`, `Watch.js:139`, `Listen.js:162` | Home: parent uses `gap`, so no hole. Video Player: its `marginTop` goes with it. Watch/Listen: it is a child of `BackHeader`'s extra row, so the row simply collapses (header shows the title only; no gap) |
| Settings "Support the Show" row | `Account.js:15` (`ROWS`) | list shortens; the Notifications row becomes first |
| Subscription screen | `Subscription.js` (whole screen reachable only from the above), `SubscriptionCheckout.js`, route registrations | unreachable once nothing navigates; no gap. Do not delete the code |
| Culture Club join CTA | `CultureClub.js:27-33` | keep only the login card (tab stays flag-hidden) |
| DonateToApp | `DonateToApp.js`, `AccountStackNavigator.js:18` | none (unreachable); consider excluding from the Android bundle if you want zero payment strings in the AAB |
| Substack paid "Subscribe to Read" | `Article.js:289-300`, "Paid" pill `WritingSubstack.js` | locked teaser would have no action: show the teaser text only or hide paid posts from the list on Android |
| Descriptions | `VideoPlayer.js:196-206` (live issue), `FullPlayer.js:89` (latent) | sanitised by 6.2 (lines removed), no gap |
| Shop rows | `Shop.js` `partition()` | rows dropped (or driven by a sheet column) |
| `androidMonthlySupport` (#59) | `featureFlags.js`, `Subscription.js`, `SubscriptionCheckout.js`, flags functions | **redundant** under a hard gate; a remote switch contradicts "not remotely switchable", so drop it from the Android path |
| Privacy policy sentence | `privacy.html` (S18) | text edit (Eric approves legal wording) |
| Bandcamp embed | `Music.js` | keep only if the on-device check shows no purchase UI |

### 6.2 Replacement button: "Go to quitefrankly.tv" -> website home/about, in-app browser
- **Wording**: neutral and fine.
- **Target: NOT safe as proposed.** The FAQ forbids "directly linking to a webpage that could lead to an alternate payment method" and bans payment "messaging ... or other calls to action". `quitefrankly.tv/` and `/about` carry "Become a Patron", "Culture Club" (to `/sponsor`), Shop and Cart in the page chrome (section 5), so a reviewer who taps through sees payment CTAs one tap away; `/about` literally calls it the main support CTA.
- **Safer options (best first)**: (1) no website link on Android; (2) a page on our own domain (e.g. `quite-frankly-app.netlify.app/about.html`: what the show is, links to YouTube/podcast, no payment words or links); (3) content-only site pages (`/articles`, `/blog`, `/newsletter-archives`) accepting that the site chrome still shows "Become a Patron".
- **Styling**: yes, change it. A gold outlined full-width button is the "support" call to action visually even if the label changes. Use a neutral secondary style, or drop the header button entirely (the Watch/Listen header and Home gap collapse cleanly, so removing it costs nothing in layout).

### 6.3 Runtime protection: payment-domain deny-list + test
Design (Android only; iOS handled by 6.4):
- `src/lib/linkPolicy.js` (pure, no RN): `isPaymentUrl(url)`, `stripPaymentLines(text)`, `filterShopRows(rows)`, `looksLikeCryptoAddress(text)`. One exported `ANDROID_BLOCKED_HOSTS` array.
- **Domain list (starting point)**: `patreon.com`, `subscribestar.com`, `subscribestar.adult`, `paypal.com`, `paypal.me`, `ko-fi.com`, `buymeacoffee.com`, `venmo.com`, `cash.app`, `cashapp.com`, `gofundme.com`, `givesendgo.com`, `stripe.com`, `buy.stripe.com`, `checkout.stripe.com`, `square.link`, `squareup.com`, `gumroad.com`, `streamlabs.com`, `revolut.me`, `monzo.me`, `wise.com` (pay links), `zelle.com`, `donorbox.org`, `liberapay.com`, `streamelements.com`, `thanks.dev`; **path rules** for `quitefrankly.tv`: `/sponsor`, `/patrons-products`, `/cart`, `/checkout`, `/account`, `/member-lounge`, `/culture-club*`, `/shop`; Substack: `*/subscribe`, `*/upgrade`, `/checkout` and paid posts; crypto address patterns (`bc1`/`1`/`3` base58 Bitcoin, `0x` + 40 hex, `r...` XRP, Solana base58 32-44, Doge `D...`).
- **Where applied** (each at the data boundary so no component needs to remember): episode and track descriptions (drop any line containing a blocked host, an address, or a CTA phrase such as "One-Time Tip", "Join The Culture Club", "Become a Patron", "Support Quite Frankly"), the Shop sheet rows, Article/Bulletin link presses (swallow instead of open), `onShouldStartLoadWithRequest` for WebViews (Bandcamp/AskFrankie), push payload text (server side, optional).
- **Test**: (a) a static test that walks `src/` and fails if any literal URL/host from the deny-list appears in a file that is reachable on Android (allow-list the dead `DonateToApp.js` explicitly); (b) fixture tests built from the **real** samples gathered in this audit (YouTube/SoundCloud descriptions, the Shop CSV rows) asserting the sanitised output contains no blocked host, no `/sponsor`, no address; (c) a Platform test that the gated components render null on Android and unchanged on iOS.
- **Limits (be honest)**: cannot police arbitrary HTML in blog/newsletter bodies, AI answers, third-party pages (YouTube/Twitch/Substack/Forum) or what a Custom Tab navigates to next. Mitigation: open author content in the in-app browser only after the link check, keep AskFrankie's external-link action to allow-listed hosts, and keep the policy in one file so Eric can extend it without a release if the list is served from the flags function (that makes the list updatable, the gate itself still hard-coded).

### 6.4 iOS, per item
| Item | Recommendation |
|---|---|
| S1/S2 Support buttons, S3 Squarespace subscription, S4 Patreon/SubscribeStar, S11 Subscribe to Read, S10 join CTA | **US storefront only** (3.1.1(a)); hide elsewhere |
| S5 PayPal, S7 crypto addresses (tips) | US storefront only; elsewhere hide (3.1.1: tips by IAP; 3.2.2(iv)) |
| S6 Amazon, S8 Mail, S12-S14, S16, physical-goods Shop rows | keep everywhere |
| Digital Shop rows (Patriot Protect, Health Reclamation, Flip City digital) | US storefront only |
| R1/R2 descriptions | strip lines on non-US storefronts, keep in US |
| S9 DonateToApp | leave unreachable |
- **Detecting the storefront**: the **App Store storefront country**, not device locale, is available from StoreKit (`Storefront.current?.countryCode`, an alpha-3 code such as `USA`). In React Native you need a native module: `react-native-iap` exposes `getStorefront()` (its README says it is being replaced by `expo-iap`; I did not confirm expo-iap's storefront API), or a small utility such as `react-native-nitro-store-country` (converts alpha-3 to alpha-2; its docs warn that **TestFlight returns "USA" as a fallback**, so a non-US path cannot be tested in TestFlight). Any of these adds a native dependency (new iOS build). Fail closed: unknown = treat as non-US.
- **What Apple requires for US links**: per the current guideline text, nothing beyond the guidelines themselves (no entitlement, no listed disclosure format, no extra step). The legal ground is moving (commission fight in the courts), so keep the US-link switch **remote-flag-controlled** on iOS, the opposite of the Android hard gate.
- Eric's belief ("a US court ruling lets US-storefront apps link out") is **verified** by 3.1.1(a) and 3.1.3.

---

## 7. Effort (rough)
| Piece | Size |
|---|---|
| Android hard gate (SponsorButton/Settings/Subscription/Checkout/CultureClub/Article), neutral replacement or removal, tests | S-M (about 1 day) |
| `linkPolicy.js` + description/shop/link filters + fixture tests + static scan | M (1-1.5 days) |
| Shop sheet: add an "Android" or "Digital" column so Eric controls rows without a release | S (no code beyond a filter) |
| Self-hosted "About" page (no payment links) | S |
| Bandcamp on-device check (+ decision) | XS |
| iOS storefront detection + remote flag + QA | M-L (1-2 days, new native build) |
| Culture Club real join flow (Play Billing + entitlement + accounts) | XL, not recommended |
| Updating `privacy.html`, Stage D screenshots after the gate | S |
Recommended order: gate -> deny-list -> then Stage C (E2E) and Stage D (screenshots/listing), because both would otherwise capture the payment UI.

---

## 8. Open questions for Eric
1. **Who receives the One-Time Donation / PayPal / BTC / XRP money, Frank or DahmsIO?** Google's FAQ treats a tip as peer-to-peer only if 100% goes to the creator with no perks. If it is Frank personally and no perks, the PayPal/crypto section may be allowed; if DahmsIO or any perk, it is not. (And the label: "Amazon" is not a donation.)
2. Keep the gold button at all on Android, or remove it? If removed, is "Go to quitefrankly.tv" still wanted? (Recommend: remove, or point to a self-hosted About page.)
3. Shop on Android: keep the Shop screen but hide **Patriot Protect, Health Reclamation Project, Flip City (digital), Wise Wolf (gold)** and decide on **Keto Brainz** (supplement) and **Cultivate Elevate** (unverified)?
4. Descriptions: strip the support block lines on Android, or hide descriptions entirely? (They are Frank's YouTube text; the sanitiser removes only offending lines.)
5. Bandcamp embed: allow a quick on-device look to see whether it shows "Buy"?
6. iOS: ship with US-only links behind a remote flag, or hide everything on iOS at first launch too?
7. Is the Substack "Subscribe to Read" / Paid pill acceptable to drop on Android (show paid posts as teasers with no action, or hide them)?
8. PR #59: `androidMonthlySupport` becomes redundant under a hard gate. Merge #59 as is (it is harmless) or amend after this audit?
9. AskFrankie answers about supplements/health: is the existing disclaimer enough for Play's Health Content policy, or should the answer prompt avoid supplement claims on Android? (Content question, outside this audit's scope but surfaced by R8.)
