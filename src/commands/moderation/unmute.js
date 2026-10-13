const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase, tempmuteDatabase } = require('../../modules/moderationUtils');
const { config } = require('../../modules/constants');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Kullanıcının susturmasını kaldırır.')
        .addUserOption(opt =>
            opt.setName('kullanici').setDescription('Susturma kaldırılacak kişi').setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('sebep').setDescription('Unmute sebebi').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, client) {
        const user   = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply(ui.error('Bu kullanıcı sunucuda bulunamadı.'));

        const muteRole = interaction.guild.roles.cache.get(config.MUTE_ROLE_ID);
        if (!muteRole) return interaction.reply(ui.error('Susturulmuş rolü bulunamadı. `MUTE_ROLE_ID` ayarını kontrol edin.'));
        if (!member.roles.cache.has(muteRole.id)) return interaction.reply(ui.warning('Bu kullanıcı zaten susturulmuş değil.'));

        await interaction.deferReply();
        // Merkezi DB'den tempmute kaydını sil
        tempmuteDatabase.delete(user.id);
        const caseId = addModCase('UNMUTE', user.id, interaction.user.id, reason);
        const dmSent = await ui.sendDMCard(user, ui.modDMCard('unmute', interaction.guild.name, interaction.user.tag, reason, `Vaka ID: **#${caseId}**`));

        try {
            await member.roles.remove(muteRole, `[#${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const payload = ui.modCard({
                action: 'unmute', tone: 'success', title: 'Susturma Kaldırıldı', caseId, user,
                moderator: interaction.user, reason, dmSent,
            });
            await ui.respond(interaction, payload);
            await ui.sendLogCard(client, payload);
        } catch (error) {
            await ui.respond(interaction, ui.error(`Unmute işlemi başarısız: \`${error.message}\``));
        }
    },
};
