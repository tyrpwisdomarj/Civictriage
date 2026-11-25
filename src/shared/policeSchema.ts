import type { EmailAlertStatus } from './triageSchema';

export const POLICE_CASE_CATEGORIES = [
  'Traffic & Road Obstruction',
  'Cyber Crime & Scam',
  'Lost Property / Document GD',
  'Public Nuisance / Safety',
  'Tourist Assistance',
  'Civic LSG Escalation',
] as const;

export type PoliceCaseCategory = (typeof POLICE_CASE_CATEGORIES)[number];

export const POLICE_PRIORITY_LEVELS = [
  'Critical / Immediate',
  'High',
  'Standard',
] as const;

export type PolicePriorityLevel = (typeof POLICE_PRIORITY_LEVELS)[number];

export const POLICE_CASE_STATUSES = [
  'Submitted',
  'Assigned to SHO / Beat Officer',
  'Under Inquiry',
  'Disposed / Closed',
] as const;

export type PoliceCaseStatus = (typeof POLICE_CASE_STATUSES)[number];

export interface KeralaPoliceDistrict {
  id: string;
  name: string;
  refCode: string;
  defaultStation: string;
  highwayDesk: string;
}

export const KERALA_POLICE_DISTRICTS: readonly KeralaPoliceDistrict[] = [
  {
    id: 'thiruvananthapuram',
    name: 'Thiruvananthapuram',
    refCode: 'TVM',
    defaultStation: 'Thiruvananthapuram Cantonment Police Station',
    highwayDesk: 'NH-66 Kazhakootam–Balaramapuram Highway Patrol',
  },
  {
    id: 'kollam',
    name: 'Kollam',
    refCode: 'KLM',
    defaultStation: 'Kollam East Police Station',
    highwayDesk: 'NH-66 / MC Road Kottarakkara Traffic Unit',
  },
  {
    id: 'pathanamthitta',
    name: 'Pathanamthitta',
    refCode: 'PTA',
    defaultStation: 'Pathanamthitta Police Station',
    highwayDesk: 'TK Road / MC Road Thiruvalla–Ranni Traffic Desk',
  },
  {
    id: 'alappuzha',
    name: 'Alappuzha',
    refCode: 'ALP',
    defaultStation: 'Alappuzha North Police Station',
    highwayDesk: 'NH-66 Cherthala–Kayamkulam Highway Patrol',
  },
  {
    id: 'kottayam',
    name: 'Kottayam',
    refCode: 'KTM',
    defaultStation: 'Kottayam West Police Station',
    highwayDesk: 'MC Road / KK Road Kottayam Traffic Enforcement',
  },
  {
    id: 'idukki',
    name: 'Idukki',
    refCode: 'IDK',
    defaultStation: 'Thodupuzha / Painavu Police Station',
    highwayDesk: 'NH-85 Munnar–Adimali Ghat Patrol',
  },
  {
    id: 'ernakulam',
    name: 'Ernakulam',
    refCode: 'EKM',
    defaultStation: 'Ernakulam Central Police Station',
    highwayDesk: 'NH-544 Edappally–Aluva Metro Traffic Wing',
  },
  {
    id: 'thrissur',
    name: 'Thrissur',
    refCode: 'TSR',
    defaultStation: 'Thrissur Town East Police Station',
    highwayDesk: 'NH-544 Mannuthy–Chalakudy Highway Patrol',
  },
  {
    id: 'palakkad',
    name: 'Palakkad',
    refCode: 'PKD',
    defaultStation: 'Palakkad Town South Police Station',
    highwayDesk: 'NH-544 Walayar–Kuthiran Tunnel Patrol',
  },
  {
    id: 'malappuram',
    name: 'Malappuram',
    refCode: 'MLP',
    defaultStation: 'Malappuram Police Station',
    highwayDesk: 'NH-66 Kottakkal–Perinthalmanna Traffic Unit',
  },
  {
    id: 'kozhikode',
    name: 'Kozhikode',
    refCode: 'KKD',
    defaultStation: 'Kozhikode Town Police Station',
    highwayDesk: 'NH-766 Thamarassery–Kunnamangalam Highway Patrol',
  },
  {
    id: 'wayanad',
    name: 'Wayanad',
    refCode: 'WND',
    defaultStation: 'Kalpetta Police Station',
    highwayDesk: 'NH-766 Thamarassery Ghat–Vythiri Traffic Patrol',
  },
  {
    id: 'kannur',
    name: 'Kannur',
    refCode: 'KNR',
    defaultStation: 'Kannur Town Police Station',
    highwayDesk: 'NH-66 Thalassery–Mattannur Highway Wing',
  },
  {
    id: 'kasaragod',
    name: 'Kasaragod',
    refCode: 'KSD',
    defaultStation: 'Kasaragod Police Station',
    highwayDesk: 'NH-66 Kanhangad–Manjeshwaram Border Patrol',
  },
] as const;

export const KERALA_EMERGENCY_HELPLINES = [
  {
    number: '112',
    label: 'Police / ERSS',
    detail: '24x7 Unified Emergency Response',
    tone: 'rose' as const,
  },
  {
    number: '1930',
    label: 'Cyber Fraud',
    detail: 'National Cyber Crime Helpline',
    tone: 'indigo' as const,
  },
  {
    number: '1912',
    label: 'KSEB Power',
    detail: 'Electrical & Live Wire Faults',
    tone: 'amber' as const,
  },
  {
    number: '1916',
    label: 'KWA Water',
    detail: 'Water Supply & Burst Pipes',
    tone: 'sky' as const,
  },
  {
    number: '1077',
    label: 'Disaster Room',
    detail: 'District Emergency Control',
    tone: 'emerald' as const,
  },
] as const;

