/**
 * ==============================================================================
 * SENTURA & EKO YILDIZ — GELİŞMİŞ ÖZEL GÜNLER VE BAYRAMLAR SİSTEMİ
 * ==============================================================================
 * Bu modül; 30 Ağustos Zafer Bayramı, 29 Ekim Cumhuriyet Bayramı, 23 Nisan,
 * 19 Mayıs, Yılbaşı ve dini bayramlar gibi özel günlerde:
 * - Sohbet selamlaşmalarını (selam, günaydın, iyi akşamlar vb.)
 * - YouTube abone olma tebrik ve kutlama kartlarını (V2 Container + DM Embed)
 * - Sunucuya yeni katılan üyelerin karşılama mesajlarını
 * otomatik olarak o güne özel, samimi, zengin ve temalı hale getirir.
 */

const fs = require('fs');
const path = require('path');

// Manuel test veya zorlama modu için durum nesnesi
let manuelTestOzelGunId = null;

/**
 * 30 AĞUSTOS ZAFER BAYRAMI — 32 ADET SAMİMİ VE ZENGİN SELAMLAŞMA MESAJI
 */
const zaferBayramiSelamMesajlari = [
    (u) => `Selamlar ${u}! 🇹🇷 30 Ağustos Zafer Bayramımız kutlu olsun, günün zafer coşkusuyla dolsun! 😊`,
    (u) => `Ooo selam ${u}! Zafer dolu, gururlu bir günde seni burada görmek ne güzel! Hoş geldin! 🇹🇷`,
    (u) => `Merhaba ${u}! Bugün büyük zaferin günü! 🇹🇷 Başta Gazi Mustafa Kemal Atatürk olmak üzere tüm kahramanlarımızı saygıyla anarken sana da kocaman selamlar!`,
    (u) => `Selam dostum ${u}! 30 Ağustos ruhuyla dopdolu, harika ve capcanlı bir gün geçirmeni dilerim! 🌟🇹🇷`,
    (u) => `Heyy ${u}, selamlar! Bu şanlı zafer gününde aramıza katılman ne güzel, günün kutlu olsun! ✨`,
    (u) => `Selam canım ${u}! 🇹🇷 Şanlı tarihimizin en büyük zaferlerinden birinde seninle selamlaşmak ayrı bir keyif. Nasılsın bakalım?`,
    (u) => `Merhabalar ${u}! Zafer Bayramı'mızın coşkusu yüreğinde, neşesi gününde olsun. Hoş geldin sefalar getirdin! 🎈`,
    (u) => `Selam ${u}! 🇹🇷 Bağımsızlık ateşimizin hiç sönmediği bu kutlu günde sana ve sevdiklerine kucak dolusu sevgiler!`,
    (u) => `Hey ${u}! Zafer bayrağımızın dalgalandığı bu harika günde selamların en güzeli sana olsun! 🇹🇷 Nasılsın dostum?`,
    (u) => `Selamlar efenim ${u}! 30 Ağustos Zafer Bayramı'nın getirdiği gurur ve mutluluk hep bizimle olsun, hoş geldin! 🌟`,
    (u) => `Aleyküm selam / Merhaba ${u}! Bugün kalbimiz ayrı bir gururla çarpıyor, Zafer Bayramımız kutlu olsun! 🇹🇷`,
    (u) => `Vay ${u}, selamlar! 30 Ağustos'un enerjisi ve coşkusu üstünde olsun, günün muhteşem geçsin! 💪🇹🇷`,
    (u) => `Selam ${u}! 🇹🇷 'Ya istiklal ya ölüm' diyenlerin zafer gününden sana kucak dolusu selamlar!`,
    (u) => `Merhabalaaar ${u}! Zafer Bayramı tatilinin ve bu kutlu günün tadını çıkarıyor musun? Ne var ne yok? 😊`,
    (u) => `Selam ${u}! Bugün milletçe göğsümüzün kabardığı gün. Seninle bu bayram gününde burada olmak harika! 🇹🇷`,
    (u) => `Hey ${u}! Şanlı 30 Ağustos Zafer Bayramı kutlu olsun dostum. Umarım her şey gönlünce gidiyordur! 🌸`,
    (u) => `Selammm ${u}! Zaferimizin ışıltısı gününü aydınlatsın, aramıza hoş geldin! 🇹🇷✨`,
    (u) => `Kocaman selamlar ${u}! 30 Ağustos Zafer Bayramı gibi nice güzel zaferler kazanacağın bir hayatın olsun! 🎖️`,
    (u) => `Selam ${u}! Gurur duyduğumuz bu özel günde seni görmek içimizi ısıttı, günün aydın olsun! 🇹🇷`,
    (u) => `Merhabalar ${u}! 30 Ağustos ruhunu birlikte yaşamak ne güzel. Nasılsın, keyifler yerinde mi? 😊`,
    (u) => `Selamlar dostum ${u}! Büyük Taarruz'un zaferle taçlandığı bu anlamlı günde sana selamların en içtenini gönderiyorum! 🇹🇷`,
    (u) => `Heyy ${u}! Zafer coşkumuz daim, neşen bol olsun. 30 Ağustos Zafer Bayramımız kutlu olsun! 🎉`,
    (u) => `Selam ${u}! 🇹🇷 Bugün bağımsızlığımızın ve dik duruşumuzun simgesi olan bir bayram. Birlikte kutlamak çok güzel!`,
    (u) => `Merhabalar ${u}! Zafer dolu bir günden, zafer gibi güzel kalpli insanlara selamlar olsun! Hoş geldin! 💖`,
    (u) => `Selam ${u}! 30 Ağustos Zafer Bayramı vesilesiyle sana sağlık, mutluluk ve başarı dolu günler dilerim! 🇹🇷`,
    (u) => `Ooo kimler gelmiş, selam ${u}! Zafer Bayramımızın sevinci yüzünden hiç eksilmesin, naber? 😄`,
    (u) => `Selam ${u}! Gazi Paşa ve silah arkadaşlarını minnetle andığımız bu kutlu günde sana sıcacık bir merhaba! 🇹🇷`,
    (u) => `Selaaam ${u}! Zafer Bayramı şerefine bugün enerjimiz tavan, umarım senin de öyledir! 🚀🇹🇷`,
    (u) => `Merhabalar ${u}! 30 Ağustos Zafer Bayramı'nın getirdiği umut ve inanç daima yolunu aydınlatsın. Hoş geldin! ✨`,
    (u) => `Selamlar sevgili ${u}! 🇹🇷 Büyük Zafer'in yıl dönümünde kalpten kalbe selamlar, iyi ki aramızdasın!`,
    (u) => `Hey ${u}! Milletimizin şanlı zafer gününde seni burada görmek çok güzel. Bayramımız kutlu olsun! 🇹🇷🎊`,
    (u) => `Sımsıcak bir selam sana ${u}! 30 Ağustos Zafer Bayramı'nın onuru ve neşesiyle dolu harika bir gün dilerim! 🇹🇷❤️`
];

