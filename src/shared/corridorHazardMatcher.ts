import type { StoredTicket } from './triageSchema';
import type { StoredPoliceCase } from './policeSchema';

export interface CorridorHazardItem {
  id: string;
  source: 'civic' | 'police';
  districtId: string;
  districtName: string;
  title: string;
  categoryOrDept: string;
  severityLabel: string;
  isCritical: boolean;
  summary: string;
}

export interface CorridorHazardReport {
  /** All open hazards grouped by Kerala district id (for 3D map pulsing markers) */
  districtHazardsMap: Record<string, CorridorHazardItem[]>;
  /** Hazards intersecting the active Origin → Destination route corridor */
  routeHazards: CorridorHazardItem[];
  /** Advisories for alternate feeder routes when hazards are present */
  alternateFeederAdvice: string | null;
}

/**
 * Ordered South-to-North Kerala spine used to compute intermediate transit districts
 * between any two Kerala districts (or towards inter-state gateways).
 */
const KERALA_SPINE_ORDER = [
  'thiruvananthapuram',
  'kollam',
  'pathanamthitta',
  'alappuzha',
  'kottayam',
  'idukki',
  'ernakulam',
  'thrissur',
  'palakkad',
  'malappuram',
  'kozhikode',
  'wayanad',
  'kannur',
  'kasaragod',
] as const;

const GATEWAY_ENTRY_DISTRICTS: Record<string, string[]> = {
  bengaluru: ['palakkad', 'wayanad', 'thrissur'],
  mysuru: ['wayanad', 'kozhikode'],
  ooty: ['wayanad', 'malappuram', 'palakkad'],
  coimbatore: ['palakkad', 'thrissur'],
  chennai: ['palakkad', 'thrissur', 'ernakulam'],
  mangaluru: ['kasaragod', 'kannur'],
};

const DISTRICT_KEYWORD_PATTERNS: Array<{
  id: string;
  name: string;
  patterns: RegExp[];
}> = [
  {
    id: 'thiruvananthapuram',
    name: 'Thiruvananthapuram',
    patterns: [/\bthiruvananthapuram\b/i, /\btrivandrum\b/i, /\btvm\b/i, /\bkazhakootam\b/i, /\bkovalam\b/i],
  },
  {
    id: 'kollam',
    name: 'Kollam',
    patterns: [/\bkollam\b/i, /\bquilon\b/i, /\bkottarakkara\b/i, /\bkarunagappally\b/i],
  },
  {
    id: 'pathanamthitta',
    name: 'Pathanamthitta',
    patterns: [/\bpathanamthitta\b/i, /\bthiruvalla\b/i, /\badur\b/i, /\badoor\b/i, /\branni\b/i, /\bkozhencherry\b/i, /\bchengannur\b/i, /\bkonni\b/i, /\bsabarimala\b/i],
  },
  {
    id: 'alappuzha',
    name: 'Alappuzha',
    patterns: [/\balappuzha\b/i, /\balleppey\b/i, /\bcherthala\b/i, /\bkayamkulam\b/i, /\bkuttanad\b/i],
  },
  {
    id: 'kottayam',
    name: 'Kottayam',
    patterns: [/\bkottayam\b/i, /\bpala\b/i, /\bchanganassery\b/i, /\bkumarakom\b/i],
  },
  {
    id: 'idukki',
    name: 'Idukki',
    patterns: [/\bidukki\b/i, /\bmunnar\b/i, /\bthodupuzha\b/i, /\bthekkady\b/i, /\badimali\b/i, /\bkattappana\b/i],
  },
  {
    id: 'ernakulam',
    name: 'Ernakulam',
    patterns: [/\bernakulam\b/i, /\bkochi\b/i, /\bcochin\b/i, /\baluva\b/i, /\bedappally\b/i, /\bkakkanad\b/i, /\bfort kochi\b/i],
  },
  {
    id: 'thrissur',
    name: 'Thrissur',
    patterns: [/\bthrissur\b/i, /\btrichur\b/i, /\bguruvayur\b/i, /\bchalakudy\b/i, /\bmannuthy\b/i],
  },
  {
    id: 'palakkad',
    name: 'Palakkad',
    patterns: [/\bpalakkad\b/i, /\bpalghat\b/i, /\bwalayar\b/i, /\bkuthiran\b/i, /\bshoranur\b/i],
  },
  {
    id: 'malappuram',
    name: 'Malappuram',
    patterns: [/\bmalappuram\b/i, /\bnilambur\b/i, /\bkottakkal\b/i, /\bmanjeri\b/i, /\bperinthalmanna\b/i, /\btirur\b/i],
  },
  {
    id: 'kozhikode',
    name: 'Kozhikode',
    patterns: [/\bkozhikode\b/i, /\bcalicut\b/i, /\bthamarassery\b/i, /\bvadakara\b/i, /\bkoyilandy\b/i],
  },
  {
    id: 'wayanad',
    name: 'Wayanad',
    patterns: [/\bwayanad\b/i, /\bkalpetta\b/i, /\bvythiri\b/i, /\bsulthan bathery\b/i, /\bmananthavady\b/i, /\bnh-?766\b/i, /\bthamarassery ghat\b/i],
  },
  {
    id: 'kannur',
    name: 'Kannur',
    patterns: [/\bkannur\b/i, /\bcannanore\b/i, /\bthalassery\b/i, /\bmattannur\b/i, /\bpayyanur\b/i],
  },
  {
    id: 'kasaragod',
    name: 'Kasaragod',
    patterns: [/\bkasaragod\b/i, /\bkanhangad\b/i, /\bbekal\b/i, /\bmanjeshwaram\b/i],
  },
];

