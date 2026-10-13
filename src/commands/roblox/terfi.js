const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setRobloxRank } = require('../../modules/robloxApi');
const { rankList } = require('../../modules/constants');
const { rankChangeCard, resolveMember } = require('../../modules/rankCards');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('terfi')
        .setDescription('Kullanıcıyı bir üst rütbeye terfi ettirir.')
        .addStringOption(opt =>
            opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction, client) {
        const username = interaction.options.getString('roblox_adi');
        await interaction.deferReply();

        try {
            const { robloxUser, rankData, error } = await resolveMember(username);
            if (error) return ui.respond(interaction, error);

            const currentIndex = rankList.findIndex(r => r.id === rankData.rank);
            if (currentIndex === -1 || currentIndex >= rankList.length - 1)
                return ui.respond(interaction, ui.warning('Kullanıcı daha fazla terfi ettirilemez — en üst rütbede. 🏆'));

            const newRank = rankList[currentIndex + 1];
            const oldRank = rankList[currentIndex] || { name: rankData.name };

            await setRobloxRank(robloxUser.id, newRank.id);

            const payload = rankChangeCard({ kind: 'terfi', robloxUser, oldRank, newRank, moderator: interaction.user });
            await ui.respond(interaction, payload);
            await ui.sendLogCard(client, payload);
        } catch (error) {
            await ui.respond(interaction, ui.error(`Terfi işlemi başarısız: \`${error.message}\``));
        }
    },
};
