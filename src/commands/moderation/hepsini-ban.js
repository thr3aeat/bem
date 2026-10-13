const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase } = require('../../modules/moderationUtils');
const ui = require('../../modules/commandUi');

function progressBar(done, total, size = 14) {
    const filled = Math.round((done / total) * size);
    return `\`${'█'.repeat(filled)}${'░'.repeat(size - filled)}\` ${done}/${total}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hepsini-ban')
        .setDescription('Birden fazla kullanıcıyı aynı anda banlar.')
        .addStringOption(opt => opt.setName('id_listesi').setDescription('ID\'leri virgül veya boşlukla ayırarak girin').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Ban sebebi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        const idListStr = interaction.options.getString('id_listesi');
        const reason = interaction.options.getString('sebep');

        const idList = [...new Set(idListStr.split(/[\s,]+/).map(id => id.trim()).filter(id => /^\d{17,20}$/.test(id)))]
            .filter(id => id !== interaction.user.id);

        if (idList.length === 0) return interaction.reply(ui.error('Geçerli kullanıcı ID\'si bulunamadı. ID\'leri virgülle ayırın.'));
        if (idList.length > 50) return interaction.reply(ui.error('Tek seferde en fazla **50** kullanıcı banlanabilir.'));

        await interaction.deferReply();
        let success = 0, fail = 0, alreadyBanned = 0;
        const failed = [];

        for (const [index, userId] of idList.entries()) {
            try {
                const alreadyBannedCheck = await interaction.guild.bans.fetch(userId).catch(() => null);
                if (alreadyBannedCheck) { alreadyBanned++; continue; }

                const user = await client.users.fetch(userId).catch(() => null);
                if (user) await ui.sendDMCard(user, ui.modDMCard('ban', interaction.guild.name, interaction.user.tag, reason));

                await interaction.guild.bans.create(userId, {
                    reason: `[TOPLU BAN] ${reason} | Yetkili: ${interaction.user.tag}`,
                    deleteMessageSeconds: 86400
                });
                addModCase('BAN', userId, interaction.user.id, `[TOPLU BAN] ${reason}`);
                success++;
            } catch {
                fail++;
                failed.push(userId);
            }

            // Uzun listelerde ilerlemeyi göster
            if (idList.length > 5 && (index + 1) % 5 === 0 && index + 1 < idList.length) {
                await ui.respond(interaction, ui.card({
                    tone: 'mod', icon: '⏳', title: 'Toplu Ban Sürüyor…',
                    description: progressBar(index + 1, idList.length),
                })).catch(() => {});
            }
            await new Promise(r => setTimeout(r, 200));
        }

        const payload = ui.card({
            tone: fail ? 'warning' : 'danger',
            icon: '🔨',
            title: 'Toplu Ban Tamamlandı',
            description: progressBar(idList.length, idList.length),
            fields: [
                { name: '👮 Yetkili', value: `${interaction.user} · \`${interaction.user.tag}\`` },
                { name: '📋 Sebep', value: `> ${reason}` },
            ],
            sections: [
                {
                    title: '📊 Sonuç',
                    fields: [
                        { name: '✅ Başarılı', value: `${success}` },
                        { name: '⚠️ Zaten Banlı', value: `${alreadyBanned}` },
                        { name: '❌ Başarısız', value: `${fail}` },
                        { name: '🔢 Toplam', value: `${idList.length}` },
                    ],
                },
                failed.length ? { title: '❌ Banlanamayanlar', text: failed.map(id => `\`${id}\``).join(' ') } : null,
            ],
        });
        await ui.respond(interaction, payload);
        await ui.sendLogCard(client, payload);
    },
};
