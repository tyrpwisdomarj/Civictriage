export const MUNICIPAL_DEPARTMENTS = [
  'Public Works & Roads (PWD)',
  'Electrical & Streetlights (KSEB)',
  'Waste & Sanitation',
  'Water Supply & Drainage (KWA)',
  'Public Safety & Encroachment',
  'Invalid / Other',
] as const;

export type MunicipalDepartment = (typeof MUNICIPAL_DEPARTMENTS)[number];

export type SeverityBand = 'Critical' | 'High' | 'Medium' | 'Low' | 'Rejected';

export type TicketWorkflowStatus = 'Triaged' | 'Dispatched' | 'Resolved' | 'Rejected';

export type EmailAlertStatus = 'sending' | 'sent' | 'skipped' | 'not_applicable';

export interface TriageTicketJSON {
  is_valid_civic_issue: boolean;
  rejection_reason: string | null;
  department: MunicipalDepartment;
  issue_category: string;
  severity_score: number;
  severity_level: SeverityBand;
  recommended_sla: string;
  severity_reasoning: string;
  ticket_title: string;
  formal_summary: string;
  extracted_landmarks: string[];
  recommended_action: string;
  detected_language: string;
  location_clues: string | null;
  visual_verification_note: string;
  exaggeration_or_mismatch: boolean;
  requires_police_escalation?: boolean;
}

export interface RepairVerificationRecord {
  verifiedAt: string;
  afterImageUrl: string;
  isResolved: boolean;
  verificationNote: string;
  emailStatus?: EmailAlertStatus;
}

export interface StoredTicket {
  id: string;
  createdAt: string;
  workflowStatus: TicketWorkflowStatus;
  emailAlertStatus?: EmailAlertStatus;
  imageUrl: string;
  imageName: string;
  citizenDescription: string;
  localBodyHint: string;
  triage: TriageTicketJSON;
  corroborationCount?: number;
  lastCorroboratedAt?: string;
  wasCorroborationBoosted?: boolean;
  repairVerification?: RepairVerificationRecord;
}

export interface TicketFilters {
  query: string;
  department: 'ALL' | MunicipalDepartment;
  status: 'ALL' | TicketWorkflowStatus;
}

export interface QueueMetrics {
  total: number;
  criticalAndHigh: number;
  pendingDispatch: number;
  spamRejected: number;
  byDepartment: Record<MunicipalDepartment, number>;
}

export interface DepartmentPolicyItem {
  department: MunicipalDepartment;
  shortCode: string;
  scope: string;
  examples: string[];
}

export const DEPARTMENT_POLICIES: DepartmentPolicyItem[] = [
  {
    department: 'Public Works & Roads (PWD)',
    shortCode: 'PWD',
    scope: 'Carriageways, pedestrian footpaths, structural road defects, and storm-felled obstructions.',
    examples: ['Deep potholes on main roads', 'Broken or collapsed footpaths', 'Road cave-ins and shoulder erosion', 'Fallen trees obstructing traffic'],
  },
  {
    department: 'Electrical & Streetlights (KSEB)',
    shortCode: 'KSEB',
    scope: 'Public electrical poles, overhead distribution lines, municipal street lighting, and transformer safety.',
    examples: ['Snapped or hanging live wires', 'Non-functional streetlights', 'Damaged transformer fencing', 'Leaning or cracked concrete utility poles'],
  },
  {
    department: 'Waste & Sanitation',
    shortCode: 'SAN',
    scope: 'Solid waste collection points, illegal roadside dumping, public sanitation hazards, and blocked open drains.',
    examples: ['Overflowing municipal waste bins', 'Illegal roadside garbage dumping', 'Unattended dead animals', 'Clogged or silted public drains'],
  },
  {
    department: 'Water Supply & Drainage (KWA)',
    shortCode: 'KWA',
    scope: 'Potable water distribution pipelines, municipal sewerage chambers, and severe stormwater inundation.',
    examples: ['Burst drinking water mains', 'Open or missing manhole covers', 'Severe road waterlogging or flooding', 'Leaking public standpipes'],
  },
  {
    department: 'Public Safety & Encroachment',
    shortCode: 'SAF',
    scope: 'Right-of-way obstructions, derelict vehicles, emergency access clearance, and civic signage integrity.',
    examples: ['Abandoned vehicles on public roads', 'Blocked hospital or fire access lanes', 'Damaged or obscured traffic signage', 'Unauthorised footpath encroachments'],
  },
  {
    department: 'Invalid / Other',
    shortCode: 'INV',
    scope: 'Submissions rejected by the multimodal spam and relevance guardrail.',
    examples: ['Personal selfies or memes', 'Private indoor household objects', 'Completely dark or unrecognizable photos', 'Non-civic personal disputes'],
  },
];

