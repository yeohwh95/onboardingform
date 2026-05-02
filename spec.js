// Server-side equivalent of buildClaudeSpec() in public/index.html.
// Produces the plain-text Claude Code build spec from form data.

const FLOW_NAMES = {
  'lead-qualify': 'Lead Qualify',
  'follow-up':    'Follow-Up Sequence',
  'appointment':  'Appointment Booking',
  'order-intake': 'Order Intake',
  'outreach':     'Sheet → Outreach',
  'renewal':      'Renewal Reminder',
  'faq-support':  'FAQ + Smart Escalation',
  'data-sync':    'Data Sync Between Tools'
};

const TOOL_LABELS = {
  'google-sheets':   'Google Sheets / Excel (Sheets API · MS Graph)',
  'whatsapp':        'WhatsApp Business (ChatDaddy · WhatsApp Cloud API)',
  'calendar':        'Calendar (Google Calendar · Cal.com · Calendly)',
  'crm':             'CRM (HubSpot · Salesforce · Pipedrive · Notion · Airtable)',
  'email':           'Email (Gmail · Outlook / MS Graph)',
  'payment':         'Payment (Stripe · Senangpay · Billplz · iPay88)',
  'ecommerce':       'E-commerce (Shopify · WooCommerce)',
  'accounting':      'Accounting (QuickBooks · Xero · Wave)',
  'pos':             'POS (Square · Loyverse)',
  'forms':           'Forms (Typeform · Paperform · Jotform)',
  'team-chat':       'Team chat (Slack · Discord · Lark · Telegram)',
  'orchestrator':    'Automation orchestrator (Make · Zapier · n8n)',
  'email-marketing': 'Email marketing (Mailchimp · SendGrid · ConvertKit)',
  'other':           'Other (custom integration — see manual_pain)'
};

function handoffString(handoff, name) {
  const map = {
    'owner-call':     `alert_owner_call — ${name} calls within 2h`,
    'calendar-link':  'ai_books_calendar_slot',
    'whatsapp-close': 'ai_closes_in_chat',
    'visit-invite':   'ai_sends_visit_invite'
  };
  return map[handoff] || 'owner-call';
}

function slaString(handoff) {
  return ({
    'owner-call':     'owner calls within 2h',
    'calendar-link':  'AI books slot, owner gets calendar invite',
    'whatsapp-close': 'AI closes fully in chat',
    'visit-invite':   'AI drives visit, owner greets'
  })[handoff] || 'owner calls within 2h';
}

function flowBlock(f, idx, d, name) {
  const lines = [`  ▸ flow_${idx + 1}: "${FLOW_NAMES[f] || f}"`];
  if (f === 'lead-qualify') {
    lines.push(
      `      trigger: "any_new_inbound_whatsapp_message"`,
      `      hours:   "${d.hours || '9am-6pm weekdays'}"`,
      `      qualify:`,
      `        Q1: "What exactly are you looking for?"`,
      `        Q2: "When do you need it?"`,
      `        Q3: "Are you the decision maker?"`,
      `      routing:`,
      `        hot:  "specific + urgent + DM → handoff"`,
      `        warm: "has need + unclear timing → nurture D3/D7"`,
      `        cold: "browsing + no urgency → archive"`,
      `      handoff: "${handoffString(d.handoff, name)}"`
    );
  }
  if (f === 'follow-up') {
    lines.push(
      `      trigger: "48h_no_reply_after_first_contact"`,
      `      sequence:`,
      `        D3:  "social_proof_angle"`,
      `        D7:  "cost_of_doing_nothing"`,
      `        D30: "re_engage_fresh_angle"`,
      `      if_no_reply_after_D30: "archive_to_meta_ads"`
    );
  }
  if (f === 'appointment') {
    const ownerKey = (name || 'owner').toLowerCase().replace(/\s+/g, '_');
    lines.push(
      `      trigger: "booking_intent_keyword_detected"`,
      `      steps:`,
      `        1: "offer_available_slots"`,
      `        2: "confirm_booking + log_to_crm"`,
      `        3: "send_24h_reminder"`,
      `      no_show: "alert_${ownerKey}"`
    );
  }
  if (f === 'order-intake') {
    lines.push(
      `      trigger: "order_message_detected"`,
      `      steps:`,
      `        1: "parse_items_against_catalogue"`,
      `        2: "send_order_summary_for_confirm"`,
      `        3: "log_to_google_sheet + alert_owner"`,
      `      sheet_cols: "timestamp | customer_name | wa_number | items | qty | total"`
    );
  }
  if (f === 'renewal') {
    const ownerKey = (name || 'owner').toLowerCase().replace(/\s+/g, '_');
    lines.push(
      `      trigger: "renewal_date_in_crm_minus_30_days"`,
      `      sequence:`,
      `        D30: "friendly_heads_up"`,
      `        D14: "upgrade_offer"`,
      `        D7:  "urgency_message"`,
      `      no_confirm: "alert_${ownerKey}_for_manual_call"`
    );
  }
  if (f === 'outreach') {
    lines.push(
      `      trigger: "scheduled_cron OR manual_run"`,
      `      steps:`,
      `        1: "read_contacts_from_sheet"`,
      `        2: "filter_by_last_contact_>_14_days"`,
      `        3: "generate_personalized_message_per_lead"`,
      `        4: "send_via_whatsapp_api"`,
      `        5: "schedule_followup_D3_D7"`,
      `      requires: "Google Sheets + WhatsApp API"`
    );
  }
  if (f === 'faq-support') {
    lines.push(
      `      trigger: "any_inbound_message"`,
      `      flow:`,
      `        1: "classify_intent (FAQ vs complex)"`,
      `        2: "if_FAQ → answer_from_knowledge_base"`,
      `        3: "if_complex → escalate_to_human + log_ticket"`,
      `      knowledge_source: "website + uploaded docs"`
    );
  }
  if (f === 'data-sync') {
    lines.push(
      `      trigger: "webhook_from_source_tool OR scheduled"`,
      `      pattern: "[source] → [destination] field mapping"`,
      `      example: "Stripe payment → Sheet row → CRM lead status"`,
      `      requires: "webhook endpoints + retry logic + idempotency"`
    );
  }
  return lines.join('\n');
}

