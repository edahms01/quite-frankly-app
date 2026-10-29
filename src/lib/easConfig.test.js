// Guardrail: the production EAS profile must carry the production API address (EAS cloud builds do not see the gitignored .env) and never a draft URL.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const eas = JSON.parse(readFileSync(new URL('../../eas.json', import.meta.url), 'utf8'));
const prod = eas.build.production;

test('eas.json production sets EXPO_PUBLIC_API_BASE_URL to the production site', () => {
  assert.equal(prod.env?.EXPO_PUBLIC_API_BASE_URL, 'https://quite-frankly-app.netlify.app');
});

test('eas.json production never points at a draft deploy or sets dev-only variables', () => {
  const text = JSON.stringify(prod);
  assert.doesNotMatch(text, /stage5[a-z]|--quite-frankly|--askfrankie/);
  assert.equal(prod.env?.EXPO_PUBLIC_ASKFRANKIE_URL, undefined);         // default (production product) is in src/config/askfrankie.js
  assert.equal(prod.env?.EXPO_PUBLIC_FLAGS_OVERRIDE, undefined);
});

test('eas.json production keeps auto-incrementing build numbers (appVersionSource remote)', () => {
  assert.equal(prod.autoIncrement, true);
  assert.equal(eas.cli.appVersionSource, 'remote');
});

// release-qa: the QA-only profile (an installable APK of the production build, never uploaded to Play).
const qa = eas.build['release-qa'];
test('eas.json release-qa extends production and makes an APK without bumping the version code', () => {
  assert.equal(qa.extends, 'production');
  assert.equal(qa.android?.buildType, 'apk');
  assert.equal(qa.autoIncrement, false);
});

test('eas.json release-qa adds nothing of its own: no env override (same JS and URLs as production), no draft URL, no dev-only variables', () => {
  assert.equal(qa.env, undefined);                                  // inherits production.env
  assert.doesNotMatch(JSON.stringify(qa), /stage5[a-z]|--quite-frankly|--askfrankie|FLAGS_OVERRIDE|ASKFRANKIE_URL/);
  assert.deepEqual(Object.keys(qa).sort(), ['android', 'autoIncrement', 'extends']);
});

test('eas.json production is still an AAB for Play (no android block) and still auto-increments', () => {
  assert.equal(prod.android, undefined);
  assert.equal(prod.autoIncrement, true);
});

test('app.json: RECORD_AUDIO, SYSTEM_ALERT_WINDOW and CAMERA are kept out of the Android build, backups are off, background audio stays', () => {
  const app = JSON.parse(readFileSync(new URL('../../app.json', import.meta.url), 'utf8')).expo;
  assert.deepEqual([...app.android.blockedPermissions].sort(), ['android.permission.CAMERA', 'android.permission.SYSTEM_ALERT_WINDOW']);
  assert.equal(app.android.allowBackup, false);
  const audio = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-audio');
  assert.deepEqual(audio[1], { enableBackgroundPlayback: true, recordAudioAndroid: false });
  for (const kept of ['android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK', 'android.permission.MODIFY_AUDIO_SETTINGS']) assert.ok(app.android.permissions.includes(kept), kept);
  assert.ok(!(app.android.blockedPermissions || []).some((p) => /EXTERNAL_STORAGE/.test(p)), 'storage permissions are left alone');
});
