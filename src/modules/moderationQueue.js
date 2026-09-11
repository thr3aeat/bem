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
const assignmentLocks = new Map();

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
    const allowedGuildId = configManager.get('ALLOWED_GUILD_ID');
    return interaction.guildId === allowedGuildId && interaction.member?.roles?.cache?.has(staffRoleId);
}

async function getModerators(guild) {
    const staffRoleId = configManager.get('ALLOWED_ROLE_ID');
    const members = await guild.members.fetch().catch(() => guild.members.cache);

    return [...members.values()]
        .filter(member => !member.user.bot && member.roles.cache.has(staffRoleId))
        .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
}

async function getActiveModerators(guild) {
    return (await getModerators(guild)).filter(isActive);
}

async function getNextModerator(guild, state = getState()) {
    const moderators = await getModerators(guild);
    const activeModeratorIds = new Set(moderators.filter(isActive).map(member => member.id));
    if (!activeModeratorIds.size) return null;

    const previousIndex = moderators.findIndex(member => member.id === state.lastAssignedId);
    for (let offset = 1; offset <= moderators.length; offset++) {
        const moderator = moderators[(previousIndex + offset + moderators.length) % moderators.length];
        if (activeModeratorIds.has(moderator.id)) return moderator;
    }
    return null;
}

async function assignNextModerator(guild) {
    const state = getState();
    const moderator = await getNextModerator(guild, state);
    if (!moderator) return null;
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

    const components = [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`modq_complete_${caseItem.id}`).setLabel('Tamamlandı').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`modq_handoff_${caseItem.id}`).setLabel('Devret').setEmoji('🔁').setStyle(ButtonStyle.Secondary),
    )];
    return moderator.send({ embeds: [assignmentEmbed], components }).then(() => true).catch(() => false);
}

function withAssignmentLock(guildId, work) {
    const previous = assignmentLocks.get(guildId) || Promise.resolve();
    const current = previous.catch(() => {}).then(work);
    assignmentLocks.set(guildId, current);
    return current.finally(() => {
        if (assignmentLocks.get(guildId) === current) assignmentLocks.delete(guildId);
    });
}

async function dispatchWaitingCasesUnlocked(guild) {
    const state = getState();
    const waitingCases = state.cases.filter(item => item.guildId === guild.id && item.status === 'waiting');

    for (const caseItem of waitingCases) {
        const moderator = await assignNextModerator(guild);
        if (!moderator) break;
        caseItem.moderatorId = moderator.id;
        caseItem.status = 'assigned';
        caseItem.assignedAt = new Date().toISOString();
        if (!await notifyModerator(moderator, caseItem)) {
            caseItem.moderatorId = null;
            caseItem.status = 'waiting';
            continue;
        }
    }
    saveState(state);
}

// Çevrim dışıyken oluşan kayıtları ilk aktif yetkili geldiğinde sırayla dağıtır.
async function dispatchWaitingCases(guild) {
    return withAssignmentLock(guild.id, () => dispatchWaitingCasesUnlocked(guild));
}

