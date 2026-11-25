export type AssistantActionId =
  | 'citizen_report'
  | 'officer_dashboard'
  | 'travel_explorer'
  | 'my_tickets'
  | 'police_desk';

export const ASSISTANT_ACTION_IDS: readonly AssistantActionId[] = [
  'citizen_report',
  'officer_dashboard',
  'travel_explorer',
  'my_tickets',
  'police_desk',
] as const;

export const ASSISTANT_ACTION_META: Record<
  AssistantActionId,
  { label: string; description: string }
> = {
  citizen_report: {
    label: 'Go to Citizen Report',
    description: 'Open the citizen photo & description triage form',
  },
  officer_dashboard: {
    label: 'Open Officer Dashboard',
    description: 'Inspect active municipal triage tickets and SHO case desk',
  },
  travel_explorer: {
    label: 'Open 3D Explorer',
    description: 'Explore the 3D Earth globe, Kerala terrain & hazard-aware route planner',
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
  'How do I report a pothole or wire hazard?',
  'Best route from Pathanamthitta to Wayanad?',
  'Check my active tickets & booked PNRs',
  'How does the UPI QR (₹1 demo) payment work?',
] as const;

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

export interface AssistantSessionContext {
  activeTab: string;
  travelOriginName: string;
  travelDestinationName: string | null;
  tickets: AssistantTicketSummary[];
  bookedTickets: AssistantBookingSummary[];
  policeCases?: AssistantPoliceSummary[];
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

  const lines: string[] = [
    'LIVE SESSION CONTEXT (read-only snapshot of this user session):',
    `- Current Page: ${activeTab}`,
    `- 3D Travel Explorer Route Selection: Origin = ${originName}, Destination = ${destName || 'Not yet selected'}`,
  ];

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

  // Remove echoed bracket action tags like [Go to Citizen Report] if the model writes them inline
  reply = reply
    .replace(
      /\s*\[(Go to Citizen Report|Open 3D Explorer|View My Tickets|Open Officer Dashboard|Open Police & Safety Desk)\]\s*/gi,
      ' '
    )
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!reply) {
    reply =
      'I can help with reporting civic issues, checking your active tickets or booked PNRs, planning Kerala & South India routes, and using the UPI QR payment flow.';
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
