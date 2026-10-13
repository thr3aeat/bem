// ============================================================
//  KOMUT ARAYÜZÜ — Components V2 kart oluşturucu
//  Tüm slash komutlarının ortak, modern görünümü buradan gelir.
// ============================================================

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require('discord.js');

const BRAND = 'Sentura 🦸 ekoyildiz';

const TONES = {
    success: { color: 0x2ECC71, icon: '✅' },
    error:   { color: 0xED4245, icon: '❌' },
    warning: { color: 0xFEE75C, icon: '⚠️' },
    info:    { color: 0x5865F2, icon: 'ℹ️' },
    neutral: { color: 0x2B2D31, icon: '📌' },
    danger:  { color: 0xC0392B, icon: '🔨' },
    mod:     { color: 0xE67E22, icon: '🛡️' },
    star:    { color: 0xF1C40F, icon: '⭐' },
};

const now = () => Math.floor(Date.now() / 1000);
const ts = (ms, style = 'R') => `<t:${Math.floor(ms / 1000)}:${style}>`;

function toColor(value, fallback) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && /^#?[0-9a-f]{6}$/i.test(value)) return parseInt(value.replace('#', ''), 16);
    return fallback;
}

function clamp(text, max = 3900) {
    const str = String(text ?? '');
    return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

/** `[{ name, value }]` → "**name** — value" satırları. `null` değerler atlanır. */
function fieldLines(fields = []) {
    return fields
        .filter(field => field && field.value !== undefined && field.value !== null && field.value !== '')
        .map(field => `${field.name ? `**${field.name}** — ` : ''}${field.value}`)
        .join('\n');
}

function divider(container, visible = true, large = false) {
    container.addSeparatorComponents(
        new SeparatorBuilder()
            .setDivider(visible)
            .setSpacing(large ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small)
    );
}

function addText(container, content) {
    if (content) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(clamp(content)));
}

function buildButton(btn) {
    if (btn instanceof ButtonBuilder) return btn;
    const b = new ButtonBuilder()
        .setLabel(btn.label)
        .setStyle(btn.url ? ButtonStyle.Link : (btn.style ?? ButtonStyle.Secondary))
        .setDisabled(Boolean(btn.disabled));
    if (btn.url) b.setURL(btn.url); else b.setCustomId(btn.customId || btn.custom_id);
    if (btn.emoji) b.setEmoji(btn.emoji);
    return b;
}

/**
 * Modern V2 kart.
 * @param {object} opts
 * @param {keyof TONES} [opts.tone]
 * @param {string} opts.title             Başlık (ikon otomatik eklenir, `icon: null` ile kapatılabilir)
 * @param {string} [opts.icon]
 * @param {string} [opts.subtitle]        Başlığın altındaki kısa açıklama
 * @param {string} [opts.description]     Ana metin
 * @param {Array<{name,value}>} [opts.fields]
 * @param {Array<{title, fields?, text?}>} [opts.sections]  Ayraçlarla bölünmüş ek bloklar
 * @param {string} [opts.thumbnail]       Başlık bölümünün sağındaki küçük görsel
 * @param {Array} [opts.buttons]          Buton tanımları (en fazla 5'li satırlara bölünür)
 * @param {string|false} [opts.footer]    Alt bilgi (false = gizle)
 * @param {number|string} [opts.color]
 * @param {boolean} [opts.ephemeral]
 */
