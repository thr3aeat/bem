const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldRequireBotReply } = require('../src/modules/selamlamaUtils');

test('plain "iyi" does not require replying to the bot', () => {
    assert.equal(shouldRequireBotReply('iyiyim', 'iyi'), false);
});

test('other health replies still require replying to the bot', () => {
    assert.equal(shouldRequireBotReply('iyiyim', 'iyiyim'), true);
});
