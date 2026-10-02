import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../screens/home/Home';
import Shop from '../screens/home/Shop';
import Community from '../screens/home/Community';
import Writing from '../screens/home/Writing';
import Article from '../screens/home/Article';
import BulletinViewer from '../screens/home/BulletinViewer';
import Music from '../screens/home/Music';
import Calendar from '../screens/home/Calendar';
import PhoneLines from '../screens/home/PhoneLines';
import Games from '../screens/games/Games';
import VideoPlayer from '../screens/watch/VideoPlayer';

const Stack = createNativeStackNavigator();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
      <Stack.Screen name="Shop" component={Shop} options={{ headerShown: false }} />
      <Stack.Screen name="Community" component={Community} options={{ headerShown: false }} />
      <Stack.Screen name="Writing" component={Writing} options={{ headerShown: false }} />
      <Stack.Screen name="Article" component={Article} options={{ headerShown: false }} />
      <Stack.Screen name="BulletinViewer" component={BulletinViewer} options={{ headerShown: false }} />
      <Stack.Screen name="Music" component={Music} options={{ headerShown: false }} />
      <Stack.Screen name="Games" component={Games} options={{ headerShown: false }} />
      <Stack.Screen name="Calendar" component={Calendar} options={{ headerShown: false }} />
      <Stack.Screen name="PhoneLines" component={PhoneLines} options={{ headerShown: false }} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayer} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
