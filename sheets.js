const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1v0fJ_RJQA33sdYvYP6sJzg10zzT-usXoaNltYwzQSjQ';
const TAB = process.env.GOOGLE_SHEET_TAB || 'Sheet1';

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

function loadCreds() {
  const inline = process.env.GOOGLE_SHEETS_CREDS_JSON;
  if (inline) return JSON.parse(inline);
  const path = process.env.GOOGLE_CREDS_PATH || `${process.env.HOME}/google-sheets-creds.json`;
  return require(path);
}

function getSheetsClient() {
  const creds = loadCreds();
  const auth = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth });
}

function generateClientId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `CL-${y}${m}${day}-${rand}`;
}

function nowKL() {
  return new Date().toLocaleString('en-CA', { timeZone: 'Asia/Kuala_Lumpur', hour12: false }).replace(',', '');
}

function buildRow(d, shareUrl) {
  return [
    nowKL(),                                                     // timestamp
    generateClientId(),                                          // client_id
    d.bizName || '',                                             // business_name
    d.bizType || '',                                             // industry
    d.name || '',                                                // contact_name
    d.phone || '',                                               // contact_wa
    d.bizPhone || '',                                            // business_wa
    (d.flows || []).map(f => FLOW_LABELS[f] || f).join(', '),    // flows_needed
    (d.pain || []).join(', '),                                   // pain_points
    d.volume || '',                                              // volume
    d.urgency || '',                                             // urgency
    d.hours || '',                                               // operating_hours
    HANDOFF_LABELS[d.handoff] || d.handoff || '',                // handoff_method
    d.deal || '',                                                // deal_value
    d.products || '',                                            // products
    shareUrl || '',                                              // share_url
    'new',                                                       // status
    '', '', '', '', '', ''                                       // builder_output, qa_result, group_id, mrr, renewal_date, health_score
  ];
}

async function appendRow(d, shareUrl) {
  const sheets = getSheetsClient();
  const row = buildRow(d, shareUrl);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A:W`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });
  return row[1]; // client_id
}

module.exports = { appendRow };
