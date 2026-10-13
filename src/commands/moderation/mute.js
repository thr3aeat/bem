const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase } = require('../../modules/moderationUtils');
const { config } = require('../../modules/constants');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Kullanıcıyı süresiz susturur.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Susturulacak kişi').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Susturma sebebi').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply(ui.error('Bu kullanıcı sunucuda bulunamadı.'));

        const muteRole = interaction.guild.roles.cache.get(config.MUTE_ROLE_ID);
        if (!muteRole) return interaction.reply(ui.error('Susturulmuş rolü bulunamadı. `MUTE_ROLE_ID` ayarını kontrol edin.'));
        if (member.roles.cache.has(muteRole.id)) return interaction.reply(ui.warning('Bu kullanıcı zaten susturulmuş.'));

        await interaction.deferReply();
        const caseId = addModCase('MUTE', user.id, interaction.user.id, reason);
        const dmSent = await ui.sendDMCard(user, ui.modDMCard('mute', interaction.guild.name, interaction.user.tag, reason, `Vaka ID: **#${caseId}**`));

        try {
            await member.roles.add(muteRole, `[Vaka #${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const payload = ui.modCard({
                action: 'mute', title: 'Kullanıcı Susturuldu', caseId, user,
                moderator: interaction.user, reason, dmSent,
                fields: [{ name: '⏱️ Süre', value: 'Süresiz' }],
            });
            await ui.respond(interaction, payload);
            await ui.sendLogCard(client, payload);
        } catch (error) {
            await ui.respond(interaction, ui.error(`Susturma işlemi başarısız: \`${error.message}\``));
        }
    },
};
