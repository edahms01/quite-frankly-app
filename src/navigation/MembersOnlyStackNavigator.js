import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CultureClub from '../screens/members/CultureClub';
import Subscription from '../screens/shared/Subscription';

const Stack = createNativeStackNavigator();

export default function MembersOnlyStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="CultureClub" component={CultureClub} />
      <Stack.Screen name="Subscription" component={Subscription} />
    </Stack.Navigator>
  );
}
