const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nick')
        .setDescription('Kullanıcının sunucu nickini değiştirir.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Nick değiştirilecek kişi').setRequired(true))
        .addStringOption(opt => opt.setName('yeni_nick').setDescription('Yeni nickname (boş = sıfırla)').setRequired(false).setMaxLength(32))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
    async execute(interaction) {
        const user = interaction.options.getUser('kullanici');
        const yeniNick = interaction.options.getString('yeni_nick') || null;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply(ui.error('Bu kullanıcı sunucuda bulunamadı.'));
        if (!member.manageable) return interaction.reply(ui.error('Bu kullanıcının nickini değiştiremem. Rolü benim rolümden yüksek olabilir.'));

        const eskiNick = member.nickname;
        try {
            await member.setNickname(yeniNick, `Nick değiştirildi | Yetkili: ${interaction.user.tag}`);
            await interaction.reply(ui.success(yeniNick ? 'Nickname Güncellendi' : 'Nickname Sıfırlandı', `${user} kullanıcısının sunucu adı güncellendi.`, {
                icon: '🏷️',
                thumbnail: member.displayAvatarURL({ size: 128 }),
                fields: [
                    { name: '⬅️ Eski', value: eskiNick ? `\`${eskiNick}\`` : '_Yok_' },
                    { name: '➡️ Yeni', value: yeniNick ? `\`${yeniNick}\`` : '_Sıfırlandı_' },
                    { name: '👮 Yetkili', value: `${interaction.user}` },
                ],
            }));
        } catch (error) {
            await interaction.reply(ui.error(`Nickname değiştirilemedi: \`${error.message}\``));
        }
    },
};
