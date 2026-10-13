const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const ui = require('../../modules/commandUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('Belirtilen kanala modern bir duyuru kartı gönderir.')
        .addChannelOption(opt => opt.setName('kanal').setDescription('Duyuru kanalı')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
        .addStringOption(opt => opt.setName('baslik').setDescription('Duyuru başlığı').setRequired(true).setMaxLength(200))
        .addStringOption(opt => opt.setName('icerik').setDescription('Duyuru içeriği (\\n ile alt satır)').setRequired(true).setMaxLength(3500))
        .addStringOption(opt => opt.setName('renk').setDescription('Kart rengi (hex, örn: #FF0000)').setRequired(false))
        .addStringOption(opt => opt.setName('gorsel').setDescription('Kartın altına eklenecek görsel URL\'si').setRequired(false))
        .addStringOption(opt => opt.setName('etiket').setDescription('Duyuruyla birlikte etiketlensin mi?').setRequired(false)
            .addChoices(
                { name: 'Etiket yok', value: 'none' },
                { name: '@everyone', value: 'everyone' },
                { name: '@here', value: 'here' },
            ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction, client) {
        const kanal = interaction.options.getChannel('kanal');
        const baslik = interaction.options.getString('baslik');
        const icerik = interaction.options.getString('icerik').replace(/\\n/g, '\n');
        const renkStr = (interaction.options.getString('renk') || '').trim();
        const gorsel = interaction.options.getString('gorsel');
        const etiket = interaction.options.getString('etiket') || 'none';

        if (renkStr && !/^#?[0-9a-f]{6}$/i.test(renkStr)) return interaction.reply(ui.error('Renk `#RRGGBB` biçiminde olmalı. Örn: `#5865F2`'));
        if (gorsel && !/^https?:\/\/\S+$/i.test(gorsel)) return interaction.reply(ui.error('Görsel bağlantısı `http(s)://` ile başlamalı.'));

        const payload = ui.card({
            tone: 'info',
            color: renkStr || undefined,
            icon: '📢',
            title: baslik,
            thumbnail: interaction.guild.iconURL({ size: 128 }) || undefined,
            description: icerik,
            footer: `Duyuru • ${interaction.guild.name}`,
        });

        if (gorsel) {
            const { MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
            payload.components[0].addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(gorsel))
            );
        }

        if (etiket !== 'none') {
            const { TextDisplayBuilder } = require('discord.js');
            payload.components.unshift(new TextDisplayBuilder().setContent(`@${etiket}`));
            payload.allowedMentions = { parse: ['everyone'] };
        }

        try {
            await kanal.send({ ...payload, flags: MessageFlags.IsComponentsV2 });
            await interaction.reply(ui.success('Duyuru Yayında', `Duyuru <#${kanal.id}> kanalına gönderildi.`, { ephemeral: true }));

            await ui.sendLogCard(client, ui.card({
                tone: 'info', icon: '📢', title: 'Duyuru Gönderildi',
                fields: [
                    { name: '👮 Gönderen', value: `${interaction.user} · \`${interaction.user.tag}\`` },
                    { name: '📝 Kanal', value: `<#${kanal.id}>` },
                    { name: '🏷️ Başlık', value: baslik },
                    { name: '🔔 Etiket', value: etiket === 'none' ? 'Yok' : `@${etiket}` },
                ],
            }));
        } catch (error) {
            await interaction.reply(ui.error(`Duyuru gönderilemedi: \`${error.message}\``));
        }
    },
};
