import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Account from '../screens/account/Account';
import Subscription from '../screens/shared/Subscription';
import NotificationsSettings from '../screens/account/NotificationsSettings';
import Donation from '../screens/account/Donation';
import ReportBug from '../screens/account/ReportBug';

const Stack = createNativeStackNavigator();

export default function AccountStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Account" component={Account} />
      <Stack.Screen name="Subscription" component={Subscription} />
      <Stack.Screen name="NotificationsSettings" component={NotificationsSettings} />
      <Stack.Screen name="Donation" component={Donation} />
      <Stack.Screen name="ReportBug" component={ReportBug} />
    </Stack.Navigator>
  );
}
