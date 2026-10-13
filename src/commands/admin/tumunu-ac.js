const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setAll } = require('../../modules/systemToggle');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tumunu-ac')
        .setDescription('Oyun, Market ve Adalet Sarayını aynı anda açar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        const payload = setAll(true, interaction.user);
        await interaction.reply(payload);
        await ui.sendLogCard(client, payload);
    },
};
