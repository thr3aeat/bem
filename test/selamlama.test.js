const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldRequireBotReply, cevapHavuzu } = require('../src/modules/selamlamaUtils');

test('common greeting pools contain expanded response choices', () => {
    for (const [tip, havuz] of Object.entries(cevapHavuzu)) {
        assert.ok(havuz.length >= 40, `${tip} havuzu genişletilmemiş`);
    }
});

test('all health replies require replying to the bot', () => {
    assert.equal(shouldRequireBotReply('iyiyim', 'iyi'), true);
    assert.equal(shouldRequireBotReply('iyiyim', 'iyiyim'), true);
    assert.equal(shouldRequireBotReply('iyiyim', 'süperim'), true);
});

test('other health replies still require replying to the bot', () => {
    assert.equal(shouldRequireBotReply('iyiyim', 'iyiyim'), true);
});
