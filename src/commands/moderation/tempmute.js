const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase, parseDuration, formatDuration, tempmuteDatabase } = require('../../modules/moderationUtils');
const { config } = require('../../modules/constants');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempmute')
        .setDescription('Kullanıcıyı belirli süreliğine susturur.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Susturulacak kişi').setRequired(true))
        .addStringOption(opt => opt.setName('sure').setDescription('Süre (örn: 10m, 2h, 1d)').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Susturma sebebi').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        const user       = interaction.options.getUser('kullanici');
        const sureStr    = interaction.options.getString('sure');
        const reason     = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        const durationMs = parseDuration(sureStr);

        if (!durationMs) return interaction.reply(ui.error('Geçersiz süre formatı. Örnek: `10m`, `2h`, `1d`'));

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply(ui.error('Bu kullanıcı sunucuda bulunamadı.'));

        const muteRole = interaction.guild.roles.cache.get(config.MUTE_ROLE_ID);
        if (!muteRole) return interaction.reply(ui.error('Susturulmuş rolü bulunamadı. `MUTE_ROLE_ID` ayarını kontrol edin.'));

        await interaction.deferReply();
        const expiresAt    = Date.now() + durationMs;
        const durationText = formatDuration(durationMs);
        const caseId       = addModCase('TEMPMUTE', user.id, interaction.user.id, `${reason} (${durationText})`);

        // Merkezi moderationUtils DB'sini kullan
        tempmuteDatabase.set(user.id, { expiresAt, reason, moderatorId: interaction.user.id });

        const dmSent = await ui.sendDMCard(user, ui.modDMCard('tempmute', interaction.guild.name, interaction.user.tag, reason,
            `⏱️ Süre: **${durationText}**\n🕐 Bitiş: ${ui.ts(expiresAt, 'F')} (${ui.ts(expiresAt)})\n🔖 Vaka ID: **#${caseId}**`
        ));

        try {
            await member.roles.add(muteRole, `[TEMPMUTE #${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const payload = ui.modCard({
                action: 'tempmute', title: 'Geçici Susturma', caseId, user,
                moderator: interaction.user, reason, dmSent,
                fields: [
                    { name: '⏱️ Süre', value: durationText },
                    { name: '🕐 Bitiş', value: `${ui.ts(expiresAt, 'F')} (${ui.ts(expiresAt)})` },
                ],
            });
            await ui.respond(interaction, payload);
            await ui.sendLogCard(client, payload);
        } catch (error) {
            tempmuteDatabase.delete(user.id);
            await ui.respond(interaction, ui.error(`Geçici susturma başarısız: \`${error.message}\``));
        }
    },
};
