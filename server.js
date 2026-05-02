require('dotenv').config();
const express = require('express');
const path = require('path');
const { appendRow } = require('./sheets');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

    // WA notification disabled — sheet write only for now.
    // Re-enable: await sendWhatsApp(buildMessage(d, shareUrl, clientId));

    res.json({ ok: true, shareUrl, clientId });
  } catch (e) {
    console.error('[submit error]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Flow Builder → http://localhost:${PORT}`));
