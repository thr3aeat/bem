const { SlashCommandBuilder } = require('discord.js');
const { ekoDailyStats, ekoAbonerDatabase, ekoCooldownSet, EKO_GUILD_ID, EKO_ROL_ID } = require('../../modules/ekoUtils');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eko-istatistik')
        .setDescription('Eko Yıldız abone istatistiklerini gösterir.'),

    async execute(interaction, client) {
        await interaction.deferReply();

        const bugun       = new Date().toISOString().slice(0, 10);
        const gunlukFoto  = ekoDailyStats.get(bugun) || 0;
        const toplamAbone = ekoAbonerDatabase.size();
        const toplamFoto  = Object.values(ekoAbonerDatabase.all()).reduce((t, u) => t + (u.totalPhotos || 0), 0);

        let rolUyeSayisi = 0;
        try {
            const guild = client.guilds.cache.get(EKO_GUILD_ID);
            if (guild) {
                await guild.members.fetch();
                rolUyeSayisi = guild.members.cache.filter(m => m.roles.cache.has(EKO_ROL_ID)).size;
            }
        } catch {}

        // Son 7 günün fotoğraf sayıları
        const gunler = [...Array(7)].map((_, i) => {
            const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10);
            return { label: d.slice(5), value: ekoDailyStats.get(d) || 0 };
        });
        const max = Math.max(1, ...gunler.map(g => g.value));
        const grafik = gunler.map(g => `\`${g.label}\` ${'▰'.repeat(Math.round((g.value / max) * 10)).padEnd(10, '▱')} **${g.value}**`).join('\n');

        await ui.respond(interaction, ui.card({
            tone: 'star',
            icon: '⭐',
            title: 'Eko Yıldız İstatistikleri',
            subtitle: `Bugün: ${bugun}`,
            fields: [
                { name: '👥 Abone (rol)', value: `**${rolUyeSayisi}**` },
                { name: '📊 Takip edilen kullanıcı', value: `**${toplamAbone}**` },
                { name: '📸 Toplam fotoğraf', value: `**${toplamFoto}**` },
                { name: '📅 Bugünkü fotoğraf', value: `**${gunlukFoto}**` },
                { name: '🕐 Cooldown\'daki kişi', value: `**${ekoCooldownSet.size}**` },
            ],
            sections: [{ title: '📈 Son 7 Gün', text: grafik }],
            footer: 'Eko Yıldız Otomasyon',
        }));
    },
};
