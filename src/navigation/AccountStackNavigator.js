import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Account from '../screens/account/Account';
import NotificationsSettings from '../screens/account/NotificationsSettings';
import ReportBug from '../screens/account/ReportBug';
import DeleteAccount from '../screens/account/DeleteAccount';

const Stack = createNativeStackNavigator();

export default function AccountStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Account" component={Account} options={{ headerShown: false }} />
      <Stack.Screen name="NotificationsSettings" component={NotificationsSettings} options={{ headerShown: false }} />
      <Stack.Screen name="ReportBug" component={ReportBug} options={{ headerShown: false }} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccount} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