export function detectDistrictsFromText(text: string): Array<{ id: string; name: string }> {
  const matches: Array<{ id: string; name: string }> = [];
  for (const spec of DISTRICT_KEYWORD_PATTERNS) {
    if (spec.patterns.some((rx) => rx.test(text))) {
      matches.push({ id: spec.id, name: spec.name });
    }
  }
  return matches;
}

export function getCorridorDistrictIds(
  originId: string,
  destinationId: string | null
): Set<string> {
  const corridor = new Set<string>([originId]);
  if (!destinationId) return corridor;
  corridor.add(destinationId);

  const gatewayDistricts = GATEWAY_ENTRY_DISTRICTS[destinationId];
  if (gatewayDistricts) {
    gatewayDistricts.forEach((d) => corridor.add(d));
  }

  const originIdx = KERALA_SPINE_ORDER.indexOf(
    originId as (typeof KERALA_SPINE_ORDER)[number]
  );
  const destAnchor = gatewayDistricts ? gatewayDistricts[0] : destinationId;
  const destIdx = KERALA_SPINE_ORDER.indexOf(
    destAnchor as (typeof KERALA_SPINE_ORDER)[number]
  );

  if (originIdx !== -1 && destIdx !== -1) {
    const start = Math.min(originIdx, destIdx);
    const end = Math.max(originIdx, destIdx);
    for (let i = start; i <= end; i++) {
      corridor.add(KERALA_SPINE_ORDER[i]);
    }
  }

  return corridor;
}

function buildAlternateFeederAdvice(
  originId: string,
  destinationId: string | null,
  routeHazards: CorridorHazardItem[]
): string | null {
  if (routeHazards.length === 0) return null;

  const affectedIds = new Set(routeHazards.map((h) => h.districtId));

  if (affectedIds.has('wayanad') || affectedIds.has('kozhikode')) {
    return 'Alternate Feeder Advised: Bypass NH-766 Thamarassery Ghat congestion by boarding Indian Railways via Chengannur (CNGR) / Thiruvalla (TRVL) to Nilambur Road (NIL) or Kozhikode (CLT) and taking the Nadugani / Kuttiady Ghat feeder road to Kalpetta.';
  }
  if (affectedIds.has('pathanamthitta')) {
    return 'Alternate Feeder Advised: Avoid flooded TK Road / Ranni approaches; use the MC Road feeder via Thiruvalla (TRVL) or Chengannur (CNGR) railway station with KSRTC Swift Express connectivity.';
  }
  if (affectedIds.has('ernakulam') || affectedIds.has('thrissur')) {
    return 'Alternate Feeder Advised: Shift long-haul transit to Vande Bharat / Indian Railways mainline (CNGR/KTYM → ERN/TCR/CLT) to bypass urban roadwork and live-wire diversion zones around Aluva & Kochi.';
  }
  if (affectedIds.has('idukki')) {
    return 'Alternate Feeder Advised: Use the Kottayam (KTYM) / Kumily or Aluva–Kothamangalam daytime KSRTC corridor and avoid unlit highland bends after dusk.';
  }

  const destLabel = destinationId ? destinationId.toUpperCase() : originId.toUpperCase();
  return `Alternate Feeder Advised: Prefer Indian Railways mainline or KSRTC Swift NH bypass corridors around flagged zones while travelling toward ${destLabel}.`;
}

