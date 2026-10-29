import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import { initialRoute, isEnabled } from '../lib/featureFlags';
import { getOnboardingDone, markOnboardingDone } from '../lib/firstRun';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';
import AccountStackNavigator from './AccountStackNavigator';
import SubscriptionCheckout from '../screens/modal/SubscriptionCheckout';
import FullPlayer from '../screens/modal/FullPlayer';

const Stack = createNativeStackNavigator();

// First screen: Home (MainTabs) for everyone while the `onboarding` flag is off (the default, so a first launch with no cached flags never flashes Welcome). With
// the flag on, the onboarding stack opens only for an install that has not reached Home yet (marker `onboarding_done`, written the first time MainTabs is focused).
// Decided once at mount: a flag that changes mid-session never re-routes. The Onboarding screens stay registered either way.
export default function RootNavigator() {
  const flags = useFeatureFlags();
  const [done, setDone] = useState(null);      // null = marker not read yet
  const initial = useRef(null);
  useEffect(() => { getOnboardingDone().then(setDone); }, []);
  const needsMarker = isEnabled(flags, 'onboarding');
  if (initial.current == null && (!needsMarker || done !== null)) initial.current = initialRoute(flags, done);
  if (initial.current == null) return <View style={{ flex: 1, backgroundColor: colors.surfaceGround }} />;   // a few ms, only while onboarding is on
  return (
    <Stack.Navigator initialRouteName={initial.current} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} listeners={{ focus: markOnboardingDone }} />
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
