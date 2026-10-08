#!/usr/bin/env node
// expo-splash-screen's iOS generator always emits the logo imageView with
// no width/height constraints and no centerY offset — it renders at
// whatever implicit size the OS gives it (not the actual asset's real
// point size) and dead-center. That doesn't match Welcome.js's onboarding
// wordmark (280x59pt, positioned above center), which is the whole point
// of this splash screen — see CLAUDE.md's "opening page" note.
//
// There's no expo-splash-screen config option for exact size/position,
// and its own plugin deliberately finalizes the storyboard as the LAST
// mod in its own mod category (see its withIosSplashScreen.js comment:
// "no other ios.splashScreenStoryboard mods can be added after this") —
// so a companion config plugin can't reliably patch it after the fact;
// dangerousMod-based plugins run in an earlier phase and get overwritten.
// This script instead runs as a separate step AFTER `expo prebuild`
// finishes (once ios/ is fully generated and finalized) and patches the
// already-written files directly.
//
// UPDATE 2026-10-07: the same patch now ALSO runs automatically during `expo prebuild` through plugins/withSplashWordmark.js (a FINALIZED mod,
// which runs after expo-splash-screen's own storyboard mod), so EAS cloud builds and plain `expo prebuild` get it too. This script remains as a
// manual re-run: it is idempotent and shares scripts/lib/splashPatch.js with the plugin.
//
// NOTE: iOS Simulator caches a launch-image snapshot per bundle ID that
// does NOT reliably invalidate on plain reinstalls — if a splash change
// doesn't appear to take effect after rebuilding, erase the simulator
// (`xcrun simctl erase <device>`) before reinstalling; don't assume this
// script or the build is broken.
const path = require('path');
const fs = require('fs');
const { patchSplash } = require('./lib/splashPatch');

const projectRoot = path.join(__dirname, '..');
const iosDir = path.join(projectRoot, 'ios');

if (!fs.existsSync(iosDir)) {
  console.log('[fix-splash-screen] No ios/ directory found — skipping (nothing to patch).');
  process.exit(0);
}
try {
  console.log(`[fix-splash-screen] Patched ${patchSplash({ projectRoot, iosDir })}.`);
} catch (e) {
  console.error(`[fix-splash-screen] ${e.message}`);
  process.exit(1);
}
