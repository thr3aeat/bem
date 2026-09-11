const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const JsonDatabase = require('./jsonDatabase');
const configManager = require('./configManager');

const db = new JsonDatabase('moderation-queue.json');
const dispatchLocks = new Map();

function getState() {
    return db.get('state') || { lastAssignedId: null, nextId: 1, cases: [] };
}

function saveState(state) {
    db.set('state', state);
}

function isActive(member) {
    return Boolean(member.presence && ['online', 'idle', 'dnd'].includes(member.presence.status));
}

function canUseQueue(interaction) {
    const staffRoleId = configManager.get('ALLOWED_ROLE_ID');
    return interaction.guild && interaction.member?.roles?.cache?.has(staffRoleId);
}

async function getActiveModerators(guild) {
    const staffRoleId = configManager.get('ALLOWED_ROLE_ID');
    const members = await guild.members.fetch().catch(() => guild.members.cache);

    return [...members.values()]
        .filter(member => !member.user.bot && member.roles.cache.has(staffRoleId) && isActive(member))
        .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
}

async function assignNextModerator(guild) {
    const moderators = await getActiveModerators(guild);
    if (!moderators.length) return null;

    const state = getState();
    const previousIndex = moderators.findIndex(member => member.id === state.lastAssignedId);
    const moderator = moderators[(previousIndex + 1 + moderators.length) % moderators.length];
    state.lastAssignedId = moderator.id;
    saveState(state);
    return moderator;
}

async function notifyModerator(moderator, caseItem) {
    const assignmentEmbed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`⚠️ Ceza İncelemesi Atandı — #${caseItem.id}`)
        .setDescription('Sıra sistemine göre bu ihlal incelemesi size atandı.')
        .addFields(
            { name: 'Kullanıcı', value: `<@${caseItem.userId}> (\`${caseItem.userId}\`)`, inline: false },
            { name: 'Sebep', value: caseItem.reason, inline: false },
            { name: 'Bildirimi yapan', value: `<@${caseItem.reporterId}>`, inline: true },
        )
        .setTimestamp();

    return moderator.send({ embeds: [assignmentEmbed] }).catch(() => null);
}

// Çevrim dışıyken oluşan kayıtları ilk aktif yetkili geldiğinde sırayla dağıtır.
async function dispatchWaitingCases(guild) {
    if (dispatchLocks.has(guild.id)) return dispatchLocks.get(guild.id);

    const dispatch = (async () => {
    const state = getState();
    const waitingCases = state.cases.filter(item => item.guildId === guild.id && item.status === 'waiting');

    for (const caseItem of waitingCases) {
        const moderator = await assignNextModerator(guild);
        if (!moderator) break;
        caseItem.moderatorId = moderator.id;
        caseItem.status = 'assigned';
        caseItem.assignedAt = new Date().toISOString();
        await notifyModerator(moderator, caseItem);
    }
    saveState(state);
    })();

    dispatchLocks.set(guild.id, dispatch);
    try {
        await dispatch;
    } finally {
        dispatchLocks.delete(guild.id);
    }
}

function makeQueueEmbed(state, activeModerators) {
    const waiting = state.cases.filter(item => item.status === 'waiting').length;
    const assigned = state.cases.filter(item => item.status === 'assigned').length;
    const next = activeModerators.length
        ? `<@${activeModerators[0].id}> ve sıradaki aktif yetkililer`
        : 'Aktif yetkili yok';

    return new EmbedBuilder()
        .setColor(activeModerators.length ? 0x5865F2 : 0xED4245)
        .setTitle('🛡️ Ceza Personel Sırası')
        .setDescription('Yeni ihlal bildirimleri, çevrim içi/aktif yetkililer arasında dönüşümlü dağıtılır. Sırası gelen kişi çevrim dışıysa otomatik atlanır.')
        .addFields(
            { name: '🟢 Aktif yetkililer', value: activeModerators.map(member => member.toString()).join(', ') || 'Yok', inline: false },
            { name: '📥 Bekleyen kayıt', value: String(waiting), inline: true },
            { name: '📌 Atanmış kayıt', value: String(assigned), inline: true },
            { name: '➡️ Sıradaki havuz', value: next, inline: false },
        )
        .setFooter({ text: 'Aktiflik Discord durumuna göre belirlenir.' })
        .setTimestamp();
}

