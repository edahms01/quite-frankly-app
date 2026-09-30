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
// Run this after every `expo prebuild --platform ios` (or `--clean`) —
// see the `prebuild:ios` npm script, which chains both automatically.
//
// NOTE: iOS Simulator caches a launch-image snapshot per bundle ID that
// does NOT reliably invalidate on plain reinstalls — if a splash change
// doesn't appear to take effect after rebuilding, erase the simulator
// (`xcrun simctl erase <device>`) before reinstalling; don't assume this
// script or the build is broken.
const fs = require('fs');
const path = require('path');

const LOGO_WIDTH = 280;
const LOGO_HEIGHT = 59;
const CENTER_Y_OFFSET = -69;
// Shift right so the red QUITE FRANKLY letters (not the whole file incl. the
// gold TV) sit on the screen's center axis — same ratio as Wordmark.js's
// LETTERS_CENTER_SHIFT_RATIO, (630-520)/1260 of the logo width. Keep in sync.
const CENTER_X_OFFSET = Math.round(LOGO_WIDTH * ((630 - 520) / 1260) * 100) / 100;

const projectRoot = path.join(__dirname, '..');
const iosDir = path.join(projectRoot, 'ios');

if (!fs.existsSync(iosDir)) {
  console.log('[fix-splash-screen] No ios/ directory found — skipping (nothing to patch).');
  process.exit(0);
}

const projectName = fs
  .readdirSync(iosDir)
  .find((name) => fs.existsSync(path.join(iosDir, name, 'SplashScreen.storyboard')));

if (!projectName) {
  console.error('[fix-splash-screen] Could not find SplashScreen.storyboard under ios/ — did prebuild run?');
  process.exit(1);
}

const imagesetDir = path.join(
  iosDir,
  projectName,
  'Images.xcassets',
  'SplashScreenLogo.imageset'
);
const sourceDir = path.join(projectRoot, 'assets', 'splash-wordmark');
for (const file of ['image.png', 'image@2x.png', 'image@3x.png']) {
  fs.copyFileSync(path.join(sourceDir, file), path.join(imagesetDir, file));
}

const storyboardPath = path.join(iosDir, projectName, 'SplashScreen.storyboard');
let xml = fs.readFileSync(storyboardPath, 'utf8');

xml = xml.replace(
  /(<imageView id="EXPO-SplashScreen"[^>]*>)\s*<rect key="frame"[^/]*\/>\s*(<\/imageView>)/,
  `$1\n                                <rect key="frame" x="0.0" y="0.0" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}"/>\n                                <constraints>\n                                    <constraint firstAttribute="width" constant="${LOGO_WIDTH}" id="wm-width-constraint"/>\n                                    <constraint firstAttribute="height" constant="${LOGO_HEIGHT}" id="wm-height-constraint"/>\n                                </constraints>\n                            $2`
);

xml = xml.replace(
  /(<constraint firstItem="EXPO-SplashScreen" firstAttribute="centerX" secondItem="EXPO-ContainerView" secondAttribute="centerX")(?: constant="[^"]*")?(\s*id=)/,
  `$1 constant="${CENTER_X_OFFSET}"$2`
);

xml = xml.replace(
  /(<constraint firstItem="EXPO-SplashScreen" firstAttribute="centerY" secondItem="EXPO-ContainerView" secondAttribute="centerY")(\s*id=)/,
  `$1 constant="${CENTER_Y_OFFSET}"$2`
);

xml = xml.replace(
  /<image name="SplashScreenLogo" width="[0-9]+" height="[0-9]+"\/>/,
  `<image name="SplashScreenLogo" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}"/>`
);

fs.writeFileSync(storyboardPath, xml);

console.log(`[fix-splash-screen] Patched ${projectName}'s splash logo to ${LOGO_WIDTH}x${LOGO_HEIGHT}pt, centerX offset ${CENTER_X_OFFSET}, centerY offset ${CENTER_Y_OFFSET}.`);
