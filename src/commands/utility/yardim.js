const { SlashCommandBuilder } = require('discord.js');
const ui = require('../../modules/commandUi');
const { canUseCommand, isOwner } = require('../../modules/commandAccess');

const CATEGORIES = [
    { id: 'moderation', icon: '🛡️', name: 'Moderasyon' },
    { id: 'admin',      icon: '⚙️', name: 'Yönetim & İstatistik' },
    { id: 'roblox',     icon: '⭐', name: 'Roblox' },
    { id: 'utility',    icon: '🧰', name: 'Genel' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yardim')
        .setDescription('Tüm komutları ve kullanım amaçlarını gösterir.'),
    async execute(interaction, client) {
        const owner = isOwner(interaction.user);
        const commands = [...client.commands.values()];
        const usable = commands.filter(cmd => canUseCommand(interaction, cmd).ok);

        const sections = CATEGORIES.map(cat => {
            const list = commands
                .filter(cmd => (cmd.category || 'utility') === cat.id)
                .sort((a, b) => a.data.name.localeCompare(b.data.name, 'tr'));
            if (!list.length) return null;
            const names = list.map(cmd => (usable.includes(cmd) ? `\`/${cmd.data.name}\`` : `~~\`/${cmd.data.name}\`~~`));
            return { title: `${cat.icon} ${cat.name} · ${list.length}`, text: names.join(' ') };
        });

        await interaction.reply(ui.card({
            tone: 'info',
            icon: '📚',
            title: 'Yardım Menüsü',
            subtitle: 'Mavi aksolotlun yüzgeçleriyle düzenlediği komut listesi 💙',
            thumbnail: client.user.displayAvatarURL({ size: 128 }),
            description: [
                `👤 **Erişim** — ${owner ? '👑 Bot Sahibi (tüm komutlar açık)' : `${usable.length}/${commands.length} komut kullanılabilir`}`,
                '-# Üstü çizili komutlar için yetkin bulunmuyor. Bir komutun detayını görmek için `/` yazıp komut adını seç.',
            ].join('\n'),
            sections,
            ephemeral: true,
        }));
    },
};