export const KERALA_POLICE_PORTAL_LINKS = {
  thuna: 'https://thuna.keralapolice.gov.in/',
  polApp: 'https://keralapolice.gov.in/',
} as const;

export interface PoliceTriageResult {
  is_emergency_life_threat: boolean;
  case_category: PoliceCaseCategory;
  recommended_unit: string;
  jurisdictional_station: string;
  priority_level: PolicePriorityLevel;
  formal_petition_summary: string;
  required_documents_checklist: string[];
  actionable_legal_guidance: string;
}

export interface StoredPoliceCase {
  id: string;
  caseRefId: string;
  createdAt: string;
  districtId: string;
  districtName: string;
  incidentDateTime: string;
  description: string;
  evidenceImageUrl?: string;
  evidenceFileName?: string;
  status: PoliceCaseStatus;
  disposalRemarks: string;
  emailAlertStatus?: EmailAlertStatus;
  isLockedHouseIntimation?: boolean;
  travelDates?: string;
  triage: PoliceTriageResult;
}

export function getPoliceDistrictById(id: string): KeralaPoliceDistrict {
  return (
    KERALA_POLICE_DISTRICTS.find((d) => d.id === id) ??
    KERALA_POLICE_DISTRICTS[2] // Pathanamthitta default
  );
}

export function generatePoliceCaseRefId(
  districtId: string,
  date: Date = new Date(),
  sequence?: number
): string {
  const district = getPoliceDistrictById(districtId);
  const year = date.getFullYear();
  const suffix =
    typeof sequence === 'number'
      ? String(sequence).padStart(4, '0')
      : String(Math.floor(1000 + Math.random() * 9000));
  return `KL-${district.refCode}-${year}-${suffix}`;
}

function resolvePoliceCategory(raw: unknown): PoliceCaseCategory {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const exact = POLICE_CASE_CATEGORIES.find(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );
    if (exact) return exact;
    const lower = trimmed.toLowerCase();
    if (/traffic|road|highway|accident|obstruction|block|landslide/.test(lower)) {
      return 'Traffic & Road Obstruction';
    }
    if (/cyber|scam|upi|fraud|otp|phishing|online/.test(lower)) {
      return 'Cyber Crime & Scam';
    }
    if (/lost|missing|passport|licence|license|document|gd|diary/.test(lower)) {
      return 'Lost Property / Document GD';
    }
    if (/tourist|visitor|travel|locked house/.test(lower)) {
      return 'Tourist Assistance';
    }
    if (/civic|lsg|municipal|panchayat|encroachment/.test(lower)) {
      return 'Civic LSG Escalation';
    }
  }
  return 'Public Nuisance / Safety';
}

function resolvePriorityLevel(
  raw: unknown,
  isEmergency: boolean
): PolicePriorityLevel {
  if (isEmergency) return 'Critical / Immediate';
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if (lower.includes('critical') || lower.includes('immediate')) {
      return 'Critical / Immediate';
    }
    if (lower.includes('high')) return 'High';
    if (lower.includes('standard') || lower.includes('normal') || lower.includes('low')) {
      return 'Standard';
    }
  }
  return 'Standard';
}

export function normalizePoliceTriagePayload(
  raw: unknown,
  districtId: string
): PoliceTriageResult {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const district = getPoliceDistrictById(districtId);

  const isEmergency = Boolean(obj.is_emergency_life_threat);
  const category = resolvePoliceCategory(obj.case_category);
  const priority = resolvePriorityLevel(obj.priority_level, isEmergency);

  const recommendedUnit =
    typeof obj.recommended_unit === 'string' && obj.recommended_unit.trim()
      ? obj.recommended_unit.trim()
      : category === 'Cyber Crime & Scam'
        ? 'Cyber Crime Cell (1930)'
        : category === 'Traffic & Road Obstruction'
          ? 'Traffic Enforcement Wing'
          : category === 'Tourist Assistance'
            ? 'Tourist Police & Janamaithri Beat Desk'
            : 'Local Law & Order Police Station';

  const station =
    typeof obj.jurisdictional_station === 'string' &&
    obj.jurisdictional_station.trim()
      ? obj.jurisdictional_station.trim()
      : district.defaultStation;

  const summary =
    typeof obj.formal_petition_summary === 'string' &&
    obj.formal_petition_summary.trim()
      ? obj.formal_petition_summary.trim()
      : `A formal e-petition has been logged for ${district.name} jurisdiction under ${category} for Station House Officer (SHO) review and General Diary entry.`;

  const rawChecklist = Array.isArray(obj.required_documents_checklist)
    ? obj.required_documents_checklist
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim())
        .slice(0, 6)
    : [];

  const checklist =
    rawChecklist.length > 0
      ? rawChecklist
      : [
          'Valid Government Photo ID (Aadhaar / Driving Licence / Passport)',
          'Incident photographs, CCTV stills, or supporting receipts if available',
          'Written contact number and local address for Beat Officer follow-up',
        ];

  const guidance =
    typeof obj.actionable_legal_guidance === 'string' &&
    obj.actionable_legal_guidance.trim()
      ? obj.actionable_legal_guidance.trim()
      : 'Preserve original digital/physical evidence and quote your Case Reference ID on the Kerala Police THUNA portal or at the jurisdictional police station.';

  return {
    is_emergency_life_threat: isEmergency,
    case_category: category,
    recommended_unit: recommendedUnit,
    jurisdictional_station: station,
    priority_level: priority,
    formal_petition_summary: summary,
    required_documents_checklist: checklist,
    actionable_legal_guidance: guidance,
  };
}
