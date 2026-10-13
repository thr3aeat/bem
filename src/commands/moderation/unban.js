const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase, tempbanDatabase } = require('../../modules/moderationUtils');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Kullanıcının yasağını kaldırır.')
        .addStringOption(opt =>
            opt.setName('kullanici_id').setDescription('Kullanıcı ID').setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('sebep').setDescription('Unban sebebi').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction, client) {
        const userId = interaction.options.getString('kullanici_id').trim();
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        if (!/^\d{17,20}$/.test(userId)) return interaction.reply(ui.error('Geçerli bir kullanıcı ID\'si girin.'));

        const bannedUser = await interaction.guild.bans.fetch(userId).catch(() => null);
        if (!bannedUser) return interaction.reply(ui.warning('Bu kullanıcı banlı değil veya ID geçersiz.'));

        await interaction.deferReply();
        try {
            await interaction.guild.bans.remove(userId, `${reason} | Yetkili: ${interaction.user.tag}`);

            // Merkezi DB'den tempban kaydını sil
            tempbanDatabase.delete(userId);

            const user = bannedUser.user || await client.users.fetch(userId).catch(() => null);
            const dmSent = user
                ? await ui.sendDMCard(user, ui.modDMCard('unban', interaction.guild.name, interaction.user.tag, reason))
                : false;

            const caseId = addModCase('UNBAN', userId, interaction.user.id, reason);
            const payload = ui.modCard({
                action: 'unban', tone: 'success', title: 'Ban Kaldırıldı', caseId,
                user, userLabel: `\`${userId}\``,
                moderator: interaction.user, reason, dmSent,
                fields: [{ name: '📜 Önceki Ban Sebebi', value: bannedUser.reason ? `> ${bannedUser.reason}` : null }],
            });
            await ui.respond(interaction, payload);
            await ui.sendLogCard(client, payload);
        } catch (error) {
            await ui.respond(interaction, ui.error(`Unban işlemi başarısız: \`${error.message}\``));
        }
    },
};
