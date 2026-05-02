require('dotenv').config();
const express = require('express');
const path = require('path');
const OpenAI = require('openai');
const { appendRow } = require('./sheets');
const { build, getDemoConfig } = require('./builder');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MODEL_CHAT = process.env.OPENAI_MODEL_CHAT || 'gpt-4o-mini';
const DEMO_MAX_TURNS = parseInt(process.env.DEMO_MAX_TURNS || '20', 10);
const DEMO_WA_SEND_ENABLED = process.env.DEMO_WA_SEND_ENABLED === 'true';
const DEMO_SEND_FROM_ACCOUNT = process.env.DEMO_SEND_FROM_ACCOUNT || ''; // gated until Benjamin picks

const CD_TOKEN   = process.env.CHATDADDY_TOKEN;
const CD_ACCOUNT = process.env.CHATDADDY_ACCOUNT || 'acc_5f2dc399-5107-4497-aa_fa91';
const BENJAMIN   = process.env.BENJAMIN_WA || '60162393812@s.whatsapp.net';
const BASE_URL   = process.env.BASE_URL || 'http://localhost:3000';

async function sendWhatsApp(text) {
  if (!CD_TOKEN) { console.log('[WA skipped — no token]\n', text); return; }
  const fetch = (...a) => import('node-fetch').then(m => m.default(...a));
  const res = await fetch(`https://api-im.chatdaddy.tech/messages?accountId=${CD_ACCOUNT}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CD_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: BENJAMIN, message: text })
  });
  if (!res.ok) console.error('[WA error]', res.status, await res.text());
}

const FLOW_LABELS = {
  'lead-qualify': 'Lead Qualify',
  'follow-up':    'Follow-Up Sequence',
  'appointment':  'Appointment Booking',
  'order-intake': 'Order Intake',
  'renewal':      'Renewal Reminder'
};

const HANDOFF_LABELS = {
  'owner-call':     'You call within 2h',
  'calendar-link':  'AI books a slot',
  'whatsapp-close': 'AI closes in chat',
  'visit-invite':   'Invite to visit'
};

function buildMessage(d, shareUrl, clientId) {
  const flows   = (d.flows || []).map(f => FLOW_LABELS[f] || f).join(', ') || '—';
  const pain    = (d.pain  || []).join(', ') || '—';
  const handoff = HANDOFF_LABELS[d.handoff] || d.handoff || '—';
  const phone   = (d.phone || '').replace(/[^0-9]/g, '');
  const idLine  = clientId ? `\n🆔 *Client ID:* ${clientId}` : '';

  return `🔔 *New AI Flow Submission*${idLine}

🏢 *Business:* ${d.bizName} (${d.bizType})
👤 *Contact:* ${d.name || '—'} · ${d.phone || 'no phone'}
📱 *Biz WA:* ${d.bizPhone || '—'}

⚙️ *Flows:* ${flows}
📊 *Volume:* ${d.volume || '—'}/day · Urgency: ${d.urgency || '—'}
🕐 *Hours:* ${d.hours || '—'}
🎯 *Hot lead handoff:* ${handoff}
💰 *Deal value:* ${d.deal || '—'}

😓 *Pain points:* ${pain}
📦 *Products:* ${d.products || '—'}

📋 *Blueprint (private):* ${shareUrl}
💬 *Call them:* wa.me/${phone}`;
}

function validate(d) {
  const errors = [];
  const has = v => typeof v === 'string' && v.trim().length > 0;
  const hasArr = v => Array.isArray(v) && v.length > 0;

  if (!has(d.bizName))   errors.push('business name is required');
  if (!has(d.bizType))   errors.push('business type is required');
  if (!hasArr(d.pain))   errors.push('select at least one pain point');
  if (!has(d.volume))    errors.push('volume is required');
  if (!has(d.urgency))   errors.push('urgency is required');
  if (!hasArr(d.flows))  errors.push('select at least one AI flow');
  if (!has(d.hours))     errors.push('operating hours required');
  if (!has(d.handoff))   errors.push('handoff method required');
  if (!has(d.deal))      errors.push('deal value required');
  if (!has(d.name))      errors.push('your name is required');
  if (!has(d.phone))     errors.push('your WhatsApp number is required');
  else if (d.phone.replace(/\D/g, '').length < 10) errors.push('phone must have at least 10 digits');
  if (!has(d.bizPhone))  errors.push('business WhatsApp number is required');

  return errors;
}

app.post('/api/submit', async (req, res) => {
  try {
    const d = req.body;

    const errors = validate(d);
    if (errors.length) {
      return res.status(400).json({ ok: false, errors });
    }

    const hash = Buffer.from(encodeURIComponent(JSON.stringify(d))).toString('base64');
    const shareUrl = `${BASE_URL}/#${hash}`;

    let clientId = null;
    try {
      clientId = await appendRow(d, shareUrl);
      console.log(`[sheet] row appended: ${clientId}`);
    } catch (sheetErr) {
      console.error('[sheet error]', sheetErr.message);
    }

    // Auto-fire Builder Agent (background, do not block submit response)
    if (clientId) {
      build(clientId, BASE_URL)
        .then(r => {
          console.log(`[builder] demo ready: ${r.demoUrl}`);
          if (DEMO_WA_SEND_ENABLED) {
            sendDemoUrl(d, r.demoUrl, clientId).catch(e => console.error('[wa demo] error', e.message));
          }
        })
        .catch(e => console.error('[builder error]', e.message));
    }

    // WA notification to owner disabled — sheet write only for now.
    // Re-enable: await sendWhatsApp(buildMessage(d, shareUrl, clientId));

    res.json({ ok: true, shareUrl, clientId });
  } catch (e) {
    console.error('[submit error]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── DEMO ROUTES ─────────────────────────────────────────────
app.get('/demo/:client_id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});

app.get('/api/demo/:client_id/config', async (req, res) => {
  try {
    const cfg = await getDemoConfig(req.params.client_id);
    if (!cfg) return res.status(404).json({ ok: false, error: 'client not found' });
    if (cfg.demoStatus !== 'ready') return res.status(409).json({ ok: false, error: `demo ${cfg.demoStatus || 'not ready'}` });
    res.json({
      ok: true,
      businessName: cfg.businessName,
      industry: cfg.industry,
      openingMsg: cfg.openingMsg,
      benjaminWa: cfg.benjaminWa
    });
  } catch (e) {
    console.error('[demo config]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/demo/:client_id/chat', async (req, res) => {
  try {
    const { history, sessionId } = req.body || {};
    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ ok: false, error: 'history required' });
    }
    if (history.length > DEMO_MAX_TURNS * 2) {
      return res.status(429).json({ ok: false, error: `demo limited to ${DEMO_MAX_TURNS} turns` });
    }
    const cfg = await getDemoConfig(req.params.client_id);
    if (!cfg || !cfg.systemPrompt) return res.status(404).json({ ok: false, error: 'demo not ready' });

    const JSON_FORMAT_RULE = `

=== OUTPUT FORMAT (MANDATORY JSON) ===
You MUST always reply with valid JSON of this exact shape:
{"thinking": ["short bullet 1", "short bullet 2", "short bullet 3"], "bubbles": ["bubble 1", "bubble 2"]}

- thinking: 3-5 short bullets showing reasoning (≤12 words each).
- bubbles: 1-4 short WhatsApp-style messages. Split your reply naturally — never one huge paragraph. Use 1-2 emojis max per bubble.
Return JSON only.

=== HARD RULE — PRICING (NEVER VIOLATE) ===
You are ABSOLUTELY FORBIDDEN to mention any specific price, cost, RM amount, dollar amount, percentage discount, payment number, salary, fee, or any monetary figure — UNLESS that exact number appears verbatim in the system prompt above.

If the customer asks anything about price/cost/quotation/budget (e.g. "how much", "berapa", "多少钱", "price", "cost", "harga", "rate", "fees", "deposit", "discount", "promo", "cheap", "afford"):
- DO NOT estimate, guess, approximate, give ranges, or use general market knowledge.
- DO NOT say things like "around RM X" / "starts from RM X" / "between X and Y".
- INSTEAD: warmly defer to the human team. Reply with one of these patterns (vary phrasing):
  · "Great pick! Let me get our team to send you the exact quote — what's your name and best contact?"
  · "Best to get you the latest pricing direct from our team. Can I take your name and number?"
  · BM: "Untuk harga terkini, biar team kami quote you direct. Boleh saya dapatkan nama dan no telefon you?"
  · 中文: "价格部分让我安排团队直接报给您最准。可以给我您的名字和联系方式吗？"

Examples:
USER: "How much for Proton X70?"
WRONG: {"bubbles": ["Around RM 98,000"]}
RIGHT: {"bubbles": ["Great pick on the X70! 🚗", "Best to get you the latest price direct from our team.", "Can I take your name and number?"]}

USER: "Diskaun ada?"
WRONG: {"bubbles": ["Boleh dapat 5%"]}
RIGHT: {"bubbles": ["Boleh check dengan team kami!", "Boleh share nama you dulu?"]}

This rule overrides everything. Never break it.`;

    const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await oai.chat.completions.create({
      model: MODEL_CHAT,
      messages: [
        { role: 'system', content: cfg.systemPrompt + JSON_FORMAT_RULE },
        ...history.slice(-DEMO_MAX_TURNS * 2)
      ],
      response_format: { type: 'json_object' },
      max_tokens: 600,
      temperature: 0.7
    });
    const raw = completion.choices[0].message.content;

    let thinking, bubbles;
    try {
      const parsed = JSON.parse(raw);
      thinking = Array.isArray(parsed.thinking) ? parsed.thinking : [];
      bubbles  = Array.isArray(parsed.bubbles) && parsed.bubbles.length ? parsed.bubbles : [String(parsed.reply || raw)];
    } catch {
      thinking = [];
      bubbles = String(raw).split(/\n\s*\n/).filter(Boolean);
    }

    // Safety net: scan bubbles for unauthorized money figures.
    // Allow numbers that appear in the system prompt verbatim (real product prices).
    const moneyRe = /(?:RM\s?\d|MYR\s?\d|\$\s?\d|USD\s?\d|\d+\s?(?:k|K|ribu|千|万)\b|\d{1,3}(?:[,\s]?\d{3})+|RM\s?\d+\.\d+)/g;
    const allowedNumbers = new Set(
      (cfg.systemPrompt.match(/\d[\d,\.]*/g) || []).filter(n => n.length >= 3)
    );
    bubbles = bubbles.map(b => {
      const matches = b.match(moneyRe) || [];
      const unauthorized = matches.filter(m => !Array.from(allowedNumbers).some(a => m.includes(a)));
      if (unauthorized.length === 0) return b;
      console.warn('[demo chat] blocked price hallucination:', unauthorized);
      thinking.push(`⚠️ Blocked unauthorized price: ${unauthorized.join(', ')}`);
      return `Best to get you the exact pricing direct from our team — can I take your name and contact? 📞`;
    });

    // Background log (don't block response)
    const lastUser = [...history].reverse().find(h => h.role === 'user');
    if (lastUser && sessionId) {
      logDemoChat({
        clientId: req.params.client_id,
        sessionId,
        userMsg: lastUser.content,
        bubbles,
        thinking,
        userAgent: req.get('user-agent') || ''
      }).catch(e => console.error('[chat log]', e.message));
    }

    res.json({ ok: true, thinking, bubbles });
  } catch (e) {
    console.error('[demo chat]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── Conversation logging to "DemoChats" tab ─────────────────
async function logDemoChat({ clientId, sessionId, userMsg, bubbles, thinking, userAgent }) {
  const { google } = require('googleapis');
  const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1v0fJ_RJQA33sdYvYP6sJzg10zzT-usXoaNltYwzQSjQ';

  function loadCreds() {
    const inline = process.env.GOOGLE_SHEETS_CREDS_JSON;
    if (inline) return JSON.parse(inline);
    return require(process.env.GOOGLE_CREDS_PATH || `${process.env.HOME}/google-sheets-creds.json`);
  }
  const c = loadCreds();
  const auth = new google.auth.JWT(c.client_email, null, c.private_key, ['https://www.googleapis.com/auth/spreadsheets']);
  const sheets = google.sheets({ version: 'v4', auth });

  const now = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Kuala_Lumpur', hour12: false }).replace(',', '');
  const rows = [
    [now, clientId, sessionId, 'user', userMsg, '', '', userAgent.slice(0, 200)],
    [now, clientId, sessionId, 'ai', bubbles.join(' ⏎ '), (thinking || []).join(' | '), String(bubbles.length), '']
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'DemoChats!A:H',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows }
  });
}

// Manual rebuild trigger (for the upcoming Apps Script "Build Now" button + cron)
app.post('/api/build/:client_id', async (req, res) => {
  try {
    const r = await build(req.params.client_id, BASE_URL);
    res.json(r);
  } catch (e) {
    console.error('[manual build]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// WA send demo URL — gated. Built but inactive until Benjamin picks the sender account.
async function sendDemoUrl(d, demoUrl, clientId) {
  if (!DEMO_WA_SEND_ENABLED) {
    console.log('[wa demo] skipped (DEMO_WA_SEND_ENABLED=false)');
    return;
  }
  if (!CD_TOKEN || !DEMO_SEND_FROM_ACCOUNT) {
    console.log('[wa demo] skipped — missing token/account');
    return;
  }
  const phone = (d.phone || '').replace(/\D/g, '');
  if (!phone) return;
  const text = `Hi ${d.name || 'there'} 👋\n\nYour AI demo is ready:\n${demoUrl}\n\nClick the link to try it — type any question, see how your AI would reply 24/7.\n\n— Benjamin`;
  const fetch = (...a) => import('node-fetch').then(m => m.default(...a));
  const r = await fetch(`https://api-im.chatdaddy.tech/messages?accountId=${DEMO_SEND_FROM_ACCOUNT}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CD_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: `${phone}@s.whatsapp.net`, message: text })
  });
  if (!r.ok) console.error('[wa demo] err', r.status, await r.text());
  else console.log(`[wa demo] sent to ${phone} — ${clientId}`);
}

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Flow Builder → http://localhost:${PORT}`));
