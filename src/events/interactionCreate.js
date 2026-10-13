const { Events, Collection } = require('discord.js');
const { canUseCommand, isOwner } = require('../modules/commandAccess');
const ui = require('../modules/commandUi');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`[⚠️] Komut bulunamadı: ${interaction.commandName}`);
                return interaction.reply(ui.error('Bu komut artık mevcut değil veya henüz yüklenmedi.')).catch(() => {});
            }

            // Sahip her yerde serbest; diğerleri yetkili rol + komutun gerektirdiği izin.
            const access = canUseCommand(interaction, command);
            if (!access.ok) {
                const description = access.reason === 'permission'
                    ? `Bu komut için şu izin(ler) gerekiyor:\n${access.missing.map(p => `> \`${ui.permissionLabel(p)}\``).join('\n')}`
                    : 'Bu botun komutlarını yalnızca yetkili ekip kullanabilir.';
                console.warn(`[🔒] Yetki reddi: /${interaction.commandName} | ${interaction.user.tag} (${interaction.user.id}) | sunucu ${interaction.guildId} | sebep ${access.reason}`);
                return interaction.reply(ui.error(description, {
                    title: 'Yetkin Yok',
                    icon: '🔒',
                    fields: [{ name: '🆔 Kullanıcı ID', value: `\`${interaction.user.id}\`` }],
                    footer: 'Bot sahibiysen bu ID\'yi BOT_OWNER_IDS ayarına ekle',
                }));
            }

            // ─── Cooldown (sahipler muaf) ────────────────────────────
            const { cooldowns } = client;
            const skipCooldown = isOwner(interaction.user);
            if (!cooldowns.has(command.data.name)) {
                cooldowns.set(command.data.name, new Collection());
            }

            const now        = Date.now();
            const timestamps = cooldowns.get(command.data.name);
            const cooldownMs = (command.cooldown ?? 3) * 1000;

            if (!skipCooldown && timestamps.has(interaction.user.id)) {
                const expiresAt = timestamps.get(interaction.user.id) + cooldownMs;
                if (now < expiresAt) {
                    const expiredTimestamp = Math.round(expiresAt / 1000);
                    return interaction.reply(ui.warning(
                        `Bu komutu tekrar kullanmak için <t:${expiredTimestamp}:R> beklemelisin.`,
                        { title: 'Biraz Yavaş', icon: '⏳' }
                    ));
                }
            }

            if (!skipCooldown) {
                timestamps.set(interaction.user.id, now);
                setTimeout(() => timestamps.delete(interaction.user.id), cooldownMs);
            }

            // ─── Çalıştır ────────────────────────────────────────────
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`[❌] Komut hatası [${interaction.commandName}]:`, error);
                const payload = ui.error(
                    'Komut çalıştırılırken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
                    { fields: [{ name: '🧩 Detay', value: `\`${String(error?.message || error).slice(0, 180)}\`` }] }
                );
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(payload).catch(() => {});
                } else {
                    await interaction.reply(payload).catch(() => {});
                }
            }

        } else if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (!command?.autocomplete || !canUseCommand(interaction, command).ok) return;
            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error(`[❌] Autocomplete hatası [${interaction.commandName}]:`, error);
            }

        } else if (interaction.isButton()) {
            if (interaction.customId.startsWith('modq_') || ['modanasayfa', 'mod_anasayfa'].includes(interaction.customId)) {
                const { handleModerationQueueInteraction } = require('../modules/moderationQueue');
                try {
                    await handleModerationQueueInteraction(interaction, client);
                } catch (error) {
                    console.error('[❌] Ceza sırası buton hatası:', error);
                    await interaction.reply({ content: '❌ Ceza sırası işlenirken bir hata oluştu.', flags: 64 }).catch(() => {});
                }
                return;
            }
            const isCustom = [
                'eko_approve_', 'eko_reject_', 'roblox_still_in_group_', 'roblox_not_in_group_',
                'user_rate_btn', 'user_reply_btn', 'user_end_btn', 'mod_reply_btn_', 'mod_end_btn_',
                'eko_undo_', 'eko_mod_send_msg_', 'ekocan_role_btn', 'ekocancik_role_btn',
                'roblox_dm_verify_'
            ].some(prefix => interaction.customId.startsWith(prefix));

            if (isCustom) {
                const { handleCustomInteraction } = require('../modules/interactionHandlerExt');
                try {
                    await handleCustomInteraction(interaction, client);
                } catch (error) {
                    console.error('[❌] Özel buton hatası:', error);
                    await interaction.reply({ content: '❌ Buton işlenirken bir hata oluştu.', flags: 64 }).catch(() => {});
                }
            } else {
                const { handleButtonInteraction } = require('../modules/buttonHandler');
                try {
                    await handleButtonInteraction(interaction, client);
                } catch (error) {
                    console.error('[❌] Buton hatası:', error);
                    await interaction.reply({ content: '❌ Buton işlenirken bir hata oluştu.', flags: 64 }).catch(() => {});
                }
            }
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modq_report_submit') {
                const { handleModerationQueueInteraction } = require('../modules/moderationQueue');
                try {
                    await handleModerationQueueInteraction(interaction, client);
                } catch (error) {
                    console.error('[❌] Ceza sırası modal hatası:', error);
                    await interaction.reply({ content: '❌ Ceza sırası işlenirken bir hata oluştu.', flags: 64 }).catch(() => {});
                }
                return;
            }
            const { handleCustomInteraction } = require('../modules/interactionHandlerExt');
            try {
                await handleCustomInteraction(interaction, client);
            } catch (error) {
                console.error('[❌] Modal hatası:', error);
                await interaction.reply({ content: '❌ Modal işlenirken bir hata oluştu.', flags: 64 }).catch(() => {});
            }
        }
    },
};
