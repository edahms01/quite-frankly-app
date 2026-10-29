import test from 'node:test';
import assert from 'node:assert/strict';
import { PROMPT_DELAY_MS, shouldPromptForPush, shouldRegisterWithoutPrompt } from './pushPromptDecision.js';

// permission (the OS) x canAskAgain (the OS) x asked (our marker). The prompt shows only while the OS has not refused AND we have not asked.
const CASES = [
  // permission,   canAskAgain, asked,  prompt, silentRegister
  ['undetermined', true,  false, true,  false],   // iOS, never asked
  ['undetermined', true,  true,  false, false],   // we asked already (e.g. killed mid-prompt): never twice
  ['denied',       true,  false, true,  false],   // Android 13+ BEFORE the first request: reports denied + canAskAgain
  ['denied',       true,  true,  false, false],   // Android after our one ask was refused once
  ['denied',       false, false, false, false],   // iOS denial / Android second refusal: never prompted
  ['denied',       false, true,  false, false],
  ['denied',       undefined, false, false, false],   // unknown = do not prompt
  ['granted',      true,  false, false, true ],   // already allowed (or Android before 13): no prompt, register once
  ['granted',      false, false, false, true ],
  ['granted',      true,  true,  false, false],
];
for (const [permission, canAskAgain, asked, prompt, register] of CASES) {
  test(`permission=${permission}, canAskAgain=${canAskAgain}, asked=${asked}: prompt=${prompt}, silent register=${register}`, () => {
    assert.equal(shouldPromptForPush({ permission, canAskAgain, asked }), prompt);
    assert.equal(shouldRegisterWithoutPrompt({ permission, asked }), register);
  });
}

test('unknown or missing values never prompt; the marker only blocks on a literal true', () => {
  for (const permission of [undefined, null, '', 'limited', 'provisional']) assert.equal(shouldPromptForPush({ permission, canAskAgain: true, asked: false }), false);
  assert.equal(shouldPromptForPush({ permission: 'undetermined', asked: undefined }), true);
});

test('the prompt waits about 1.5 s after Home first shows', () => { assert.equal(PROMPT_DELAY_MS, 1500); });
