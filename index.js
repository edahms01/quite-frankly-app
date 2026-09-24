import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';

import App from './App';
import PlaybackService from './src/services/PlaybackService';

// Must be registered at module scope, before registerRootComponent — this
// is what lets react-native-track-player run playback in the background
// and drive lock-screen/notification controls.
TrackPlayer.registerPlaybackService(() => PlaybackService);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
