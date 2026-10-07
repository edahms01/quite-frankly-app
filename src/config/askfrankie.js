import appJson from '../../app.json';

// Where the AskFrankie chat lives (the product site, repo AskFrankieBranded) and how the WebView identifies itself. "?app=1" and the QFApp/ user agent both
// switch the page into app layout. A local/dev build can point at a draft deploy with EXPO_PUBLIC_ASKFRANKIE_URL (same pattern as EXPO_PUBLIC_API_BASE_URL).
export const ASKFRANKIE_URL = process.env.EXPO_PUBLIC_ASKFRANKIE_URL || 'https://askfrankie.netlify.app/?app=1';
// scheme + host (+ port) of the chat page: the ONLY origin whose messages we accept and the only one allowed to load inside the WebView.
export const ASKFRANKIE_ORIGIN = ASKFRANKIE_URL.replace(/^(https?:\/\/[^/?#]+).*$/i, '$1');
export const APP_UA_NAME = `QFApp/${appJson.expo.version}`;
// the key in AsyncStorage the sign-in flow writes (src/screens/onboarding/CodeEntry.js / Email.js)
export const SESSION_TOKEN_KEY = 'onboarding_session_token';
export const EMAIL_KEY = 'onboarding_email';
