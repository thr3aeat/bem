const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ui = require('../../modules/commandUi');

const CHUNK_LIMIT = 3500;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tumrollerveidleriveisimleri')
        .setDescription('Sunucudaki tüm rolleri idleri ve isimleriyle listeler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // Sohbeti doldurmasın

        const roles = interaction.guild.roles.cache.sort((a, b) => b.position - a.position);

        const chunks = [];
        let current = '';
        roles.forEach(role => {
            const line = `${role.id === interaction.guild.id ? '🌐' : '🎭'} **${role.name}** — \`${role.id}\`${role.managed ? ' · 🤖' : ''}\n`;
            if (current.length + line.length > CHUNK_LIMIT) {
                chunks.push(current);
                current = '';
            }
            current += line;
        });
        if (current) chunks.push(current);

        for (let i = 0; i < chunks.length; i++) {
            const payload = ui.card({
                tone: 'info',
                icon: '🗂️',
                title: `Sunucu Rolleri${chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : ''}`,
                subtitle: `${roles.size} rol · yüksekten düşüğe`,
                description: chunks[i],
                ephemeral: true,
            });
            if (i === 0) await ui.respond(interaction, payload);
            else await interaction.followUp(payload);
        }
    },
};
