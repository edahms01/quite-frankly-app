import { createNavigationContainerRef } from '@react-navigation/native';

// MiniPlayer renders outside <NavigationContainer> (it's a persistent
// app-wide overlay, mounted as a sibling in App.js), so it has no access to
// useNavigation()/useRoute(). This ref, passed to <NavigationContainer ref=...>,
// is how it navigates to FullPlayer and reads the current route instead.
export const navigationRef = createNavigationContainerRef();

export function navigateToFullPlayer() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('FullPlayer');
  }
}

// getRootState() returns RootNavigator's own state (its top-level route,
// e.g. "MainTabs"/"AccountStack"/"Onboarding"), not the deepest focused
// leaf screen — exactly what MiniPlayer needs to know whether it should
// show itself, regardless of which tab/stack/screen is active underneath.
export function isOnMainTabs() {
  if (!navigationRef.isReady()) return false;
  const rootState = navigationRef.getRootState();
  const topRoute = rootState?.routes?.[rootState.index];
  return topRoute?.name === 'MainTabs';
}