export interface SeverityRubricTier {
  range: string;
  band: SeverityBand;
  sla: string;
  criteria: string;
  examples: string;
}

export const SEVERITY_RUBRIC: SeverityRubricTier[] = [
  {
    range: '9–10',
    band: 'Critical',
    sla: 'Immediate (0–4 hours)',
    criteria: 'Immediate threat to life, electrocution hazard, or severe accident risk.',
    examples: 'Exposed live wires, open deep manhole, major road collapse, heavy flooding.',
  },
  {
    range: '7–8',
    band: 'High',
    sla: 'Priority (24–48 hours)',
    criteria: 'Major civic disruption, vehicular damage risk, or acute public health hazard.',
    examples: 'Large pothole on main road, burst water main, overflowing garbage near school or hospital.',
  },
  {
    range: '4–6',
    band: 'Medium',
    sla: 'Standard (Within 7 days)',
    criteria: 'Routine municipal maintenance issue with moderate public inconvenience.',
    examples: 'Single non-working streetlight, moderate drain siltation, minor footpath slab damage.',
  },
  {
    range: '1–3',
    band: 'Low',
    sla: 'Scheduled (Within 14 days)',
    criteria: 'Cosmetic defect or minor nuisance with negligible safety risk.',
    examples: 'Faded road markings, small harmless curb puddle, overgrown roadside weeds.',
  },
  {
    range: '0',
    band: 'Rejected',
    sla: 'Not Applicable',
    criteria: 'Image is unrelated to public civic infrastructure or visually unrecognizable.',
    examples: 'Selfies, memes, private indoor objects, pitch-black or severely blurred uploads.',
  },
];

export function getSeverityBand(score: number, isValid: boolean): SeverityBand {
  if (!isValid || score <= 0) return 'Rejected';
  if (score >= 9) return 'Critical';
  if (score >= 7) return 'High';
  if (score >= 4) return 'Medium';
  return 'Low';
}

export function getRecommendedSla(band: SeverityBand): string {
  switch (band) {
    case 'Critical':
      return 'Immediate (0–4 hours)';
    case 'High':
      return 'Priority (24–48 hours)';
    case 'Medium':
      return 'Standard (Within 7 days)';
    case 'Low':
      return 'Scheduled (Within 14 days)';
    case 'Rejected':
      return 'N/A';
  }
}

export function resolveMunicipalDepartment(input: unknown, isValid: boolean): MunicipalDepartment {
  if (!isValid) return 'Invalid / Other';
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const exact = MUNICIPAL_DEPARTMENTS.find(
      (dept) => dept.toLowerCase() === trimmed.toLowerCase()
    );
    if (exact && exact !== 'Invalid / Other') {
      return exact;
    }

    const lower = trimmed.toLowerCase();
    if (lower.includes('pwd') || lower.includes('road') || lower.includes('public works')) {
      return 'Public Works & Roads (PWD)';
    }
    if (lower.includes('kseb') || lower.includes('electric') || lower.includes('streetlight')) {
      return 'Electrical & Streetlights (KSEB)';
    }
    if (lower.includes('waste') || lower.includes('sanitation') || lower.includes('garbage')) {
      return 'Waste & Sanitation';
    }
    if (lower.includes('kwa') || lower.includes('water') || lower.includes('drain')) {
      return 'Water Supply & Drainage (KWA)';
    }
    if (lower.includes('safety') || lower.includes('encroach')) {
      return 'Public Safety & Encroachment';
    }
  }
  return 'Public Works & Roads (PWD)';
}

