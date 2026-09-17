const test = require('node:test');
const assert = require('node:assert/strict');

const {
    extractImageUrls,
    createImageFingerprints,
    hammingDistance,
    isPerceptualMatch,
} = require('../src/modules/imageDuplicateDetection');
const sharp = require('sharp');

test('extractImageUrls collects image sources from attachments, embeds, and message links', () => {
    const urls = extractImageUrls({
        attachments: new Map([
            ['one', { url: 'https://cdn.discordapp.com/a.png', contentType: 'image/png' }],
            ['two', { url: 'https://cdn.discordapp.com/note.txt', contentType: 'text/plain' }],
        ]),
        embeds: [{ image: { proxyURL: 'https://media.discordapp.net/embed.webp' } }],
        content: 'Buna da bak: https://example.com/proof.jpeg?width=400',
    });

    assert.deepEqual(urls, [
        'https://cdn.discordapp.com/a.png',
        'https://media.discordapp.net/embed.webp',
        'https://example.com/proof.jpeg?width=400',
    ]);
});

test('isPerceptualMatch catches visually near copies while rejecting different images', () => {
    assert.equal(hammingDistance('0000000000000000', '0000000000000011'), 2);
    assert.equal(isPerceptualMatch('0000000000000000', '0000000000000011'), true);
    assert.equal(isPerceptualMatch('0000000000000000', 'ffffffffffffffff'), false);
});

test('createImageFingerprints matches a PNG and JPEG rendering of the same image', async () => {
    const png = await sharp({
        create: { width: 16, height: 16, channels: 3, background: { r: 30, g: 120, b: 240 } },
    }).png().toBuffer();
    const jpeg = await sharp(png).jpeg({ quality: 65 }).toBuffer();

    const pngFingerprints = await createImageFingerprints(png);
    const jpegFingerprints = await createImageFingerprints(jpeg);

    assert.notEqual(pngFingerprints.sha256, jpegFingerprints.sha256);
    assert.equal(isPerceptualMatch(pngFingerprints.perceptualHash, jpegFingerprints.perceptualHash), true);
});
