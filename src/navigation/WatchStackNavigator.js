import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Watch from '../screens/watch/Watch';
import VideoPlayer from '../screens/watch/VideoPlayer';
import Listen from '../screens/shared/Listen';

const Stack = createNativeStackNavigator();

export default function WatchStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Watch" component={Watch} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayer} />
      <Stack.Screen name="Listen" component={Listen} />
    </Stack.Navigator>
  );
}