function buildSpec(d) {
  const biz = d.bizName || 'Your Business';
  const name = d.name || 'You';
  const prods = (d.products || '').split(',').map(s => s.trim()).filter(Boolean);
  const flows = d.flows || [];
  const dateStr = new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });

  const flowLines = flows.map((f, i) => flowBlock(f, i, d, name)).join('\n\n');

  const prodList = prods.length
    ? prods.map(p => `  ▸ "${p}"`).join('\n')
    : `  ▸ "[add product names here]"`;

  const tmplBase = ['greeting_message', 'hot_lead_alert_to_owner'];
  if (flows.includes('lead-qualify')) tmplBase.push('qualification_q1', 'qualification_q2', 'qualification_q3', 'case_study_d3', 'warm_nurture_d7');
  if (flows.includes('follow-up'))    tmplBase.push('follow_up_d3_social_proof', 'follow_up_d7_cost_of_waiting', 're_engage_d30');
  if (flows.includes('appointment'))  tmplBase.push('booking_confirmation', '24h_reminder');
  if (flows.includes('order-intake')) tmplBase.push('order_summary_confirm', 'order_logged_receipt');
  if (flows.includes('renewal'))      tmplBase.push('renewal_d30', 'renewal_d14_upgrade', 'renewal_d7_urgency');
  const tmplList = [...new Set(tmplBase)].map(t => `  ▸ "${t}"`).join('\n');

  const ownerPhone = (d.phone || 'OWNER_NUMBER').replace(/\D/g, '');

  // Integrations: always include WhatsApp + AI core. Add user-selected tools.
  const toolsSelected = (d.toolsUsed || []).map(t => TOOL_LABELS[t] || t);
  const baseIntegrations = ['WhatsApp Business (primary channel)'];
  if (!toolsSelected.some(t => /sheet|excel/i.test(t))) baseIntegrations.push('Google Sheets (default data store)');
  const allIntegrations = [...baseIntegrations, ...toolsSelected];
  const integrationsList = allIntegrations.map(t => `  ▸ "${t}"`).join('\n');

  // Business context block (website + description + manual pain)
  const ctxLines = [];
  if (d.website)        ctxLines.push(`  website:     "${d.website}"`);
  if (d.bizDescription) ctxLines.push(`  description: "${d.bizDescription.replace(/"/g, '\\"').slice(0, 300)}"`);
  if (d.manualPain)     ctxLines.push(`  manual_pain: "${d.manualPain.replace(/"/g, '\\"').slice(0, 400)}"`);
  const contextBlock = ctxLines.length ? `BUSINESS_CONTEXT:\n${ctxLines.join('\n')}\n\n` : '';

  return `# CLAUDE CODE BUILD SPEC — ${biz} WhatsApp AI Agent
# Generated: ${dateStr} · Paste this into Claude Code to start the build

SYSTEM:
  name:     "${biz} WhatsApp AI Agent"
  platform: "ChatDaddy API + WhatsApp"
  biz_type: "${d.bizType || 'Business'}"
  owner:    "${name}"
  volume:   "${d.volume || '50-200'} tasks/day"
  urgency:  "${d.urgency || 'Next 3 months'}"
  deal_val: "${d.deal || '?'}"

${contextBlock}FLOWS:
${flowLines}

PRODUCT_CATALOGUE:
${prodList}

MESSAGE_TEMPLATES_TO_WRITE:
${tmplList}

INTEGRATIONS_REQUIRED:
${integrationsList}
  ▸ "WhatsApp alerts → ${name}: +${ownerPhone}"

HANDOFF_PROTOCOL:
  type:    "${d.handoff || 'owner-call'}"
  message: "🔴 Hot lead: [Name] · [Number] · [Intent summary] — call now."
  sla:     "${slaString(d.handoff)}"
`;
}

module.exports = { buildSpec };
