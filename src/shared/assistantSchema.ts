export type AssistantActionId =
  | 'home'
  | 'citizen_report'
  | 'officer_dashboard'
  | 'travel_explorer'
  | 'local_life'
  | 'jobs_portal'
  | 'weekend_planner'
  | 'event_ai'
  | 'my_tickets'
  | 'police_desk';

export const ASSISTANT_ACTION_IDS: readonly AssistantActionId[] = [
  'home',
  'citizen_report',
  'officer_dashboard',
  'travel_explorer',
  'local_life',
  'jobs_portal',
  'weekend_planner',
  'event_ai',
  'my_tickets',
  'police_desk',
] as const;

export const ASSISTANT_ACTION_META: Record<
  AssistantActionId,
  { label: string; description: string }
> = {
  home: {
    label: 'Return to Home Portal',
    description: 'Open the 3-way Welcome Homepage',
  },
  citizen_report: {
    label: 'Go to Citizen Report',
    description: 'Open the citizen photo & description triage form',
  },
  officer_dashboard: {
    label: 'Open Officer Dashboard',
    description: 'Inspect active municipal triage tickets and SHO case desk',
  },
  travel_explorer: {
    label: 'Open 3D World Explorer',
    description: 'Explore the 3D Earth globe, India Relief Maps, airlines & hazard-aware routes',
  },
  local_life: {
    label: 'Open Local Life Hub',
    description: 'Explore Kerala Education, Lifestyle, Food Spots, Expenses & Local Transport',
  },
  jobs_portal: {
    label: 'Open Jobs & Careers Portal',
    description: 'Browse Kerala PSC, DWMS/KKEM internships, IT roles & 1-click Quick Apply',
  },
  weekend_planner: {
    label: 'Open AI Weekend Planner',
    description: 'Build & customize an hour-by-hour Gemini weekend itinerary with Google Maps',
  },
  event_ai: {
    label: 'Open Event Management AI',
    description: 'Plan meetups/turf matches and order on-spot food delivery to your map pin',
  },
  my_tickets: {
    label: 'View My Tickets',
    description: 'Open your confirmed PNR e-tickets and UPI payment receipts',
  },
  police_desk: {
    label: 'Open Police & Safety Desk',
    description: 'File a Police e-Complaint, General Diary (GD) log, or check THUNA/112 guidance',
  },
};

export const ASSISTANT_QUICK_PROMPTS: readonly string[] = [
  'Show me IT internships and DWMS jobs in Kerala',
  'Plan my weekend in Pathanamthitta under ₹2,000',
  'Organize a turf meetup for 10 friends and order snacks to the spot',
  'Check my active tickets, K-SMART services & booked PNRs',
] as const;

export const ASSISTANT_SLASH_COMMANDS: ReadonlyArray<{
  command: string;
  usage: string;
  description: string;
  template: string;
  targetAction: AssistantActionId;
}> = [
  {
    command: '/jobs',
    usage: '/jobs [role/district]',
    description: 'Search Kerala PSC, DWMS/KKEM internships, IT & remote roles',
    template: '/jobs IT internships and DWMS roles in Pathanamthitta & Kochi',
    targetAction: 'jobs_portal',
  },
  {
    command: '/weekend',
    usage: '/weekend [district/budget]',
    description: 'Architect a Gemini hour-by-hour weekend plan with map pins',
    template: '/weekend Pathanamthitta under ₹2,000 chill cafes & scenic drives',
    targetAction: 'weekend_planner',
  },
  {
    command: '/event',
    usage: '/event [type/guests/spot]',
    description: 'Plan a meetup, turf match or party with on-spot food delivery',
    template: '/event Turf meetup for 10 friends at Thiruvalla Turf with snacks & drinks',
    targetAction: 'event_ai',
  },
  {
    command: '/ksmart',
    usage: '/ksmart [certificate/issue]',
    description: 'Guidance on Kerala LSG K-SMART civic filings & certificates',
    template: '/ksmart How do I report a road hazard and track LSG repair verification?',
    targetAction: 'citizen_report',
  },
];

export const ASSISTANT_MENTIONS: ReadonlyArray<{
  handle: string;
  label: string;
  targetAction: AssistantActionId;
}> = [
  { handle: '@Jobs', label: 'Jobs & DWMS', targetAction: 'jobs_portal' },
  { handle: '@Weekend', label: 'Weekend AI', targetAction: 'weekend_planner' },
  { handle: '@EventAI', label: 'Event & Food', targetAction: 'event_ai' },
  { handle: '@KSMART', label: 'Civic Triage', targetAction: 'citizen_report' },
  { handle: '@Police', label: 'THUNA / 112', targetAction: 'police_desk' },
  { handle: '@Travel', label: '3D Maps', targetAction: 'travel_explorer' },
];

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  actions?: AssistantActionId[];
  isError?: boolean;
}

export interface AssistantTicketSummary {
  id: string;
  title: string;
  department: string;
  severityScore: number;
  urgencyLevel: string;
  workflowStatus: string;
  isValid: boolean;
}