function makeQueueEmbed(state, activeModerators, guildId, nextModerator = null) {
    const guildCases = state.cases.filter(item => item.guildId === guildId);
    const waiting = guildCases.filter(item => item.status === 'waiting').length;
    const assigned = guildCases.filter(item => item.status === 'assigned').length;
    const completed = guildCases.filter(item => item.status === 'completed').length;
    const next = nextModerator
        ? `${nextModerator} (sıradaki aktif yetkili)`
        : 'Aktif yetkili yok';

    return new EmbedBuilder()
        .setColor(activeModerators.length ? 0x5865F2 : 0xED4245)
        .setTitle('🛡️ Ceza Personel Sırası')
        .setDescription('Yeni ihlal bildirimleri, çevrim içi/aktif yetkililer arasında dönüşümlü dağıtılır. Sırası gelen kişi çevrim dışıysa otomatik atlanır.')
        .addFields(
            { name: '🟢 Aktif yetkililer', value: activeModerators.map(member => member.toString()).join(', ') || 'Yok', inline: false },
            { name: '📥 Bekleyen kayıt', value: String(waiting), inline: true },
            { name: '📌 Atanmış kayıt', value: String(assigned), inline: true },
            { name: '✅ Tamamlanan kayıt', value: String(completed), inline: true },
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
            content: '❌ Kullanıcı için Discord ID’sini veya `@etiketi` girin.',
            flags: 64,
        });
    }
    return withAssignmentLock(interaction.guildId, async () => {
        const state = getState();
        const moderator = await assignNextModerator(interaction.guild);
        const caseItem = {
            id: state.nextId++, guildId: interaction.guildId, userId, reason,
            reporterId: interaction.user.id, moderatorId: moderator?.id || null,
            status: moderator ? 'assigned' : 'waiting', createdAt: new Date().toISOString(),
        };
        state.cases.push(caseItem);

        const delivered = moderator && await notifyModerator(moderator, caseItem);
        if (!delivered) {
            caseItem.moderatorId = null;
            caseItem.status = 'waiting';
            await dispatchWaitingCasesUnlocked(interaction.guild);
        }
        saveState(state);

        return interaction.reply({
            content: caseItem.status === 'assigned'
                ? `✅ İhlal kaydı #${caseItem.id}, sıra sistemindeki aktif yetkili <@${caseItem.moderatorId}> kişisine atandı.`
                : `⚠️ İhlal kaydı #${caseItem.id} bekleme sırasına alındı. Aktif yetkili yok veya atanan yetkiliye DM gönderilemedi.`,
            flags: 64,
        });
    });
}

async function handleAssignedCaseAction(interaction, client) {
    const match = interaction.customId.match(/^modq_(complete|handoff)_(\d+)$/);
    if (!match) return false;

    const [, action, caseId] = match;
    const state = getState();
    const caseItem = state.cases.find(item => String(item.id) === caseId);
    if (!caseItem || caseItem.status !== 'assigned' || caseItem.moderatorId !== interaction.user.id) {
        await interaction.reply({ content: '❌ Bu kayıt size atanmış değil veya işlem zaten tamamlanmış.', flags: 64 });
        return true;
    }

    if (action === 'complete') {
        caseItem.status = 'completed';
        caseItem.completedAt = new Date().toISOString();
        caseItem.completedBy = interaction.user.id;
        saveState(state);
        await interaction.update({ components: [] });
        return true;
    }

    await withAssignmentLock(caseItem.guildId, async () => {
        caseItem.status = 'waiting';
        caseItem.moderatorId = null;
        caseItem.handedOffAt = new Date().toISOString();
        saveState(state);
    });
    await interaction.update({ components: [] });
    const guild = client.guilds.cache.get(caseItem.guildId);
    if (guild) await dispatchWaitingCases(guild);
    return true;
}

async function handleModerationQueueInteraction(interaction, client) {
    if (interaction.isButton() && await handleAssignedCaseAction(interaction, client)) return;

    if (!canUseQueue(interaction)) {
        return interaction.reply({ content: '❌ Bu ceza personel panelini kullanma yetkiniz yok.', flags: 64 });
    }

    if (interaction.isButton() && ['modanasayfa', 'mod_anasayfa', 'modq_open'].includes(interaction.customId)) {
        const moderators = await getActiveModerators(interaction.guild);
        const nextModerator = await getNextModerator(interaction.guild);
        return interaction.reply({
            embeds: [makeQueueEmbed(getState(), moderators, interaction.guildId, nextModerator)],
            components: makePanelComponents(),
            flags: 64,
        });
    }

    if (interaction.isButton() && interaction.customId === 'modq_report') {
        const modal = new ModalBuilder().setCustomId('modq_report_submit').setTitle('Kural İhlali Bildir');
        const userField = new TextInputBuilder()
            .setCustomId('modq_user')
            .setLabel('Kullanıcı ID veya @etiketi')
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
        const nextModerator = await getNextModerator(interaction.guild, state);
        return interaction.reply({ embeds: [makeQueueEmbed(state, moderators, interaction.guildId, nextModerator)], flags: 64 });
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modq_report_submit') {
        return createCase(interaction);
    }
}

module.exports = {
    dispatchWaitingCases,
    canUseQueue,
    getActiveModerators,
    getNextModerator,
    getState,
    handleModerationQueueInteraction,
    makePanelComponents,
    makeQueueEmbed,
};