const zaferBayramiGunaydinMesajlari = [
    (u) => `Günaydın ${u}! 🇹🇷 Zafer sabahından, şanlı 30 Ağustos gününden kucak dolusu sevgiler!`,
    (u) => `Günaydın ${u}! 🌅 30 Ağustos Zafer Bayramı'mızın coşkusuyla uyandığımız bu şahane günün tadını çıkar!`,
    (u) => `Zafer dolu bir sabahtan günaydın ${u}! ☕ Enerjin bol, bayramın kutlu olsun!`,
    (u) => `Sabahın en güzel saatlerinde, 30 Ağustos Zafer Bayramı gururuyla günaydın ${u}! 🇹🇷✨`,
    (u) => `Günaydınlar ${u}! Büyük Zafer'in aydınlığı gününü taçlandırsın! 🇹🇷`
];

const zaferBayramiAksamMesajlari = [
    (u) => `İyi akşamlar ${u}! 🇹🇷 30 Ağustos Zafer Bayramı akşamında sevdiklerinle huzurlu ve neşeli vakitler dilerim!`,
    (u) => `Zafer Bayramı'nın gurur dolu akşamından iyi akşamlar ${u}! Günün nasıl geçti bakalım? ✨`,
    (u) => `İyi akşamlar ${u}! 🇹🇷 Bayram coşkusuyla geçen güzel bir günün ardından keyifli akşamlar!`
];

