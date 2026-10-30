# 6. Graphic assets

| Asset | Spec (Console) | Status |
|---|---|---|
| **App icon** | 512 x 512 PNG, 32-bit, up to 1 MB, no rounded corners baked in | **Done**: `docs/play-console/store-icon-512.png` (512x512, opaque, from "jester bright 2x") |
| **Feature graphic** | 1024 x 500 PNG or JPEG, no alpha | **Missing.** Not created. Suggestion: the wide wordmark on the dark background (`src/assets/images/quite-frankly-tv-wordmark-gold.png` is 1260x264 transparent) centred on `#0c0f14`, nothing else, no store badges, no rating text, no "free / new / best" words. Say so and I will make it |
| **Phone screenshots** | 2 to 8; JPEG or 24-bit PNG (**no alpha**); each side 320 to 3840 px; **the long side may not exceed 2x the short side** (so 1080x2400 is rejected, 1080x2160 or 1080x1920 passes). 4 to 8 recommended | **Not captured yet.** Capture list below |
| 7-inch / 10-inch tablet screenshots | optional (`supportsTablet` is false) | skip |
| Promo video | optional | skip |

## How to capture from the v8 APK (API 36 emulator, one emulator at a time)
```
adb install -r quite-frankly-v8-release-qa.apk
adb shell wm size 1080x1920 && adb shell wm density 420     # 16:9, passes the 2:1 rule
adb shell settings put global sysui_demo_allowed 1          # clean status bar
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 1200
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4
adb exec-out screencap -p | magick - -alpha off -strip shot-01-home.png     # 24-bit, no alpha
# afterwards: adb shell wm size reset && adb shell wm density reset
```
Use gesture navigation. Allow the notification prompt once, then dismiss it before capturing.

## Which screens (in this order; 8 shots)
1. **Home** (top of the screen): Most Recent card + the first tiles. Do not scroll to the bottom (the website link is not a selling point and the page it opens shows membership pages).
2. **Watch**: the video grid.
3. **Video Player**: a video playing with the description preview (the payment lines are stripped; pick a recent one). Avoid expanding the description.
4. **Listen**: episode list with the **MiniPlayer playing** (shows background audio).
5. **Read**: Substack tab with the free post.
6. **Jam**: Spotify playlist + the Bandcamp small player.
7. **Play**: a game window open over a playing video (Memory Match or Snake).
8. **AskFrankie**: a streamed answer on screen. Capture **with an answer visible** so the rotating suggestion pills are not in the frame (they can show topic chips you may not want in the store). The AI label and "Report a Problem" button should be visible.

**Do not capture:** Shop, Connect (links to other stores / platforms), Settings with the notification screen is fine but not needed, the notification permission dialog, the Home bottom, anything with an error / offline banner, the emulator's navigation bar in 3-button mode. None of the removed UI (gold support buttons, Culture Club tab or tile, Support the Show, Donate) exists in v8, so any screen is clean; the list above is about what sells the app and avoids third-party store links.
