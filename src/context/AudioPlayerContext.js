import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  State,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';

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

// Module-level (not component state) so setupPlayer() only ever runs once
// per app lifetime, surviving React 19/dev StrictMode's double-invoke of
// effects — TrackPlayer.setupPlayer() rejects if called again while already
// set up.
let setupPromise = null;

function setupTrackPlayer() {
  if (!setupPromise) {
    setupPromise = TrackPlayer.setupPlayer().then(() =>
      TrackPlayer.updateOptions({
        capabilities: [Capability.Play, Capability.Pause, Capability.SeekTo, Capability.Stop],
        compactCapabilities: [Capability.Play, Capability.Pause],
        notificationCapabilities: [Capability.Play, Capability.Pause],
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.PausePlayback,
        },
      })
    );
  }
  return setupPromise;
}

function mapState(state) {
  switch (state) {
    case State.Playing:
      return 'playing';
    case State.Paused:
      return 'paused';
    case State.Buffering:
    case State.Loading:
    case State.Connecting:
      return 'buffering';
    case State.Error:
      return 'error';
    default:
      return 'idle';
  }
}

export function AudioPlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [error, setError] = useState(null);
  const rawState = usePlaybackState();
  const progress = useProgress(1000);

  useEffect(() => {
    let cancelled = false;
    setupTrackPlayer().catch((err) => {
      if (!cancelled) setError(err.message);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useTrackPlayerEvents([Event.PlaybackError], (event) => {
    setError(event?.message ?? 'Playback error');
  });

  const play = useCallback(async (episode) => {
    if (!episode?.audioUrl) return;
    setError(null);
    try {
      await setupTrackPlayer();
      const active = await TrackPlayer.getActiveTrack();
      if (active?.id === episode.guid) {
        await TrackPlayer.play();
        return;
      }
      // Always reset before adding — single track at a time, no queue.
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: episode.guid,
        url: episode.audioUrl,
        title: episode.title,
        artist: 'Quite Frankly',
        // No per-episode artwork exists in the feed data — static show logo.
        artwork: require('../assets/images/quite-frankly-logo-final.png'),
      });
      setCurrentTrack(episode);
      await TrackPlayer.play();
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const pause = useCallback(async () => {
    try {
      await TrackPlayer.pause();
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const playbackState = mapState(rawState?.state ?? rawState);

  const togglePlayPause = useCallback(async () => {
    if (playbackState === 'playing') {
      await pause();
    } else if (currentTrack) {
      await play(currentTrack);
    }
  }, [playbackState, currentTrack, pause, play]);

  const seekTo = useCallback(async (seconds) => {
    try {
      await TrackPlayer.seekTo(seconds);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const value = {
    currentTrack,
    playbackState,
    position: progress.position,
    duration: progress.duration,
    error,
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
