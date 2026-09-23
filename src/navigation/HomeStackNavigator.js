import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../screens/home/Home';
import Shop from '../screens/home/Shop';
import Community from '../screens/home/Community';
import Writing from '../screens/home/Writing';
import Band from '../screens/home/Band';
import Calendar from '../screens/home/Calendar';
import Listen from '../screens/shared/Listen';

const Stack = createNativeStackNavigator();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Shop" component={Shop} />
      <Stack.Screen name="Community" component={Community} />
      <Stack.Screen name="Writing" component={Writing} />
      <Stack.Screen name="Band" component={Band} />
      <Stack.Screen name="Calendar" component={Calendar} />
      <Stack.Screen name="Listen" component={Listen} />
    </Stack.Navigator>
  );
}
