const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Kanalı mesaj gönderimine kapatır.')
        .addChannelOption(opt =>
            opt.setName('kanal').setDescription('Kilitlenecek kanal (boş = mevcut)').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;
        if (!kanal.permissionOverwrites) return interaction.reply(ui.error('Bu kanal türünün izinleri düzenlenemez.'));

        try {
            await kanal.permissionOverwrites.edit(
                interaction.guild.roles.everyone,
                { SendMessages: false },
                { reason: `Kanal kilitlendi | Yetkili: ${interaction.user.tag}` }
            );
            await interaction.reply(ui.card({
                tone: 'mod',
                icon: '🔒',
                title: 'Kanal Kilitlendi',
                description: `<#${kanal.id}> kanalına artık **@everyone** mesaj gönderemez.`,
                fields: [{ name: '👮 Yetkili', value: `${interaction.user}` }],
            }));
        } catch (error) {
            await interaction.reply(ui.error(`Kanal kilitlenemedi: \`${error.message}\``));
        }
    },
};
