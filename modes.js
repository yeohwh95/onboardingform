// modes.js — reads pre-built demo modes from the "DemoModes" sheet tab.
// These are generic showcases (Sales / Service / Operations) the user can
// switch into after the lead-qualify demo, to see what AI can do beyond chat.

const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1v0fJ_RJQA33sdYvYP6sJzg10zzT-usXoaNltYwzQSjQ';
const TAB = 'DemoModes';

function loadCreds() {
  const inline = process.env.GOOGLE_SHEETS_CREDS_JSON;
  if (inline) return JSON.parse(inline);
  return require(process.env.GOOGLE_CREDS_PATH || `${process.env.HOME}/google-sheets-creds.json`);
}

function getSheets() {
  const c = loadCreds();
  const auth = new google.auth.JWT(c.client_email, null, c.private_key, ['https://www.googleapis.com/auth/spreadsheets.readonly']);
  return google.sheets({ version: 'v4', auth });
}

let cache = null;
let cacheAt = 0;
const CACHE_TTL_MS = 60_000;

async function loadModes() {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return cache;

  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A2:H`
  });
  const rows = res.data.values || [];
  const modes = rows.filter(r => r[0]).map(r => ({
    modeId:       r[0],
    businessName: r[1] || '',
    industry:     r[2] || '',
    personaName:  r[3] || '',
    description:  r[4] || '',
    icon:         r[5] || '🤖',
    openingMsg:   r[6] || 'Hi!',
    systemPrompt: r[7] || ''
  }));
  cache = modes;
  cacheAt = Date.now();
  return modes;
}

async function getMode(modeId) {
  const modes = await loadModes();
  return modes.find(m => m.modeId === modeId) || null;
}

async function listModes() {
  const modes = await loadModes();
  return modes.map(m => ({
    modeId: m.modeId,
    businessName: m.businessName,
    industry: m.industry,
    personaName: m.personaName,
    description: m.description,
    icon: m.icon
  }));
}

module.exports = { loadModes, getMode, listModes };
