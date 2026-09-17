const { EmbedBuilder } = require('discord.js');
const { EKO_GUILD_ID, EKO_KANAL_ID, EKO_ROL_ID, EKO_DM_MESAJ } = require('./constants');
const JsonDatabase = require('./jsonDatabase');
const { subscriberPayload } = require('./subscriberMessaging');

const ekoAbonerDatabase = new JsonDatabase('subscribers.json');
const ekoDailyStats = new Map();
const ekoCooldownSet = new Set();

function ekoFotografVarMi(message) {
    const resimUzantilari = ['jpg','jpeg','png','gif','webp','bmp','tiff','svg','avif','heic','heif'];
    if (message.attachments.some(a => {
        const uzanti = (a.name || '').split('.').pop().toLowerCase();
        return resimUzantilari.includes(uzanti);
    })) return true;

    if (message.attachments.some(a => a.contentType?.startsWith('image/'))) return true;
    if (message.embeds.some(e => e.image || e.thumbnail)) return true;

    const urlRegex = /https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?[^\s]*)?/i;
    if (urlRegex.test(message.content)) return true;

    return false;
}

function ekoGuncelleIstatistik(userId) {
    const bugun = new Date().toISOString().slice(0, 10);
    const gunlukSayi = (ekoDailyStats.get(bugun) || 0) + 1;
    ekoDailyStats.set(bugun, gunlukSayi);

    const mevcut = ekoAbonerDatabase.get(userId) || { count: 0, lastPhotoAt: null, totalPhotos: 0 };
    mevcut.totalPhotos += 1;
    mevcut.lastPhotoAt = new Date();
    ekoAbonerDatabase.set(userId, mevcut);

    return { gunlukSayi, kullaniciFoto: mevcut.totalPhotos };
}

