const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-al')
        .setDescription('Kullanıcıdan rol alır.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Rol alınacak kişi').setRequired(true))
        .addRoleOption(opt => opt.setName('rol').setDescription('Alınacak rol').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
        const user = interaction.options.getUser('kullanici');
        const rol = interaction.options.getRole('rol');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply(ui.error('Bu kullanıcı sunucuda bulunamadı.'));
        if (rol.managed || rol.id === interaction.guild.id) return interaction.reply(ui.error('Bu rol bot/entegrasyon rolü olduğu için elle yönetilemez.'));
        if (!rol.editable) return interaction.reply(ui.error(`<@&${rol.id}> rolü benim en yüksek rolümden yukarıda; yönetemem.`));
        if (!member.roles.cache.has(rol.id)) return interaction.reply(ui.warning(`${user} zaten <@&${rol.id}> rolüne sahip değil.`));

        try {
            await member.roles.remove(rol, `Rol alındı | Yetkili: ${interaction.user.tag}`);
            const dmSent = await ui.sendDMCard(user, ui.modDMCard('note', interaction.guild.name, interaction.user.tag, `**${rol.name}** rolü alındı.`));
            await interaction.reply(ui.card({
                tone: 'mod',
                color: rol.color || undefined,
                icon: '➖',
                title: 'Rol Alındı',
                thumbnail: user.displayAvatarURL({ size: 128 }),
                description: `${user} kullanıcısından <@&${rol.id}> rolü alındı.`,
                fields: [
                    { name: '👮 Yetkili', value: `${interaction.user}` },
                    { name: '📩 DM', value: dmSent ? '✅ Bilgilendirildi' : '⚠️ Gönderilemedi' },
                ],
            }));
        } catch (error) {
            await interaction.reply(ui.error(`Rol alınamadı: \`${error.message}\``));
        }
    },
};