function card(opts = {}) {
    const tone = TONES[opts.tone] || TONES.info;
    const icon = opts.icon === null ? '' : `${opts.icon || tone.icon} `;
    const container = new ContainerBuilder().setAccentColor(toColor(opts.color, tone.color));

    const header = [`## ${icon}${opts.title || 'Bilgi'}`, opts.subtitle ? `-# ${opts.subtitle}` : null]
        .filter(Boolean).join('\n');

    if (opts.thumbnail) {
        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(clamp(
                    [header, opts.description].filter(Boolean).join('\n')
                )))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(opts.thumbnail))
        );
    } else {
        addText(container, header);
        if (opts.description) addText(container, opts.description);
    }

    const lines = fieldLines(opts.fields);
    if (lines) {
        divider(container);
        addText(container, lines);
    }

    for (const section of opts.sections || []) {
        if (!section) continue;
        const body = [section.title ? `### ${section.title}` : null, section.text, fieldLines(section.fields)]
            .filter(Boolean).join('\n');
        if (!body) continue;
        divider(container);
        addText(container, body);
    }

    if (opts.footer !== false) {
        divider(container, false);
        addText(container, `-# ${opts.footer || BRAND} • <t:${now()}:R>`);
    }

    const buttons = (opts.buttons || []).filter(Boolean).map(buildButton);
    for (let i = 0; i < buttons.length; i += 5) {
        container.addActionRowComponents(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    let flags = MessageFlags.IsComponentsV2;
    if (opts.ephemeral) flags |= MessageFlags.Ephemeral;

    return {
        components: [container],
        flags,
        allowedMentions: opts.allowedMentions ?? { parse: [] },
    };
}

const success = (title, description, extra = {}) => card({ tone: 'success', title, description, ...extra });
const error   = (description, extra = {}) => card({ tone: 'error', title: extra.title || 'İşlem Başarısız', description, ephemeral: true, ...extra });
const warning = (description, extra = {}) => card({ tone: 'warning', title: extra.title || 'Dikkat', description, ephemeral: true, ...extra });
const info    = (title, description, extra = {}) => card({ tone: 'info', title, description, ...extra });

/** Düzenleme (editReply / update / edit) için: ephemeral bayrağı değiştirilemez, sadece V2 bayrağı kalır. */
function forEdit(payload) {
    const { flags, ...rest } = payload;
    return { ...rest, flags: MessageFlags.IsComponentsV2 };
}

/** Etkileşimin durumuna göre reply / editReply / followUp seçer. */
async function respond(interaction, payload) {
    if (interaction.deferred && !interaction.replied) return interaction.editReply(forEdit(payload));
    if (interaction.replied) return interaction.followUp(payload);
    return interaction.reply(payload);
}

/** Moderasyon/denetim kanalına V2 kartı gönderir. */
async function sendLogCard(client, payload) {
    const { config } = require('./constants');
    if (!config.LOG_CHANNEL_ID) return;
    try {
        const channel = await client.channels.fetch(config.LOG_CHANNEL_ID);
        if (channel) await channel.send(forEdit(payload));
    } catch { }
}

/** Kullanıcıya V2 DM kartı gönderir; başarı durumunu döndürür. */
async function sendDMCard(user, payload) {
    try {
        await user.send(forEdit(payload));
        return true;
    } catch {
        return false;
    }
}

// ============================================================
//  MODERASYON KARTLARI
// ============================================================

/** Moderasyon işlemi sonuç kartı (kanal yanıtı + log). */
function modCard({ action, title, caseId, user, userLabel, moderator, reason, fields = [], dmSent, tone = 'mod' }) {
    const { colorMap, iconMap } = require('./constants');
    const target = user
        ? `${user.toString()} · \`${user.tag || user.username}\`\n-# ID: ${user.id}`
        : userLabel;
    return card({
        tone,
        color: colorMap[action],
        icon: iconMap[action],
        title: caseId ? `${title} · Vaka #${caseId}` : title,
        thumbnail: user?.displayAvatarURL?.({ size: 128 }),
        description: target,
        fields: [
            { name: '👮 Yetkili', value: moderator ? `${moderator.toString()} · \`${moderator.tag}\`` : null },
            { name: '📋 Sebep', value: reason ? `> ${reason}` : null },
            ...fields,
            dmSent === undefined ? null : { name: '📩 DM', value: dmSent ? '✅ Gönderildi' : '⚠️ Gönderilemedi (DM kapalı)' },
        ],
    });
}

/** Cezalandırılan kullanıcıya gönderilen DM kartı. */
function modDMCard(action, guildName, moderatorTag, reason, extra = '') {
    const { colorMap, iconMap, titleMap } = require('./constants');
    return card({
        color: colorMap[action],
        icon: iconMap[action],
        title: titleMap[action] || 'Moderasyon Bildirimi',
        fields: [
            { name: '🏠 Sunucu', value: guildName },
            { name: '👮 Yetkili', value: moderatorTag },
            { name: '📋 Sebep', value: `> ${reason || 'Belirtilmedi'}` },
        ],
        sections: extra ? [{ title: '📌 Ek Bilgi', text: extra }] : [],
        footer: `${BRAND} | İtiraz için yetkililere başvurun`,
    });
}

const PERMISSION_NAMES = {
    Administrator: 'Yönetici',
    ManageGuild: 'Sunucuyu Yönet',
    ManageRoles: 'Rolleri Yönet',
    ManageChannels: 'Kanalları Yönet',
    ManageMessages: 'Mesajları Yönet',
    ManageNicknames: 'Kullanıcı Adlarını Yönet',
    ModerateMembers: 'Üyelere Zaman Aşımı Uygula',
    BanMembers: 'Üyeleri Yasakla',
    KickMembers: 'Üyeleri At',
};

const permissionLabel = perm => PERMISSION_NAMES[perm] || perm;

module.exports = {
    BRAND,
    TONES,
    card,
    success,
    error,
    warning,
    info,
    respond,
    forEdit,
    sendLogCard,
    sendDMCard,
    modCard,
    modDMCard,
    fieldLines,
    permissionLabel,
    ts,
    ButtonStyle,
};
