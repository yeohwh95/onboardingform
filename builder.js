// Builder Agent — turns the Claude Code build_spec into a runnable demo:
// produces a personalized OpenAI system prompt + opening message that the
// /demo/:client_id chat endpoint will use.

const OpenAI = require('openai');
const { google } = require('googleapis');
const { buildSpec } = require('./spec');

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1v0fJ_RJQA33sdYvYP6sJzg10zzT-usXoaNltYwzQSjQ';
const TAB = process.env.GOOGLE_SHEET_TAB || 'Sheet1';
const MODEL_BUILD = process.env.OPENAI_MODEL_BUILD || 'gpt-4o-mini';

function loadCreds() {
  const inline = process.env.GOOGLE_SHEETS_CREDS_JSON;
  if (inline) return JSON.parse(inline);
  return require(process.env.GOOGLE_CREDS_PATH || `${process.env.HOME}/google-sheets-creds.json`);
}

function getSheetsClient() {
  const c = loadCreds();
  const auth = new google.auth.JWT(c.client_email, null, c.private_key, ['https://www.googleapis.com/auth/spreadsheets']);
  return google.sheets({ version: 'v4', auth });
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Headers for clarity:
const COL = {
  timestamp: 1, client_id: 2, business_name: 3, industry: 4,
  contact_name: 5, contact_wa: 6, business_wa: 7,
  flows_needed: 8, pain_points: 9, volume: 10, urgency: 11,
  operating_hours: 12, handoff_method: 13, deal_value: 14, products: 15,
  share_url: 16, status: 17,
  builder_output_path: 18, qa_result: 19,
  group_id: 20, mrr: 21, renewal_date: 22, health_score: 23,
  build_spec: 24,
  demo_system_prompt: 25, demo_opening_msg: 26, demo_url: 27, demo_status: 28
};

async function findRowByClientId(clientId) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A2:AB`
  });
  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][COL.client_id - 1] === clientId) {
      return { rowIndex: i + 2, row: rows[i] };
    }
  }
  return null;
}

function rowToFormData(row) {
  return {
    bizName:  row[COL.business_name - 1]   || '',
    bizType:  row[COL.industry - 1]        || '',
    name:     row[COL.contact_name - 1]    || '',
    phone:    row[COL.contact_wa - 1]      || '',
    bizPhone: row[COL.business_wa - 1]     || '',
    flows:    (row[COL.flows_needed - 1]   || '').split(',').map(s => s.trim()).filter(Boolean),
    pain:     (row[COL.pain_points - 1]    || '').split(',').map(s => s.trim()).filter(Boolean),
    volume:   row[COL.volume - 1]          || '',
    urgency:  row[COL.urgency - 1]         || '',
    hours:    row[COL.operating_hours - 1] || '',
    handoff:  row[COL.handoff_method - 1]  || '',
    deal:     row[COL.deal_value - 1]      || '',
    products: row[COL.products - 1]        || ''
  };
}

async function generateDemoConfig(d, spec) {
  const oai = getOpenAI();
  const prompt = `You are configuring a WhatsApp AI Agent for a real business. The business owner submitted this spec:

${spec}

Generate two things:
1. SYSTEM_PROMPT — a concise, specific system prompt (≤300 words) that makes a chat-LLM behave like ${d.bizName}'s WhatsApp assistant. Include: persona/business context, the products/services, the flows the AI should run (lead qualify, appointment booking, etc.), the qualification questions, the handoff rule. Make it feel like a real ${d.bizType || 'business'} assistant — not generic. Use plain English. The assistant should not pretend to be a human, but should be warm and professional.

2. OPENING_MESSAGE — one short, friendly first message (≤25 words) the AI sends when a customer first opens the demo. Should make the prospect want to reply. Include the business name, mention what kind of help is available.

Return JSON only with this shape:
{"system_prompt": "...", "opening_message": "..."}`;

  const completion = await oai.chat.completions.create({
    model: MODEL_BUILD,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7
  });

  const out = JSON.parse(completion.choices[0].message.content);
  if (!out.system_prompt || !out.opening_message) {
    throw new Error('OpenAI returned incomplete demo config');
  }
  return { systemPrompt: out.system_prompt, openingMsg: out.opening_message };
}

async function build(clientId, baseUrl) {
  const sheets = getSheetsClient();
  const found = await findRowByClientId(clientId);
  if (!found) throw new Error(`client_id not found: ${clientId}`);
  const { rowIndex, row } = found;

  // Mark as building
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!AB${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['building']] }
  });

  try {
    const d = rowToFormData(row);
    const spec = row[COL.build_spec - 1] || buildSpec(d);

    const { systemPrompt, openingMsg } = await generateDemoConfig(d, spec);
    const demoUrl = `${baseUrl}/demo/${clientId}`;

    // Write demo_system_prompt, demo_opening_msg, demo_url, demo_status (Y..AB)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!Y${rowIndex}:AB${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[systemPrompt, openingMsg, demoUrl, 'ready']] }
    });

    // Set top-level status to demo_ready
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!Q${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['demo_ready']] }
    });

    return { ok: true, clientId, demoUrl, openingMsg };
  } catch (e) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!AB${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[`failed: ${String(e.message).slice(0, 200)}`]] }
    });
    throw e;
  }
}

async function getDemoConfig(clientId) {
  const found = await findRowByClientId(clientId);
  if (!found) return null;
  const { row } = found;
  return {
    clientId,
    businessName: row[COL.business_name - 1] || '',
    industry:     row[COL.industry - 1]      || '',
    systemPrompt: row[COL.demo_system_prompt - 1] || '',
    openingMsg:   row[COL.demo_opening_msg - 1]   || '',
    demoStatus:   row[COL.demo_status - 1]        || '',
    benjaminWa:   process.env.BENJAMIN_DEMO_WA || '60162393812'
  };
}

module.exports = { build, getDemoConfig, findRowByClientId };
