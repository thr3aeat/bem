const { Events } = require('discord.js');
const { dispatchWaitingCases } = require('../modules/moderationQueue');

module.exports = {
    name: Events.PresenceUpdate,
    async execute(_oldPresence, newPresence) {
        if (!newPresence.guild || newPresence.status === 'offline') return;
        await dispatchWaitingCases(newPresence.guild).catch(error => {
            console.error('[❌] Bekleyen ceza kayıtları dağıtılamadı:', error);
        });
    },
};
