const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setRobloxRank } = require('../../modules/robloxApi');
const { rankList } = require('../../modules/constants');
const { rankChangeCard, resolveMember } = require('../../modules/rankCards');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rutbedegistir')
        .setDescription('Kullanıcıya listeden bir rütbe atar.')
        .addStringOption(opt =>
            opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)
        )
        .addIntegerOption(opt =>
            opt.setName('rutbe_id').setDescription('Atanacak rütbeyi listeden seçin').setRequired(true).setAutocomplete(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const filtered = rankList.filter(r => r.name.toLowerCase().includes(focusedValue.toLowerCase()));
        await interaction.respond(filtered.slice(0, 25).map(r => ({ name: r.name, value: r.id })));
    },

    async execute(interaction, client) {
        const username    = interaction.options.getString('roblox_adi');
        const requestedId = interaction.options.getInteger('rutbe_id');
        await interaction.deferReply();

        try {
            const { robloxUser, rankData, error } = await resolveMember(username);
            if (error) return ui.respond(interaction, error);

            const newRank = rankList.find(r => r.id === requestedId);
            if (!newRank) return ui.respond(interaction, ui.error('Geçersiz rütbe seçildi. Listeden bir rütbe seç.'));
            if (newRank.id === rankData.rank) return ui.respond(interaction, ui.warning(`Kullanıcı zaten **${newRank.name}** rütbesinde.`));

            const oldRank = rankList.find(r => r.id === rankData.rank) || { name: rankData.name };
            await setRobloxRank(robloxUser.id, newRank.id);

            const payload = rankChangeCard({ kind: 'degistir', robloxUser, oldRank, newRank, moderator: interaction.user });
            await ui.respond(interaction, payload);
            await ui.sendLogCard(client, payload);
        } catch (error) {
            await ui.respond(interaction, ui.error(`Rütbe değiştirilemedi: \`${error.message}\``));
        }
    },
};
