const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase, addWarning } = require('../../modules/moderationUtils');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Kullanıcıya uyarı verir.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Uyarılacak kişi').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Uyarı sebebi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply(ui.error('Bu kullanıcı sunucuda bulunamadı.'));
        if (user.bot) return interaction.reply(ui.error('Botlara uyarı verilemez.'));

        await interaction.deferReply();
        const warnCount = addWarning(user.id, reason, interaction.user.id);
        const caseId = addModCase('WARN', user.id, interaction.user.id, reason);

        const dmSent = await ui.sendDMCard(user, ui.modDMCard('warn', interaction.guild.name, interaction.user.tag, reason,
            `Bu sizin **${warnCount}. uyarınız**.\nVaka ID: **#${caseId}**`
        ));

        const level = warnCount >= 5 ? '🔴 Kritik' : warnCount >= 3 ? '🟠 Yüksek' : '🟡 Normal';
        const payload = ui.modCard({
            action: 'warn', tone: 'warning', title: 'Kullanıcı Uyarıldı', caseId, user,
            moderator: interaction.user, reason, dmSent,
            fields: [{ name: '🔢 Toplam Uyarı', value: `**${warnCount}** · ${level}` }],
        });
        await ui.respond(interaction, payload);
        await ui.sendLogCard(client, payload);
    },
};
