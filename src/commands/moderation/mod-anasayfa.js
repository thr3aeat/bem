const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {
    getActiveModerators,
    getState,
    makePanelComponents,
    makeQueueEmbed,
} = require('../../modules/moderationQueue');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod-anasayfa')
        .setDescription('Moderatör ceza sırası ve ihlal bildirim panelini açar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const activeModerators = await getActiveModerators(interaction.guild);
        await interaction.reply({
            embeds: [makeQueueEmbed(getState(), activeModerators)],
            components: makePanelComponents(),
            flags: 64,
        });
    },
};
