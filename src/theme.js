/**
 * Quite Frankly — theme.js
 * Source of truth for design tokens, translated from the Design System
 * artifact into real React Native values. Import from here rather than
 * hardcoding colors/spacing in individual screens.
 */

export const colors = {
  brandRed: '#9E1B22',      // primary actions, live indicators
  accentGold: '#C9974A',    // highlights, "recommended," Culture Club
  surfaceGround: '#121014', // app background
  surfaceCard: '#1E1B1F',   // card/row backgrounds
  surfaceLine: '#2A2422',   // borders, dividers
  surfaceLive: '#2A1012',   // live-state background accent
  inkPrimary: '#F3EEE4',    // primary text
  inkMuted: '#A69C93',      // secondary text
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
};

/**
 * Type scale, derived from what's actually used consistently across the
 * wireframes (page headers, card titles, meta text, badges).
 */
export const fontSize = {
  xs: 10,   // micro-labels, badge text (e.g. day abbreviations)
  sm: 12,   // captions, timestamps
  base: 13, // secondary text, links, meta
  md: 14,   // standard row/card titles
  lg: 15,   // buttons, emphasized body
  xl: 16,   // emphasis titles (day-card headers)
  xxl: 20,  // page/section headers
  display: 40, // splash/hero wordmark only
};

/**
 * Font families, loaded via @expo-google-fonts/inter and
 * @expo-google-fonts/bebas-neue + expo-font's useFonts (see App.js) —
 * upstream Google Fonts ships Inter as variable-only now, so these
 * packages are used instead of raw static .ttf files to get real
 * discrete weights. Names below must match the exported constants
 * from those packages exactly.
 */
export const fontFamily = {
  display: 'BebasNeue_400Regular', // hero/splash only, never body text
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

/**
 * Shadows are platform-specific in React Native — there is no single
 * cross-platform "box-shadow." iOS uses shadowColor/shadowOffset/
 * shadowOpacity/shadowRadius; Android uses elevation, which does NOT
 * support colored shadows (they render as a fixed dark tint regardless
 * of shadowColor). shadowGlow (the gold ring for live/exclusive states)
 * is the one that needs real platform branching — on Android, fake the
 * glow with a colored border instead of relying on elevation to carry
 * the gold color, since it won't.
 */
import { Platform } from 'react-native';

export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    android: { elevation: 4 },
  }),
  glow: Platform.select({
    ios: {
      shadowColor: colors.accentGold,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 6,
    },
    // Android elevation can't carry color — approximate with a border
    // on the component itself: borderWidth: 1, borderColor: colors.accentGold
    android: { elevation: 4 },
  }),
};

const theme = { colors, spacing, radius, fontSize, fontFamily, shadows };

export default theme;
