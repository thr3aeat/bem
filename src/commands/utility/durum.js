const { SlashCommandBuilder } = require('discord.js');
const { overview } = require('../../modules/systemToggle');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('durum')
        .setDescription('Tüm sistemlerin anlık durumunu gösterir.'),
    async execute(interaction, client) {
        const ping = client.ws.ping;
        await interaction.reply(ui.card({
            tone: 'info',
            icon: '📡',
            title: 'Sistem Durum Paneli',
            subtitle: 'Anlık oyun, market ve bot durumu',
            fields: overview(),
            sections: [{
                title: '🤖 Bot',
                fields: [
                    { name: '🟢 Durum', value: 'Çevrimiçi' },
                    { name: '📶 Gecikme', value: `\`${ping}ms\` ${ping < 100 ? '🟢' : ping < 200 ? '🟡' : '🔴'}` },
                    { name: '⏱️ Açılış', value: ui.ts(Date.now() - process.uptime() * 1000) },
                ],
            }],
        }));
    },
};
