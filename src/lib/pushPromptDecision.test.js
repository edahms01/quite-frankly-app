import test from 'node:test';
import assert from 'node:assert/strict';
import { PROMPT_DELAY_MS, shouldPromptForPush, shouldRegisterWithoutPrompt } from './pushPromptDecision.js';

// permission (the OS) x asked (our marker): only "never asked by the OS AND never asked by us" shows the prompt.
const CASES = [
  // permission,   asked,  prompt, silentRegister
  ['undetermined', false, true,  false],
  ['undetermined', true,  false, false],   // we asked already (e.g. the app was killed mid-prompt): never twice
  ['granted',      false, false, true ],   // already allowed (or Android before 13): no prompt, register once
  ['granted',      true,  false, false],
  ['denied',       false, false, false],   // an install that already denied is never prompted
  ['denied',       true,  false, false],
];
for (const [permission, asked, prompt, register] of CASES) {
  test(`permission=${permission}, asked=${asked}: prompt=${prompt}, silent register=${register}`, () => {
    assert.equal(shouldPromptForPush({ permission, asked }), prompt);
    assert.equal(shouldRegisterWithoutPrompt({ permission, asked }), register);
  });
}

test('unknown or missing values never prompt', () => {
  for (const permission of [undefined, null, '', 'limited', 'provisional']) assert.equal(shouldPromptForPush({ permission, asked: false }), false);
  assert.equal(shouldPromptForPush({ permission: 'undetermined', asked: undefined }), true);   // the marker only blocks on a literal true
});

test('the prompt waits about 1.5 s after Home first shows', () => { assert.equal(PROMPT_DELAY_MS, 1500); });
