// Android 15+ / target SDK 36 is edge-to-edge: android:windowSoftInputMode="adjustResize" no longer shrinks the content, so the keyboard is drawn OVER
// the bottom of the screen and covers the AskFrankie page's input box (typed text was accepted but invisible). The screen reads the keyboard's top edge
// from the RN Keyboard event and pads its bottom by however far the keyboard reaches into the screen's own area. Pure, node --test covers it.

/** px the keyboard covers of a container whose bottom edge is containerBottom; both in window coordinates. 0 when there is no overlap or bad input. */
export function keyboardOverlap({ containerBottom, keyboardTop }) {
  if (!Number.isFinite(containerBottom) || !Number.isFinite(keyboardTop)) return 0;
  return Math.max(0, Math.round(containerBottom - keyboardTop));
}
