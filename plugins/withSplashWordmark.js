// Applies the splash-logo patch (scripts/lib/splashPatch.js) at the END of `expo prebuild --platform ios`, so EAS cloud iOS builds and plain `expo prebuild`
// get it with no custom prebuildCommand (EAS cannot run a command containing `&&`).
// Why a FINALIZED mod: expo-splash-screen writes SplashScreen.storyboard as the last mod in its own category, and an ordinary or dangerous mod runs earlier
// and gets overwritten. `withFinalizedMod` runs after every other mod, once ios/ is fully written.
const { withFinalizedMod } = require('@expo/config-plugins');
const { patchSplash } = require('../scripts/lib/splashPatch');

module.exports = function withSplashWordmark(config) {
  return withFinalizedMod(config, [
    'ios',
    async (cfg) => {
      const message = patchSplash({ projectRoot: cfg.modRequest.projectRoot, iosDir: cfg.modRequest.platformProjectRoot });
      console.log(`[withSplashWordmark] Patched ${message}.`);
      return cfg;
    },
  ]);
};