function makePanelComponents() {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('modq_report').setLabel('Kural İhlali Bildir').setEmoji('⚠️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('modq_status').setLabel('Sırayı Gör').setEmoji('📋').setStyle(ButtonStyle.Secondary),
    )];
}

async function createCase(interaction) {
    const userInput = interaction.fields.getTextInputValue('modq_user').trim();
    const reason = interaction.fields.getTextInputValue('modq_reason').trim();
    const userId = userInput.replace(/[<@!>]/g, '');
    if (!/^\d{17,20}$/.test(userId)) {
        return interaction.reply({
            content: '❌ Kullanıcı için Discord ID’sini veya `@kullanıcı` etiketini girin.',
            flags: 64,
        });
    }
    const state = getState();
    const moderator = await assignNextModerator(interaction.guild);
    const caseItem = {
        id: state.nextId++,
        guildId: interaction.guildId,
        userId,
        reason,
        reporterId: interaction.user.id,
        moderatorId: moderator?.id || null,
        status: moderator ? 'assigned' : 'waiting',
        createdAt: new Date().toISOString(),
    };
    state.cases.push(caseItem);
    saveState(state);

    if (!moderator) {
        return interaction.reply({
            content: `⚠️ İhlal kaydı #${caseItem.id} oluşturuldu; ancak şu anda aktif bir yetkili olmadığı için bekleme sırasına alındı.`,
            flags: 64,
        });
    }

    await notifyModerator(moderator, caseItem);
    return interaction.reply({
        content: `✅ İhlal kaydı #${caseItem.id}, sıra sistemindeki aktif yetkili ${moderator} kişisine atandı.`,
        flags: 64,
    });
}

async function handleModerationQueueInteraction(interaction) {
    if (!canUseQueue(interaction)) {
        return interaction.reply({ content: '❌ Bu ceza personel panelini kullanma yetkiniz yok.', flags: 64 });
    }

    if (interaction.isButton() && ['modanasayfa', 'mod_anasayfa', 'modq_open'].includes(interaction.customId)) {
        const moderators = await getActiveModerators(interaction.guild);
        return interaction.reply({
            embeds: [makeQueueEmbed(getState(), moderators)],
            components: makePanelComponents(),
            flags: 64,
        });
    }

    if (interaction.isButton() && interaction.customId === 'modq_report') {
        const modal = new ModalBuilder().setCustomId('modq_report_submit').setTitle('Kural İhlali Bildir');
        const userField = new TextInputBuilder()
            .setCustomId('modq_user')
            .setLabel('Kullanıcı ID veya kullanıcı etiketi')
            .setPlaceholder('Örn. 123456789012345678 veya @Kullanıcı')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        const reasonField = new TextInputBuilder()
            .setCustomId('modq_reason')
            .setLabel('İhlal / ceza sebebi')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);
        modal.addComponents(new ActionRowBuilder().addComponents(userField), new ActionRowBuilder().addComponents(reasonField));
        return interaction.showModal(modal);
    }

    if (interaction.isButton() && interaction.customId === 'modq_status') {
        const state = getState();
        const moderators = await getActiveModerators(interaction.guild);
        return interaction.reply({ embeds: [makeQueueEmbed(state, moderators)], flags: 64 });
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modq_report_submit') {
        return createCase(interaction);
    }
}

module.exports = {
    dispatchWaitingCases,
    canUseQueue,
    getActiveModerators,
    getState,
    handleModerationQueueInteraction,
    makePanelComponents,
    makeQueueEmbed,
};
