const { Events } = require('discord.js');
const { rankList, ROBLOX_COOKIE, config } = require('../modules/constants');
const { getGroupRoles } = require('../modules/robloxApi');
const { checkExpiredPunishments } = require('../modules/moderationUtils');
const scheduler = require('../modules/scheduler');
const { deployCommands } = require('../modules/commandDeployer');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`[🤖] ${client.user.tag} olarak giriş yapıldı!`);
        console.log(`[📊] ${client.guilds.cache.size} sunucuda aktif.`);
        console.log(`[📋] ${rankList.length} rütbe yüklendi.`);
        
        // Komutları otomatik kaydet
        await deployCommands();

        // Bot çevrim dışıyken oluşmuş ceza kayıtlarını aktif yetkililere dağıt.
        const { dispatchWaitingCases } = require('../modules/moderationQueue');
        for (const guild of client.guilds.cache.values()) {
            await dispatchWaitingCases(guild).catch(error => {
                console.error('[❌] Başlangıç ceza sırası dağıtımı başarısız:', error);
            });
        }
        
        const { startPresenceRotation } = require('../modules/axolotlPersonality');
        startPresenceRotation(client);

        // Başlangıçta grup rollerini önbelleğe al
        if (ROBLOX_COOKIE) {
            await getGroupRoles();
        }

        // Geçici ban/mute kontrolü - her dakika çalışır
        scheduler.addTask('punishment-expiry-check', () => checkExpiredPunishments(client, config), 60000);

        // Haftalık Moderatör Liderlik Raporu kontrolü - her saat başı çalışır (7 gün tamamlandığında otomatik kanala atar)
        const { publishWeeklyReport } = require('../modules/modStatsUtils');
        scheduler.addTask('weekly-mod-stats-report', () => publishWeeklyReport(client), 3600000);

        // Roblox grup kontrolü - her dakika çalışır (Tam Otomatik Canlı Doğrulama, Dinamik Artan Aralık & DM Sistemi)
        const checkRobloxGroupStatus = async (cl) => {
            try {
                const JsonDatabase = require('../modules/jsonDatabase');
                const robloxChecksDb = new JsonDatabase('robloxChecks.json');
                const { KAYIT_GUILD_ID, KAYIT_GRUP_ID, KAYIT_DISCORD_ROL_ID } = require('../modules/constants');
                const { getUserRankInGroup } = require('../modules/robloxApi');
                const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                const { sendLog } = require('../modules/embedBuilders');
                
                const now = Date.now();
                const checks = robloxChecksDb.all();
                
                for (const userId in checks) {
                    const entry = checks[userId];
                    if (entry.status === 'pending' && entry.checkAt <= now) {
                        try {
                            const rankData = await getUserRankInGroup(entry.robloxUserId, KAYIT_GRUP_ID);
                            const isInGroup = rankData && rankData.rank > 0;
                            
                            const guild = cl.guilds.cache.get(KAYIT_GUILD_ID);
                            let member = null;
                            if (guild) {
                                member = await guild.members.fetch(entry.discordUserId).catch(() => null);
                            }

                            if (isInGroup) {
                                // 🟢 1. DURUM: KULLANICI HALA GRUPTA -> OTOMATİK ONAYLA & SÜREYİ ARTIR
                                if (member) {
                                    const rol = guild.roles.cache.get(KAYIT_DISCORD_ROL_ID);
                                    if (rol && !member.roles.cache.has(KAYIT_DISCORD_ROL_ID)) {
                                        await member.roles.add(rol, 'Roblox grup kontrolü: Grupta olduğu otomatik doğrulandı');
                                    }
                                }

                                // Süreyi artır: 14 günden başlar, her seferinde +14 gün eklenir (14 -> 28 -> 42 -> 56...)
                                const currentDays = entry.intervalDays || 14;
                                const nextDays = currentDays + 14;
                                entry.intervalDays = nextDays;
                                entry.checkAt = now + (nextDays * 24 * 60 * 60 * 1000);
                                entry.status = 'pending';
                                entry.lastCheckedAt = now;
                                entry.consecutiveChecks = (entry.consecutiveChecks || 0) + 1;
                                robloxChecksDb.set(userId, entry);

                                // Sistem loguna bilgi ver
                                try {
                                    const logEmbed = new EmbedBuilder()
                                        .setColor('#00FF88')
                                        .setTitle('🤖 Otomatik Roblox Grup Kontrolü Başarılı')
                                        .setDescription(
                                            `**<@${entry.discordUserId}>** (\`${entry.discordUserId}\`) kullanıcısının Roblox grubu kontrol edildi ve **grupta aktif olduğu doğrulandı**.\n\n` +
                                            `🎮 **Roblox:** [${entry.robloxUsername}](https://www.roblox.com/users/${entry.robloxUserId}/profile) (\`${rankData.name}\` - Rank: ${rankData.rank})\n` +
                                            `🎭 **Rol:** <@&${KAYIT_DISCORD_ROL_ID}> (Korundu)\n` +
                                            `📅 **Bir Sonraki Kontrol:** <t:${Math.floor(entry.checkAt / 1000)}:R> (**${nextDays} gün sonra**)`
                                        )
                                        .setTimestamp();
                                    await sendLog(cl, logEmbed);
                                } catch {}

                            } else {
                                // 🔴 2. DURUM: KULLANICI GRUPTA DEĞİL -> ROLÜ KALDIR & DM İLE LİNK + BUTON GÖNDER
                                if (member) {
                                    const rol = guild.roles.cache.get(KAYIT_DISCORD_ROL_ID);
                                    if (rol && member.roles.cache.has(KAYIT_DISCORD_ROL_ID)) {
                                        await member.roles.remove(rol, 'Roblox grubunda bulunmadığı tespit edildi (Otomatik kontrol)');
                                    }
                                }

                                let dmSuccess = false;
                                try {
                                    const user = await cl.users.fetch(entry.discordUserId).catch(() => null);
                                    if (user) {
                                        const dmEmbed = new EmbedBuilder()
                                            .setColor('#FFA500')
                                            .setTitle('⚠️ Roblox Grup Üyeliği Uyarısı')
                                            .setDescription(
                                                `Merhaba **${user.username}**,\n\n` +
                                                `Rutin sistem kontrolümüzde Roblox grubumuzda bulunmadığınız tespit edilmiştir. Bu sebeple sunucumuzdaki <@&${KAYIT_DISCORD_ROL_ID}> rolünüz geçici olarak kaldırılmıştır.\n\n` +
                                                `🔗 **Tekrar Gruba Katılmak İçin:**\n` +
                                                `👉 [Eko Yıldız Roblox Grubu](https://www.roblox.com/communities/${KAYIT_GRUP_ID})\n\n` +
                                                `Gruba katıldıktan sonra aşağıdaki **"Girdim / Tekrar Kontrol Et"** butonuna basarak rolünüzü anında geri alabilirsiniz.`
                                            )
                                            .setFooter({ text: 'Eko Yıldız Roblox Otomatik Kontrol Sistemi' })
                                            .setTimestamp();

                                        const dmRow = new ActionRowBuilder().addComponents(
                                            new ButtonBuilder()
                                                .setCustomId(`roblox_dm_verify_${entry.discordUserId}`)
                                                .setLabel('Girdim / Tekrar Kontrol Et')
                                                .setStyle(ButtonStyle.Success)
                                                .setEmoji('✅')
                                        );

                                        await user.send({ embeds: [dmEmbed], components: [dmRow] });
                                        dmSuccess = true;
                                    }
                                } catch (dmErr) {
                                    console.warn(`[ROBLOX KONTROL] DM gönderilemedi (${entry.discordUserId}):`, dmErr.message);
                                    dmSuccess = false;
                                }

                                if (!dmSuccess) {
                                    // DM KAPALI veya ULAŞILAMAZ -> O KULLANICI İÇİN KONTROLÜ KAPAT
                                    entry.status = 'closed_dm_unreachable';
                                    entry.closedAt = now;
                                    entry.lastCheckedAt = now;
                                    robloxChecksDb.set(userId, entry);

                                    try {
                                        const logEmbed = new EmbedBuilder()
                                            .setColor('#FF3333')
                                            .setTitle('❌ Roblox Grup Kontrolü Kapatıldı (DM Kapalı)')
                                            .setDescription(
                                                `**<@${entry.discordUserId}>** (\`${entry.discordUserId}\`) kullanıcısının grupta olmadığı tespit edildi ancak **DM'si kapalı veya ulaşılamaz** olduğu için Roblox grup kontrolü bu kullanıcı için **kapatıldı** ve rolü kaldırıldı.`
                                            )
                                            .setTimestamp();
                                        await sendLog(cl, logEmbed);
                                    } catch {}
                                } else {
                                    // DM Başarıyla gönderildi -> Kullanıcının "Girdim" butonuna basması bekleniyor
                                    entry.status = 'waiting_dm_verification';
                                    entry.lastCheckedAt = now;
                                    robloxChecksDb.set(userId, entry);

                                    try {
                                        const logEmbed = new EmbedBuilder()
                                            .setColor('#FFA500')
                                            .setTitle('⚠️ Roblox Grup Üyeliği Bulunamadı (DM Gönderildi)')
                                            .setDescription(
                                                `**<@${entry.discordUserId}>** (\`${entry.discordUserId}\`) kullanıcısının grupta olmadığı görüldü. Rolü askıya alındı ve kullanıcıya DM üzerinden grup linki ile doğrulama butonu gönderildi.`
                                            )
                                            .setTimestamp();
                                        await sendLog(cl, logEmbed);
                                    } catch {}
                                }
                            }
                        } catch (itemErr) {
                            console.error(`[ROBLOX KONTROL] Kullanıcı ${userId} kontrol edilirken hata:`, itemErr.message);
                        }
                    }
                }
            } catch (err) {
                console.error('[KONTROL] Roblox grup kontrolü sırasında hata:', err.message);
            }
        };
        scheduler.addTask('roblox-group-status-check', () => checkRobloxGroupStatus(client), 60000);

        // Kayıt ve Eko Yıldız karşılama mesajlarını ve başlangıç kanal taramasını kontrol et
        const { kayitKarsilamaMesajiniGonder, taraveKontrolEtKayitKanali } = require('../modules/kayitUtils');
        const { ekoKarsilamaMesajiniGonder, ekoAbonerDatabase, EKO_GUILD_ID, EKO_ROL_ID } = require('../modules/ekoUtils');
        setTimeout(() => kayitKarsilamaMesajiniGonder(client), 3000);
        setTimeout(() => taraveKontrolEtKayitKanali(client), 4000);
        setTimeout(() => ekoKarsilamaMesajiniGonder(client), 5000);

        // Başlangıçta eksik abone rollerini tamamlama kontrolü
        setTimeout(async () => {
            try {
                const guild = client.guilds.cache.get(EKO_GUILD_ID);
                if (guild) {
                    console.log('[⭐ EKO] Başlangıçta abone rolleri kontrol ediliyor...');
                    const subscribers = ekoAbonerDatabase.all();
                    const rol = guild.roles.cache.get(EKO_ROL_ID);
                    if (rol) {
                        await guild.members.fetch();
                        let eklenenSayi = 0;
                        for (const userId in subscribers) {
                            const member = guild.members.cache.get(userId);
                            if (member && !member.roles.cache.has(EKO_ROL_ID)) {
                                console.log(`[⭐ EKO] ${member.user.tag} (${userId}) veritabanında abone olarak kayıtlı fakat rolü eksik. Rol tanımlanıyor...`);
                                await member.roles.add(rol, 'Başlangıçta eksik abone rolünü tamamlama (otomasyon)').catch(err => {
                                    console.error(`[EKO] Rol tanımlama hatası (${member.user.tag}):`, err.message);
                                });
                                eklenenSayi++;
                            }
                        }
                        if (eklenenSayi > 0) {
                            console.log(`[⭐ EKO] Toplam ${eklenenSayi} üyeye eksik olan abone rolü başarıyla tanımlandı.`);
                        } else {
                            console.log('[⭐ EKO] Eksik abone rolü olan üye bulunmadı.');
                        }
                    } else {
                        console.warn('[⚠️ EKO] Eko Abone Rolü bulunamadı, kontrol atlanıyor.');
                    }
                } else {
                    console.warn('[⚠️ EKO] Eko Sunucusu bulunamadı, kontrol atlanıyor.');
                }
            } catch (err) {
                console.error('[❌ EKO] Başlangıç abone rol kontrolü sırasında hata oluşti:', err);
            }
        // Kayıt taramasının yaptığı gateway üye listesinden sonra çalışır; aynı
        // sunucu için eşzamanlı opcode 8 istekleri Discord tarafından sınırlanır.
        }, 35000);

        // Ekocan / Ekocancık aile seçim mesajı kontrolü
        const sendEkocanChoiceMessage = async (cl) => {
            try {
                const { EKOCAN_SECIM_KANAL_ID, EKO_GUILD_ID } = require('../modules/constants');
                const guild = await cl.guilds.fetch(EKO_GUILD_ID).catch(() => null);
                if (!guild) return;
                const kanal = await guild.channels.fetch(EKOCAN_SECIM_KANAL_ID).catch(() => null);
                if (!kanal) return;

                const mesajlar = await kanal.messages.fetch({ limit: 50 }).catch(() => null);
                if (mesajlar) {
                    const mevcut = mesajlar.find(m => m.author.id === cl.user.id && m.embeds.some(e => e.title === '📢 KARARINI VER!'));
                    if (mevcut) {
                        console.log('[📌 EKO] Ekocan aile seçim mesajı zaten mevcut.');
                        return;
                    }
                }

                const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor('#FF6600')
                    .setTitle('📢 KARARINI VER!')
                    .setDescription(
                        `⚡ **EKOCAN AİLESİ Mİ?**\n` +
                        `⚡ **EKOCANCIK AİLESİ Mİ?**\n\n` +
                        `Tıklayarak rolü al!`
                    )
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ekocan_role_btn')
                        .setLabel('EKOCAN')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🔥'),
                    new ButtonBuilder()
                        .setCustomId('ekocancik_role_btn')
                        .setLabel('EKOCANCIK')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⭐')
                );

                await kanal.send({ embeds: [embed], components: [row] });
                console.log('[📌 EKO] Ekocan aile seçim mesajı gönderildi.');
            } catch (err) {
                console.error('[❌ EKO] Ekocan aile seçim mesajı gönderilemedi:', err.message);
            }
        };
        setTimeout(() => sendEkocanChoiceMessage(client), 10000);
    },
};
