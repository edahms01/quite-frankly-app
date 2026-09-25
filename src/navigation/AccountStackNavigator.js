import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Account from '../screens/account/Account';
import Subscription from '../screens/shared/Subscription';
import NotificationsSettings from '../screens/account/NotificationsSettings';
import ReportBug from '../screens/account/ReportBug';
import DonateToApp from '../screens/account/DonateToApp';

const Stack = createNativeStackNavigator();

export default function AccountStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Account" component={Account} options={{ headerShown: false }} />
      <Stack.Screen name="Subscription" component={Subscription} options={{ headerShown: false }} />
      <Stack.Screen name="NotificationsSettings" component={NotificationsSettings} options={{ headerShown: false }} />
      <Stack.Screen name="ReportBug" component={ReportBug} options={{ headerShown: false }} />
      <Stack.Screen name="DonateToApp" component={DonateToApp} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