function asNonEmptyString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

function asNullableString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

function asStringArray(value: unknown, fallbackSingle?: string | null): string[] {
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);
    if (cleaned.length > 0) return cleaned;
  }
  if (fallbackSingle && fallbackSingle.trim().length > 0) {
    return fallbackSingle
      .split(/[,—-]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

function enforceSingleSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'No visual risk factors identified.';
  return cleaned;
}

export function normalizeTriagePayload(raw: unknown): TriageTicketJSON {
  const record = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const isValid = Boolean(record.is_valid_civic_issue);
  const locationClues = asNullableString(record.location_clues);

  if (!isValid) {
    const rejectionReason = asNonEmptyString(
      record.rejection_reason,
      'The uploaded photograph does not depict public civic infrastructure or a verifiable municipal issue.'
    );
    return {
      is_valid_civic_issue: false,
      rejection_reason: rejectionReason,
      department: 'Invalid / Other',
      issue_category: asNonEmptyString(record.issue_category, 'Non-Civic / Invalid Submission'),
      severity_score: 0,
      severity_level: 'Rejected',
      recommended_sla: 'N/A',
      severity_reasoning: enforceSingleSentence(
        asNonEmptyString(
          record.severity_reasoning,
          'No public civic hazard or municipal infrastructure defect is visible in the submitted image.'
        )
      ),
      ticket_title: asNonEmptyString(record.ticket_title, 'Rejected Submission — Non-Civic Content'),
      formal_summary: asNonEmptyString(
        record.formal_summary,
        'The citizen submission has been automatically filtered out during multimodal triage because the attached photograph does not depict a public municipal infrastructure issue.'
      ),
      extracted_landmarks: [],
      recommended_action: 'Close submission as invalid and notify citizen to submit a valid outdoor civic infrastructure photograph.',
      detected_language: asNonEmptyString(record.detected_language, 'English'),
      location_clues: locationClues,
      visual_verification_note: asNonEmptyString(
        record.visual_verification_note,
        'Visual inspection indicates the photo is unrelated to public civic infrastructure.'
      ),
      exaggeration_or_mismatch: true,
    };
  }

  const parsedScore = Number(record.severity_score);
  const clampedScore = Number.isFinite(parsedScore)
    ? Math.max(1, Math.min(10, Math.round(parsedScore)))
    : 5;
  const band = getSeverityBand(clampedScore, true);
  const department = resolveMunicipalDepartment(record.department, true);

  return {
    is_valid_civic_issue: true,
    rejection_reason: null,
    department,
    issue_category: asNonEmptyString(record.issue_category, 'General Civic Infrastructure Defect'),
    severity_score: clampedScore,
    severity_level: band,
    recommended_sla: getRecommendedSla(band),
    severity_reasoning: enforceSingleSentence(
      asNonEmptyString(
        record.severity_reasoning,
        'Visual evidence confirms a public infrastructure defect requiring municipal inspection.'
      )
    ),
    ticket_title: asNonEmptyString(record.ticket_title, `${department} Maintenance Ticket`),
    formal_summary: asNonEmptyString(
      record.formal_summary,
      'A public infrastructure defect has been reported and visually confirmed for municipal department review.'
    ),
    extracted_landmarks: asStringArray(record.extracted_landmarks, locationClues),
    recommended_action: asNonEmptyString(
      record.recommended_action,
      `Dispatch ${department} field inspection crew within ${getRecommendedSla(band)} to verify and remediate the reported defect.`
    ),
    detected_language: asNonEmptyString(record.detected_language, 'English'),
    location_clues: locationClues,
    visual_verification_note: asNonEmptyString(
      record.visual_verification_note,
      'Visual evidence aligns with the submitted civic issue report.'
    ),
    exaggeration_or_mismatch: Boolean(record.exaggeration_or_mismatch),
    ...(record.requires_police_escalation === true ||
    department === 'Public Safety & Encroachment'
      ? { requires_police_escalation: true }
      : {}),
  };
}

export function buildStrictJsonOutput(ticket: TriageTicketJSON): string {
  return JSON.stringify(ticket, null, 2);
}

export function generateTicketId(date: Date = new Date(), sequence?: number): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const suffix =
    typeof sequence === 'number'
      ? String(sequence).padStart(4, '0')
      : String(Math.floor(1000 + Math.random() * 9000));
  return `KSM-${yyyy}${mm}${dd}-${suffix}`;
}

