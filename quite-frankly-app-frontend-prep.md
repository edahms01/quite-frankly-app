# Quite Frankly — Frontend Prep

Two things that don't depend on which framework gets chosen. Companion to `quite-frankly-app-plan.md` (decisions) and `quite-frankly-app-component-map.md` (screens/data).

## Framework: React Native (decided)
One codebase for iOS/Android, already the assumed stack for the audio player (`react-native-track-player` v4).

## Design tokens
Superseded (M1, 2026-10-27): the token table that lived here (old `#121014` / `#1E1B1F` / radius 6-12-20 / Bebas) is out of date. Tokens now come from AskFrankie's shared design files, vendored in `src/design/` and re-exported by `src/theme.js`. Values and rules: `qf-design-system_v1.md` (in `qf-design-kit/docs/`) and `src/design/qf-tokens.mobile.js`.

## Navigation architecture

**Root**: Onboarding stack (first-launch only, skippable — Welcome → **Notifications permission screen** → Email) → hands off to Main App and never returns unless the app is reinstalled.

**Main App**: Bottom tab navigator, 3 tabs — Home, Watch, Members Only.

**Per-tab stacks** (screens pushed from within each tab):
- **Home stack**: Home → Shop, Community (shown as "Connect"), Writing (shown as "Read"), Music ("Jam"), Games ("Play"), PhoneLines ("Call"), Calendar ("Schedule"), Listen (each a push). Visible names changed 2026-10-27; route and file names did not. All Home cards come from one `DESTINATIONS` list in `Home.js`.
- **Watch stack**: Watch → Video Player, Listen
- **Members Only stack**: Culture Club (Members Only tab root) → Subscription

**Global/account screens** — reached via the avatar icon on any tab, so these live in a stack reachable from all three tabs rather than duplicated per-tab: Account → Subscription, **Notification settings screen** (toggles — distinct from the onboarding permission screen above), Donation, Report a Bug.

**Modal presentation** (not a push — a sheet over the current screen): Subscription Checkout. This is the system-browser-style sheet (SFSafariViewController / Custom Tabs) loading Frank's real Squarespace checkout — needs modal presentation, not a stack push, to get that native "sheet slides up" feel and easy dismissal.

**Persistent overlay, not a screen**: the Listen mini-player. Docks above the tab bar app-wide once something's playing — lives outside the navigation stack entirely, rendered at the app-shell level so it survives tab switches.
