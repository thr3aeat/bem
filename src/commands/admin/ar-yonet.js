const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const autoResponder = require('../../modules/autoResponder');
const ui = require('../../modules/commandUi');

const PAGE_LIMIT = 3500;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ar-yonet')
        .setDescription('Otomatik cevaplayıcı sistemini yönetir.')
        .addSubcommand(sub =>
            sub.setName('ekle')
                .setDescription('Yeni bir tetikleyici ekler.')
                .addStringOption(opt => opt.setName('tetikleyici').setDescription('Mesaj içinde geçecek kelime').setRequired(true).setMaxLength(100))
                .addStringOption(opt => opt.setName('cevap').setDescription('Botun vereceği cevap').setRequired(true).setMaxLength(1500))
        )
        .addSubcommand(sub =>
            sub.setName('sil')
                .setDescription('Bir tetikleyiciyi siler.')
                .addStringOption(opt => opt.setName('tetikleyici').setDescription('Silinecek kelime').setRequired(true).setAutocomplete(true))
        )
        .addSubcommand(sub =>
            sub.setName('liste')
                .setDescription('Tüm tetikleyicileri listeler.')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const choices = Object.keys(autoResponder.getAll())
            .filter(key => key.includes(focused))
            .slice(0, 25)
            .map(key => ({ name: key.slice(0, 100), value: key.slice(0, 100) }));
        await interaction.respond(choices);
    },

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'ekle') {
            const trigger = interaction.options.getString('tetikleyici').trim();
            const response = interaction.options.getString('cevap');
            const existed = Object.prototype.hasOwnProperty.call(autoResponder.getAll(), trigger.toLowerCase());
            autoResponder.add(trigger, response);
            return interaction.reply(ui.success(existed ? 'Otomatik Cevap Güncellendi' : 'Otomatik Cevap Eklendi', null, {
                icon: '🤖',
                ephemeral: true,
                fields: [
                    { name: '🔑 Tetikleyici', value: `\`${trigger.toLowerCase()}\`` },
                    { name: '💬 Cevap', value: `> ${response}` },
                ],
            }));
        }

        if (sub === 'sil') {
            const trigger = interaction.options.getString('tetikleyici').trim().toLowerCase();
            if (!Object.prototype.hasOwnProperty.call(autoResponder.getAll(), trigger)) {
                return interaction.reply(ui.warning(`\`${trigger}\` adında bir tetikleyici bulunamadı.`));
            }
            autoResponder.remove(trigger);
            return interaction.reply(ui.success('Otomatik Cevap Silindi', `\`${trigger}\` tetikleyicisi kaldırıldı.`, { icon: '🗑️', ephemeral: true }));
        }

        if (sub === 'liste') {
            const entries = Object.entries(autoResponder.getAll());
            let text = entries.map(([k, v]) => `🔑 **${k}**\n-# ↳ ${String(v).replace(/\n/g, ' ').slice(0, 120)}`).join('\n');
            if (text.length > PAGE_LIMIT) text = `${text.slice(0, PAGE_LIMIT)}\n…`;
            return interaction.reply(ui.card({
                tone: 'info',
                icon: '📚',
                title: 'Otomatik Cevap Listesi',
                subtitle: `${entries.length} tetikleyici kayıtlı`,
                description: text || '_Henüz otomatik cevap eklenmemiş. `/ar-yonet ekle` ile başlayabilirsin._',
                ephemeral: true,
            }));
        }
    },
};
