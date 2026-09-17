const test = require('node:test');
const assert = require('node:assert/strict');
const { createVerificationCode, verifyCode } = require('../src/modules/subscriptionPortalAuth');

test('verification code is accepted once before expiry', () => {
    const record = createVerificationCode('123', 1000, () => '482913');
    assert.equal(verifyCode(record, '482913', 1001).ok, true);
    record.usedAt = 1001;
    assert.equal(verifyCode(record, '482913', 1002).ok, false);
});

test('verification code is rejected after expiry', () => {
    const record = createVerificationCode('123', 1000, () => '482913');
    assert.equal(verifyCode(record, '482913', 1000 + 11 * 60 * 1000).reason, 'expired');
});
