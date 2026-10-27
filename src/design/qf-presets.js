// Quite Frankly component presets, MOBILE (React Native). Hand-written; every value comes from qf-tokens.mobile.js.
// The web twin of each preset is a class in web/qf-components.css (same name, same look).
// Use them by spreading into a StyleSheet entry:   card: { ...card, padding: spacing.md }
// Rules: no hex codes, no raw radii, no raw font sizes in screens. If you need a value that is not here, add a TOKEN first.
import {
  colors, spacing, radius, fontSize, fontFamily, control, opacity, shadows,
} from './qf-tokens.mobile';

/** Press feedback for every TouchableOpacity. */
export const activeOpacity = opacity.pressed;

// ---------- type ----------
export const titleLg = { fontFamily: fontFamily.bold, fontSize: fontSize.titleLg, color: colors.textPrimary };
export const title = { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary };       // screen title (BackHeader)
export const titleSm = { fontFamily: fontFamily.bold, fontSize: fontSize.titleSm, color: colors.textPrimary };  // sheet / panel title
export const reading = { fontFamily: fontFamily.regular, fontSize: fontSize.body, lineHeight: 23, color: colors.textPrimary };
export const meta = { fontFamily: fontFamily.regular, fontSize: fontSize.meta, color: colors.textSecondary };
export const caption = { fontFamily: fontFamily.regular, fontSize: fontSize.caption, color: colors.textSecondary };
export const hint = { fontFamily: fontFamily.regular, fontSize: fontSize.caption, color: colors.textTertiary };
export const sectionLabel = { fontFamily: fontFamily.semiBold, fontSize: fontSize.meta, color: colors.textSecondary };   // Title Case string, never all caps, no tracking
export const link = { fontFamily: fontFamily.regular, color: colors.accentGold, textDecorationLine: 'underline' };
export const errorText = { fontFamily: fontFamily.medium, fontSize: fontSize.meta, color: colors.statusError };           // NEVER brandRed for text (2.4:1)

// ---------- surfaces ----------
/** Card / row / tile base: raised fill + 1px hairline. No shadow. */
export const card = {
  backgroundColor: colors.bgRaised,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  borderRadius: radius.lg,
};
export const cardSelected = { borderColor: colors.accentGold, backgroundColor: colors.bgRaised2 };
export const row = { ...card, flexDirection: 'row', alignItems: 'center', gap: spacing.smd, paddingVertical: spacing.smd, paddingHorizontal: spacing.md };
export const tile = { ...card, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md };
/** Red-hairline surface. Web only in practice: the mobile app has no red edge (kept for completeness). */
export const signature = { ...card, borderColor: colors.borderSignature, borderRadius: radius.xl };
/** Things that float over content (game window, mini player, sheets): hairline + shadow. */
export const floating = { backgroundColor: colors.bgBase, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.xl, ...shadows.md };
export const divider = { height: 1, backgroundColor: colors.borderDefault };

// ---------- buttons ----------
export const button = {
  minHeight: control.lg,                 // 44: touch target
  paddingHorizontal: spacing.mdl,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  gap: spacing.sm,
};
export const buttonText = { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary };
export const buttonPrimary = { ...button, backgroundColor: colors.brandRed, borderColor: colors.brandRed };
export const buttonPrimaryText = { ...buttonText, color: colors.textOnRed };
export const buttonGold = { ...button, borderColor: colors.accentGold, backgroundColor: colors.bgRaised };       // 'Become a Sponsor'
export const buttonGoldText = { ...buttonText, fontSize: fontSize.ui, color: colors.accentGold };
export const buttonQuiet = { ...button, borderColor: 'transparent' };
export const buttonQuietText = { ...buttonText, color: colors.textSecondary };
export const buttonDisabled = { opacity: opacity.disabled };

// ---------- pill / chip / tag ----------
export const pill = { minHeight: control.sm, paddingHorizontal: spacing.smd, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderDefault, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.tight };
export const pillText = { fontFamily: fontFamily.medium, fontSize: fontSize.caption, color: colors.textSecondary };
export const pillSelected = { borderColor: colors.accentGold };
export const chip = { minHeight: control.xs, paddingVertical: 5, paddingHorizontal: 11, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.bgRaised };
export const chipText = { fontFamily: fontFamily.regular, fontSize: fontSize.caption, color: colors.textPrimary };
export const tag = { alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderDefault };
export const tagText = { fontFamily: fontFamily.semiBold, fontSize: fontSize.compact, color: colors.textSecondary };
export const tagGold = { borderColor: colors.accentGold };
export const tagSolid = { backgroundColor: colors.accentGold, borderColor: 'transparent' };                          // 'Today', 'Most Recent'
export const tagSolidText = { fontFamily: fontFamily.bold, fontSize: fontSize.compact, color: colors.textOnGold };
export const tagLive = { backgroundColor: colors.statusLive, borderColor: colors.statusLive };                       // LIVE NOW
export const tagLiveText = { fontFamily: fontFamily.bold, fontSize: fontSize.compact, color: colors.textOnRed };
export const offer = { paddingVertical: spacing.tight, paddingHorizontal: spacing.smd, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.accentGoldBorder };
export const offerText = { fontFamily: fontFamily.regular, fontSize: fontSize.meta, color: colors.accentGold };

// ---------- segmented control (Blog | Newsletter) ----------
export const segTrack = { flexDirection: 'row', padding: 2, borderRadius: radius.pill, backgroundColor: colors.bgTrack, borderWidth: 1, borderColor: colors.borderDefault };
export const segButton = { flex: 1, minHeight: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill };
export const segButtonSelected = { backgroundColor: colors.accentGold };
export const segText = { fontFamily: fontFamily.semiBold, fontSize: fontSize.meta, color: colors.textSecondary };
export const segTextSelected = { fontFamily: fontFamily.bold, color: colors.textOnGold };

// ---------- inputs ----------
export const input = {
  minHeight: control.lg,
  paddingHorizontal: spacing.smd,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  backgroundColor: colors.bgRaised,
  color: colors.textPrimary,
  fontFamily: fontFamily.regular,
  fontSize: fontSize.lead,               // 16: matches the web's no-zoom size
};
export const inputFocused = { borderColor: colors.borderFocus };
export const placeholderColor = colors.textTertiary;

// ---------- misc ----------
export const iconButton = { width: control.sm, height: control.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' };
export const avatarChip = { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.bgRaised2, alignItems: 'center', justifyContent: 'center' };  // was surfaceLine used as a FILL
