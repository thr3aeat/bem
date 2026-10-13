const { PermissionsBitField } = require('discord.js');
const configManager = require('./configManager');

// Bot sahipleri: tüm komutları her sunucuda, rol/yetki aramadan kullanabilir.
// 1031620522406072350 → ekoyildz. Ek sahipler BOT_OWNER_IDS (virgülle ayrılmış) ile eklenebilir.
const DEFAULT_OWNER_IDS = ['1031620522406072350'];

function getOwnerIds() {
    const raw = configManager.get('BOT_OWNER_IDS', DEFAULT_OWNER_IDS);
    const list = Array.isArray(raw) ? raw : String(raw).split(',');
    return new Set([...DEFAULT_OWNER_IDS, ...list.map(id => String(id).trim()).filter(Boolean)]);
}

function isOwner(userOrId) {
    const id = typeof userOrId === 'string' ? userOrId : userOrId?.id;
    return Boolean(id) && getOwnerIds().has(id);
}

/**
 * Discord, `default_member_permissions` olan komutları yetkisi olmayan kullanıcılardan
 * tamamen gizler; bu da sahibin komutları görememesine yol açar. Gerekli izni
 * komut üzerinde saklayıp Discord tarafındaki kısıtlamayı kaldırıyoruz, kontrolü
 * ise çalışma anında `canUseCommand` ile yapıyoruz.
 */
function prepareCommand(command) {
    if (command.requiredPermissions === undefined) {
        const perms = command.data.default_member_permissions;
        command.requiredPermissions = perms ? BigInt(perms) : null;
        command.data.setDefaultMemberPermissions(null);
    }
    return command;
}

function hasStaffRole(interaction) {
    const allowedGuildId = configManager.get('ALLOWED_GUILD_ID', '1483482948320891074');
    const allowedRoleId = configManager.get('ALLOWED_ROLE_ID', '1521519524812165280');
    const roles = interaction.member?.roles;
    const hasRole = roles && (
        (typeof roles.cache?.has === 'function' && roles.cache.has(allowedRoleId)) ||
        (Array.isArray(roles) && roles.includes(allowedRoleId))
    );
    return interaction.guildId === allowedGuildId && Boolean(hasRole);
}

function missingPermissions(interaction, command) {
    if (!command?.requiredPermissions) return [];
    const perms = interaction.memberPermissions;
    if (!perms) return new PermissionsBitField(command.requiredPermissions).toArray();
    if (perms.has(PermissionsBitField.Flags.Administrator)) return [];
    return perms.missing(command.requiredPermissions);
}

/** @returns {{ ok: true } | { ok: false, reason: 'role' | 'permission', missing?: string[] }} */
function canUseCommand(interaction, command) {
    if (isOwner(interaction.user)) return { ok: true };
    if (!hasStaffRole(interaction)) return { ok: false, reason: 'role' };
    const missing = missingPermissions(interaction, command);
    if (missing.length) return { ok: false, reason: 'permission', missing };
    return { ok: true };
}

module.exports = { isOwner, getOwnerIds, prepareCommand, hasStaffRole, canUseCommand };
