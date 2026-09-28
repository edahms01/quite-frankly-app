import { useEffect, useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import RenderHTML, { defaultSystemFonts } from 'react-native-render-html';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Share2 } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import LoadingState from '../../components/LoadingState';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
// Same value as netlify/functions/lib/squarespaceBlog.js's SITE_BASE_URL --
// not imported directly since this frontend file has no existing precedent
// of importing from netlify/functions (every other quitefrankly.tv literal
// in this codebase, e.g. Writing.js/Community.js/CultureClub.js, is its own
// local hardcoded string, same pattern kept here). Used to resolve
// relative hrefs/srcs in post bodies (Squarespace posts commonly link to
// other same-site pages with a relative path) so react-native-render-html
// resolves them to absolute URLs before this screen's isHttpUrl guard ever
// sees them -- review fix, otherwise a relative link silently no-ops on tap.
const SITE_BASE_URL = 'https://www.quitefrankly.tv';
const HERO_HEIGHT = 220;
const BODY_FETCH_TIMEOUT_MS = 10000;
const AUTHOR_FALLBACK = 'Quite Frankly';

// Same "Mon D, YYYY · N min read" formatter as WritingBlog.js — kept as its
// own local copy rather than extracted to a shared utils file, matching
// that file's own precedent (a single-consumer local helper, now
// duplicated once for a second consumer rather than refactored, per the
// brief's ask to "reuse the same ... approach," not restructure file
// boundaries Task 7 hasn't asked for).
function formatPostDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${month} ${d.getDate()}, ${d.getFullYear()}`;
}

function metaLine(post) {
  const date = formatPostDate(post.publishedAt);
  const minutes = post.readMinutes ? `${post.readMinutes} min read` : null;
  return [date, minutes].filter(Boolean).join(' · ');
}

// Wireframe's floating header buttons use rgba(18,16,20,0.55) — that's
// colors.surfaceGround's own RGB at 55% alpha, not a new literal hex.
// Derived here from the token itself rather than hardcoding a second copy
// of the color, per the theme-token rule.
function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// http/https-only guard for every outbound open on this screen (inline body
// links + the bottom comments link) — never open an arbitrary scheme.
function isHttpUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function openOutbound(url) {
  if (!isHttpUrl(url)) return;
  WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'close' });
}

// Same missing-heroImageUrl treatment as WritingBlog.js's ImagePlaceholder:
// a flat surfaceLine block + centered lucide image icon (no gradient
// primitive available in RN's StyleSheet, no gradient lib installed —
// same deviation Task 5 already flagged and Eric signed off on).
function HeroImage({ post }) {
  return post.heroImageUrl ? (
    <Image source={{ uri: post.heroImageUrl }} style={styles.hero} resizeMode="cover" />
  ) : (
    <View style={[styles.hero, styles.heroPlaceholder]}>
      <ImageIcon color={colors.inkMuted} size={34} />
    </View>
  );
}

// tagsStyles/renderersProps/baseStyle are module-level constants (not
// recreated per render) since none of them depend on component state —
// avoids passing a fresh object identity to RenderHTML on every render.
const baseStyle = {
  color: colors.inkPrimary,
  fontFamily: fontFamily.regular,
  fontSize: fontSize.md,
  lineHeight: fontSize.md * 1.6,
};

const tagsStyles = {
  p: {
    marginTop: 0,
    marginBottom: spacing.md,
  },
  a: {
    color: colors.accentGold,
    textDecorationLine: 'underline',
  },
  // Wireframe: border-left: 3px solid #C9974A; padding: 4px 0 4px 16px;
  // font-style: italic. #C9974A is colors.accentGold by exact hex value.
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accentGold,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: spacing.md,
    paddingRight: 0,
    marginLeft: 0,
    fontStyle: 'italic',
  },
  img: {
    borderRadius: radius.md,
  },
  // Inter's weights are separate font families here (not one family
  // toggled via fontWeight) -- a plain CSS `font-weight` on a single-weight
  // custom font is a no-op in RN's Yoga/text layer, especially on Android.
  // Review fix: without this, <strong>/<b> silently rendered as regular
  // weight instead of bold.
  strong: {
    fontFamily: fontFamily.bold,
  },
  b: {
    fontFamily: fontFamily.bold,
  },
};

// react-native-render-html@6.3.4 only renders a fontFamily value that's in
// this list (buildTREFromConfig.js/LongFontFamilyPropertyValidator) --
// anything else is silently dropped and falls back to the system font.
// Review fix: baseStyle/tagsStyles above reference fontFamily.regular and
// fontFamily.bold, neither of which is in the library's own default list
// (Arial/Courier New/Georgia + platform system fonts), so the article body
// was silently rendering in the system font instead of Inter.
const systemFonts = [...defaultSystemFonts, fontFamily.regular, fontFamily.bold];

// Link-press interception: react-native-render-html 6.3.4's documented API
// for this is renderersProps.a.onPress(event, href, htmlAttribs, target) —
// confirmed against this exact installed version's type defs
// (lib/typescript/shared-types.d.ts). Routed through the same
// openOutbound() http/https guard as the bottom comments link.
const renderersProps = {
  a: {
    onPress: (_event, href) => openOutbound(href),
  },
};

export default function Article({ navigation, route }) {
  const post = route?.params?.post ?? {};
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const [bodyHtml, setBodyHtml] = useState(null);
  const [bodyLoading, setBodyLoading] = useState(true);
  const [bodyError, setBodyError] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Real timeout via AbortController — not just hoping the request
  // completes. Covers both a hung request (abort fires the timeout) and an
  // ordinary network/HTTP failure (caught below) with the same fallback.
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BODY_FETCH_TIMEOUT_MS);

    (async () => {
      try {
        if (!post.id) throw new Error('Missing post id');
        const response = await fetch(
          `${API_BASE_URL}/.netlify/functions/get-blog-posts?id=${encodeURIComponent(post.id)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`Article body request failed: ${response.status}`);
        const data = await response.json();
        if (mountedRef.current) {
          setBodyHtml(data.bodyHtml ?? '');
          setBodyLoading(false);
        }
      } catch (err) {
        if (mountedRef.current) {
          setBodyError(true);
          setBodyLoading(false);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    })();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [post.id]);

  // Server writes author as item.author?.displayName ?? '' with no
  // "Quite Frankly" fallback (netlify/functions/lib/squarespaceBlog.js) —
  // Global Constraints: "author falls back to Quite Frankly wherever the
  // app displays it, when the sheet cell is empty." Applied here since
  // this is the first screen that actually surfaces author in the UI.
  const author = post.author || AUTHOR_FALLBACK;
  const meta = metaLine(post);
  const contentWidth = windowWidth - spacing.md * 2;

  const shareArticle = () => {
    Share.share({ message: post.title ?? '', url: post.url ?? '' });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroWrap}>
        <HeroImage post={post} />

        <TouchableOpacity
          style={[styles.circleButton, styles.backButtonPos, { top: insets.top + spacing.sm }]}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
        >
          <ChevronLeft color={colors.inkPrimary} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.circleButton, styles.shareButtonPos, { top: insets.top + spacing.sm }]}
          onPress={shareArticle}
          accessibilityLabel="Share"
        >
          <Share2 color={colors.inkPrimary} size={17} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.metaRow}>
          {/* Always "Blog" — collection is write-side-only, never surfaced. */}
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>Blog</Text>
          </View>
          {meta ? <Text style={styles.metaText}>{meta}</Text> : null}
        </View>

        <Text style={styles.title}>{post.title}</Text>

        <View style={styles.bylineRow}>
          <View style={styles.avatar} />
          <Text style={styles.bylineText}>{author}</Text>
        </View>

        <View style={styles.divider} />

        {bodyLoading ? (
          <LoadingState message="Loading article…" />
        ) : bodyError || !bodyHtml ? (
          <View style={styles.bodyFallback}>
            <Text style={styles.bodyFallbackMessage}>
              Couldn't load this article's text right now.
            </Text>
            {isHttpUrl(post.url) ? (
              <TouchableOpacity onPress={() => openOutbound(post.url)} hitSlop={8}>
                <Text style={styles.bodyFallbackLink}>Open on quitefrankly.tv</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <RenderHTML
            source={{ html: bodyHtml, baseUrl: SITE_BASE_URL }}
            contentWidth={contentWidth}
            baseStyle={baseStyle}
            tagsStyles={tagsStyles}
            systemFonts={systemFonts}
            renderersProps={renderersProps}
          />
        )}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.commentsLink} onPress={() => openOutbound(post.url)}>
          <Text style={styles.commentsLinkText}>View comments & discussion on quitefrankly.tv</Text>
          <ChevronRight color={colors.inkMuted} size={16} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
  heroWrap: {
    width: '100%',
    height: HERO_HEIGHT,
    backgroundColor: colors.surfaceLine,
  },
  hero: {
    width: '100%',
    height: HERO_HEIGHT,
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButton: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: hexToRgba(colors.surfaceGround, 0.55),
  },
  backButtonPos: {
    left: spacing.md,
  },
  shareButtonPos: {
    right: spacing.md,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryPill: {
    borderWidth: 1,
    borderColor: colors.accentGold,
    borderRadius: radius.lg,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  categoryPillText: {
    color: colors.accentGold,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
  },
  metaText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
  },
  // 28px/700 title — no fontSize token reaches 28 (fontSize.xxl=20 is the
  // largest below fontSize.display=40, which is reserved for the splash
  // wordmark only per theme.js's own comment). Hardcoded literal, same
  // precedent as Task 5's non-token pixel dimensions (160px hero, 56px
  // thumbnail) — extending theme.js's scale is out of scope for a single
  // screen file.
  title: {
    color: colors.inkPrimary,
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 28 * 1.2,
    marginBottom: spacing.sm,
  },
  bylineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceLine,
  },
  bylineText: {
    color: colors.inkMuted,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceLine,
    marginBottom: spacing.lg,
  },
  bodyFallback: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Matches ErrorState.js's message/retryText styling exactly (brandRed
  // message, accentGold semibold link) — not reusing that shared component
  // directly since it hardcodes "Try again" as its action label and this
  // screen needs "Open on quitefrankly.tv" instead.
  bodyFallbackMessage: {
    color: colors.brandRed,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  bodyFallbackLink: {
    color: colors.accentGold,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
  commentsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentsLinkText: {
    flex: 1,
    color: colors.inkMuted,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    marginRight: spacing.sm,
  },
});
