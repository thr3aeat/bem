const express = require('express');
const crypto = require('crypto');
const { createVerificationCode, verifyCode } = require('./modules/subscriptionPortalAuth');
const app = express();

app.use(express.json());

const status = {
    isGameOpen: true,
    isMarketOpen: true,
    isAdaletSarayOpen: false
};

// Roblox sunucularından gelen verileri saklamak için
const robloxServers = new Map();
const loginCodes = new Map();
const sessions = new Map();
const codeRequestTimes = new Map();

function parseCookies(req) {
    return Object.fromEntries((req.headers.cookie || '').split(';').map(item => item.trim().split('=').map(decodeURIComponent)).filter(([key]) => key));
}

function subscriptionPage(title, body) {
    return `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font:16px system-ui;background:#07172b;color:#e8f4ff;max-width:680px;margin:8vh auto;padding:24px}.card{background:#102b4b;border:1px solid #2478bd;border-radius:18px;padding:28px}input,button{box-sizing:border-box;width:100%;padding:12px;margin:8px 0;border-radius:9px;border:0}button{background:#2aa8ff;color:#04203a;font-weight:700}</style><main class="card"><h1>🦎 ${title}</h1>${body}</main></html>`;
}

// Cronjob & Render Keep-Alive Endpoints (24/7 Uptime)
app.get(['/', '/ping', '/health'], (req, res) => {
    res.status(200).json({
        status: 'online',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

app.get('/check-status', (req, res) => {
    res.json({
        open: status.isGameOpen,
        market: status.isMarketOpen,
        adaletSaray: status.isAdaletSarayOpen
    });
});

app.post('/api/oc-playerlist', (req, res) => {
    const secret = req.headers['x-nexus-secret'];
    if (secret !== 'senturabem') return res.status(403).json({ error: 'Unauthorized' });

    const { serverId, placeId, userIds, serverBans } = req.body;

    robloxServers.set(serverId, {
        placeId,
        players: userIds || [],
        bans: serverBans || [],
        lastUpdate: Date.now()
    });

    // 5 dakika boyunca güncellenmeyen sunucuları temizle
    const now = Date.now();
    for (const [id, data] of robloxServers.entries()) {
        if (now - data.lastUpdate > 300000) robloxServers.delete(id);
    }

    res.json({ success: true });
});

app.post('/update-adalet', (req, res) => {
    const { status: newStatus } = req.body;

    if (typeof newStatus === 'boolean') {
        status.isAdaletSarayOpen = newStatus;
        res.json({ success: true, current: status.isAdaletSarayOpen });
    } else {
        res.status(400).json({ success: false, error: 'Geçersiz veri tipi.' });
    }
});

const startApi = (port, client) => {
    app.get('/subscription', (_req, res) => res.send(subscriptionPage('Abone Doğrulama Merkezi', '<p>Discord kullanıcı ID’ni gir. Mavi aksolotl sana DM’den tek kullanımlık kod gönderecek.</p><form method="post" action="/subscription/code"><input name="discordId" inputmode="numeric" placeholder="Discord kullanıcı ID" required><button>Kod Gönder</button></form>')));
    app.post('/subscription/code', express.urlencoded({ extended: false }), async (req, res) => {
        const discordId = String(req.body.discordId || '').trim();
        if (!/^\d{17,20}$/.test(discordId)) return res.status(400).send(subscriptionPage('Geçersiz bilgi', '<p>Discord kullanıcı ID’ni doğru gir.</p>'));
        if (Date.now() - (codeRequestTimes.get(discordId) || 0) < 60000) return res.status(429).send(subscriptionPage('Biraz bekle', '<p>Yeni kod için kısa süre bekle.</p>'));
        const user = await client?.users.fetch(discordId).catch(() => null);
        if (!user) return res.status(404).send(subscriptionPage('Kullanıcı bulunamadı', '<p>ID ile eşleşen Discord kullanıcısı bulunamadı.</p>'));
        const record = createVerificationCode(discordId); loginCodes.set(discordId, record); codeRequestTimes.set(discordId, Date.now());
        try { await user.send(`💙 Abone Merkezi giriş kodun: **${record.code}**\nBu kod 10 dakika geçerlidir; kimseyle paylaşma.`); }
        catch { return res.status(409).send(subscriptionPage('DM kapalı', '<p>Discord DM’lerini açıp tekrar dene.</p>')); }
        res.send(subscriptionPage('Kodu gir', `<form method="post" action="/subscription/verify"><input type="hidden" name="discordId" value="${discordId}"><input name="code" inputmode="numeric" placeholder="6 haneli kod" required><button>Doğrula</button></form>`));
    });
    app.post('/subscription/verify', express.urlencoded({ extended: false }), (req, res) => {
        const discordId = String(req.body.discordId || ''); const record = loginCodes.get(discordId); const result = verifyCode(record, String(req.body.code || '').trim());
        if (!result.ok) return res.status(400).send(subscriptionPage('Kod geçersiz', '<p>Kod hatalı, kullanılmış veya süresi dolmuş.</p>'));
        record.usedAt = Date.now(); const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, { discordId, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
        res.setHeader('Set-Cookie', `subscription_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`); res.redirect('/subscription/me');
    });
    app.get('/subscription/me', (req, res) => {
        const session = sessions.get(parseCookies(req).subscription_session); if (!session || session.expiresAt < Date.now()) return res.redirect('/subscription');
        const subscribers = require('./modules/ekoUtils').ekoAbonerDatabase; const data = subscribers.get(session.discordId) || {};
        res.send(subscriptionPage('Başvuru Durumun', `<p>Durum: <b>${data.status || (data.totalPhotos ? 'Onaylandı' : 'Kayıt bulunamadı')}</b></p><p>Toplam görsel: ${data.totalPhotos || 0}</p><p>Son işlem: ${data.lastPhotoAt || '—'}</p>`));
    });
    app.listen(port, '0.0.0.0', () => {
        console.log(`[🌐 API] 24/7 Web servisi ve Keep-Alive endpointleri ${port} portunda (0.0.0.0) aktif.`);
    });

    // Otomatik Self-Ping (Render URL tanımlı ise her 5 dakikada bir kendini pingler)
    const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.PROJECT_URL;
    if (selfUrl) {
        setInterval(() => {
            fetch(`${selfUrl}/ping`)
                .then(() => console.log('[🔄 KEEP-ALIVE] Self-ping başarılı.'))
                .catch(err => console.warn('[⚠️ KEEP-ALIVE] Self-ping hatası:', err.message));
        }, 5 * 60 * 1000);
    }
};

module.exports = { status, startApi, robloxServers };
