const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setAll } = require('../../modules/systemToggle');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tumunu-kapat')
        .setDescription('Tüm sistemleri aynı anda kapatır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        const payload = setAll(false, interaction.user);
        await interaction.reply(payload);
        await ui.sendLogCard(client, payload);
    },
};
