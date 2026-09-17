const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { status } = require('../../api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('durum')
        .setDescription('Tüm sistemlerin anlık durumunu gösterir.'),
    async execute(interaction, client) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📡 Sistem Durum Paneli')
            .addFields(
                { name: '🎮 Roblox Oyun', value: status.isGameOpen ? '✅ AÇIK' : '❌ KAPALI', inline: true },
                { name: '🛒 Rütbe Market', value: status.isMarketOpen ? '✅ AÇIK' : '❌ KAPALI', inline: true },
                { name: '⚖️ Adalet Sarayı', value: status.isAdaletSarayOpen ? '✅ AÇIK' : '❌ KAPALI', inline: true },
                { name: '🤖 Bot Durumu', value: '🟢 Çevrimiçi', inline: true },
                { name: '📡 API Gecikme', value: `${client.ws.ping}ms`, inline: true },
                { name: '⏱️ Uptime', value: `<t:${Math.floor((Date.now() - process.uptime() * 1000) / 1000)}:R>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Mavi aksolotl kontrol panelini kuru tutuyor. 💙' });

        await interaction.reply({ embeds: [embed] });
    },
};
