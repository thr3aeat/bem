const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldRequireBotReply, cevapHavuzu } = require('../src/modules/selamlamaUtils');

test('common greeting pools contain expanded response choices', () => {
    assert.ok(cevapHavuzu.selam.length >= 40);
    assert.ok(cevapHavuzu.nasılsın.length >= 40);
    assert.ok(cevapHavuzu['ne yapıyorsun'].length >= 40);
    assert.ok(cevapHavuzu.iyiyim.length >= 40);
});

test('plain "iyi" does not require replying to the bot', () => {
    assert.equal(shouldRequireBotReply('iyiyim', 'iyi'), false);
});

test('other health replies still require replying to the bot', () => {
    assert.equal(shouldRequireBotReply('iyiyim', 'iyiyim'), true);
});
