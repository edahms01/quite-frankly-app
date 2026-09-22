# Quite Frankly — Frontend Prep

Two things that don't depend on which framework gets chosen. Companion to `quite-frankly-app-plan.md` (decisions) and `quite-frankly-app-component-map.md` (screens/data).

## Framework: React Native (decided)
One codebase for iOS/Android, already the assumed stack for the audio player (`react-native-track-player` v4).

## Design tokens (values, not syntax)
Pulled from the Design System artifact and used consistently across every wireframe screen. Now translated into a real, importable file — `theme.js` — with the caveats specific to React Native (platform-specific shadows, font linking) noted inline there.

**Colors**
| Token | Hex | Use |
|---|---|---|
| brand-red | `#9E1B22` | Primary actions, live indicators |
| accent-gold | `#C9974A` | Highlights, "recommended," Culture Club |
| surface-ground | `#121014` | App background |
| surface-card | `#1E1B1F` | Card/row backgrounds |
| surface-line | `#2A2422` | Borders, dividers |
| surface-live | `#2A1012` | Live-state background accent |
| ink-primary | `#F3EEE4` | Primary text |
| ink-muted | `#A69C93` | Secondary text |

**Type**
- Display: Bebas Neue — splash/hero only (wordmark, onboarding), never body text
- UI: Inter — everything else, weights 400/500/600/700 used across screens

**Spacing scale**: xs `4px` · sm `8px` · md `16px` · lg `24px`

**Radius scale**: sm `6px` · md `12px` · lg `20px`

**Shadows**: shadow-sm, shadow-md, shadow-glow (gold ring — reserved for live/exclusive states, e.g. the LIVE badge)

## Navigation architecture

**Root**: Onboarding stack (first-launch only, skippable — Welcome → **Notifications permission screen** → Email) → hands off to Main App and never returns unless the app is reinstalled.

**Main App**: Bottom tab navigator, 3 tabs — Home, Watch, Members Only.

**Per-tab stacks** (screens pushed from within each tab):
- **Home stack**: Home → Shop, Community, Writing, Band, Calendar, Listen (each a push)
- **Watch stack**: Watch → Video Player, Listen
- **Members Only stack**: Culture Club (Members Only tab root) → Subscription

**Global/account screens** — reached via the avatar icon on any tab, so these live in a stack reachable from all three tabs rather than duplicated per-tab: Account → Subscription, **Notification settings screen** (toggles — distinct from the onboarding permission screen above), Donation, Report a Bug.

**Modal presentation** (not a push — a sheet over the current screen): Subscription Checkout. This is the system-browser-style sheet (SFSafariViewController / Custom Tabs) loading Frank's real Squarespace checkout — needs modal presentation, not a stack push, to get that native "sheet slides up" feel and easy dismissal.

**Persistent overlay, not a screen**: the Listen mini-player. Docks above the tab bar app-wide once something's playing — lives outside the navigation stack entirely, rendered at the app-shell level so it survives tab switches.