/**
 * Cross-references active high-severity civic tickets (>= 7) and open high-priority
 * police traffic/safety petitions against all Kerala districts and the selected route corridor.
 */
export function evaluateCorridorHazards(
  tickets: StoredTicket[],
  policeCases: StoredPoliceCase[],
  originId: string,
  destinationId: string | null
): CorridorHazardReport {
  const districtHazardsMap: Record<string, CorridorHazardItem[]> = {};

  const addHazard = (item: CorridorHazardItem) => {
    if (!districtHazardsMap[item.districtId]) {
      districtHazardsMap[item.districtId] = [];
    }
    if (!districtHazardsMap[item.districtId].some((h) => h.id === item.id)) {
      districtHazardsMap[item.districtId].push(item);
    }
  };

  // 1. Open high-severity civic tickets (severity_score >= 7)
  for (const t of tickets) {
    if (
      !t.triage.is_valid_civic_issue ||
      t.workflowStatus === 'Resolved' ||
      t.workflowStatus === 'Rejected' ||
      t.triage.severity_score < 7
    ) {
      continue;
    }

    const combinedText = [
      t.localBodyHint,
      t.triage.location_clues ?? '',
      t.triage.ticket_title,
      t.triage.formal_summary,
      ...(t.triage.extracted_landmarks ?? []),
    ].join(' ');

    const matchedDistricts = detectDistrictsFromText(combinedText);
    for (const dist of matchedDistricts) {
      addHazard({
        id: `civic-${t.id}-${dist.id}`,
        source: 'civic',
        districtId: dist.id,
        districtName: dist.name,
        title: t.triage.ticket_title,
        categoryOrDept: t.triage.department,
        severityLabel: `Severity ${t.triage.severity_score}/10 (${t.triage.severity_level})`,
        isCritical: t.triage.severity_score >= 9,
        summary: t.triage.severity_reasoning,
      });
    }
  }

  // 2. Open high-priority / traffic / safety police cases
  for (const pc of policeCases) {
    if (pc.status === 'Disposed / Closed') continue;
    const isRouteSafetyRelevant =
      pc.triage.priority_level === 'Critical / Immediate' ||
      pc.triage.priority_level === 'High' ||
      pc.triage.case_category === 'Traffic & Road Obstruction' ||
      pc.triage.case_category === 'Public Nuisance / Safety';

    if (!isRouteSafetyRelevant) continue;

    addHazard({
      id: `police-${pc.caseRefId}-${pc.districtId}`,
      source: 'police',
      districtId: pc.districtId,
      districtName: pc.districtName,
      title: `${pc.triage.case_category} (${pc.caseRefId})`,
      categoryOrDept: pc.triage.recommended_unit,
      severityLabel: pc.triage.priority_level,
      isCritical:
        pc.triage.is_emergency_life_threat ||
        pc.triage.priority_level === 'Critical / Immediate',
      summary: pc.triage.formal_petition_summary,
    });
  }

  // 3. Intersect against selected Origin -> Destination corridor
  const corridorDistricts = getCorridorDistrictIds(originId, destinationId);
  const routeHazards: CorridorHazardItem[] = [];
  const seenIds = new Set<string>();

  for (const dId of corridorDistricts) {
    const items = districtHazardsMap[dId] ?? [];
    for (const item of items) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        routeHazards.push(item);
      }
    }
  }

  // Sort critical hazards first
  routeHazards.sort((a, b) => Number(b.isCritical) - Number(a.isCritical));

  return {
    districtHazardsMap,
    routeHazards,
    alternateFeederAdvice: buildAlternateFeederAdvice(
      originId,
      destinationId,
      routeHazards
    ),
  };
}
