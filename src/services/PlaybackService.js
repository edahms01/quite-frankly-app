import TrackPlayer, { Event } from 'react-native-track-player';

// Registered via TrackPlayer.registerPlaybackService in index.js. Runs in a
// headless JS context, separate from the app's React tree — this is what
// makes lock-screen/notification controls actually call into the player
// when the app is backgrounded, not just when it's in the foreground.
module.exports = async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => TrackPlayer.seekTo(event.position));
};
