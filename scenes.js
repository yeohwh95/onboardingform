// scenes.js — Stripe-style scripted scene definitions for the 4 AI modes.
// Each scene plays automatically: cards fade in on left/right + thinking
// checkmarks + final reply bubble. User just watches, ~5-8 seconds.

const SCENES = [
  // ─────────── 1. AI Group Order Agent ───────────────────
  {
    modeId: 'group_order',
    name: 'AI Group Order Agent',
    icon: '🛒',
    color: '#16a34a',
    description: 'Read order → parse → confirm → auto-place → update Sheet',
    industry: 'F&B / Wholesale / Group Buy',

    scenario: {
      userMsg: '10kg sayur kangkong\n5kg tomato\n3kg onion\nfor Cheras outlet — deliver tomorrow',
      model: 'GPT-4o',
      durationMs: 6500,

      leftCards: [
        { delay: 500,  icon: '📩', title: 'WhatsApp inbox',  subtitle: 'Reading message…' },
        { delay: 1500, icon: '📋', title: 'Order template',   subtitle: 'Matching against catalog' },
        { delay: 3000, icon: '📊', title: 'Google Sheets',    subtitle: 'orders_log_2026.xlsx' }
      ],

      rightCards: [
        { delay: 2200, icon: '⚙️', title: 'Parse order',      subtitle: '3 items + qty' },
        { delay: 3500, icon: '✅', title: 'Confirm order',    subtitle: 'Stock checked' },
        { delay: 4200, icon: '📤', title: 'Auto-place order', subtitle: 'Logged to Sheet' }
      ],

      thinkingSteps: [
        { delay: 700,  text: 'Read order' },
        { delay: 1700, text: 'Parsed 3 items × qty' },
        { delay: 2700, text: 'Outlet: Cheras (verified)' },
        { delay: 3700, text: 'Confirmed against catalog' },
        { delay: 4700, text: 'Logged to Google Sheet' }
      ],

      finalReply: {
        delay: 5500,
        bubbles: [
          'Order locked in! 🎉',
          '✅ 3 items confirmed for Cheras',
          '🚚 Delivery tomorrow 9am — logged to Sheet'
        ]
      }
    }
  },

  // ─────────── 2. AI Google Sheet Agent ───────────────────
  {
    modeId: 'gsheet_outreach',
    name: 'AI Google Sheet Agent',
    icon: '📊',
    color: '#2563eb',
    description: 'Read Sheet → filter contacts → outreach → follow-up',
    industry: 'CRM / Lead Nurture',

    scenario: {
      userMsg: 'Run today\'s outreach: contact all leads with no reply in 14 days',
      model: 'GPT-4o',
      durationMs: 7000,

      leftCards: [
        { delay: 500,  icon: '📥', title: 'Google Sheets',      subtitle: 'leads_master.xlsx · 1,247 rows' },
        { delay: 1700, icon: '🎯', title: 'Filter rules',       subtitle: 'last_contact > 14 days' },
        { delay: 3300, icon: '💬', title: 'WhatsApp API',       subtitle: 'ChatDaddy connected' }
      ],

      rightCards: [
        { delay: 2400, icon: '🔍', title: 'Filter contacts',   subtitle: '47 leads matched' },
        { delay: 3800, icon: '✉️', title: 'Personalize msg',   subtitle: 'Per-lead context' },
        { delay: 4600, icon: '📨', title: 'Send outreach',      subtitle: '47 messages queued' },
        { delay: 5400, icon: '⏰', title: 'Schedule follow-up', subtitle: 'D3 + D7 cron' }
      ],

      thinkingSteps: [
        { delay: 700,  text: 'Read 1,247 leads from Sheet' },
        { delay: 1900, text: 'Filtered: 47 cold leads' },
        { delay: 3000, text: 'Generated 47 personalized messages' },
        { delay: 4100, text: 'Sent via WhatsApp API' },
        { delay: 5200, text: 'Follow-up scheduled D3 + D7' }
      ],

      finalReply: {
        delay: 6000,
        bubbles: [
          'Outreach complete! 📤',
          '✅ 47 leads contacted',
          '⏰ Follow-ups locked for D3 + D7'
        ]
      }
    }
  },

  // ─────────── 3. AI Appointment Agent ───────────────────
  {
    modeId: 'appointment',
    name: 'AI Appointment Agent',
    icon: '📅',
    color: '#7c3aed',
    description: 'Qualify (Q1/Q2/Q3) → check slots → send link → reminder → calendar',
    industry: 'Booking / Consulting / Services',

    scenario: {
      userMsg: 'Hi, I want to book a consultation for next week',
      model: 'GPT-4o',
      durationMs: 7500,

      leftCards: [
        { delay: 500,  icon: '🤔', title: 'Q1/Q2/Q3 qualifier', subtitle: 'Lead qualification framework' },
        { delay: 2000, icon: '📅', title: 'Calendar API',       subtitle: 'Cal.com connected' },
        { delay: 3800, icon: '🔔', title: 'Reminder service',   subtitle: 'WhatsApp + email' }
      ],

      rightCards: [
        { delay: 1300, icon: '✓',  title: 'Q1: Purpose',        subtitle: 'AI consulting · captured' },
        { delay: 2300, icon: '✓',  title: 'Q2: Timeline',       subtitle: 'Next week · captured' },
        { delay: 3000, icon: '✓',  title: 'Q3: Decision maker', subtitle: 'Yes · captured' },
        { delay: 4500, icon: '🔗', title: 'Send booking link',  subtitle: 'cal.com/aibenjamin' },
        { delay: 5300, icon: '⏰', title: 'Set reminder',       subtitle: '24h + 1h before' },
        { delay: 6000, icon: '📆', title: 'Update calendar',    subtitle: 'Sat 10am · synced' }
      ],

      thinkingSteps: [
        { delay: 700,  text: 'Detecting booking intent' },
        { delay: 1500, text: 'Q1 ✓ purpose: consultation' },
        { delay: 2500, text: 'Q2 ✓ timing: next week' },
        { delay: 3300, text: 'Q3 ✓ authority: yes' },
        { delay: 4200, text: 'Found 3 open slots' },
        { delay: 5500, text: 'Booking link sent + reminder set' }
      ],

      finalReply: {
        delay: 6500,
        bubbles: [
          'Locked in for Sat 10am! 🎉',
          '🔗 Booking link sent — confirm in 1 tap',
          '⏰ Reminder ON: 24h + 1h before'
        ]
      }
    }
  },

  // ─────────── 4. AI Sales Manager ───────────────────
  {
    modeId: 'sales_manager',
    name: 'AI Sales Manager',
    icon: '👔',
    color: '#dc2626',
    description: 'Read intent → assign rep → notify → update CRM',
    industry: 'Sales Operations',

    scenario: {
      userMsg: 'Hi, urgent — looking for AI agency for my motor dealership. 3 outlets, need to close this month.',
      model: 'GPT-4o',
      durationMs: 6500,

      leftCards: [
        { delay: 500,  icon: '🧠', title: 'Intent classifier',  subtitle: 'Hot/Warm/Cold + Vertical' },
        { delay: 1700, icon: '👥', title: 'Sales team roster',  subtitle: '3 reps · specialization tagged' },
        { delay: 3500, icon: '🗂️', title: 'CRM (Supabase)',    subtitle: 'leads.crm_pipeline' }
      ],

      rightCards: [
        { delay: 1200, icon: '🚨', title: 'Detect intent',     subtitle: 'HOT · motor · urgent' },
        { delay: 2400, icon: '🎯', title: 'Match specialist',  subtitle: 'John (motor expert)' },
        { delay: 3200, icon: '🔔', title: 'Notify John',        subtitle: 'WhatsApp alert sent' },
        { delay: 4200, icon: '📊', title: 'Update CRM',         subtitle: 'status = HOT · assigned' }
      ],

      thinkingSteps: [
        { delay: 700,  text: 'Classified intent: HOT lead' },
        { delay: 1500, text: 'Vertical: motor dealer' },
        { delay: 2300, text: 'Urgency: this month + multi-outlet' },
        { delay: 3000, text: 'Best rep: John (motor expert)' },
        { delay: 3900, text: 'Alert sent to John\'s WhatsApp' },
        { delay: 4900, text: 'CRM updated: status=HOT, owner=John' }
      ],

      finalReply: {
        delay: 5500,
        bubbles: [
          'Got it — connecting you with John 👨‍💼',
          'Our motor specialist (he\'s closed 12 dealerships).',
          '⏱️ He\'ll WhatsApp you within 15 min.'
        ]
      }
    }
  }
];

function listScenes() {
  return SCENES.map(s => ({
    modeId: s.modeId,
    name: s.name,
    icon: s.icon,
    color: s.color,
    description: s.description,
    industry: s.industry
  }));
}

function getScene(modeId) {
  return SCENES.find(s => s.modeId === modeId) || null;
}

module.exports = { listScenes, getScene };