/**
 * 29 EKİM CUMHURİYET BAYRAMI MESAJLARI
 */
const cumhuriyetBayramiSelamMesajlari = [
    (u) => `Selamlar ${u}! 🇹🇷 Cumhuriyetimizin ilan edildiği bu şanlı günde 29 Ekim Cumhuriyet Bayramımız kutlu olsun!`,
    (u) => `Merhaba ${u}! Yaşasın Cumhuriyet! 🇹🇷 Başta Mustafa Kemal Atatürk olmak üzere cumhuriyet kahramanlarımızı minnetle anıyor, sana sımsıcak selamlar gönderiyorum!`,
    (u) => `Selam ${u}! 🇹🇷 Cumhuriyetimizin ışığı yolunu daima aydınlatsın, hoş geldin sefalar getirdin!`,
    (u) => `Heyy ${u}! Bugün en büyük bayram, kutlu olsun! 🇹🇷 Seninle bu bayramı kutlamak harika bir duygu!`,
    (u) => `Kocaman bir selam sana ${u}! 🇹🇷 Cumhuriyet ilelebet payidar kalsın, günün bayram coşkusuyla geçsin!`
];

/**
 * 23 NİSAN ULUSAL EGEMENLİK VE ÇOCUK BAYRAMI
 */
const cocukBayramiSelamMesajlari = [
    (u) => `Selamlar ${u}! 🎈 23 Nisan Ulusal Egemenlik ve Çocuk Bayramımız kutlu olsun! İçindeki çocuğu hiç kaybetme!`,
    (u) => `Merhaba ${u}! Dünyada çocuklara armağan edilmiş tek bayramdan sana sımsıcak kucak dolusu selamlar! 🇹🇷✨`,
    (u) => `Heyy ${u}! Neşe dolu, cıvıl cıvıl bir 23 Nisan gününden selamlar! Yüzün hep gülsün! 😊`,
    (u) => `Selam ${u}! 23 Nisan coşkusu yüreğini sarsın, günün çocuk saflığı ve neşesiyle geçsin! 🎈🇹🇷`
];

/**
 * 19 MAYIS GENÇLİK VE SPOR BAYRAMI
 */
const genclikBayramiSelamMesajlari = [
    (u) => `Selamlar ${u}! 🇹🇷 19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramımız kutlu olsun! Gençliğin ve dinamizmin hiç bitmesin!`,
    (u) => `Merhaba ${u}! Samsun'da yakılan bağımsızlık meşalesinin aydınlığında sana kucak dolusu selamlar! 🇹🇷✨`,
    (u) => `Hey ${u}! Gençlik ateşi ve spor ruhuyla dolu harika bir 19 Mayıs gününden selamlar, hoş geldin! 💪`
];

/**
 * 1 OCAK YILBAŞI / YENİ YIL MESAJLARI
 */
const yeniYilSelamMesajlari = [
    (u) => `Mutlu Yıllar ${u}! 🎄 Yeni yıl sana sağlık, huzur, başarı ve sevdiklerinle bol kahkaha getirsin! Hoş geldin!`,
    (u) => `Selam ${u}! ❄️ Yeni yılın ilk günlerinden kucak dolusu sevgiler, bu yıl senin yılın olsun! 🥳`,
    (u) => `Yeni yılda da birlikteyiz! Selamlar ${u}, yeni yılın kutlu, neşen bol olsun! 🎁✨`
];

