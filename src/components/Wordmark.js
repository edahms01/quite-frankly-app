import { Image } from 'react-native';

// Onboarding/boot wordmark ("QUITE FRANKLY TV", gold TV). Native asset is
// 1260x264 (downscaled from assets/wordmark - TV logo gold.png, 4160x872) —
// height is derived from width here so every call site's aspect ratio can't
// drift out of sync with the real image. Opaque #121014 bg baked in, same as
// colors.surfaceGround, so it's only safe on that background. Home, VideoPlayer,
// Welcome and the App.js boot screen all render this component.
//
// `centerOnLetters`: the file is centered on its full bounds, but the gold "TV"
// is meant to read as a handwritten add-on hanging off the red QUITE FRANKLY
// letters, so the letters (not the file) should sit on the layout's center
// axis. Measured on the 1260px file: the red letters span x=4..1036, center
// 520, vs. the file's own center 630 — so we shift the image right by 110/1260
// of its width. Used by the centered opening-page layouts (Welcome, boot
// screen); left-aligned headers (Home, VideoPlayer) don't use it. The native
// splash applies the same ratio in scripts/fix-splash-screen.js (keep in sync).
export const LETTERS_CENTER_SHIFT_RATIO = (630 - 520) / 1260;

export default function Wordmark({ width = 280, style, centerOnLetters = false }) {
  return (
    <Image
      source={require('../assets/images/quite-frankly-tv-wordmark-gold.png')}
      style={[
        { width, height: width * (264 / 1260) },
        centerOnLetters && { transform: [{ translateX: width * LETTERS_CENTER_SHIFT_RATIO }] },
        style,
      ]}
      resizeMode="contain"
    />
  );
}
