// GENERATED from tokens/tokens.json (v1.0.0, sha f8b92aa59549). Do not edit by hand: change tokens.json and run `npm run tokens`.
// Drop-in replacement for src/theme.js: every old key (brandRed, surfaceCard, fontSize.md, radius.md ...) still exists.
// VALUES changed on purpose (see docs: radius.md 12->10, radius.lg 20->14, surfaces now match AskFrankie).
import { Platform } from 'react-native';

export const tokensVersion = "1.0.0+f8b92aa59549";

export const colors = {
  "bgPage": "#05060a",
  "bgBase": "#0c0f14",
  "bgRaised": "#161b22",
  "bgRaised2": "#1e242d",
  "bgInset": "#080a0d",
  "bgTrack": "rgba(255,255,255,0.06)",
  "borderDefault": "rgba(255,255,255,0.09)",
  "borderStrong": "rgba(255,255,255,0.14)",
  "borderHover": "rgba(255,255,255,0.28)",
  "borderFocus": "rgba(200,44,42,0.6)",
  "borderSignature": "rgba(200,44,42,0.55)",
  "textPrimary": "#e8eaef",
  "textSecondary": "rgba(232,234,239,0.65)",
  "textTertiary": "rgba(232,234,239,0.52)",
  "textDisabled": "rgba(232,234,239,0.38)",
  "textOnGold": "#121014",
  "textOnRed": "#ffffff",
  "brandRed": "#980201",
  "brandRedHover": "#b00302",
  "brandRedHi": "#c82c2a",
  "accentGold": "#c9974a",
  "accentGoldBorder": "rgba(201,151,74,0.55)",
  "accentGoldSoft": "rgba(201,151,74,0.14)",
  "statusLive": "#e0332b",
  "statusLiveText": "#ef6a65",
  "statusError": "#e0332b",
  "statusSuccess": "#5fd08a",
  "statusLiveBorder": "rgba(239,106,101,0.45)",
  "tintLive": "#2a1012",
  "contentShort": "#8b6fc9",
  "contentVideo": "#5b8dc9",
  "contentStream": "#5fa76e",
  "scrimDefault": "rgba(5,6,10,0.66)",
  "scrimLight": "rgba(5,6,10,0.28)",
  "scrimSolid": "rgba(5,6,10,0.96)",
  "surfaceGround": "#0c0f14",
  "surfaceCard": "#161b22",
  "surfaceLine": "rgba(255,255,255,0.09)",
  "surfaceLive": "#2a1012",
  "inkPrimary": "#e8eaef",
  "inkMuted": "rgba(232,234,239,0.65)",
  "typeShort": "#8b6fc9",
  "typeVideo": "#5b8dc9",
  "typeStream": "#5fa76e"
};

export const spacing = {
  "hair": 2,
  "xs": 4,
  "tight": 6,
  "sm": 8,
  "smd": 12,
  "md": 16,
  "mdl": 20,
  "lg": 24,
  "xl": 32
};

export const radius = {
  "sm": 6,
  "md": 10,
  "lg": 14,
  "xl": 22,
  "pill": 999
};

export const fontSize = {
  "micro": 10,
  "xs": 10,
  "compact": 11,
  "caption": 12,
  "sm": 12,
  "meta": 13,
  "base": 13,
  "ui": 14,
  "md": 14,
  "body": 15,
  "lg": 15,
  "lead": 16,
  "xl": 16,
  "titleSm": 18,
  "title": 20,
  "xxl": 20,
  "titleLg": 28,
  "display": 40
};

export const lineHeight = {
  "tight": 1.2,
  "compact": 1.35,
  "body": 1.5,
  "reading": 1.55
};

export const fontFamily = {
  "display": "Inter_700Bold",
  "regular": "Inter_400Regular",
  "regularItalic": "Inter_400Regular_Italic",
  "medium": "Inter_500Medium",
  "semiBold": "Inter_600SemiBold",
  "bold": "Inter_700Bold"
};

export const control = {
  "xs": 28,
  "sm": 32,
  "md": 40,
  "lg": 44
};     // heights in dp; control.lg (44) is the minimum touch target

export const motion = {
  "fast": 150,
  "base": 250,
  "slow": 500,
  "gesture": 1000
};       // milliseconds

export const opacity = {
  "disabled": 0.5,
  "pressed": 0.7
};     // opacity.pressed = activeOpacity

// Cards no longer use a shadow (they have a 1px border). sm/md remain for FLOATING things (game window, mini player, sheets).
export const shadows = {
  sm: Platform.select({
  "ios": {
    "shadowColor": "#000",
    "shadowOffset": {
      "width": 0,
      "height": 1
    },
    "shadowOpacity": 0.2,
    "shadowRadius": 2
  },
  "android": {
    "elevation": 2
  }
}),
  md: Platform.select({
  "ios": {
    "shadowColor": "#000",
    "shadowOffset": {
      "width": 0,
      "height": 2
    },
    "shadowOpacity": 0.25,
    "shadowRadius": 4
  },
  "android": {
    "elevation": 4
  }
}),
};

const theme = { colors, spacing, radius, fontSize, lineHeight, fontFamily, control, motion, opacity, shadows };
export default theme;
