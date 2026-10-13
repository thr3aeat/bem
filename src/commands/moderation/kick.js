const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase } = require('../../modules/moderationUtils');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kullanıcıyı sunucudan atar.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Atılacak kişi').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Atılma sebebi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction, client) {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply(ui.error('Bu kullanıcı sunucuda bulunamadı.'));
        if (user.id === interaction.user.id) return interaction.reply(ui.error('Kendini atamazsın.'));
        if (!member.kickable) return interaction.reply(ui.error('Bu kullanıcıyı atamam. Rolü benim rolümden yüksek olabilir.'));

        await interaction.deferReply();
        const caseId = addModCase('KICK', user.id, interaction.user.id, reason);
        const dmSent = await ui.sendDMCard(user, ui.modDMCard('kick', interaction.guild.name, interaction.user.tag, reason, `Vaka ID: **#${caseId}**`));

        try {
            await member.kick(`[#${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const payload = ui.modCard({
                action: 'kick', title: 'Kullanıcı Atıldı', caseId, user,
                moderator: interaction.user, reason, dmSent,
            });
            await ui.respond(interaction, payload);
            await ui.sendLogCard(client, payload);
        } catch (error) {
            await ui.respond(interaction, ui.error(`Atma işlemi başarısız: \`${error.message}\``));
        }
    },
};