function ekoAboneDMEmbed(member, fotoSayi) {
    const { getAktifOzelGun } = require('./ozelGunler');
    const aktifGun = getAktifOzelGun();

    const embedColor = (aktifGun && aktifGun.accentHex) ? aktifGun.accentHex : '#FFD700';
    const embedTitle = aktifGun 
        ? `${aktifGun.emoji} ${aktifGun.name} — Eko Yıldız Ailemize Hoş Geldiniz!` 
        : '⭐ Eko Yıldız — Ailemize Hoş Geldiniz!';
    const embedDesc = aktifGun && aktifGun.aboneDmNotu 
        ? `${aktifGun.aboneDmNotu}\n\n${EKO_DM_MESAJ}`
        : EKO_DM_MESAJ;

    return new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(embedTitle)
        .setDescription(embedDesc)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
        .addFields(
            { name: '👤 Kullanıcı', value: `${member.user.tag}`, inline: true },
            { name: '🎭 Kazanılan Rol', value: '⭐ Eko Yıldız Abone', inline: true },
            { name: '📸 Toplam Fotoğraf', value: `${fotoSayi} Adet`, inline: true },
            { name: '📅 Abone Olma Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: aktifGun ? `${aktifGun.name} Özel Abone Sistemi` : 'Eko Yıldız Premium Abone Sistemi', iconURL: member.guild.iconURL() });
}

function ekoKanalTebrikEmbed(member, fotoSayi, yeniAbone) {
    const { getAktifOzelGun } = require('./ozelGunler');
    const aktifGun = getAktifOzelGun();

    let renk = yeniAbone ? '#00FF88' : '#FFD700';
    if (aktifGun && aktifGun.accentHex) renk = aktifGun.accentHex;

    let baslik = yeniAbone ? `🎉 Yeni Eko Yıldız Abonesi! — ${member.user.username}` : `📸 Yeni Fotoğraf Paylaşımı — ${member.user.username}`;
    if (aktifGun && yeniAbone) {
        baslik = `${aktifGun.emoji} ${aktifGun.shortName || aktifGun.name} — ${member.user.username}`;
    }

    let aciklama = yeniAbone ? `**${member.user.toString()}** YouTube kanalımıza abone olarak **⭐ Eko Yıldız Abone** rolünü kazandı! ⭐` : `**${member.user.toString()}** yeni bir kanıt fotoğrafı paylaştı.`;
    if (aktifGun && yeniAbone && typeof aktifGun.aboneTebrikAciklama === 'function') {
        aciklama = aktifGun.aboneTebrikAciklama(member.user.username, '⭐ Eko Yıldız Abone');
    }

    return new EmbedBuilder()
        .setColor(renk)
        .setTitle(baslik)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(aciklama)
        .addFields(
            { name: '📸 Paylaşılan Fotoğraf', value: `${fotoSayi} Adet`, inline: true },
            { name: '🎭 Rol Durumu', value: '⭐ Eko Yıldız Abone (Aktif)', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: aktifGun ? `${aktifGun.name} • Eko Yıldız Otomasyonu` : 'Sentura • Eko Yıldız Otomasyonu' });
}

function ekoLogEmbed(member, yeniAbone, fotoSayi, dmDurumu) {
    return new EmbedBuilder()
        .setColor(yeniAbone ? '#00FF88' : '#3498DB')
        .setTitle(yeniAbone ? '⭐ Eko Yıldız — Yeni Abone Tanımlandı' : '📸 Eko Yıldız — Fotoğraf İnceleme')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '👤 Üye', value: `${member.user.tag}\n(\`${member.user.id}\`)`, inline: true },
            { name: '🆕 Durum', value: yeniAbone ? '✅ Yeni Abone' : 'ℹ️ Zaten Abone', inline: true },
            { name: '📸 Fotoğraf Sayısı', value: `${fotoSayi}`, inline: true },
            { name: '📩 DM İletim', value: dmDurumu ? '✅ Gönderildi' : '❌ Kapalı / Gönderilemedi', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Eko Yıldız Otomasyon Log' });
}

let ekoKarsilamaMesajId = null;

async function ekoKarsilamaMesajiniGonder(client) {
    try {
        const guild = await client.guilds.fetch(EKO_GUILD_ID).catch(() => null);
        if (!guild) return;
        const kanal = await guild.channels.fetch(EKO_KANAL_ID).catch(() => null);
        if (!kanal) return;

        const mesajlar = await kanal.messages.fetch({ limit: 50 }).catch(() => null);
        if (mesajlar) {
            const mevcutMesaj = mesajlar.find(
                m => m.author.id === client.user.id && m.pinned && m.embeds.some(e => e.title === '⭐ Eko Yıldız Abone Rolü Nasıl Alınır?')
            );
            if (mevcutMesaj) {
                ekoKarsilamaMesajId = mevcutMesaj.id;
                console.log('[📌 EKO] Bilgilendirme mesajı zaten mevcut, izleniyor.');
                return;
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⭐ Eko Yıldız Abone Rolü Nasıl Alınır?')
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .setDescription(
                `Aramıza hoş geldin! YouTube kanalımıza abone olarak özel **⭐ Eko Yıldız Abone** rolünü anında alabilirsin.\n\n` +
                `**📌 Adım Adım Rol Alma Rehberi:**\n\n` +
                `1️⃣ **Abone Ol:** [Eko Yıldız YouTube Kanalı](https://www.youtube.com/@eko8yildiz) adresinden kanalımıza abone ol.\n\n` +
                `2️⃣ **Ekran Görüntüsü Al:** Abone olduğunu gösteren net bir fotoğraf / ekran görüntüsü al.\n\n` +
                `3️⃣ **Buraya Yükle:** Fotoğrafı **bu kanala** gönder.\n\n` +
                `⚡ Yapay zeka otomasyonumuz ekran görüntüsünü anında kontrol edecek ve özel rolünü verecektir! 🎉`
            )
            .setTimestamp()
            .setFooter({ text: 'Sentura • Eko Yıldız Abone Otomasyonu' });

        const yeniMesaj = await kanal.send(subscriberPayload({ embeds: [embed] }));
        ekoKarsilamaMesajId = yeniMesaj.id;

        await yeniMesaj.pin().catch(() => {});
        console.log('[📌 EKO] Bilgilendirme mesajı gönderildi ve sabitlendi.');

        // Sistem sabitleme mesajını sil
        setTimeout(async () => {
            const sonMesajlar = await kanal.messages.fetch({ limit: 5 }).catch(() => null);
            if (sonMesajlar) {
                const sistemMesaji = sonMesajlar.find(m => m.system && m.type === 6);
                if (sistemMesaji) await sistemMesaji.delete().catch(() => {});
            }
        }, 3000);

    } catch (err) {
        console.error('[❌ EKO] Bilgilendirme mesajı gönderilemedi:', err.message);
    }
}

module.exports = {
    ekoAbonerDatabase, ekoDailyStats, ekoCooldownSet,
    ekoFotografVarMi, ekoGuncelleIstatistik,
    ekoAboneDMEmbed, ekoKanalTebrikEmbed, ekoLogEmbed,
    EKO_GUILD_ID, EKO_KANAL_ID, EKO_ROL_ID,
    ekoKarsilamaMesajiniGonder, getEkoKarsilamaMesajId: () => ekoKarsilamaMesajId
};