/**
 * RAMAZAN / KURBAN BAYRAMI MESAJLARI
 */
const diniBayramSelamMesajlari = [
    (u) => `Hayırlı ve mutlu bayramlar ${u}! 🍬 Sevdiklerinle beraber şeker tadında, huzur dolu bir bayram dilerim!`,
    (u) => `Selamlar ${u}! Bayramın mübarek olsun, hanene sağlık, huzur ve bereket dolsun! 🌸`,
    (u) => `İyi bayramlar dostum ${u}! Büyüklerin ellerinden, küçüklerin gözlerinden öpüldüğü bu güzel günde selamlar! 💖`
];

/**
 * TÜM ÖZEL GÜN TANIMLARI
 */
const OZEL_GUNLER = {
    'zafer_bayrami': {
        id: 'zafer_bayrami',
        name: '30 Ağustos Zafer Bayramı',
        shortName: 'Zafer Bayramı',
        emoji: '🇹🇷',
        accentColor: 0xE30A17, // Türk Bayrağı Kırmızısı
        accentHex: '#E30A17',
        // Tarih filtresi: 30 Ağustos (Ay 8, Gün 30)
        matchDate: (month, day) => month === 8 && day === 30,
        aboneBaslik: '🇹🇷 30 Ağustos Zafer Bayramı Özel — Yeni Eko Yıldız Abonesi!',
        aboneTebrikAciklama: (username, roleName) => 
            `**${username}**, şanlı **30 Ağustos Zafer Bayramı** coşkusuyla YouTube kanalımıza abone olarak **${roleName}** rolünü kazandı! Büyük Zafer'in yıl dönümünde aramıza hoş geldin şampiyon! ⭐🇹🇷`,
        aboneDmNotu: 
            `🇹🇷 **30 Ağustos Zafer Bayramımız Kutlu Olsun!**\n` +
            `Gazi Mustafa Kemal Atatürk ve silah arkadaşlarının bize armağan ettiği bu şanlı zafer gününde Eko Yıldız ailemize katıldınız! Aramıza hoş geldiniz! ⭐`,
        welcomeBanner: (username, guildName) => 
            `## 🇹🇷 30 Ağustos Zafer Bayramı'nda Hoş Geldin, ${username}!\n` +
            `Şanlı zaferimizin yıl dönümünde **${guildName}** ailemize katıldın! Bayram coşkusuyla sefalar getirdin! 🎉`,
        selamlar: zaferBayramiSelamMesajlari,
        gunaydinlar: zaferBayramiGunaydinMesajlari,
        aksamlar: zaferBayramiAksamMesajlari
    },

    'cumhuriyet_bayrami': {
        id: 'cumhuriyet_bayrami',
        name: '29 Ekim Cumhuriyet Bayramı',
        shortName: 'Cumhuriyet Bayramı',
        emoji: '🇹🇷',
        accentColor: 0xE30A17,
        accentHex: '#E30A17',
        matchDate: (month, day) => month === 10 && day === 29,
        aboneBaslik: '🇹🇷 29 Ekim Cumhuriyet Bayramı Özel — Yeni Eko Yıldız Abonesi!',
        aboneTebrikAciklama: (username, roleName) => 
            `**${username}**, Cumhuriyetimizin ışığında YouTube kanalımıza abone olarak **${roleName}** rolünü kazandı! Yaşasın Cumhuriyet! ⭐🇹🇷`,
        aboneDmNotu: 
            `🇹🇷 **29 Ekim Cumhuriyet Bayramımız Kutlu Olsun!**\n` +
            `Cumhuriyetimizin kurulduğu bu onurlu günde ailemize katıldınız! Hoş geldiniz!`,
        welcomeBanner: (username, guildName) => 
            `## 🇹🇷 Cumhuriyet Coşkusuyla Hoş Geldin, ${username}!\n` +
            `29 Ekim Cumhuriyet Bayramı'nda **${guildName}** sunucumuza katıldın!`,
        selamlar: cumhuriyetBayramiSelamMesajlari
    },

    'cocuk_bayrami': {
        id: 'cocuk_bayrami',
        name: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı',
        shortName: '23 Nisan',
        emoji: '🎈',
        accentColor: 0x00B4D8,
        accentHex: '#00B4D8',
        matchDate: (month, day) => month === 4 && day === 23,
        aboneBaslik: '🎈 23 Nisan Çocuk Bayramı Özel — Yeni Eko Yıldız Abonesi!',
        aboneTebrikAciklama: (username, roleName) => 
            `**${username}**, 23 Nisan neşesiyle kanalımıza abone olarak **${roleName}** rolünü kazandı! Bayramımız kutlu olsun! 🎉`,
        aboneDmNotu: `🎈 23 Nisan Ulusal Egemenlik ve Çocuk Bayramımız kutlu olsun! Ailemize hoş geldin!`,
        welcomeBanner: (username, guildName) => 
            `## 🎈 23 Nisan Neşesiyle Hoş Geldin, ${username}!\n` +
            `**${guildName}** ailemize bayram coşkusuyla katıldın!`,
        selamlar: cocukBayramiSelamMesajlari
    },

    'genclik_bayrami': {
        id: 'genclik_bayrami',
        name: '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı',
        shortName: '19 Mayıs',
        emoji: '⚡',
        accentColor: 0xFF9F1C,
        accentHex: '#FF9F1C',
        matchDate: (month, day) => month === 5 && day === 19,
        aboneBaslik: '⚡ 19 Mayıs Gençlik Bayramı Özel — Yeni Eko Yıldız Abonesi!',
        aboneTebrikAciklama: (username, roleName) => 
            `**${username}**, 19 Mayıs gençlik enerjisiyle YouTube kanalımıza abone olarak **${roleName}** rolünü kazandı! 🇹🇷`,
        aboneDmNotu: `⚡ 19 Mayıs Gençlik ve Spor Bayramımız kutlu olsun! Aramıza hoş geldin!`,
        welcomeBanner: (username, guildName) => 
            `## ⚡ 19 Mayıs Coşkusuyla Hoş Geldin, ${username}!\n` +
            `**${guildName}** sunucumuza sefalar getirdin!`,
        selamlar: genclikBayramiSelamMesajlari
    },

    'yeni_yil': {
        id: 'yeni_yil',
        name: 'Mutlu Yıllar (Yeni Yıl)',
        shortName: 'Yeni Yıl',
        emoji: '🎄',
        accentColor: 0x2EC4B6,
        accentHex: '#2EC4B6',
        matchDate: (month, day) => (month === 12 && day === 31) || (month === 1 && day === 1),
        aboneBaslik: '🎄 Yeni Yıl Özel — Yeni Eko Yıldız Abonesi!',
        aboneTebrikAciklama: (username, roleName) => 
            `**${username}**, yeni yıl coşkusuyla YouTube kanalımıza abone olarak **${roleName}** rolünü kazandı! Yeni yılın kutlu olsun! 🥳`,
        aboneDmNotu: `🎄 Mutlu Yıllar! Yeni yılın ilk günlerinde Eko Yıldız ailemize katıldınız, hoş geldiniz!`,
        welcomeBanner: (username, guildName) => 
            `## 🎄 Yeni Yıl Neşesiyle Hoş Geldin, ${username}!\n` +
            `Yeni yılda **${guildName}** ailemize sefalar getirdin!`,
        selamlar: yeniYilSelamMesajlari
    },

    'sevgililer_gunu': {
        id: 'sevgililer_gunu',
        name: '14 Şubat Sevgililer Günü',
        shortName: 'Sevgililer Günü',
        emoji: '💖',
        accentColor: 0xE63946,
        accentHex: '#E63946',
        matchDate: (month, day) => month === 2 && day === 14,
        aboneBaslik: '💖 14 Şubat Özel — Yeni Eko Yıldız Abonesi!',
        aboneTebrikAciklama: (username, roleName) => 
            `**${username}**, sevgi dolu bir günde kanalımıza abone olarak **${roleName}** rolünü kazandı! Aramıza hoş geldin! 💕`,
        aboneDmNotu: `💖 Sevginin ve dostluğun paylaşıldığı bu güzel günde Eko Yıldız ailemize katıldınız!`,
        welcomeBanner: (username, guildName) => 
            `## 💖 Sevgi Dolu Günde Hoş Geldin, ${username}!\n` +
            `**${guildName}** sunucumuza hoş geldin!`,
        selamlar: [
            (u) => `Selamlar ${u}! 💖 Sevgi ve dostluk dolu harika bir 14 Şubat dilerim, hoş geldin!`,
            (u) => `Merhaba ${u}! Bugün kalplerin sevgiyle attığı gün, selamların en güzeli sana olsun! 💕`
        ]
    }
};

