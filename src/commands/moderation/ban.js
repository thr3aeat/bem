const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase } = require('../../modules/moderationUtils');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Kullanıcıyı sunucudan yasaklar.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Banlanacak kişi').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Ban sebebi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, client) {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (user.id === interaction.user.id) return interaction.reply(ui.error('Kendini banlayamazsın.'));
        if (member && !member.bannable) {
            return interaction.reply(ui.error('Bu kullanıcıyı banlayamam. Rolü benim rolümden yüksek olabilir.'));
        }

        await interaction.deferReply();
        const caseId = addModCase('BAN', user.id, interaction.user.id, reason);
        const dmSent = await ui.sendDMCard(user, ui.modDMCard('ban', interaction.guild.name, interaction.user.tag, reason, `Vaka ID: **#${caseId}**`));

        try {
            await interaction.guild.bans.create(user.id, {
                reason: `[Vaka #${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`,
                deleteMessageSeconds: 604800 // 7 gün
            });

            const payload = ui.modCard({
                action: 'ban', title: 'Kullanıcı Yasaklandı', caseId, user,
                moderator: interaction.user, reason, dmSent,
                fields: [{ name: '🧹 Mesaj Temizliği', value: 'Son 7 gün' }],
            });
            await ui.respond(interaction, payload);
            await ui.sendLogCard(client, payload);
        } catch (error) {
            await ui.respond(interaction, ui.error(`Banlama işlemi başarısız: \`${error.message}\``));
        }
    },
};