export interface AssistantBookingSummary {
  pnr: string;
  channel: string;
  from: string;
  to: string;
  classOrTier: string;
  seatAssignment: string;
  travelDate: string;
  paidAmountInr: number;
  actualFareInr: number;
  isDemoFare: boolean;
}

export interface AssistantPoliceSummary {
  caseRefId: string;
  districtName: string;
  category: string;
  priority: string;
  status: string;
  station: string;
  isEmergency: boolean;
}

export interface AssistantJobAppSummary {
  applicationId: string;
  jobTitle: string;
  employer: string;
  district: string;
  status: string;
}

export interface AssistantFoodOrderSummary {
  orderId: string;
  eventHeadline: string;
  spotLocation: string;
  totalInr: number;
  stage: string;
}

export interface AssistantSessionContext {
  activeTab: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userHomeDistrict?: string;
  userAcademicStream?: string;
  travelOriginName: string;
  travelDestinationName: string | null;
  localLifeDistrict?: string;
  localLifeSection?: string;
  tickets: AssistantTicketSummary[];
  bookedTickets: AssistantBookingSummary[];
  policeCases?: AssistantPoliceSummary[];
  jobApplications?: AssistantJobAppSummary[];
  weekendPlanHeadline?: string | null;
  activeEventHeadline?: string | null;
  foodOrders?: AssistantFoodOrderSummary[];
}

export interface AssistantApiResponse {
  reply: string;
  actions: AssistantActionId[];
  modelUsed?: string;
}

function clampText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

/**
 * Formats live read-only client session context into a compact, bounded block
 * injected into the Gemini system instruction.
 */