/**
 * Şu an aktif olan özel günü döner.
 * Manuel test modu açıksa doğrudan onu döner, yoksa sistem tarihine bakar.
 */
function getAktifOzelGun(customDate = null) {
    if (manuelTestOzelGunId && OZEL_GUNLER[manuelTestOzelGunId]) {
        return OZEL_GUNLER[manuelTestOzelGunId];
    }

    const d = customDate || new Date();
    // Türkiye saati (UTC+3) hesabı
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const trDate = new Date(utc + (3600000 * 3));

    const month = trDate.getMonth() + 1; // 1-12
    const day = trDate.getDate();        // 1-31

    for (const key of Object.keys(OZEL_GUNLER)) {
        const gun = OZEL_GUNLER[key];
        if (typeof gun.matchDate === 'function' && gun.matchDate(month, day)) {
            return gun;
        }
    }

    return null;
}

/**
 * Özel gün için uygun selamlama yanıtını çeker.
 * Eğer o gün ve o kategori için özel mesaj yoksa null döner (varsayılan sisteme düşer).
 */
function getOzelGunSelamMesaji(tip, kullaniciAdi) {
    const aktifGun = getAktifOzelGun();
    if (!aktifGun) return null;

    let havuz = null;
    if (tip === 'selam' && aktifGun.selamlar && aktifGun.selamlar.length > 0) {
        havuz = aktifGun.selamlar;
    } else if (tip === 'günaydın' && aktifGun.gunaydinlar && aktifGun.gunaydinlar.length > 0) {
        havuz = aktifGun.gunaydinlar;
    } else if (tip === 'iyi akşamlar' && aktifGun.aksamlar && aktifGun.aksamlar.length > 0) {
        havuz = aktifGun.aksamlar;
    } else if (aktifGun.selamlar && aktifGun.selamlar.length > 0 && (tip === 'selam' || tip === 'hoş geldin')) {
        havuz = aktifGun.selamlar;
    }

    if (!havuz || havuz.length === 0) return null;

    const fn = havuz[Math.floor(Math.random() * havuz.length)];
    return typeof fn === 'function' ? fn(kullaniciAdi) : fn;
}

/**
 * Test ve simulasyon için manuel özel gün belirle
 */
function setTestOzelGun(id) {
    if (!id || id === 'none' || id === 'sifirla') {
        manuelTestOzelGunId = null;
        return null;
    }
    if (OZEL_GUNLER[id]) {
        manuelTestOzelGunId = id;
        return OZEL_GUNLER[id];
    }
    return null;
}

function getTestOzelGunId() {
    return manuelTestOzelGunId;
}

function getTumOzelGunler() {
    return OZEL_GUNLER;
}

module.exports = {
    OZEL_GUNLER,
    getAktifOzelGun,
    getOzelGunSelamMesaji,
    setTestOzelGun,
    getTestOzelGunId,
    getTumOzelGunler
};
