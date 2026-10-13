// ============================================================
//  OYUN / MARKET / ADALET SARAYI durum kartları (Components V2)
// ============================================================

const { ButtonStyle } = require('discord.js');
const { status } = require('../api');
const ui = require('./commandUi');

const SYSTEMS = {
    game:   { key: 'isGameOpen',        icon: '🎮', name: 'Roblox Oyun Girişleri' },
    market: { key: 'isMarketOpen',      icon: '🛒', name: 'Rütbe Marketi' },
    adalet: { key: 'isAdaletSarayOpen', icon: '⚖️', name: 'Adalet Sarayı' },
};

const badge = open => (open ? '🟢 **AÇIK**' : '🔴 **KAPALI**');

function overview() {
    return Object.values(SYSTEMS).map(s => ({ name: `${s.icon} ${s.name}`, value: badge(status[s.key]) }));
}

/** Tek bir sistemin durumunu değiştirir ve sonuç kartını döndürür. */
function setSystem(id, open, user) {
    const system = SYSTEMS[id];
    const before = status[system.key];
    status[system.key] = open;

    return ui.card({
        tone: open ? 'success' : 'error',
        icon: system.icon,
        title: `${system.name} ${open ? 'Açıldı' : 'Kapatıldı'}`,
        description: before === open
            ? `Sistem zaten ${open ? 'açıktı' : 'kapalıydı'}; durum korunuyor.`
            : `${badge(before)} ➜ ${badge(open)}`,
        fields: [{ name: '👮 İşlemi Yapan', value: `${user} · \`${user.tag}\`` }],
        sections: [{ title: '📡 Tüm Sistemler', fields: overview() }],
    });
}

/** Tüm sistemleri aynı anda açar/kapatır. */
function setAll(open, user) {
    for (const system of Object.values(SYSTEMS)) status[system.key] = open;
    return ui.card({
        tone: open ? 'success' : 'error',
        icon: open ? '🟢' : '🔴',
        title: open ? 'Tüm Sistemler Açıldı' : 'Tüm Sistemler Kapatıldı',
        description: open
            ? 'Oyun, market ve Adalet Sarayı oyunculara **açık**.'
            : 'Oyun, market ve Adalet Sarayı oyunculara **kapalı**.',
        fields: [...overview(), { name: '👮 İşlemi Yapan', value: `${user} · \`${user.tag}\`` }],
    });
}

module.exports = { SYSTEMS, setSystem, setAll, overview };
