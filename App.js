import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
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
import Wordmark from './src/components/Wordmark';
import { colors, spacing } from './src/theme';
import { YouTubeFeedProvider } from './src/context/YouTubeFeedContext';
import { AudioPlayerProvider } from './src/context/AudioPlayerContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { navigationRef } from './src/navigation/navigationRef';

// Keep the native splash screen up until fonts are actually ready —
// without this, it auto-hides as soon as the native view mounts (well
// before useFonts resolves), leaving a blank flash between the splash
// disappearing and the real UI appearing.
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_400Regular_Italic,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    BebasNeue_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    // Matches Welcome.js's wordmark size/position exactly (same background,
    // same centered layout, same Wordmark default width) so this reads as
    // the same opening page still loading, not a separate splash screen —
    // the native OS splash behind this is the same wordmark image too,
    // just scaled to fill the screen since native splash config can't
    // pin an exact width like this can.
    return (
      <View style={bootStyles.container}>
        <Wordmark style={bootStyles.wordmark} />
      </View>
    );
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

// Mirrors Welcome.js's container/content styles (same background,
// justifyContent: center, paddingHorizontal) — kept separate rather than
// imported since Welcome's version also carries onboarding-only siblings
// (dots, CTA) this boot screen intentionally doesn't render.
const bootStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  wordmark: {
    alignSelf: 'center',
  },
});
