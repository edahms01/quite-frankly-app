import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAudioPlayer } from '../context/AudioPlayerContext';

// Coordinates a video screen/card with AudioPlayerContext's shared
// activeSource so podcast and video playback stay mutually exclusive.
// `onForcedStop` fires whenever this consumer currently owns playback and
// stops being the active source for any reason — a podcast taking the slot,
// or the screen losing focus — so the caller can reset its own UI (unmount
// the WebView, revert to a thumbnail, etc).
export function useVideoActiveSource({ onForcedStop } = {}) {
  const { activeSource, setVideoActive } = useAudioPlayer();
  const ownsPlaybackRef = useRef(false);
  const onForcedStopRef = useRef(onForcedStop);
  onForcedStopRef.current = onForcedStop;

  const claim = useCallback(() => {
    ownsPlaybackRef.current = true;
    setVideoActive(true);
  }, [setVideoActive]);

  // Stops playback if (and only if) this consumer currently owns it, and
  // always resets the caller's UI via onForcedStop — used both when a
  // podcast steals the slot and when the screen loses focus, since either
  // way the video must not keep running unseen.
  const stop = useCallback(() => {
    if (!ownsPlaybackRef.current) return;
    ownsPlaybackRef.current = false;
    setVideoActive(false);
    onForcedStopRef.current?.();
  }, [setVideoActive]);

  useEffect(() => {
    if (activeSource !== 'video') stop();
  }, [activeSource, stop]);

  // Screens (bottom tabs, native-stack) stay mounted when blurred here —
  // without this, switching away would leave video silently playing.
  useFocusEffect(
    useCallback(() => {
      return () => stop();
    }, [stop])
  );

  return { activeSource, claim, release: stop };
}
