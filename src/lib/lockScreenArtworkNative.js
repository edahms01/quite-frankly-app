// Native glue for lockScreenArtwork.js (imports react-native / expo-asset, so it is not covered by node --test; the logic is in lockScreenArtwork.js).
// The artwork is the app icon, referenced by path, so a later icon swap needs no code change.
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { requireNativeModule } from 'expo';
import { resolveArtworkUri } from './lockScreenArtwork';

export function loadLockScreenArtwork() {
  try {
    const asset = Asset.fromModule(require('../../assets/icon.png'));
    return resolveArtworkUri({
      asset: { uri: asset.uri, hash: asset.hash, type: asset.type },
      platform: Platform.OS,
      copyToCache: (uri, hash, type) => requireNativeModule('ExpoAsset').downloadAsync(uri, hash, type),
    });
  } catch {
    return Promise.resolve(null);
  }
}
