// Lock-screen / media-notification artwork for expo-audio. Its native side takes `artworkUrl` as a java.net.URL / Foundation URL, so only http(s)
// and file URLs work. In a dev client `Image.resolveAssetSource(require(...))` is an http:// Metro URL, but in a release build on Android it is a
// bare drawable resource name ("assets_icon"), which crashed the app on the first episode tap (MalformedURLException: no protocol).
// Fix: ask expo-asset's native `ExpoAsset.downloadAsync` to copy the bundled resource into the cache dir and hand back a file:// URL.
// Pure (the native copy is injected) so node --test can cover it. It never throws: no usable URI = null = play without artwork.

/** true for the URL schemes the native players can open. */
export function isArtworkUri(uri) {
  return typeof uri === 'string' && /^(https?|file):\/\/\S+$/i.test(uri);
}

/**
 * asset: { uri, hash, type } of the bundled image. copyToCache(uri, hash, type) -> Promise<string> (Android only).
 * Returns a usable URI string or null.
 */
export async function resolveArtworkUri({ asset, platform, copyToCache }) {
  try {
    if (!asset) return null;
    // http(s) (dev client) or an iOS bundle file:// URL: usable as is
    if (isArtworkUri(asset.uri) && !String(asset.uri).startsWith('file:///android_res/')) return asset.uri;
    // Android release: a bare resource name (or file:///android_res/...) the native URL class cannot open: copy it to the cache first
    if (platform === 'android' && typeof copyToCache === 'function' && asset.uri) {
      const local = String(await copyToCache(asset.uri, asset.hash ?? null, asset.type ?? 'png'));
      return isArtworkUri(local) ? local : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** The metadata object for setActiveForLockScreen: artworkUrl only when it is a URL the native side can open. */
export function lockScreenMetadata({ title, artist = 'Quite Frankly', artworkUri }) {
  return { title, artist, ...(isArtworkUri(artworkUri) ? { artworkUrl: artworkUri } : {}) };
}
