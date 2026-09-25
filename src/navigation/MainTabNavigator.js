import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { House as HomeIcon, CirclePlay, Crown } from 'lucide-react-native';
import HomeStackNavigator from './HomeStackNavigator';
import WatchStackNavigator from './WatchStackNavigator';
import MembersOnlyStackNavigator from './MembersOnlyStackNavigator';
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
        name="MembersOnly"
        component={MembersOnlyStackNavigator}
        options={{
          title: 'Culture Club',
          tabBarIcon: ({ color, size }) => <Crown color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
