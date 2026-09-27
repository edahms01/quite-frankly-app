import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { House as HomeIcon, CirclePlay, Headphones, Crown } from 'lucide-react-native';
import HomeStackNavigator from './HomeStackNavigator';
import WatchStackNavigator from './WatchStackNavigator';
import ListenStackNavigator from './ListenStackNavigator';
import CultureClubStackNavigator from './CultureClubStackNavigator';
import { resetTabStackOnBlur } from './resetStackOnBlur';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentGold,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: { backgroundColor: colors.surfaceCard, borderTopColor: colors.surfaceLine },
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
      <Tab.Screen
        name="CultureClub"
        component={CultureClubStackNavigator}
        options={{
          title: 'Culture Club',
          tabBarIcon: ({ color, size }) => <Crown color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
