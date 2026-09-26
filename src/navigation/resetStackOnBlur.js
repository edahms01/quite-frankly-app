import { CommonActions } from '@react-navigation/native';

// Bottom-tab navigators keep each tab's nested stack mounted and preserve
// its state by default — without this, leaving a tab pushed deep into its
// own stack (e.g. Home -> Shop, CultureClub -> Subscription) and coming
// back later (via the tab bar, or a navigate() from elsewhere in the app)
// reopens wherever that stack was left, not the tab's root screen.
//
// Wired once as the Tab.Navigator's own `screenListeners`, not per
// Tab.Screen — this is what makes it apply to every tab automatically,
// including any tab added later, with zero per-tab wiring. Resetting on
// blur (not the tab's own focus) also means it resets while backgrounded/
// foregrounded without ever switching tabs. A single-screen stack (no
// push targets) is an automatic no-op, since its index never exceeds 0.
export function resetTabStackOnBlur({ navigation, route }) {
  return {
    blur: () => {
      const tabState = navigation.getState();
      const tabRoute = tabState.routes.find((r) => r.name === route.name);
      if (tabRoute?.state && tabRoute.state.index > 0) {
        navigation.dispatch({
          ...CommonActions.reset({ index: 0, routes: [{ name: tabRoute.state.routes[0].name }] }),
          target: tabRoute.state.key,
        });
      }
    },
  };
}
