const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { EKO_GUILD_ID, EKO_KANAL_ID, EKO_ROL_ID, ekoFotografVarMi } = require('../../modules/ekoUtils');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eko-toplu-rol')
        .setDescription('Kanalda fotoğraf paylaşmış herkese Eko Yıldız rolü verir (toplu).')
        .addIntegerOption(opt =>
            opt.setName('limit')
                .setDescription('Kaç mesaj taransın? (max 100, varsayılan 100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const guild = interaction.client.guilds.cache.get(EKO_GUILD_ID);
        if (!guild) return ui.respond(interaction, ui.error('Eko sunucusu bulunamadı. Bot sunucuda mı?'));

        const rol = guild.roles.cache.get(EKO_ROL_ID);
        if (!rol) return ui.respond(interaction, ui.error('Eko Yıldız rolü bulunamadı.'));

        const kanal = guild.channels.cache.get(EKO_KANAL_ID);
        if (!kanal) return ui.respond(interaction, ui.error('Eko kanalı bulunamadı.'));

        const limit = interaction.options.getInteger('limit') ?? 100;

        let mesajlar;
        try {
            mesajlar = await kanal.messages.fetch({ limit });
        } catch {
            return ui.respond(interaction, ui.error('Kanal mesajları alınamadı.'));
        }

        const fotografPaylasanlar = new Set();
        mesajlar.forEach(m => {
            if (!m.author.bot && ekoFotografVarMi(m)) {
                fotografPaylasanlar.add(m.author.id);
            }
        });

        if (fotografPaylasanlar.size === 0) {
            return ui.respond(interaction, ui.info('Kimse Bulunamadı', `Son **${limit}** mesajda fotoğraf paylaşan kullanıcı yok.`, { icon: '🔍' }));
        }

        await guild.members.fetch();
        let verildi = 0, atildi = 0, hata = 0;

        for (const userId of fotografPaylasanlar) {
            const m = guild.members.cache.get(userId);
            if (!m) { hata++; continue; }

            if (!m.roles.cache.has(EKO_ROL_ID)) {
                try {
                    await m.roles.add(rol, `Toplu rol verme işlemi | Yetkili: ${interaction.user.tag}`);
                    verildi++;
                } catch {
                    hata++;
                }
            } else {
                atildi++;
            }
            await new Promise(r => setTimeout(r, 100)); // Rate limit koruması
        }

        await ui.respond(interaction, ui.card({
            tone: hata > 0 ? 'warning' : verildi > 0 ? 'success' : 'neutral',
            icon: '📊',
            title: 'Toplu Rol İşlemi Tamamlandı',
            description: `<#${EKO_KANAL_ID}> kanalındaki son **${limit}** mesaj tarandı.`,
            fields: [
                { name: '✅ Rol verildi', value: `${verildi} kişi` },
                { name: '⏩ Zaten vardı', value: `${atildi} kişi` },
                { name: '❌ Hata / sunucuda değil', value: `${hata} kişi` },
                { name: '👮 İşlemi yapan', value: `${interaction.user}` },
            ],
            footer: 'Eko Yıldız Otomasyon',
        }));
    },
};
