// scenes.js — Multi-turn scripted scene scripts (Stripe-style demo).
// Each scene plays 2-3 conversational turns: user → thinking + cards → bot reply,
// then next user → more thinking + cards → next bot reply. ~10-12s total.

const TURN_GAP_MS = 800;

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
      model: 'GPT-4o',
      turnGapMs: TURN_GAP_MS,
      turns: [
        {
          durationMs: 4200,
          userMsg: '10kg sayur kangkong\n5kg tomato\n3kg onion\nfor Cheras outlet',
          leftCards: [
            { delay: 700,  icon: '📩', title: 'WhatsApp inbox',  subtitle: 'Reading message' },
            { delay: 2200, icon: '📋', title: 'Order template',   subtitle: 'Matching catalog' }
          ],
          rightCards: [
            { delay: 1500, icon: '⚙️', title: 'Parse order',     subtitle: '3 items + qty' }
          ],
          thinking: [
            { delay: 500,  text: 'Read order' },
            { delay: 1200, text: 'Parsed 3 items × qty' },
            { delay: 2000, text: 'Outlet: Cheras (verified)' }
          ],
          botBubbles: [
            { delay: 2700, text: 'Got it! 3 items confirmed for Cheras 🛒' },
            { delay: 3300, text: 'Quick one — when do you need delivery?' }
          ]
        },
        {
          durationMs: 4500,
          userMsg: 'tomorrow morning, before 10am',
          leftCards: [
            { delay: 1700, icon: '📊', title: 'Google Sheets',    subtitle: 'orders_log_2026.xlsx' }
          ],
          rightCards: [
            { delay: 700,  icon: '✅', title: 'Confirm order',    subtitle: 'Stock checked' },
            { delay: 2300, icon: '📤', title: 'Auto-place order', subtitle: 'Driver assigned' }
          ],
          thinking: [
            { delay: 400,  text: 'Slot available: 8-10am' },
            { delay: 1300, text: 'Stock confirmed' },
            { delay: 2100, text: 'Logged to Google Sheet' }
          ],
          botBubbles: [
            { delay: 2700, text: 'Locked in tomorrow 8-10am! 🚚' },
            { delay: 3300, text: 'Order auto-placed, Sheet updated.' },
            { delay: 3900, text: 'Reply OK to confirm 👍' }
          ]
        }
      ]
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
      model: 'GPT-4o',
      turnGapMs: TURN_GAP_MS,
      turns: [
        {
          durationMs: 4500,
          userMsg: 'Run today\'s outreach to cold leads',
          leftCards: [
            { delay: 600,  icon: '📥', title: 'Google Sheets',   subtitle: 'leads_master · 1,247 rows' },
            { delay: 2000, icon: '🎯', title: 'Filter rules',    subtitle: 'last_contact > 14 days' }
          ],
          rightCards: [
            { delay: 1300, icon: '🔍', title: 'Filter contacts', subtitle: 'Scanning sheet…' }
          ],
          thinking: [
            { delay: 500,  text: 'Connected to Sheet' },
            { delay: 1500, text: 'Read 1,247 leads' },
            { delay: 2400, text: 'Filtered 47 cold leads' }
          ],
          botBubbles: [
            { delay: 3000, text: '47 cold leads found 📋' },
            { delay: 3600, text: 'Want me to send personalized outreach to all 47?' }
          ]
        },
        {
          durationMs: 5000,
          userMsg: 'Yes, go ahead',
          leftCards: [
            { delay: 1500, icon: '💬', title: 'WhatsApp API',     subtitle: 'ChatDaddy connected' }
          ],
          rightCards: [
            { delay: 600,  icon: '✉️', title: 'Personalize',      subtitle: 'Per-lead context' },
            { delay: 2100, icon: '📨', title: 'Send outreach',     subtitle: '47 messages queued' },
            { delay: 3300, icon: '⏰', title: 'Schedule follow-up', subtitle: 'D3 + D7 cron' }
          ],
          thinking: [
            { delay: 500,  text: 'Generating 47 personalized msgs' },
            { delay: 1700, text: 'Sending via WhatsApp API' },
            { delay: 2900, text: 'Follow-ups locked D3 + D7' }
          ],
          botBubbles: [
            { delay: 3500, text: 'Outreach complete! 📤' },
            { delay: 4100, text: '✅ 47 leads contacted, follow-ups scheduled' },
            { delay: 4500, text: 'Daily report tomorrow 9am 📊' }
          ]
        }
      ]
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
      model: 'GPT-4o',
      turnGapMs: TURN_GAP_MS,
      turns: [
        {
          durationMs: 3500,
          userMsg: 'Hi, I want to book a consultation',
          leftCards: [
            { delay: 700,  icon: '🤔', title: 'Q1/Q2/Q3 qualifier', subtitle: 'Lead qualification' }
          ],
          rightCards: [],
          thinking: [
            { delay: 400, text: 'Detected: booking intent' },
            { delay: 1200, text: 'Starting Q1 (purpose)' }
          ],
          botBubbles: [
            { delay: 1800, text: 'Hey! Sure thing 👋' },
            { delay: 2400, text: 'What\'s the consultation about?' }
          ]
        },
        {
          durationMs: 3700,
          userMsg: 'AI implementation for my motor dealership',
          leftCards: [],
          rightCards: [
            { delay: 700, icon: '✓', title: 'Q1: Purpose', subtitle: 'AI consulting · captured' }
          ],
          thinking: [
            { delay: 400, text: 'Q1 ✓ purpose: AI consulting' },
            { delay: 1300, text: 'Asking Q2 (timing)' }
          ],
          botBubbles: [
            { delay: 1900, text: 'Got it — AI for motor dealer ✓' },
            { delay: 2600, text: 'When works for you? Weekdays or weekends?' }
          ]
        },
        {
          durationMs: 5500,
          userMsg: 'Saturday morning works. I\'m the owner.',
          leftCards: [
            { delay: 1800, icon: '📅', title: 'Calendar API',     subtitle: 'Cal.com connected' },
            { delay: 3500, icon: '🔔', title: 'Reminder service', subtitle: 'WhatsApp + email' }
          ],
          rightCards: [
            { delay: 600,  icon: '✓',  title: 'Q2: Timing',        subtitle: 'Sat morning · captured' },
            { delay: 1100, icon: '✓',  title: 'Q3: Authority',     subtitle: 'Owner · captured' },
            { delay: 2400, icon: '🔗', title: 'Send booking link',  subtitle: 'cal.com/aibenjamin' },
            { delay: 4000, icon: '📆', title: 'Update calendar',    subtitle: 'Sat 10am · synced' }
          ],
          thinking: [
            { delay: 400,  text: 'Q2 + Q3 ✓ — fully qualified' },
            { delay: 1600, text: 'Found Sat 10am slot' },
            { delay: 2700, text: 'Sent booking link' },
            { delay: 4200, text: 'Reminder set 24h + 1h before' }
          ],
          botBubbles: [
            { delay: 3000, text: 'Sat 10am locked in! 🎉' },
            { delay: 3700, text: '🔗 Booking link sent — confirm in 1 tap' },
            { delay: 4700, text: '⏰ I\'ll remind you 24h before' }
          ]
        }
      ]
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
      model: 'GPT-4o',
      turnGapMs: TURN_GAP_MS,
      turns: [
        {
          durationMs: 4200,
          userMsg: 'Hi — urgent. AI agency for my motor dealership, 3 outlets, need to close this month.',
          leftCards: [
            { delay: 600,  icon: '🧠', title: 'Intent classifier', subtitle: 'Hot/Warm/Cold + Vertical' }
          ],
          rightCards: [
            { delay: 1500, icon: '🚨', title: 'Detect intent',     subtitle: 'HOT · motor · urgent' }
          ],
          thinking: [
            { delay: 500,  text: 'Classifying intent…' },
            { delay: 1300, text: 'HOT lead · motor · urgent' },
            { delay: 2100, text: 'Multi-outlet (3) · this month' }
          ],
          botBubbles: [
            { delay: 2700, text: 'Got it — sounds urgent 🔥' },
            { delay: 3300, text: 'Quick read on your needs… stand by.' }
          ]
        },
        {
          durationMs: 5500,
          userMsg: 'Sure, let me know who I\'ll be talking to',
          leftCards: [
            { delay: 1100, icon: '👥', title: 'Sales team roster', subtitle: '3 reps · specialization tagged' },
            { delay: 3000, icon: '🗂️', title: 'CRM (Supabase)',    subtitle: 'leads.crm_pipeline' }
          ],
          rightCards: [
            { delay: 700,  icon: '🎯', title: 'Match specialist',  subtitle: 'John (motor expert)' },
            { delay: 2200, icon: '🔔', title: 'Notify John',        subtitle: 'WhatsApp alert sent' },
            { delay: 3600, icon: '📊', title: 'Update CRM',         subtitle: 'status=HOT, owner=John' }
          ],
          thinking: [
            { delay: 500,  text: 'Best match: John (motor specialist)' },
            { delay: 1500, text: 'John has closed 12 dealerships' },
            { delay: 2700, text: 'Sent WhatsApp alert to John' },
            { delay: 4000, text: 'CRM updated · pipeline owner=John' }
          ],
          botBubbles: [
            { delay: 3200, text: 'You\'re going to John 👨‍💼' },
            { delay: 3900, text: '12 dealerships closed, including KL3 last quarter.' },
            { delay: 4700, text: 'He\'ll WhatsApp you within 15 min ⏱️' }
          ]
        }
      ]
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
