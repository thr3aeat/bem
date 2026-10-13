const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Belirtilen sayıda mesajı siler.')
        .addIntegerOption(opt =>
            opt.setName('sayi').setDescription('Silinecek mesaj sayısı (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)
        )
        .addUserOption(opt =>
            opt.setName('kullanici').setDescription('Sadece bu kişinin mesajlarını sil').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, client) {
        const sayi       = interaction.options.getInteger('sayi');
        const targetUser = interaction.options.getUser('kullanici');

        if (sayi < 1 || sayi > 100) return interaction.reply(ui.error('Silinecek mesaj sayısı 1-100 arasında olmalıdır.'));

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            let messages = await interaction.channel.messages.fetch({ limit: sayi });
            if (targetUser) messages = messages.filter(m => m.author.id === targetUser.id);

            const deleted = await interaction.channel.bulkDelete(messages, true);
            const skipped = messages.size - deleted.size;

            await ui.respond(interaction, ui.success('Mesajlar Temizlendi', `**${deleted.size}** mesaj <#${interaction.channelId}> kanalından silindi.`, {
                icon: '🧹',
                fields: [
                    { name: '👤 Hedef', value: targetUser ? `${targetUser}` : 'Herkes' },
                    { name: '⏭️ Atlanan', value: skipped > 0 ? `${skipped} mesaj (14 günden eski)` : null },
                ],
            }));

            await ui.sendLogCard(client, ui.card({
                tone: 'mod', icon: '🗑️', title: 'Toplu Mesaj Silme',
                fields: [
                    { name: '👮 Yetkili', value: `${interaction.user} · \`${interaction.user.tag}\`` },
                    { name: '📝 Kanal', value: `<#${interaction.channelId}>` },
                    { name: '🔢 Silinen', value: `${deleted.size}` },
                    { name: '👤 Hedef', value: targetUser ? targetUser.tag : 'Herkes' },
                ],
            }));
        } catch (error) {
            await ui.respond(interaction, ui.error(`Mesajlar silinirken hata oluştu: \`${error.message}\``));
        }
    },
};
