const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {
    getActiveModerators,
    getNextModerator,
    getState,
    makeQueuePanel,
} = require('../../modules/moderationQueue');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod-anasayfa')
        .setDescription('Moderatör ceza sırası ve ihlal bildirim panelini açar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const activeModerators = await getActiveModerators(interaction.guild);
        const nextModerator = await getNextModerator(interaction.guild);
        await interaction.reply(makeQueuePanel(getState(), activeModerators, interaction.guildId, nextModerator));
    },
};
