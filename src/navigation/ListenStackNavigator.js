import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Listen from '../screens/shared/Listen';

const Stack = createNativeStackNavigator();

export default function ListenStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Listen" component={Listen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
