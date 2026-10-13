const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const ui = require('../../modules/commandUi');

const KEY_PERMS = ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'ManageMessages', 'BanMembers', 'KickMembers', 'ModerateMembers'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-bilgi')
        .setDescription('Rol hakkında bilgi gösterir.')
        .addRoleOption(opt => opt.setName('rol').setDescription('Bilgi alınacak rol').setRequired(true)),
    async execute(interaction) {
        const rol = interaction.options.getRole('rol');
        await interaction.deferReply();
        await interaction.guild.members.fetch().catch(() => null);
        const memberCount = interaction.guild.members.cache.filter(m => m.roles.cache.has(rol.id)).size;

        const perms = new PermissionsBitField(rol.permissions);
        const keyPerms = KEY_PERMS.filter(p => perms.has(p, false)).map(p => `\`${ui.permissionLabel(p)}\``);

        await ui.respond(interaction, ui.card({
            tone: 'info',
            color: rol.color || undefined,
            icon: '🎭',
            title: rol.name,
            subtitle: `Rol bilgisi · ${interaction.guild.name}`,
            thumbnail: rol.iconURL?.({ size: 128 }) || undefined,
            description: `${rol}`,
            fields: [
                { name: '🆔 ID', value: `\`${rol.id}\`` },
                { name: '🎨 Renk', value: `\`${rol.hexColor}\`` },
                { name: '👥 Üye', value: `**${memberCount}**` },
                { name: '📊 Pozisyon', value: `${rol.position} / ${interaction.guild.roles.cache.size - 1}` },
            ],
            sections: [
                {
                    title: '⚙️ Ayarlar',
                    fields: [
                        { name: '📌 Ayrı gösterilir', value: rol.hoist ? '✅' : '❌' },
                        { name: '🏷️ Bahsedilebilir', value: rol.mentionable ? '✅' : '❌' },
                        { name: '🤖 Entegrasyon rolü', value: rol.managed ? '✅' : '❌' },
                        { name: '📅 Oluşturulma', value: `${ui.ts(rol.createdTimestamp, 'D')} (${ui.ts(rol.createdTimestamp)})` },
                    ],
                },
                { title: '🔑 Önemli İzinler', text: keyPerms.join(' ') || '_Yok_' },
            ],
        }));
    },
};
