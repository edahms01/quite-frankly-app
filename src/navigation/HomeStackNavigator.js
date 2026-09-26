import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../screens/home/Home';
import Shop from '../screens/home/Shop';
import Community from '../screens/home/Community';
import Writing from '../screens/home/Writing';
import Band from '../screens/home/Band';
import Calendar from '../screens/home/Calendar';
import VideoPlayer from '../screens/watch/VideoPlayer';

const Stack = createNativeStackNavigator();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
      <Stack.Screen name="Shop" component={Shop} options={{ headerShown: false }} />
      <Stack.Screen name="Community" component={Community} options={{ headerShown: false }} />
      <Stack.Screen name="Writing" component={Writing} options={{ headerShown: false }} />
      <Stack.Screen name="Band" component={Band} options={{ headerShown: false }} />
      <Stack.Screen name="Calendar" component={Calendar} options={{ headerShown: false }} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayer} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
