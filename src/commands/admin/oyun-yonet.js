const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setSystem } = require('../../modules/systemToggle');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oyun-yonet')
        .setDescription('Roblox oyun girişlerini açar veya kapatır.')
        .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction, client) {
        const payload = setSystem('game', interaction.options.getBoolean('durum'), interaction.user);
        await interaction.reply(payload);
        await ui.sendLogCard(client, payload);
    },
};
