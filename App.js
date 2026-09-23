import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';

import RootNavigator from './src/navigation/RootNavigator';
import MiniPlayer from './src/components/MiniPlayer';
import { YouTubeFeedProvider } from './src/context/YouTubeFeedContext';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    BebasNeue_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <YouTubeFeedProvider>
        <View style={{ flex: 1 }}>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
          <MiniPlayer />
        </View>
      </YouTubeFeedProvider>
    </SafeAreaProvider>
  );
}
