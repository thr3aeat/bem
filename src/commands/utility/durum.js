const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { status } = require('../../api');
const { panel } = require('../../modules/v2Ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('durum')
        .setDescription('Tüm sistemlerin anlık durumunu gösterir.'),
    async execute(interaction, client) {
        await interaction.reply({ ...panel({
            title: '📡 Sistem Durum Paneli',
            details: `🎮 Roblox Oyun — ${status.isGameOpen ? '✅ AÇIK' : '❌ KAPALI'}\n🛒 Rütbe Market — ${status.isMarketOpen ? '✅ AÇIK' : '❌ KAPALI'}\n⚖️ Adalet Sarayı — ${status.isAdaletSarayOpen ? '✅ AÇIK' : '❌ KAPALI'}\n🤖 Bot — 🟢 Çevrimiçi\n📡 API Gecikme — ${client.ws.ping}ms\n⏱️ Uptime — <t:${Math.floor((Date.now() - process.uptime() * 1000) / 1000)}:R>`
        }), flags: MessageFlags.IsComponentsV2 });
    },
};
