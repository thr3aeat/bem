const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toplu-dm')
        .setDescription('Belirli role sahip kişilere toplu DM gönderir.')
        .addRoleOption(opt => opt.setName('rol').setDescription('Hedef rol').setRequired(true))
        .addStringOption(opt => opt.setName('mesaj').setDescription('Mesaj içeriği').setRequired(true).setMaxLength(3500))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const rol = interaction.options.getRole('rol');
        const mesaj = interaction.options.getString('mesaj').replace(/\\n/g, '\n');

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.guild.members.fetch();

        const members = interaction.guild.members.cache.filter(m =>
            m.roles.cache.has(rol.id) && !m.user.bot
        );

        if (members.size === 0) {
            return ui.respond(interaction, ui.warning(`<@&${rol.id}> rolüne sahip kullanıcı bulunamadı.`));
        }

        const dmPayload = ui.card({
            tone: 'info',
            icon: '📢',
            title: 'Toplu Duyuru',
            subtitle: `${interaction.guild.name} yetkili ekibinden`,
            description: mesaj,
            fields: [{ name: '👮 Gönderen', value: interaction.user.tag }],
        });

        let success = 0, fail = 0, done = 0;
        for (const [, member] of members) {
            if (await ui.sendDMCard(member.user, dmPayload)) success++; else fail++;
            done++;
            if (done % 10 === 0 && done < members.size) {
                const filled = Math.round((done / members.size) * 14);
                await ui.respond(interaction, ui.card({
                    tone: 'info', icon: '⏳', title: 'Toplu DM Gönderiliyor…',
                    description: `\`${'█'.repeat(filled)}${'░'.repeat(14 - filled)}\` ${done}/${members.size}`,
                })).catch(() => {});
            }
            // Rate limit için küçük bekleme
            await new Promise(r => setTimeout(r, 100));
        }

        await ui.respond(interaction, ui.card({
            tone: fail ? 'warning' : 'success',
            icon: '📊',
            title: 'Toplu DM Tamamlandı',
            description: `<@&${rol.id}> rolündeki üyelere mesaj gönderildi.`,
            fields: [
                { name: '✅ Başarılı', value: `${success}` },
                { name: '❌ Başarısız', value: fail ? `${fail} (DM kapalı)` : '0' },
                { name: '🔢 Toplam', value: `${members.size}` },
            ],
        }));
    },
};
