// Shared by scripts/fix-splash-screen.js (manual re-run) and plugins/withSplashWordmark.js (runs during `expo prebuild`, locally and on EAS).
// Patches the already-generated ios/<Project>/SplashScreenLogo.imageset and SplashScreen.storyboard on disk. Idempotent. See the header of
// scripts/fix-splash-screen.js for why this has to be a post-generation patch.
const fs = require('fs');
const path = require('path');

const LOGO_WIDTH = 280;
const LOGO_HEIGHT = 59;
const CENTER_Y_OFFSET = -69;
// Shift right so the red QUITE FRANKLY letters (not the whole file incl. the
// gold TV) sit on the screen's center axis — same ratio as Wordmark.js's
// LETTERS_CENTER_SHIFT_RATIO, (630-520)/1260 of the logo width. Keep in sync.
const CENTER_X_OFFSET = Math.round(LOGO_WIDTH * ((630 - 520) / 1260) * 100) / 100;

/** Returns a short description of what was patched; throws if the generated project is not where it is expected. */
function patchSplash({ projectRoot, iosDir }) {
  const projectName = fs
    .readdirSync(iosDir)
    .find((name) => fs.existsSync(path.join(iosDir, name, 'SplashScreen.storyboard')));
  if (!projectName) throw new Error('Could not find SplashScreen.storyboard under ios/ — did prebuild run?');

  const imagesetDir = path.join(iosDir, projectName, 'Images.xcassets', 'SplashScreenLogo.imageset');
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
  return `${projectName}'s splash logo to ${LOGO_WIDTH}x${LOGO_HEIGHT}pt, centerX offset ${CENTER_X_OFFSET}, centerY offset ${CENTER_Y_OFFSET}`;
}

module.exports = { patchSplash };
