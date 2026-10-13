// ============================================================
//  ROBLOX RÜTBE KARTLARI (Components V2)
// ============================================================

const { rankList } = require('./constants');
const ui = require('./commandUi');

const headshot = id => `https://www.roblox.com/headshot-thumbnail/image?userId=${id}&width=420&height=420&format=png`;
const profile = user => `[${user.name}](https://www.roblox.com/users/${user.id}/profile)`;

function ladder(rankId) {
    const index = rankList.findIndex(r => r.id === rankId);
    if (index === -1) return null;
    const filled = Math.round(((index + 1) / rankList.length) * 12);
    return `\`${'▰'.repeat(filled)}${'▱'.repeat(12 - filled)}\` ${index + 1}/${rankList.length}`;
}

const KINDS = {
    terfi:     { tone: 'success', icon: '🆙', title: 'Terfi Edildi', arrow: '⬆️' },
    tenzil:    { tone: 'error',   icon: '⬇️', title: 'Rütbe Düşürüldü', arrow: '⬇️' },
    degistir:  { tone: 'info',    icon: '🔄', title: 'Rütbe Değiştirildi', arrow: '➡️' },
};

/** Rütbe değişikliği sonuç kartı. */
function rankChangeCard({ kind, robloxUser, oldRank, newRank, moderator }) {
    const k = KINDS[kind];
    return ui.card({
        tone: k.tone,
        icon: k.icon,
        title: k.title,
        thumbnail: headshot(robloxUser.id),
        description: `${profile(robloxUser)}\n**${oldRank.name}** ${k.arrow} **${newRank.name}**`,
        fields: [
            { name: '🆔 Roblox ID', value: `\`${robloxUser.id}\`` },
            { name: '📊 Kademe', value: ladder(newRank.id) },
            { name: '👮 Yetkili', value: `${moderator} · \`${moderator.tag}\`` },
        ],
    });
}

/** Roblox kullanıcısını bulur ve grup rütbesini getirir; hata durumunda kullanıcıya gösterilecek kartı döndürür. */
async function resolveMember(username) {
    const { getRobloxUser, getUserRankInGroup } = require('./robloxApi');
    const robloxUser = await getRobloxUser(username);
    if (!robloxUser) return { error: ui.error(`**${username}** adında bir Roblox kullanıcısı bulunamadı.`, { title: 'Kullanıcı Bulunamadı', icon: '🔍' }) };
    const rankData = await getUserRankInGroup(robloxUser.id);
    if (rankData.rank === 0) return { error: ui.warning(`${profile(robloxUser)} emniyet grubumuzda bulunmuyor.`, { title: 'Grupta Değil', icon: '🚫' }) };
    return { robloxUser, rankData };
}

module.exports = { headshot, profile, ladder, rankChangeCard, resolveMember };
