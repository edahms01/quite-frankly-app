import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Image } from 'react-native';
import {
  setAudioModeAsync,
  useAudioPlayer as useExpoAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';

const AudioPlayerContext = createContext({
  currentTrack: null,
  playbackState: 'idle',
  position: 0,
  duration: 0,
  error: null,
  play: () => {},
  pause: () => {},
  togglePlayPause: () => {},
  seekTo: () => {},
});

// No per-episode artwork exists in the feed data — static show logo, resolved
// to a URI via RN's built-in resolver (expo-audio's artworkUrl takes a URL
// string, not a raw require() result — no need for the expo-asset dependency).
const ARTWORK_URI = Image.resolveAssetSource(
  require('../assets/images/quite-frankly-logo-final.png')
).uri;

export function AudioPlayerProvider({ children }) {
  const player = useExpoAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const [currentTrack, setCurrentTrack] = useState(null);

  useEffect(() => {
    // doNotMix is required for setActiveForLockScreen to work (per expo-audio docs).
    setAudioModeAsync({
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    });
  }, []);

  const play = useCallback(
    (episode) => {
      if (!episode?.audioUrl) return;
      if (currentTrack?.guid === episode.guid) {
        player.play();
        return;
      }
      // Single track at a time — replace() swaps the loaded source outright, no queue.
      player.replace({ uri: episode.audioUrl });
      setCurrentTrack(episode);
      // Android kills background audio after ~3 min without this — must be
      // called for every new track, not just once at app start.
      player.setActiveForLockScreen(
        true,
        { title: episode.title, artist: 'Quite Frankly', artworkUrl: ARTWORK_URI },
        { isLiveStream: false }
      );
      player.play();
    },
    [currentTrack, player]
  );

  const pause = useCallback(() => {
    player.pause();
  }, [player]);

  const togglePlayPause = useCallback(() => {
    if (status.playing) {
      pause();
    } else if (currentTrack) {
      play(currentTrack);
    }
  }, [status.playing, currentTrack, pause, play]);

  const seekTo = useCallback(
    (seconds) => {
      player.seekTo(seconds);
    },
    [player]
  );

  const playbackState = !currentTrack
    ? 'idle'
    : status.error
      ? 'error'
      : status.isBuffering
        ? 'buffering'
        : status.playing
          ? 'playing'
          : 'paused';

  const value = {
    currentTrack,
    playbackState,
    position: status.currentTime,
    duration: status.duration,
    error: status.error,
    play,
    pause,
    togglePlayPause,
    seekTo,
  };

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  return useContext(AudioPlayerContext);
}
