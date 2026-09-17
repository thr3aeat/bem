const test = require('node:test');
const assert = require('node:assert/strict');

const { subscriberAllowedMentions, subscriberPayload } = require('../src/modules/subscriberMessaging');

test('subscriberAllowedMentions permits users but disables roles and mass mentions', () => {
    assert.deepEqual(subscriberAllowedMentions(), {
        parse: ['users'],
        roles: [],
        repliedUser: false,
    });
});

test('subscriberPayload preserves user mentions while applying subscriber mention safety', () => {
    const payload = subscriberPayload({ content: '<@123> aboneliğin doğrulandı.' });

    assert.equal(payload.content, '<@123> aboneliğin doğrulandı.');
    assert.deepEqual(payload.allowedMentions, subscriberAllowedMentions());
});
