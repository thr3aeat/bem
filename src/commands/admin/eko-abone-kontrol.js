const { SlashCommandBuilder } = require('discord.js');
const { ekoAbonerDatabase, EKO_GUILD_ID, EKO_ROL_ID } = require('../../modules/ekoUtils');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eko-abone-kontrol')
        .setDescription('Bir kullanıcının abone durumunu kontrol eder.')
        .addUserOption(opt =>
            opt.setName('kullanici').setDescription('Kontrol edilecek kişi').setRequired(true)
        ),

    // Veriler her zaman Eko sunucusundan okunur; komut her sunucudan çalışır.
    async execute(interaction, client) {
        const hedef = interaction.options.getUser('kullanici');
        const veri  = ekoAbonerDatabase.get(hedef.id);
        const guild = client.guilds.cache.get(EKO_GUILD_ID);

        let abone = false;
        let uye = false;
        if (guild) {
            const m = await guild.members.fetch(hedef.id).catch(() => null);
            uye = Boolean(m);
            if (m) abone = m.roles.cache.has(EKO_ROL_ID);
        }

        const sonTarih = veri?.lastPhotoAt ? new Date(veri.lastPhotoAt).getTime() : null;

        await interaction.reply(ui.card({
            tone: abone ? 'star' : 'neutral',
            icon: '⭐',
            title: 'YouTube Abone Kontrolü',
            subtitle: hedef.tag,
            thumbnail: hedef.displayAvatarURL({ size: 256 }),
            description: abone
                ? `${hedef} **Eko Yıldız abonesi** ✨`
                : `${hedef} henüz abone rolüne sahip değil.`,
            fields: [
                { name: '🆔 ID', value: `\`${hedef.id}\`` },
                { name: '🏠 Sunucuda', value: uye ? '✅ Evet' : '❌ Hayır' },
                { name: '🎭 Abone Rolü', value: abone ? `✅ <@&${EKO_ROL_ID}>` : '❌ Yok' },
                { name: '📸 Paylaşılan Fotoğraf', value: `**${veri?.totalPhotos || 0}** adet` },
                { name: '📅 Son Paylaşım', value: sonTarih ? `${ui.ts(sonTarih, 'f')} (${ui.ts(sonTarih)})` : '_Bilinmiyor_' },
            ],
            footer: 'Eko Yıldız Abone Kontrol Sistemi',
            ephemeral: true,
        }));
    },
};
