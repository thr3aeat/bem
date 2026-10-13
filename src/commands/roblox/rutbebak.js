const { SlashCommandBuilder } = require('discord.js');
const { rankList } = require('../../modules/constants');
const { headshot, profile, ladder, resolveMember } = require('../../modules/rankCards');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rutbebak')
        .setDescription('Kullanıcının Roblox rütbesini gösterir.')
        .addStringOption(opt =>
            opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)
        ),

    async execute(interaction) {
        const username = interaction.options.getString('roblox_adi');
        await interaction.deferReply();

        try {
            const { robloxUser, rankData, error } = await resolveMember(username);
            if (error) return ui.respond(interaction, error);

            const rankIndex = rankList.findIndex(r => r.id === rankData.rank);
            const rankObj   = rankList[rankIndex];
            const prevRank  = rankIndex > 0 ? rankList[rankIndex - 1] : null;
            const nextRank  = rankIndex !== -1 && rankIndex < rankList.length - 1 ? rankList[rankIndex + 1] : null;

            await ui.respond(interaction, ui.card({
                tone: 'info',
                icon: '👮',
                title: rankObj ? rankObj.name : rankData.name,
                subtitle: `Rütbe bilgisi · ${robloxUser.name}`,
                thumbnail: headshot(robloxUser.id),
                description: profile(robloxUser),
                fields: [
                    { name: '🔢 Rütbe ID', value: `\`${rankData.rank}\`` },
                    { name: '📊 Kademe', value: ladder(rankData.rank) || 'Bilinmiyor' },
                    { name: '⬆️ Sonraki', value: nextRank ? nextRank.name : '🏆 En yüksek rütbe' },
                    { name: '⬇️ Önceki', value: prevRank ? prevRank.name : '—' },
                    { name: '🆔 Roblox ID', value: `\`${robloxUser.id}\`` },
                ],
            }));
        } catch (error) {
            await ui.respond(interaction, ui.error(`Rütbe bilgisi alınamadı: \`${error.message}\``));
        }
    },
};
