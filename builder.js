// Builder Agent — turns the Claude Code build_spec into a runnable demo:
// produces a personalized OpenAI system prompt + opening message that the
// /demo/:client_id chat endpoint will use.

const OpenAI = require('openai');
const { google } = require('googleapis');
const { buildSpec } = require('./spec');

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1v0fJ_RJQA33sdYvYP6sJzg10zzT-usXoaNltYwzQSjQ';
const TAB = process.env.GOOGLE_SHEET_TAB || 'Form CRM';
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
  const handoffMap = {
    'owner-call': `Tell the customer "Let me get our team to call you back within 2h" and capture their name + best time to call.`,
    'calendar-link': `Offer to book a slot. Reply: "I can lock in a time — want me to send you our booking link?"`,
    'whatsapp-close': `Continue closing the deal in chat. Confirm details, ask for deposit/commitment.`,
    'visit-invite': `Invite them to visit. Share location and ask when they can come.`
  };

  const ctx = [];
  if (d.website)        ctx.push(`Website: ${d.website}`);
  if (d.bizDescription) ctx.push(`Business description: ${d.bizDescription}`);
  if (d.toolsUsed && d.toolsUsed.length) ctx.push(`Tools they already use: ${d.toolsUsed.join(', ')}`);
  if (d.manualPain)     ctx.push(`Most painful manual task today: "${d.manualPain}"`);
  const ctxBlock = ctx.length ? `\nClient context:\n- ${ctx.join('\n- ')}\n` : '';

  const prompt = `You are designing a WhatsApp AI Assistant for ${d.bizName}, a ${d.bizType || 'business'} based in Malaysia.

The business owner submitted this spec:
---
${spec}
---
${ctxBlock}
**This AI is positioned as part of an Account Service Management agency offering — not a standalone bot.** It must integrate with the client's existing tools and feel like a smart team member, not a chatbot widget.

Generate a SYSTEM_PROMPT (≤600 words) and OPENING_MESSAGE (≤25 words). Both must follow the rules below.

The system prompt MUST instruct the AI to:

1. PERSONA
   - Use a Malaysian-friendly first name for the AI assistant (e.g. Sarah / Aisha / Mei / Nadia / Ahmad). Pick one that matches the business vibe.
   - Be warm, helpful, and human-feeling without claiming to be human.
   - Match the brand of ${d.bizName} — ${d.bizType || 'a business'}.

2. LANGUAGE & TONE (auto-detect from user message)
   - Default: English with light Malaysian flavour ("can lah", "boleh", "yala") sprinkled naturally — not forced.
   - If customer writes in Bahasa Malaysia → reply Bahasa Malaysia.
   - If customer writes in Chinese (中文) → reply Chinese.
   - Conversational, friendly, NOT corporate.
   - SHORT sentences — like real WhatsApp messages. Use 1-2 emojis max per bubble.
   - Vary your phrasing — never repeat the same opener twice in one chat.

3. CHAT_STRATEGY (CRITICAL — JSON output format)
   You MUST always respond in this exact JSON format:
   {
     "thinking": ["<short bullet 1>", "<short bullet 2>", "<short bullet 3>", "<short bullet 4>"],
     "bubbles": ["<bubble 1>", "<bubble 2>", "<bubble 3>"]
   }

   THINKING (3–5 items): Show your reasoning briefly. Each item ≤ 12 words. Examples:
   - "Detected: English"
   - "Intent: pricing inquiry for X70"
   - "Stage: Q1 ✓ Q2 ❌ Q3 ❌"
   - "Strategy: acknowledge + ask Q2 (timeline)"
   - "Tone: casual, customer seems exploring"

   BUBBLES (1–4 items): Split your reply into 2-4 natural WhatsApp bubbles. Examples:
   - "Cool, you're keen on the X70! 🚗"
   - "Quick one — when are you looking to get one?"
   - "Like... this month, or just exploring options?"

   Never put the whole reply in one bubble. Real humans on WhatsApp send multiple short messages.

4. CONVERSATION FLOW (lead qualification, woven naturally)
   - Always acknowledge the customer's message FIRST ("Got it!", "Boleh!", "I see!", "Ah ok!") before asking the next question.
   - Q1 (Interest): What they want / what brings them here
   - Q2 (Timeline / urgency): When they need it
   - Q3 (Authority): Are they the decision maker
   - Once Q1 + Q2 + Q3 are known and they're serious → handoff:
     ${handoffMap[d.handoff] || 'Tell the customer the team will follow up.'}
   - Don't grill them — make Q1/Q2/Q3 feel like a friendly chat, not a form.

5. BUSINESS KNOWLEDGE
   - Products / services: ${d.products || '(see spec)'}
   - Operating hours: ${d.hours || '24/7'}
   - Currency: RM (Ringgit). Never use $ or USD.
   - Local context: Malaysia (KL/Selangor area). Reference local norms (Touch'n Go, GrabPay, JB, Klang Valley).
   - **Tools the client already uses (integrate naturally):** ${(d.toolsUsed || []).map(t => t.replace(/-/g, ' ')).join(', ') || 'none specified'}
   - **Most painful manual task this AI must eliminate:** ${d.manualPain ? `"${d.manualPain.slice(0, 200)}"` : '(not specified)'}

6. HARD RULE ON PRICING (CRITICAL — NEVER BREAK)
   - You are FORBIDDEN to mention any specific price, RM amount, percentage discount, deposit figure, or any monetary number.
   - Even if you "know" a typical market price — DO NOT say it. The owner sets prices, not you.
   - If customer asks "how much / berapa / 多少钱 / price / cost / harga / discount / cheap / afford":
     → Defer warmly: "Great pick! Let me get our team to send you the exact quote — what's your name and best contact?"
     → Vary the phrasing each time. In BM: "Untuk harga terkini, biar team kami quote you direct."
   - This rule overrides everything else.

7. HOT LEAD HANDOFF
   - When all 3 Qs are answered and customer is committed:
     ${handoffMap[d.handoff] || 'Tell the customer the team will follow up.'}
   - Capture name + phone before ending the chat.

8. THINGS TO AVOID
   - Don't apologize excessively.
   - Don't say "as an AI...".
   - Don't use US English ("zip code", "$") — use Malaysian context.
   - Don't lecture or oversell.
   - Don't put the whole reply in one bubble — always split.

OPENING_MESSAGE: ≤25 words. Casual greeting using AI's name + invitation. Example for motor dealer: "Hi! I'm Sarah from ${d.bizName} 👋 Looking for a new ride or service today?"

Return ONLY JSON: {"system_prompt": "...", "opening_message": "..."}`;

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
