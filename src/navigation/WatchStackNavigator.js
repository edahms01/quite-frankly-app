import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Watch from '../screens/watch/Watch';
import VideoPlayer from '../screens/watch/VideoPlayer';

const Stack = createNativeStackNavigator();

export default function WatchStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Watch" component={Watch} options={{ headerShown: false }} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayer} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
