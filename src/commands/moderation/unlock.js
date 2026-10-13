const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Kanalı tekrar mesaj gönderimine açar.')
        .addChannelOption(opt =>
            opt.setName('kanal').setDescription('Açılacak kanal (boş = mevcut)').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;
        if (!kanal.permissionOverwrites) return interaction.reply(ui.error('Bu kanal türünün izinleri düzenlenemez.'));

        try {
            await kanal.permissionOverwrites.edit(
                interaction.guild.roles.everyone,
                { SendMessages: null },
                { reason: `Kanal kilidi açıldı | Yetkili: ${interaction.user.tag}` }
            );
            await interaction.reply(ui.card({
                tone: 'success',
                icon: '🔓',
                title: 'Kanal Kilidi Açıldı',
                description: `<#${kanal.id}> kanalı tekrar mesaj gönderimine açıldı.`,
                fields: [{ name: '👮 Yetkili', value: `${interaction.user}` }],
            }));
        } catch (error) {
            await interaction.reply(ui.error(`Kanal kilidi açılamadı: \`${error.message}\``));
        }
    },
};
