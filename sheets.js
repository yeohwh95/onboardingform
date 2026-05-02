const { google } = require('googleapis');
const { buildSpec } = require('./spec');

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1v0fJ_RJQA33sdYvYP6sJzg10zzT-usXoaNltYwzQSjQ';
const TAB = process.env.GOOGLE_SHEET_TAB || 'Form CRM';

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
    nowKL(),                                                     // A  timestamp
    generateClientId(),                                          // B  client_id
    d.bizName || '',                                             // C  business_name
    d.bizType || '',                                             // D  industry
    d.name || '',                                                // E  contact_name
    d.phone || '',                                               // F  contact_wa
    d.bizPhone || '',                                            // G  business_wa
    (d.flows || []).map(f => FLOW_LABELS[f] || f).join(', '),    // H  flows_needed
    (d.pain || []).join(', '),                                   // I  pain_points (legacy — empty for new submissions)
    d.volume || '',                                              // J  volume
    d.urgency || '',                                             // K  urgency
    d.hours || '',                                               // L  operating_hours
    HANDOFF_LABELS[d.handoff] || d.handoff || '',                // M  handoff_method
    d.deal || '',                                                // N  deal_value
    d.products || '',                                            // O  products
    shareUrl || '',                                              // P  share_url
    'new',                                                       // Q  status
    '', '', '', '', '', '',                                      // R-W builder_output_path, qa_result, group_id, mrr, renewal_date, health_score
    buildSpec(d),                                                // X  build_spec
    '', '', '', '',                                              // Y-AB demo_system_prompt, demo_opening_msg, demo_url, demo_status (Builder fills)
    d.website || '',                                             // AC website
    (d.toolsUsed || []).join(', '),                              // AD tools_used
    d.manualPain || ''                                           // AE manual_pain
  ];
}

async function appendRow(d, shareUrl) {
  const sheets = getSheetsClient();
  const row = buildRow(d, shareUrl);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A:AE`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });
  return row[1]; // client_id
}

module.exports = { appendRow };
