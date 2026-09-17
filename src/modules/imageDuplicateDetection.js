const crypto = require('crypto');
const sharp = require('sharp');

const IMAGE_URL_PATTERN = /https?:\/\/\S+?\.(?:jpg|jpeg|png|gif|webp|bmp|svg|avif|heic|heif)(?:\?[^\s]*)?/gi;
const PERCEPTUAL_DISTANCE_LIMIT = 8;

function isImageUrl(url = '') {
    return /\.(?:jpg|jpeg|png|gif|webp|bmp|svg|avif|heic|heif)(?:\?[^\s]*)?$/i.test(url);
}

function extractImageUrls(message) {
    const urls = new Set();
    const add = url => {
        if (typeof url === 'string' && url.startsWith('http')) urls.add(url);
    };

    for (const attachment of message.attachments?.values?.() || []) {
        if (attachment.contentType?.startsWith('image/') || isImageUrl(attachment.url)) add(attachment.url);
    }

    for (const embed of message.embeds || []) {
        add(embed.image?.proxyURL || embed.image?.url);
        add(embed.thumbnail?.proxyURL || embed.thumbnail?.url);
    }

    for (const url of message.content?.match(IMAGE_URL_PATTERN) || []) add(url);
    return [...urls];
}

async function createImageFingerprints(buffer) {
    const pixels = await sharp(buffer, { animated: false })
        .resize(16, 16, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer();
    const average = pixels.reduce((sum, pixel) => sum + pixel, 0) / pixels.length;

    return {
        sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
        perceptualHash: [...pixels].map(pixel => pixel >= average ? '1' : '0').join(''),
    };
}

function hammingDistance(first, second) {
    if (typeof first !== 'string' || typeof second !== 'string' || first.length !== second.length) return Infinity;
    return [...first].reduce((distance, bit, index) => distance + (bit === second[index] ? 0 : 1), 0);
}

function isPerceptualMatch(first, second, maxDistance = PERCEPTUAL_DISTANCE_LIMIT) {
    return hammingDistance(first, second) <= maxDistance;
}

function findDuplicate(records, fingerprints) {
    const exact = records[fingerprints.sha256];
    if (exact) return { type: 'exact', record: exact };

    for (const record of Object.values(records)) {
        if (record?.perceptualHash && isPerceptualMatch(record.perceptualHash, fingerprints.perceptualHash)) {
            return { type: 'similar', record };
        }
    }
    return null;
}

module.exports = {
    extractImageUrls,
    createImageFingerprints,
    findDuplicate,
    hammingDistance,
    isPerceptualMatch,
};
