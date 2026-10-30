# 3. Foreground service permissions declaration

Console: App content > **Foreground service permissions**. The app declares `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MEDIA_PLAYBACK` (the merged manifest shows `foregroundServiceType` = mediaPlayback, `0x00000002`, from the audio library). No other foreground service type.

## Answers
| Field | Paste |
|---|---|
| Foreground service type | **Media playback** |
| Does your app use this for... | Playing audio the user started (podcast episodes) |
| Describe the user-facing feature | "Listen plays podcast episodes. When the user starts an episode and leaves the app or turns the screen off, audio keeps playing through a media-playback foreground service with an ongoing media notification (episode title, artwork, play / pause). The user controls playback from the notification and the lock screen. The service starts only when the user taps play and stops when playback is paused or finished." |
| Why does it need a foreground service | "Without it Android stops the audio a few minutes after the app leaves the foreground. Podcast episodes are 1 to 2 hours long and are normally listened to with the screen off." |
| User impact if it is deferred or interrupted | "Playback would stop mid-episode and the user would have to reopen the app." |
| Is it started by a user action? | Yes: tapping an episode (or Play) in Listen |
| Video link | Upload the video from the shot list below as unlisted on YouTube (or a shared Drive link) and paste the URL |

## Video: 30 seconds or less, screen recording, no audio track needed
Record on the API 36 emulator or a phone with the v8 build. Command (stops itself at 30 s): `adb shell screenrecord --time-limit 30 /sdcard/fgs.mp4 && adb pull /sdcard/fgs.mp4`. Turn on "Show taps" (Developer options) so the taps are visible.

| Time | Shot |
|---|---|
| 0:00 to 0:04 | Home. Tap the **Listen** tile (or the Listen tab) |
| 0:04 to 0:08 | The episode list. Tap the first episode: the MiniPlayer appears at the bottom, the play icon turns to pause, the position moves |
| 0:08 to 0:12 | Press the **Home** button (app goes to the background; audio keeps going). Pull down the notification shade: the **media notification** with title, artwork and pause button is visible. Hold for 2 s |
| 0:12 to 0:17 | Tap **pause** in the notification (audio stops), then **play** (resumes) |
| 0:17 to 0:24 | Press the **power** button: screen off, 3 s, press again: the **lock screen** shows the media card with artwork; audio is still playing |
| 0:24 to 0:30 | Unlock, open the app again: MiniPlayer still shows the episode; tap pause. End |

Emulator tip: to see the lock-screen card the emulator needs a screen lock (Settings > Security > Screen lock > Swipe is enough). The media card also shows in the notification shade, which already proves the feature if the lock screen is not available.
