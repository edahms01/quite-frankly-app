import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { House as HomeIcon, CirclePlay, Headphones, Crown } from 'lucide-react-native';
import HomeStackNavigator from './HomeStackNavigator';
import WatchStackNavigator from './WatchStackNavigator';
import ListenStackNavigator from './ListenStackNavigator';
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
        // Bottom-tab navigators keep each tab's nested stack mounted and
        // preserve its state by default — without this, leaving Watch on
        // VideoPlayer and coming back (via the tab bar or Home's Watch
        // card) reopens VideoPlayer instead of the Watch list. Resetting
        // on blur (not on the tab's own focus) means it also resets while
        // backgrounded/foregrounded without ever switching tabs.
        listeners={({ navigation }) => ({
          blur: () => {
            const tabState = navigation.getState();
            const watchRoute = tabState.routes.find((r) => r.name === 'Watch');
            if (watchRoute?.state && watchRoute.state.index > 0) {
              navigation.dispatch({
                ...CommonActions.reset({ index: 0, routes: [{ name: 'Watch' }] }),
                target: watchRoute.state.key,
              });
            }
          },
        })}
      />
      <Tab.Screen
        name="Listen"
        component={ListenStackNavigator}
        options={{ tabBarIcon: ({ color, size }) => <Headphones color={color} size={size} /> }}
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
