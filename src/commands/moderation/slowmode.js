const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ui = require('../../modules/commandUi');

function formatSeconds(total) {
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    return [h && `${h} saat`, m && `${m} dakika`, s && `${s} saniye`].filter(Boolean).join(' ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Kanalda yavaş modu ayarlar.')
        .addIntegerOption(opt =>
            opt.setName('saniye').setDescription('Saniye (0 = kapat, en fazla 21600)').setRequired(true).setMinValue(0).setMaxValue(21600)
        )
        .addChannelOption(opt =>
            opt.setName('kanal').setDescription('Kanal (boş = mevcut kanal)').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const saniye = interaction.options.getInteger('saniye');
        const kanal  = interaction.options.getChannel('kanal') || interaction.channel;

        if (saniye < 0 || saniye > 21600) return interaction.reply(ui.error('Yavaş mod süresi 0-21600 saniye arasında olmalıdır.'));
        if (typeof kanal.setRateLimitPerUser !== 'function') return interaction.reply(ui.error('Bu kanal türünde yavaş mod ayarlanamaz.'));

        try {
            await kanal.setRateLimitPerUser(saniye, `Slowmode ayarlandı | Yetkili: ${interaction.user.tag}`);
            await interaction.reply(saniye === 0
                ? ui.success('Yavaş Mod Kapatıldı', `<#${kanal.id}> kanalında artık bekleme süresi yok.`, { icon: '🐇' })
                : ui.success('Yavaş Mod Ayarlandı', `<#${kanal.id}> kanalında üyeler her **${formatSeconds(saniye)}** bir mesaj atabilir.`, {
                    icon: '🐢',
                    fields: [{ name: '👮 Yetkili', value: `${interaction.user}` }],
                }));
        } catch (error) {
            await interaction.reply(ui.error(`Yavaş mod ayarlanamadı: \`${error.message}\``));
        }
    },
};
