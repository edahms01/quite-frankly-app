import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House as HomeIcon, CirclePlay, Headphones } from 'lucide-react-native';
import HomeStackNavigator from './HomeStackNavigator';
import WatchStackNavigator from './WatchStackNavigator';
import ListenStackNavigator from './ListenStackNavigator';
import { resetTabStackOnBlur } from './resetStackOnBlur';
import { colors, spacing } from '../theme';
import { tabBarMetrics } from '../lib/tabBarMetrics';

const Tab = createBottomTabNavigator();

// bottom-tabs' own automatic height/safe-area math was leaving icons and
// labels stranded near the top of a much taller bar, with a large dead
// gap below them instead of the bar hugging the content — explicit
// height/padding here, driven by the real inset, fixes it deterministically
// instead of trusting the library's default sizing.
export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  // iOS: the original measured values. Android: a fixed content height above the system bar (src/lib/tabBarMetrics.js).
  const bar = tabBarMetrics({ platform: Platform.OS, bottomInset: insets.bottom, spacingMd: spacing.md, spacingSm: spacing.sm, spacingXs: spacing.xs });
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentGold,
        tabBarInactiveTintColor: colors.inkMuted,
        // Content is top-anchored inside the bar's padded box — paddingTop
        // is what actually pushes icons down, paddingBottom doesn't pull
        // them toward the bottom (confirmed by measuring the rendered gap
        // on-device, not guessed: increasing paddingTop shifted content
        // down 1:1 and shrank the *bottom* gap by the same amount, with
        // paddingBottom having no independent effect). The library also
        // adds ~8pt of its own unremovable top margin on top of whatever's
        // set here. spacing.md (not spacing.xs) accounts for both, so the
        // ~35pt gap above the icons roughly matches the ~35pt gap below
        // them (insets.bottom) instead of the icons sitting almost flush
        // with the bar's top edge.
        tabBarStyle: {
          backgroundColor: colors.surfaceCard,
          borderTopColor: colors.surfaceLine,
          height: bar.height,
          paddingTop: bar.paddingTop,
          paddingBottom: bar.paddingBottom,
          // Insets the whole row of 3 tabs from both screen edges equally, so
          // the leftmost and rightmost tabs do not sit at the bar's raw edge.
          paddingHorizontal: spacing.md,
        },
      }}
      // Applies to every tab automatically — including any tab added here
      // later — rather than needing a `listeners` prop wired individually
      // on each Tab.Screen. See resetStackOnBlur.js for why this exists.
      screenListeners={resetTabStackOnBlur}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Watch"
        component={WatchStackNavigator}
        options={{ tabBarIcon: ({ color, size }) => <CirclePlay color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Listen"
        component={ListenStackNavigator}
        options={{ tabBarIcon: ({ color, size }) => <Headphones color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}