export function buildSessionContextBlock(
  ctx?: Partial<AssistantSessionContext> | null
): string {
  if (!ctx || typeof ctx !== 'object') {
    return 'LIVE SESSION CONTEXT:\n- Active page: Unknown\n- Active Travel Explorer selection: Origin Pathanamthitta, Destination not selected\n- Submitted Civic Tickets: None\n- Confirmed Travel Bookings: None';
  }

  const activeTab = clampText(ctx.activeTab, 40) || 'Citizen Report';
  const originName = clampText(ctx.travelOriginName, 60) || 'Pathanamthitta';
  const destName = clampText(ctx.travelDestinationName, 60);

  const tickets = Array.isArray(ctx.tickets) ? ctx.tickets.slice(0, 12) : [];
  const bookings = Array.isArray(ctx.bookedTickets)
    ? ctx.bookedTickets.slice(0, 10)
    : [];
  const policeCases = Array.isArray(ctx.policeCases)
    ? ctx.policeCases.slice(0, 10)
    : [];
  const jobApps = Array.isArray(ctx.jobApplications)
    ? ctx.jobApplications.slice(0, 6)
    : [];
  const foodOrders = Array.isArray(ctx.foodOrders)
    ? ctx.foodOrders.slice(0, 5)
    : [];

  const localDistrict = clampText(ctx.localLifeDistrict, 40) || 'Pathanamthitta';
  const localSection = clampText(ctx.localLifeSection, 30) || 'Education';
  const weekendHeadline = clampText(ctx.weekendPlanHeadline, 120);
  const eventHeadline = clampText(ctx.activeEventHeadline, 120);
  const userName = clampText(ctx.userName, 80);
  const userRole = clampText(ctx.userRole, 40);
  const userHomeDistrict = clampText(ctx.userHomeDistrict, 60);

  const lines: string[] = [
    'LIVE SESSION CONTEXT (read-only snapshot of this user session):',
    ...(userName
      ? [
          `- Signed-in User: ${userName}${userRole ? ` (${userRole})` : ''}${
            userHomeDistrict ? ` · Home District: ${userHomeDistrict}` : ''
          }`,
        ]
      : []),
    `- Current Page: ${activeTab}`,
    `- 3D Travel Explorer Route Selection: Origin = ${originName}, Destination = ${destName || 'Not yet selected'}`,
    `- Local Life Hub Focus: District = ${localDistrict}, Section = ${localSection}`,
    `- Active Weekend Itinerary: ${weekendHeadline || 'Not generated yet'}`,
    `- Active Event Plan: ${eventHeadline || 'Not created yet'}`,
  ];

  if (jobApps.length > 0) {
    lines.push(`- Submitted Job Applications (${jobApps.length}):`);
    for (const app of jobApps) {
      lines.push(
        `  • [${clampText(app.applicationId, 24)}] ${clampText(app.jobTitle, 80)} @ ${clampText(app.employer, 60)} (${clampText(app.district, 30)}) | ${clampText(app.status, 30)}`
      );
    }
  } else {
    lines.push('- Submitted Job Applications: None yet.');
  }

  if (foodOrders.length > 0) {
    lines.push(`- Active On-Spot Event Food Orders (${foodOrders.length}):`);
    for (const ord of foodOrders) {
      lines.push(
        `  • [${clampText(ord.orderId, 24)}] ${clampText(ord.eventHeadline, 70)} → Pin: ${clampText(ord.spotLocation, 50)} | ₹${Math.round(Number(ord.totalInr) || 0)} | Stage: ${clampText(ord.stage, 30)}`
      );
    }
  }

  if (tickets.length === 0) {
    lines.push('- Submitted Civic Tickets: None yet.');
  } else {
    lines.push(`- Submitted Civic Tickets (${tickets.length} shown):`);
    for (const t of tickets) {
      const id = clampText(t?.id, 32) || 'TKT';
      const title = clampText(t?.title, 100) || 'Untitled issue';
      const dept = clampText(t?.department, 60) || 'Unknown Dept';
      const status = clampText(t?.workflowStatus, 32) || 'Triaged';
      const urgency = clampText(t?.urgencyLevel, 24) || 'Standard';
      const sev = Number.isFinite(Number(t?.severityScore))
        ? Math.max(0, Math.min(10, Math.round(Number(t?.severityScore))))
        : 0;
      const validTag = t?.isValid === false ? 'Invalid/Rejected' : `Severity ${sev}/10 (${urgency})`;
      lines.push(`  • [${id}] "${title}" | Dept: ${dept} | ${validTag} | Status: ${status}`);
    }
  }

  if (policeCases.length === 0) {
    lines.push('- Police & Safety Petitions / GD Logs: None yet.');
  } else {
    lines.push(`- Police & Safety Petitions / GD Logs (${policeCases.length} shown):`);
    for (const pc of policeCases) {
      const ref = clampText(pc?.caseRefId, 32) || 'KL-GD';
      const dist = clampText(pc?.districtName, 40) || 'Kerala';
      const cat = clampText(pc?.category, 50) || 'Safety';
      const prio = clampText(pc?.priority, 32) || 'Standard';
      const status = clampText(pc?.status, 40) || 'Submitted';
      const station = clampText(pc?.station, 60) || 'Local Station';
      const emg = pc?.isEmergency ? ' [112 EMERGENCY]' : '';
      lines.push(
        `  • [${ref}] ${cat} (${dist}) | Priority: ${prio}${emg} | Station: ${station} | Status: ${status}`
      );
    }
  }

  if (bookings.length === 0) {
    lines.push('- Confirmed Travel Bookings (PNRs): None yet.');
  } else {
    lines.push(`- Confirmed Travel Bookings (${bookings.length} shown):`);
    for (const b of bookings) {
      const pnr = clampText(b?.pnr, 32) || 'PENDING';
      const channel = clampText(b?.channel, 20).toUpperCase() || 'TRAVEL';
      const from = clampText(b?.from, 60) || 'Origin';
      const to = clampText(b?.to, 60) || 'Destination';
      const cls = clampText(b?.classOrTier, 40) || 'Standard';
      const seat = clampText(b?.seatAssignment, 60) || 'Assigned';
      const date = clampText(b?.travelDate, 20) || 'Upcoming';
      const paid = Number.isFinite(Number(b?.paidAmountInr)) ? Math.round(Number(b?.paidAmountInr)) : 0;
      const fare = Number.isFinite(Number(b?.actualFareInr)) ? Math.round(Number(b?.actualFareInr)) : paid;
      const modeTag = b?.isDemoFare ? `₹${paid} demo paid (fare ₹${fare})` : `₹${paid} paid`;
      lines.push(
        `  • PNR ${pnr} (${channel}) | ${from} → ${to} | ${cls} | Seat(s): ${seat} | Date: ${date} | ${modeTag}`
      );
    }
  }

  return lines.join('\n');
}

const VALID_ACTION_SET = new Set<string>(ASSISTANT_ACTION_IDS);

/**
 * Validates and cleans a structured assistant reply payload.
 */
export function normalizeAssistantResponse(raw: unknown): AssistantApiResponse {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  let reply = typeof obj.reply === 'string' ? obj.reply.trim() : '';

  // Remove echoed bracket action tags if the model writes them inline
  reply = reply
    .replace(
      /\s*\[(Go to Citizen Report|Open 3D Explorer|View My Tickets|Open Officer Dashboard|Open Police & Safety Desk|Open Jobs & Careers Portal|Open AI Weekend Planner|Open Event Management AI)\]\s*/gi,
      ' '
    )
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!reply) {
    reply =
      'I can help with Kerala & Remote jobs (/jobs), Gemini weekend plans (/weekend), event planning & on-spot food ordering (/event), K-SMART civic reports, police petitions, and 3D travel bookings.';
  }

  const rawActions = Array.isArray(obj.actions) ? obj.actions : [];
  const actions: AssistantActionId[] = [];
  for (const item of rawActions) {
    if (typeof item === 'string' && VALID_ACTION_SET.has(item)) {
      const id = item as AssistantActionId;
      if (!actions.includes(id)) {
        actions.push(id);
      }
    }
    if (actions.length >= 3) break;
  }

  return { reply, actions };
}
