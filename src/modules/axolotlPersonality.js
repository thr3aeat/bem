const AXOLOTL_STATUSES = [
    '🫧 Baloncukları sayıyor',
    '💙 EkoYıldız’ı yüzgeçleriyle yönetiyor',
    '🌊 Sunucuda yüzüyor',
    '👀 Ticketlara uzaktan bakıyor',
    '🐟 Bir komut daha yedi',
    '🦎 Mavi aksolotl görev başında',
    '✨ Modları sessizce izliyor',
    '🫧 Bir baloncuk daha patladı…',
    '💙 Her şey kontrol altında. Sanırım.',
    '🌊 Sunucunun derinliklerinde dolaşıyor',
];

const PRESENCE_INTERVAL_MS = 12 * 60 * 1000;
const activeRotators = new WeakMap();

function createPresenceRotator(client, schedule = callback => setInterval(callback, PRESENCE_INTERVAL_MS)) {
    let timer = null;
    let index = 0;

    const applyCurrentStatus = () => {
        client.user.setActivity(AXOLOTL_STATUSES[index], { type: 4 });
        index = (index + 1) % AXOLOTL_STATUSES.length;
    };

    return {
        start() {
            if (timer) return;
            applyCurrentStatus();
            timer = schedule(applyCurrentStatus);
        },
    };
}

function startPresenceRotation(client, schedule) {
    if (activeRotators.has(client)) return activeRotators.get(client);
    const rotator = createPresenceRotator(client, schedule);
    rotator.start();
    activeRotators.set(client, rotator);
    return rotator;
}

module.exports = { AXOLOTL_STATUSES, createPresenceRotator, startPresenceRotation };
