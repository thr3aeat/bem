const crypto = require('crypto');

const CODE_TTL_MS = 10 * 60 * 1000;

function createVerificationCode(discordId, now = Date.now(), codeFactory = () => String(crypto.randomInt(100000, 1000000))) {
    return { discordId, code: codeFactory(), createdAt: now, expiresAt: now + CODE_TTL_MS, usedAt: null };
}

function verifyCode(record, submittedCode, now = Date.now()) {
    if (!record || record.usedAt || record.code !== submittedCode) return { ok: false, reason: 'invalid' };
    if (now > record.expiresAt) return { ok: false, reason: 'expired' };
    return { ok: true };
}

module.exports = { createVerificationCode, verifyCode, CODE_TTL_MS };