export function filterTickets(tickets: StoredTicket[], filters: TicketFilters): StoredTicket[] {
  const q = filters.query.trim().toLowerCase();

  return tickets.filter((item) => {
    if (filters.department !== 'ALL' && item.triage.department !== filters.department) {
      return false;
    }
    if (filters.status !== 'ALL' && item.workflowStatus !== filters.status) {
      return false;
    }
    if (!q) return true;

    const haystack = [
      item.id,
      item.triage.ticket_title,
      item.triage.formal_summary,
      item.triage.department,
      item.triage.issue_category,
      item.triage.location_clues ?? '',
      item.localBodyHint,
      item.citizenDescription,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function computeQueueMetrics(tickets: StoredTicket[]): QueueMetrics {
  const byDepartment: Record<MunicipalDepartment, number> = {
    'Public Works & Roads (PWD)': 0,
    'Electrical & Streetlights (KSEB)': 0,
    'Waste & Sanitation': 0,
    'Water Supply & Drainage (KWA)': 0,
    'Public Safety & Encroachment': 0,
    'Invalid / Other': 0,
  };

  let criticalAndHigh = 0;
  let pendingDispatch = 0;
  let spamRejected = 0;

  for (const ticket of tickets) {
    byDepartment[ticket.triage.department] =
      (byDepartment[ticket.triage.department] ?? 0) + 1;

    if (!ticket.triage.is_valid_civic_issue || ticket.workflowStatus === 'Rejected') {
      spamRejected += 1;
    } else {
      if (ticket.triage.severity_score >= 7) {
        criticalAndHigh += 1;
      }
      if (ticket.workflowStatus === 'Triaged') {
        pendingDispatch += 1;
      }
    }
  }

  return {
    total: tickets.length,
    criticalAndHigh,
    pendingDispatch,
    spamRejected,
    byDepartment,
  };
}

const DUPLICATE_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'near',
  'from',
  'that',
  'this',
  'road',
  'ward',
  'issue',
  'please',
  'urgent',
  'municipality',
  'corporation',
  'panchayat',
  'kerala',
  'public',
  'main',
  'street',
  'area',
  'spot',
]);

function extractMatchTokens(parts: Array<string | null | undefined>): Set<string> {
  const tokens = new Set<string>();
  for (const raw of parts) {
    if (!raw) continue;
    const cleaned = raw
      .toLowerCase()
      .replace(/[^a-z0-9\u0d00-\u0d7f\s]/g, ' ')
      .split(/\s+/);
    for (const token of cleaned) {
      if (token.length >= 3 && !DUPLICATE_STOP_WORDS.has(token)) {
        tokens.add(token);
      }
    }
  }
  return tokens;
}

/**
 * Finds an existing open, valid civic ticket in the same department with overlapping
 * landmarks or location/defect keywords so repeat citizen reports boost priority
 * instead of cluttering the municipal queue.
 */
export function findDuplicateTicketMatch(
  existingTickets: StoredTicket[],
  incoming: TriageTicketJSON,
  incomingLocationHint = '',
  incomingDescription = ''
): StoredTicket | null {
  if (!incoming.is_valid_civic_issue) return null;

  const incomingLandmarks = new Set(
    (incoming.extracted_landmarks ?? [])
      .map((l) => l.trim().toLowerCase())
      .filter((l) => l.length >= 3)
  );
  const incomingTokens = extractMatchTokens([
    ...(incoming.extracted_landmarks ?? []),
    incoming.location_clues,
    incomingLocationHint,
    incoming.ticket_title,
    incoming.issue_category,
    incomingDescription,
  ]);

  if (incomingLandmarks.size === 0 && incomingTokens.size === 0) return null;

  let bestMatch: StoredTicket | null = null;
  let bestScore = 0;

  for (const ticket of existingTickets) {
    if (
      !ticket.triage.is_valid_civic_issue ||
      ticket.workflowStatus === 'Resolved' ||
      ticket.workflowStatus === 'Rejected'
    ) {
      continue;
    }
    if (ticket.triage.department !== incoming.department) {
      continue;
    }

    let score = 0;

    // Direct landmark phrase overlap (strongest signal)
    for (const lm of ticket.triage.extracted_landmarks ?? []) {
      const normalized = lm.trim().toLowerCase();
      if (!normalized) continue;
      for (const incLm of incomingLandmarks) {
        if (
          normalized === incLm ||
          (normalized.length >= 4 && incLm.includes(normalized)) ||
          (incLm.length >= 4 && normalized.includes(incLm))
        ) {
          score += 3;
        }
      }
    }

    // Token overlap across landmarks, location clues, title, and category
    const existingTokens = extractMatchTokens([
      ...(ticket.triage.extracted_landmarks ?? []),
      ticket.triage.location_clues,
      ticket.localBodyHint,
      ticket.triage.ticket_title,
      ticket.triage.issue_category,
    ]);

    let tokenOverlap = 0;
    for (const token of incomingTokens) {
      if (existingTokens.has(token)) {
        tokenOverlap += 1;
      }
    }
    score += tokenOverlap;

    if (score >= 2 && score > bestScore) {
      bestScore = score;
      bestMatch = ticket;
    }
  }

  return bestMatch;
}

/**
 * Increments citizen corroboration count and bumps severity by +1 (capped at 10),
 * recalculating severity band and SLA accordingly.
 */
export function applyTicketCorroboration(
  ticket: StoredTicket,
  timestampIso: string = new Date().toISOString()
): StoredTicket {
  const nextCount = (ticket.corroborationCount ?? 1) + 1;
  const nextSeverity = Math.min(10, Math.max(1, ticket.triage.severity_score + 1));
  const nextBand = getSeverityBand(nextSeverity, true);

  return {
    ...ticket,
    corroborationCount: nextCount,
    lastCorroboratedAt: timestampIso,
    wasCorroborationBoosted: true,
    triage: {
      ...ticket.triage,
      severity_score: nextSeverity,
      severity_level: nextBand,
      recommended_sla: getRecommendedSla(nextBand),
    },
  };
}

export interface DashboardAnalyticsSummary {
  totalActiveHazards: number;
  totalValidTickets: number;
  criticalSlaAlerts: number;
  resolvedCount: number;
  resolutionRatePercent: number;
}

export function computeDashboardAnalytics(
  tickets: StoredTicket[]
): DashboardAnalyticsSummary {
  let totalValidTickets = 0;
  let totalActiveHazards = 0;
  let criticalSlaAlerts = 0;
  let resolvedCount = 0;

  for (const t of tickets) {
    if (!t.triage.is_valid_civic_issue || t.workflowStatus === 'Rejected') {
      continue;
    }
    totalValidTickets += 1;
    if (t.workflowStatus === 'Resolved') {
      resolvedCount += 1;
    } else {
      totalActiveHazards += 1;
      if (t.triage.severity_score >= 7) {
        criticalSlaAlerts += 1;
      }
    }
  }

  const resolutionRatePercent =
    totalValidTickets > 0
      ? Math.round((resolvedCount / totalValidTickets) * 100)
      : 0;

  return {
    totalActiveHazards,
    totalValidTickets,
    criticalSlaAlerts,
    resolvedCount,
    resolutionRatePercent,
  };
}
