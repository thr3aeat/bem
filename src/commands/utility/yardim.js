const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { panel } = require('../../modules/v2Ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yardim')
        .setDescription('Tüm komutları ve kullanım amaçlarını gösterir.'),
    async execute(interaction, client) {
        await interaction.reply({ ...panel({ title: '📚 Yardım Menüsü', body: 'Mavi aksolotlun yüzgeçleriyle düzenlediği komut listesi. 💙', details: '🛡️ Moderasyon\n`/ban`, `/tempban`, `/kick`, `/mute`, `/warn`, `/clear`, `/lock`, `/unlock`\n\n🎮 Yönetim\n`/oyun-yonet`, `/market-yonet`, `/adaletsarayi-yonet`, `/sistem-kontrol`\n\n⭐ Roblox\n`/terfi`, `/tenzil`, `/rutbebak`, `/rutbelist`\n\n📊 Genel\n`/anket`, `/ping`, `/avatar`, `/bot`, `/sunucu`, `/kullanici`, `/duyuru`, `/nick`\n\n📈 İstatistik\n`/eko-istatistik`, `/mod-istatistik`, `/hg-istatistik`, `/selamlama-istatistik`' }), flags: MessageFlags.IsComponentsV2 });
    },
};
