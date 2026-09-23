import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CultureClub from '../screens/members/CultureClub';
import Subscription from '../screens/shared/Subscription';

const Stack = createNativeStackNavigator();

export default function MembersOnlyStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CultureClub" component={CultureClub} options={{ headerShown: false }} />
      <Stack.Screen name="Subscription" component={Subscription} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
