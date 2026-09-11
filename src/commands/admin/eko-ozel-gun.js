const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const {
    OZEL_GUNLER,
    getAktifOzelGun,
    setTestOzelGun,
    getTestOzelGunId,
    getTumOzelGunler,
    getOzelGunSelamMesaji
} = require('../../modules/ozelGunler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eko-ozel-gun')
        .setDescription('Özel gün ve bayram temasını yönetir, test eder veya durumu görüntüler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('durum')
                .setDescription('Şu an aktif olan özel gün ve bayram temasını gösterir.')
        )
        .addSubcommand(sub =>
            sub.setName('test')
                .setDescription('İstediğiniz özel gün temasını anında test modunda etkinleştirir.')
                .addStringOption(opt =>
                    opt.setName('bayram')
                        .setDescription('Test etmek istediğiniz bayram / özel gün')
                        .setRequired(true)
                        .addChoices(
                            { name: '🇹🇷 30 Ağustos Zafer Bayramı (32 Özel Selamlama)', value: 'zafer_bayrami' },
                            { name: '🇹🇷 29 Ekim Cumhuriyet Bayramı', value: 'cumhuriyet_bayrami' },
                            { name: '🎈 23 Nisan Ulusal Egemenlik ve Çocuk Bayramı', value: 'cocuk_bayrami' },
                            { name: '⚡ 19 Mayıs Gençlik ve Spor Bayramı', value: 'genclik_bayrami' },
                            { name: '🎄 Yılbaşı / Yeni Yıl', value: 'yeni_yil' },
                            { name: '💖 14 Şubat Sevgililer Günü', value: 'sevgililer_gunu' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('sifirla')
                .setDescription('Test modunu kapatır ve botun gerçek takvim tarihine dönmesini sağlar.')
        )
        .addSubcommand(sub =>
            sub.setName('ornek-selam')
                .setDescription('Aktif olan özel güne ait rastgele bir samimi selamlama üretir.')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'durum') {
            const aktifGun = getAktifOzelGun();
            const testId = getTestOzelGunId();

            let statusText = '';
            if (aktifGun) {
                statusText = `🎉 **Aktif Özel Gün:** ${aktifGun.emoji} **${aktifGun.name}**\n` +
                             `🎨 **Tema Rengi:** \`${aktifGun.accentHex}\`\n` +
                             `🧪 **Mod:** ${testId ? `⚠️ **Test / Simülasyon Modu Açık** (ID: \`${testId}\`)` : '📅 **Otomatik Takvim Modu**'}\n` +
                             `💬 **Selamlama Mesaj Havuzu:** **${aktifGun.selamlar ? aktifGun.selamlar.length : 0} Adet**`;
            } else {
                statusText = `📅 **Bugün özel bir gün takviminde yer almıyor.** (Varsayılan tema aktif)\n` +
                             `💡 Test etmek isterseniz \`/eko-ozel-gun test bayram: 30 Ağustos Zafer Bayramı\` komutunu kullanabilirsiniz.`;
            }

            const container = new ContainerBuilder()
                .setAccentColor(aktifGun ? aktifGun.accentColor : 0x5865F2)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## 🎊 Özel Günler ve Bayramlar Durum Paneli`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(statusText)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Sentura Özel Günler Sistemi • <t:${Math.floor(Date.now() / 1000)}:R>`)
                );

            return await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (subcommand === 'test') {
            const bayramKey = interaction.options.getString('bayram');
            const secilenGun = setTestOzelGun(bayramKey);

            if (!secilenGun) {
                return await interaction.reply({ content: '❌ Belirtilen özel gün bulunamadı.', ephemeral: true });
            }

            const container = new ContainerBuilder()
                .setAccentColor(secilenGun.accentColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## 🧪 Test Modu Etkinleştirildi: ${secilenGun.emoji} ${secilenGun.name}`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `✅ **${secilenGun.name}** teması bot genelinde test için zorunlu kılındı!\n\n` +
                        `✨ **Uygulanan Alanlar:**\n` +
                        `• 💬 **Sohbet Selamlaşmaları:** ${secilenGun.selamlar ? secilenGun.selamlar.length : 0} adet özel samimi mesaj havuzu\n` +
                        `• 🏆 **Abone Kutlama Kartları:** V2 Container ve DM kutlama embed'i bu temaya büründü\n` +
                        `• 👋 **Hoş Geldin Kartları:** Sunucuya yeni gelenler bu bayram coşkusuyla karşılanacak\n\n` +
                        `ℹ️ Testi bitirmek için \`/eko-ozel-gun sifirla\` komutunu kullanabilirsiniz.`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# Sentura Özel Gün Test Modu • <t:${Math.floor(Date.now() / 1000)}:R>`)
                );

            return await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (subcommand === 'sifirla') {
            setTestOzelGun(null);
            const container = new ContainerBuilder()
                .setAccentColor(0x00FF88)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## 🔄 Test Modu Kapatıldı`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `✅ Test modu sıfırlandı. Bot yeniden gerçek takvim tarihine göre otomatik özel gün tespiti yapacaktır.`
                    )
                );

            return await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (subcommand === 'ornek-selam') {
            const aktifGun = getAktifOzelGun();
            const username = interaction.member?.displayName || interaction.user.username;
            const ornekMesaj = getOzelGunSelamMesaji('selam', username);

            if (!ornekMesaj) {
                return await interaction.reply({
                    content: 'ℹ️ Şu an aktif bir özel gün teması yok. Önce `/eko-ozel-gun test bayram: zafer_bayrami` ile bir tema seçebilirsiniz.',
                    ephemeral: true
                });
            }

            return await interaction.reply({
                content: `🇹🇷 **[${aktifGun.name} Selam Örneği]**\n${ornekMesaj}`
            });
        }
    }
};
