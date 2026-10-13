const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase, parseDuration, formatDuration, tempbanDatabase } = require('../../modules/moderationUtils');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('Kullanıcıyı belirli süreliğine yasaklar.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Banlanacak kişi').setRequired(true))
        .addStringOption(opt => opt.setName('sure').setDescription('Süre (örn: 10m, 2h, 1d)').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Ban sebebi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, client) {
        const user       = interaction.options.getUser('kullanici');
        const sureStr    = interaction.options.getString('sure');
        const reason     = interaction.options.getString('sebep');
        const durationMs = parseDuration(sureStr);

        if (!durationMs) return interaction.reply(ui.error('Geçersiz süre formatı. Örnek: `10m`, `2h`, `1d`'));
        if (user.id === interaction.user.id) return interaction.reply(ui.error('Kendini banlayamazsın.'));

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (member && !member.bannable) {
            return interaction.reply(ui.error('Bu kullanıcıyı banlayamam. Rolü benim rolümden yüksek olabilir.'));
        }

        await interaction.deferReply();
        const expiresAt    = Date.now() + durationMs;
        const durationText = formatDuration(durationMs);
        const caseId       = addModCase('TEMPBAN', user.id, interaction.user.id, `${reason} (${durationText})`);

        // Merkezi moderationUtils DB'sini kullan (duplicate DB yok)
        tempbanDatabase.set(user.id, { expiresAt, reason, moderatorId: interaction.user.id });

        const dmSent = await ui.sendDMCard(user, ui.modDMCard('tempban', interaction.guild.name, interaction.user.tag, reason,
            `⏱️ Süre: **${durationText}**\n🕐 Bitiş: ${ui.ts(expiresAt, 'F')} (${ui.ts(expiresAt)})\n🔖 Vaka ID: **#${caseId}**`
        ));

        try {
            await interaction.guild.bans.create(user.id, {
                reason: `[TEMPBAN #${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`,
                deleteMessageSeconds: 86400
            });

            const payload = ui.modCard({
                action: 'tempban', title: 'Geçici Ban', caseId, user,
                moderator: interaction.user, reason, dmSent,
                fields: [
                    { name: '⏱️ Süre', value: durationText },
                    { name: '🕐 Bitiş', value: `${ui.ts(expiresAt, 'F')} (${ui.ts(expiresAt)})` },
                ],
            });
            await ui.respond(interaction, payload);
            await ui.sendLogCard(client, payload);
        } catch (error) {
            tempbanDatabase.delete(user.id);
            await ui.respond(interaction, ui.error(`Geçici banlama işlemi başarısız: \`${error.message}\``));
        }
    },
};
