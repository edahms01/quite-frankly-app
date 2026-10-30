// Bottom tab bar size, as a pure function of platform and the real bottom safe-area inset (node --test covers it).
// iOS keeps the original, device-measured values (height 49 + inset, paddingTop md): unchanged on purpose.
// Android (edge-to-edge since target SDK 35/36): the bar sits UNDER the system navigation bar, whose height is the inset (about 24 dp for the gesture
// pill, 42 dp for 3-button navigation). The iOS numbers leave only 49 - 16 = 33 dp above the inset for icon (24) + label + the library's own ~8 dp top
// margin, so the label row spilled into the inset area and 3-button navigation painted over it. Here the content area above the inset is a fixed
// 64 dp, so label + icon always sit fully above whatever the system draws at the bottom.
export const ANDROID_CONTENT_HEIGHT = 64;
export const IOS_CONTENT_HEIGHT = 49;

export function tabBarMetrics({ platform, bottomInset, spacingMd = 16, spacingSm = 8, spacingXs = 4 }) {
  const inset = Number.isFinite(bottomInset) && bottomInset > 0 ? bottomInset : 0;
  if (platform === 'android') {
    return { height: ANDROID_CONTENT_HEIGHT + inset, paddingTop: spacingSm, paddingBottom: inset || spacingXs };
  }
  return { height: IOS_CONTENT_HEIGHT + inset, paddingTop: spacingMd, paddingBottom: inset || spacingXs };
}
