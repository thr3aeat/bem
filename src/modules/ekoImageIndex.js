const JsonDatabase = require('./jsonDatabase');
const { EKO_GUILD_ID, EKO_KANAL_ID } = require('./constants');
const { extractImageUrls, createImageFingerprints } = require('./imageDuplicateDetection');

// Render diski kalıcı değil: her deploy/restart'ta data/ klasörü sıfırlanır ve
// daha önce kabul edilmiş görseller tekrar "yeni" sayılırdı. Kanal geçmişi
// kalıcı olduğu için parmak izi indeksi açılışta oradan yeniden kurulur.
const HISTORY_SCAN_LIMIT = 2000;

const ekoImageHashesDb = new JsonDatabase('ekoImageHashes.json');
let indexPromise = null;

async function fingerprintUrl(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return createImageFingerprints(Buffer.from(await response.arrayBuffer()));
}

async function fetchChannelImageMessages(channel) {
    const messages = [];
    let before;
    let scanned = 0;
    while (scanned < HISTORY_SCAN_LIMIT) {
        const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
        if (!batch.size) break;
        scanned += batch.size;
        for (const msg of batch.values()) {
            if (!msg.author?.bot) messages.push(msg);
        }
        before = batch.last().id;
        if (batch.size < 100) break;
    }
    // En eski mesaj önce: aynı görselin ilk yükleyeni kayıtta kalır.
    return messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

async function rebuildFromHistory(client) {
    const guild = client.guilds.cache.get(EKO_GUILD_ID);
    const channel = guild && await guild.channels.fetch(EKO_KANAL_ID).catch(() => null);
    if (!channel?.messages) return;

    const messages = await fetchChannelImageMessages(channel);
    let added = 0;
    for (const msg of messages) {
        for (const url of extractImageUrls(msg)) {
            try {
                const fingerprints = await fingerprintUrl(url);
                if (ekoImageHashesDb.has(fingerprints.sha256)) continue;
                ekoImageHashesDb.set(fingerprints.sha256, {
                    userId: msg.author.id, messageId: msg.id, timestamp: msg.createdTimestamp,
                    perceptualHash: fingerprints.perceptualHash,
                });
                added++;
            } catch (err) {
                console.warn(`[EKO] Geçmiş görsel parmak izi alınamadı (${msg.id}):`, err.message);
            }
        }
    }
    await ekoImageHashesDb._flush();
    console.log(`[⭐ EKO] Görsel indeksi kanal geçmişinden kuruldu: ${messages.length} mesaj, ${added} yeni kayıt.`);
}

// İndeks hazır olana kadar bekler; tarama başarısız olsa bile mevcut kayıtlarla devam edilir.
function ensureEkoImageIndex(client) {
    if (!indexPromise) {
        indexPromise = rebuildFromHistory(client).catch(err => {
            console.error('[EKO] Görsel indeksi kanal geçmişinden kurulamadı:', err.message);
        });
    }
    return indexPromise;
}

module.exports = {
    ekoImageHashesDb,
    ensureEkoImageIndex,
    fingerprintUrl,
};
