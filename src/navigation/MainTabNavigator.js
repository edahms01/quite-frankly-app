import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeStackNavigator from './HomeStackNavigator';
import WatchStackNavigator from './WatchStackNavigator';
import MembersOnlyStackNavigator from './MembersOnlyStackNavigator';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Watch" component={WatchStackNavigator} />
      <Tab.Screen name="MembersOnly" component={MembersOnlyStackNavigator} options={{ title: 'Members Only' }} />
    </Tab.Navigator>
  );
}
