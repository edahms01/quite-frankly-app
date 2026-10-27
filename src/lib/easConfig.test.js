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
