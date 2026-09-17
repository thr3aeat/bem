const { Events } = require('discord.js');
const { 
    EKO_GUILD_ID, EKO_KANAL_ID, EKO_ROL_ID,
    ekoFotografVarMi, ekoGuncelleIstatistik,
    ekoAboneDMEmbed, ekoKanalTebrikEmbed, ekoLogEmbed,
    ekoCooldownSet
} = require('../modules/ekoUtils');
const { sendLog } = require('../modules/embedBuilders');

const JsonDatabase = require('../modules/jsonDatabase');
const {
    extractImageUrls,
    createImageFingerprints,
    findDuplicate,
} = require('../modules/imageDuplicateDetection');
const { subscriberAllowedMentions, subscriberPayload } = require('../modules/subscriberMessaging');
const ekoImageHashesDb = new JsonDatabase('ekoImageHashes.json');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;
        if (message.guildId !== EKO_GUILD_ID) return;
        if (message.channelId !== EKO_KANAL_ID) return;
        if (!ekoFotografVarMi(message)) return;

        // --- Görsel kopyalama kontrolü: ek, embed ve bağlantılar için tam + görsel parmak izi ---
        const resimUrlListesi = extractImageUrls(message);
        if (resimUrlListesi.length === 0) {
            await message.reply(subscriberPayload({ content: '⚠️ Görseli okuyamadım; lütfen ekran görüntüsünü doğrudan dosya olarak yeniden yükle.' })).catch(() => {});
            return;
        }

        const fingerprintsListesi = [];
        for (const resimUrl of resimUrlListesi) {
            try {
                const response = await fetch(resimUrl);
                if (!response.ok) continue;
                fingerprintsListesi.push(await createImageFingerprints(Buffer.from(await response.arrayBuffer())));
            } catch (hashErr) {
                console.warn('[EKO] Bir görsel parmak izi oluşturulamadı:', hashErr.message);
            }
        }
        if (!fingerprintsListesi.length) {
            await message.reply(subscriberPayload({ content: '⚠️ Görseli kontrol edemedim; lütfen dosyayı doğrudan yeniden yükle.' })).catch(() => {});
            return;
        }

        const duplicateEntry = fingerprintsListesi.map(fingerprints => ({ fingerprints, duplicate: findDuplicate(ekoImageHashesDb.all(), fingerprints) })).find(item => item.duplicate);
        const fingerprints = fingerprintsListesi[0];
        const duplicate = duplicateEntry?.duplicate;
        if (duplicate) {
            const existingRecord = duplicate.record;
                        // Birebir aynı görsel tespit edildi!
                        try {
                            await message.delete().catch(() => {});
                        } catch {}

                        const warningMsg = await message.channel.send(subscriberPayload({
                            content: `❌ ${message.author.toString()} Bu görsel daha önce kullanılmış. Lütfen kendi güncel abone ekran görüntünü gönder.`
                        })).catch(() => null);

                        if (warningMsg) {
                            setTimeout(() => warningMsg.delete().catch(() => {}), 10000);
                        }

                        // Log kanalına uyarısını gönder
                        try {
                            const { EmbedBuilder } = require('discord.js');
                            const warnEmbed = new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('⚠️ Görsel Kopyalama Engellendi')
                                .setDescription(
                                    `**<@${message.author.id}>** (\`${message.author.tag}\`), daha önce ` +
                                    (existingRecord.userId === message.author.id ? 'kendisi' : `**<@${existingRecord.userId}>**`) +
                                    ` tarafından yüklenmiş olan görselin **${duplicate.type === 'exact' ? 'birebir kopyasını' : 'çok benzer bir sürümünü'}** yüklemeye çalıştı.\n\n` +
                                    `🚫 Mesaj otomatik silindi ve onay/rol işlemi engellendi.`
                                )
                                .addFields(
                                    { name: '👤 Kullanıcı', value: `<@${message.author.id}> (\`${message.author.id}\`)`, inline: true },
                                    { name: '📅 Orijinal Yükleme', value: `<t:${Math.floor(existingRecord.timestamp / 1000)}:R>`, inline: true }
                                )
                                .setTimestamp();
                            await sendLog(client, warnEmbed, subscriberAllowedMentions());
                        } catch {}

                        console.warn(`[⚠️ EKO GÖRSEL KOPYALAMA] ${message.author.tag} (${message.author.id}) kopyalanmış görsel attı. Hash: ${fingerprints.sha256}`);
                        return; // İşlemi tamamen iptal et
        }

        // Yeni görsel - hem dosya hem de görünüm parmak izini sakla.
        for (const imageFingerprints of fingerprintsListesi) ekoImageHashesDb.set(imageFingerprints.sha256, {
            userId: message.author.id, messageId: message.id, timestamp: Date.now(),
            perceptualHash: imageFingerprints.perceptualHash,
        });
        // Duplicate kaydı rol/onay akışından önce kalıcılaştırılır. Render yeniden
        // başlasa bile başarılı ilk yükleme kaybolup aynı dosya tekrar kabul edilmez.
        await ekoImageHashesDb._flush();

        // --- Üye bilgisini al ---
        let member;
        try {
            const guild = client.guilds.cache.get(EKO_GUILD_ID);
            if (!guild) return;
            member = await guild.members.fetch(message.author.id).catch(() => null);
            if (!member) return;
        } catch {
            return;
        }

        // --- Rol kontrolü ---
        const zatenAbone = member.roles.cache.has(EKO_ROL_ID);

        // --- İstatistik güncelle ---
        const stats = ekoGuncelleIstatistik(message.author.id);
        const toplamFoto = stats.kullaniciFoto;

        // --- ✅ Tepki ekle ---
        try {
            await message.react('✅');
        } catch (err) {
            console.error('[EKO] Tepki eklenemedi:', err.message);
        }

        // --- Rol ver (sadece yoksa) ---
        let rolVerildi = false;
        if (!zatenAbone) {
            try {
                const rol = member.guild.roles.cache.get(EKO_ROL_ID);
                if (rol) {
                    await member.roles.add(rol, 'Eko Yıldız — fotoğraf paylaşımı (otomasyon)');
                    rolVerildi = true;
                }
            } catch (err) {
                console.error('[EKO] Rol verilemedi:', err.message);
            }
        }

        // --- DM gönder ---
        const cooldownKey = `${message.author.id}_${new Date().toISOString().slice(0, 10)}`;
        let dmDurumu = false;

        if (!ekoCooldownSet.has(cooldownKey)) {
            try {
                const dmEmbed = ekoAboneDMEmbed(member, toplamFoto);
                await message.author.send(subscriberPayload({ embeds: [dmEmbed] }));
                dmDurumu = true;
                ekoCooldownSet.add(cooldownKey);
                // Cooldown 24 saat sonra otomatik temizle
                setTimeout(() => ekoCooldownSet.delete(cooldownKey), 24 * 60 * 60 * 1000);
            } catch {
                // DM kapalı — sessizce geç
            }
        }

        // --- Kanal içi tebrik mesajı (sadece yeni abonelere) ---
        if (rolVerildi) {
            try {
                const ComponentsV2Factory = require('../modules/componentsV2Factory');
                const v2Payload = ComponentsV2Factory.buildSubscriberV2({
                    member,
                    fotoSayi: toplamFoto,
                    yeniAbone: true,
                    ekoRoleId: EKO_ROL_ID
                });
                const tebrikMesaj = await message.channel.send(v2Payload);
                // 15 saniye sonra tebrik mesajını sil
                setTimeout(() => tebrikMesaj.delete().catch(() => {}), 15000);
            } catch (err) {
                console.error('[EKO] Tebrik mesajı gönderilemedi:', err.message);
            }
        }

        // --- Log kanalına gönder ---
        try {
            const logEmbed = ekoLogEmbed(member, rolVerildi, toplamFoto, dmDurumu);
            await sendLog(client, logEmbed, subscriberAllowedMentions());
        } catch (err) {
            console.error('[EKO] Log gönderilemedi:', err.message);
        }

        // --- Onay kanalına gönder ---
        try {
            const { EKO_ONAY_KANAL_ID } = require('../modules/constants');
            const onayKanal = await client.channels.fetch(EKO_ONAY_KANAL_ID).catch(() => null);
            if (onayKanal) {
                const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
                
                let resimUrl = null;
                const a = message.attachments.first();
                if (a && a.contentType?.startsWith('image/')) {
                    resimUrl = a.url;
                } else if (a) {
                    resimUrl = a.url;
                }

                const onayEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('📢 Abone Onay İsteği')
                    .setDescription(`**${message.author.toString()}** (${message.author.tag} - \`${message.author.id}\`) otomatik onay yaptı...\n\nAbone gerçekten olunmuş mudur yoksa yanlış mıdır?`)
                    .addFields(
                        { name: '📅 Gönderim Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '🔗 Orijinal Mesaj', value: `[Tıkla ve Git](${message.url})`, inline: true }
                    )
                    .setTimestamp();

                if (resimUrl) {
                    onayEmbed.setImage(resimUrl);
                }

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`eko_approve_${message.author.id}_${message.id}`)
                        .setLabel('Evet, Gerçek')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId(`eko_reject_${message.author.id}_${message.id}`)
                        .setLabel('Yanlış / Reddet')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

                await onayKanal.send(subscriberPayload({ content: `🔔 **Yeni Onay İsteği!** ${message.author.toString()}`, embeds: [onayEmbed], components: [row] }));
            }
        } catch (err) {
            console.error('[EKO] Onay kanalına istek gönderilemedi:', err.message);
        }

        console.log(`[⭐ EKO] ${message.author.tag} fotoğraf paylaştı | Yeni abone: ${rolVerildi} | Fotoğraf: ${toplamFoto}`);
    },
};
