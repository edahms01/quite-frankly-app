import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';
import AccountStackNavigator from './AccountStackNavigator';
import SubscriptionCheckout from '../screens/modal/SubscriptionCheckout';
import FullPlayer from '../screens/modal/FullPlayer';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="AccountStack" component={AccountStackNavigator} />
      <Stack.Screen
        name="SubscriptionCheckout"
        component={SubscriptionCheckout}
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="FullPlayer"
        component={FullPlayer}
        options={{ presentation: 'modal', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
