const { SlashCommandBuilder, ButtonStyle } = require('discord.js');
const { ekoAbonerDatabase, ekoCooldownSet } = require('../../modules/ekoUtils');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eko-sifirla')
        .setDescription('Bir kullanıcının Eko Yıldız abone verilerini sıfırlar.')
        .addUserOption(opt =>
            opt.setName('kullanici').setDescription('Sıfırlanacak kişi').setRequired(true)
        ),

    async execute(interaction, client) {
        const hedef  = interaction.options.getUser('kullanici');
        const onceki = ekoAbonerDatabase.get(hedef.id);

        if (!onceki) return interaction.reply(ui.warning(`${hedef} için Eko Yıldız verisi bulunamadı.`));

        // Geri alınamaz işlem: önce onay iste
        const confirmId = `eko_reset_ok_${interaction.id}`;
        const cancelId  = `eko_reset_no_${interaction.id}`;
        const response = await interaction.reply({
            ...ui.card({
                tone: 'warning',
                icon: '🗑️',
                title: 'Veriyi Sıfırla?',
                description: `${hedef} kullanıcısının **${onceki.totalPhotos || 0}** fotoğraflık Eko Yıldız kaydı silinecek. Bu işlem geri alınamaz.`,
                buttons: [
                    { customId: confirmId, label: 'Evet, sıfırla', emoji: '🗑️', style: ButtonStyle.Danger },
                    { customId: cancelId, label: 'Vazgeç', style: ButtonStyle.Secondary },
                ],
                ephemeral: true,
            }),
            withResponse: true,
        });

        const button = await response.resource.message.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id && [confirmId, cancelId].includes(i.customId),
            time: 30_000,
        }).catch(() => null);

        if (!button || button.customId === cancelId) {
            const payload = ui.card({ tone: 'neutral', icon: '↩️', title: button ? 'İşlem İptal Edildi' : 'Süre Doldu', description: 'Hiçbir veri silinmedi.' });
            return button ? button.update(ui.forEdit(payload)) : interaction.editReply(ui.forEdit(payload)).catch(() => {});
        }

        ekoAbonerDatabase.delete(hedef.id);

        // Cooldown'u da temizle
        for (const key of ekoCooldownSet) {
            if (key.startsWith(hedef.id)) ekoCooldownSet.delete(key);
        }

        const payload = ui.card({
            tone: 'error',
            icon: '🗑️',
            title: 'Eko Yıldız Verisi Sıfırlandı',
            thumbnail: hedef.displayAvatarURL({ size: 128 }),
            fields: [
                { name: '👤 Kullanıcı', value: `${hedef} · \`${hedef.tag}\`` },
                { name: '📸 Önceki Fotoğraf', value: `${onceki.totalPhotos || 0}` },
                { name: '👮 İşlemi Yapan', value: `${interaction.user}` },
            ],
            footer: 'Eko Yıldız Otomasyon',
        });
        await button.update(ui.forEdit(payload));
        await ui.sendLogCard(client, payload);
    },
};
