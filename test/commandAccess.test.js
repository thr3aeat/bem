const test = require('node:test');
const assert = require('node:assert/strict');
const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const { prepareCommand, canUseCommand, isOwner } = require('../src/modules/commandAccess');
const ui = require('../src/modules/commandUi');

const OWNER_ID = '1031620522406072350';
const makeCommand = () => prepareCommand({
    data: new SlashCommandBuilder().setName('ban').setDescription('x')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
});
const interaction = ({ userId = '1', guildId = '1483482948320891074', roles = [], perms = 0n } = {}) => ({
    user: { id: userId },
    guildId,
    member: { roles },
    memberPermissions: new PermissionsBitField(perms),
});

test('discord tarafındaki yetki gizlemesi kaldırılır, izin komutta saklanır', () => {
    const command = makeCommand();
    assert.equal(command.data.toJSON().default_member_permissions, null);
    assert.equal(command.requiredPermissions, PermissionFlagsBits.BanMembers);
});

test('bot sahibi tüm komutları rol ve izin olmadan kullanabilir', () => {
    assert.equal(isOwner(OWNER_ID), true);
    assert.deepEqual(canUseCommand(interaction({ userId: OWNER_ID, guildId: 'baska' }), makeCommand()), { ok: true });
});

test('yetkili rolü olmayan kullanıcı reddedilir', () => {
    assert.equal(canUseCommand(interaction(), makeCommand()).reason, 'role');
});

test('yetkili rolü olup izni olmayan kullanıcı eksik izni görür', () => {
    const result = canUseCommand(interaction({ roles: ['1521519524812165280'] }), makeCommand());
    assert.equal(result.reason, 'permission');
    assert.deepEqual(result.missing, ['BanMembers']);
});

test('yetkili rolü ve izni olan kullanıcı komutu kullanabilir', () => {
    const result = canUseCommand(interaction({ roles: ['1521519524812165280'], perms: PermissionFlagsBits.BanMembers }), makeCommand());
    assert.deepEqual(result, { ok: true });
});

test('hata kartı Components V2 + ephemeral olarak oluşturulur', () => {
    const payload = ui.error('olmadı');
    assert.equal(payload.flags & (1 << 15), 1 << 15);
    assert.equal(payload.flags & (1 << 6), 1 << 6);
    assert.equal(payload.components[0].toJSON().type, 17);
    assert.equal(ui.forEdit(payload).flags, 1 << 15);
});
