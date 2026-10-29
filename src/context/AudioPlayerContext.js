import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  setAudioModeAsync,
  useAudioPlayer as useExpoAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { lockScreenMetadata } from '../lib/lockScreenArtwork';
import { loadLockScreenArtwork } from '../lib/lockScreenArtworkNative';

const AudioPlayerContext = createContext({
  currentTrack: null,
  playbackState: 'idle',
  position: 0,
  duration: 0,
  error: null,
  activeSource: null,
  play: () => {},
  pause: () => {},
  togglePlayPause: () => {},
  seekTo: () => {},
  setVideoActive: () => {},
});

export function AudioPlayerProvider({ children }) {
  const player = useExpoAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const [currentTrack, setCurrentTrack] = useState(null);
  // Shared with video screens (see useVideoActiveSource) so podcast and
  // video playback stay mutually exclusive — 'podcast' | 'video' | null.
  const [activeSource, setActiveSource] = useState(null);

  // Lock-screen artwork = the app icon, copied to a file:// URL on Android release builds (see src/lib/lockScreenArtwork.js).
  // Resolved once at start-up; null (not ready / failed) just means no artwork, never an error.
  const artworkUriRef = useRef(null);
  useEffect(() => {
    let alive = true;
    loadLockScreenArtwork().then((uri) => {
      if (alive) artworkUriRef.current = uri;
    });
    return () => {
      alive = false;
    };
  }, []);

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
      setActiveSource('podcast');
      if (currentTrack?.guid === episode.guid) {
        player.play();
        return;
      }
      // Single track at a time — replace() swaps the loaded source outright, no queue.
      player.replace({ uri: episode.audioUrl });
      setCurrentTrack(episode);
      // Android kills background audio after ~3 min without this — must be
      // called for every new track, not just once at app start.
      // Lock-screen metadata is a nicety: if native rejects it, playback must still start.
      try {
        player.setActiveForLockScreen(
          true,
          lockScreenMetadata({ title: episode.title, artworkUri: artworkUriRef.current }),
          { isLiveStream: false }
        );
      } catch (err) {
        console.warn('setActiveForLockScreen failed', err);
      }
      player.play();
    },
    [currentTrack, player]
  );

  const pause = useCallback(() => {
    player.pause();
  }, [player]);

  // setVideoActive must have a stable identity across renders — video
  // screens re-claim on mount via an effect keyed on it (see
  // useVideoActiveSource), and if it changed identity every time
  // status.playing flipped (e.g. right when a podcast resumes), that
  // effect would re-fire and immediately re-pause the podcast it was
  // just told to resume. Reading status/pause via refs avoids that.
  const statusPlayingRef = useRef(status.playing);
  statusPlayingRef.current = status.playing;
  const pauseRef = useRef(pause);
  pauseRef.current = pause;

  const setVideoActive = useCallback((isActive) => {
    if (isActive) {
      if (statusPlayingRef.current) pauseRef.current();
      setActiveSource('video');
    } else {
      // Only clear if video still owns the slot — a podcast may have
      // already reclaimed it (e.g. video's own unmount cleanup firing
      // after a podcast started), and this must not stomp on that.
      setActiveSource((prev) => (prev === 'video' ? null : prev));
    }
  }, []);

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
    activeSource,
    play,
    pause,
    togglePlayPause,
    seekTo,
    setVideoActive,
  };

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  return useContext(AudioPlayerContext);
}
