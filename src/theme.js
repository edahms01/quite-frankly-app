/**
 * Quite Frankly - theme.js
 * Thin wrapper: the VALUES now come from the shared design tokens (src/design/qf-tokens.mobile.js, synced from AskFrankie/design).
 * Every old key (colors.brandRed, spacing.md, radius.md, fontSize.md, fontFamily.semiBold, shadows.sm ...) still works, so no screen needs
 * an import change. New code: use the semantic keys (colors.bgRaised, colors.textSecondary, radius.lg, fontSize.titleSm ...) or a preset
 * from src/design/qf-presets.js. Do NOT hardcode colours, radii or font sizes: see qf-design-system_v1.md.
 */
export {
  colors, spacing, radius, fontSize, lineHeight, fontFamily, control, motion, opacity, shadows, tokensVersion,
} from './design/qf-tokens.mobile';
export { default } from './design/qf-tokens.mobile';
