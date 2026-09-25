import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_400Regular_Italic,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';

import RootNavigator from './src/navigation/RootNavigator';
import MiniPlayer from './src/components/MiniPlayer';
import OfflineBanner from './src/components/OfflineBanner';
import { YouTubeFeedProvider } from './src/context/YouTubeFeedContext';
import { AudioPlayerProvider } from './src/context/AudioPlayerContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { navigationRef } from './src/navigation/navigationRef';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_400Regular_Italic,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    BebasNeue_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NetworkProvider>
          <YouTubeFeedProvider>
            <AudioPlayerProvider>
              <View style={{ flex: 1 }}>
                <NavigationContainer ref={navigationRef}>
                  <RootNavigator />
                </NavigationContainer>
                <MiniPlayer />
                <OfflineBanner />
              </View>
            </AudioPlayerProvider>
          </YouTubeFeedProvider>
        </NetworkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
