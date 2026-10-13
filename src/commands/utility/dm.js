const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Kullanıcıya DM gönderir.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('DM gönderilecek kişi').setRequired(true))
        .addStringOption(opt => opt.setName('mesaj').setDescription('Mesaj içeriği').setRequired(true).setMaxLength(3500))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        const user = interaction.options.getUser('kullanici');
        const mesaj = interaction.options.getString('mesaj').replace(/\\n/g, '\n');

        if (user.bot) return interaction.reply(ui.error('Botlara DM gönderilemez.'));

        const sent = await ui.sendDMCard(user, ui.card({
            tone: 'info',
            icon: '📩',
            title: 'Yetkili Mesajı',
            subtitle: `${interaction.guild?.name || 'Sunucu'} yetkili ekibinden`,
            description: mesaj,
            fields: [{ name: '👮 Gönderen', value: interaction.user.tag }],
        }));

        await interaction.reply(sent
            ? ui.success('DM Gönderildi', `${user} kullanıcısına mesajın iletildi.`, { ephemeral: true, sections: [{ title: '📝 Mesaj', text: `>>> ${mesaj}` }] })
            : ui.error(`${user} kullanıcısına DM gönderilemedi. DM kutusu kapalı olabilir.`));
    },
};
