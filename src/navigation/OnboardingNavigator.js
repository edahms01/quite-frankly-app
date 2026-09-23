import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Welcome from '../screens/onboarding/Welcome';
import NotificationsPermission from '../screens/onboarding/NotificationsPermission';
import Email from '../screens/onboarding/Email';
import CodeEntry from '../screens/onboarding/CodeEntry';

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={Welcome} />
      <Stack.Screen name="NotificationsPermission" component={NotificationsPermission} />
      <Stack.Screen name="Email" component={Email} />
      <Stack.Screen name="CodeEntry" component={CodeEntry} />
    </Stack.Navigator>
  );
}
