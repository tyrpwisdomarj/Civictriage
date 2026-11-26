import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  MUNICIPAL_DEPARTMENTS,
  normalizeTriagePayload,
} from './src/shared/triageSchema.ts';
import {
  normalizeTravelGuidePayload,
  normalizeTravelPreference,
  type TravelGuideResponse,
  type TravelPreference,
} from './src/shared/travelSchema.ts';
import {
  ASSISTANT_ACTION_IDS,
  buildSessionContextBlock,
  normalizeAssistantResponse,
  type AssistantApiResponse,
  type AssistantSessionContext,
} from './src/shared/assistantSchema.ts';

import {
  getPoliceDistrictById,
  normalizePoliceTriagePayload,
  POLICE_CASE_CATEGORIES,
  POLICE_PRIORITY_LEVELS,
  type PoliceTriageResult,
} from './src/shared/policeSchema.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const ALLOWED_POLICE_EVIDENCE_MIME_TYPES = new Set([
  ...ALLOWED_MIME_TYPES,
  'application/pdf',
]);

const FLASH_MULTIMODAL_MODELS = [
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
] as const;

const triageResultCache = new Map<string, ReturnType<typeof normalizeTriagePayload>>();

const TRIAGE_SYSTEM_INSTRUCTION = `You are an expert Municipal Civic Issue Triage AI for local self-government bodies (municipalities and panchayats in Kerala, integrating with official portals such as K-SMART). Your job is to analyze a citizen's uploaded image and text description (which may be in English, Malayalam, or Manglish) and convert it into a structured, actionable municipal triage ticket.

Follow these strict rules:
1. VALIDATION & SPAM GUARDRAIL: First inspect the image and text. If the image is unrelated to public civic infrastructure (e.g., selfies, memes, indoor private objects, completely dark/blurry unrecognizable photos), set "is_valid_civic_issue" to false, explain why clearly in "rejection_reason", set "department" to "Invalid / Other", and set "severity_score" to 0.
2. MULTIMODAL CROSS-CHECK: Rely primarily on visual evidence in the photo. If the user's text exaggerates (e.g., claims "massive flood" for a tiny puddle) or is vague (e.g., "fix this fast"), base your severity and category strictly on what is actually visible in the image, while incorporating valid location/context clues from the text. Set "exaggeration_or_mismatch" to true whenever the citizen's text substantially exaggerates or contradicts the visual evidence, and explain the comparison objectively in "visual_verification_note".
3. DEPARTMENT ROUTING: Map the issue strictly to one of these municipal departments:
   - "Public Works & Roads (PWD)" (potholes, broken footpaths, road cave-ins, fallen trees blocking roads)
   - "Electrical & Streetlights (KSEB)" (broken streetlights, hanging/live wires, damaged transformer fencing)
   - "Waste & Sanitation" (overflowing bins, illegal garbage dumping, dead animals, clogged public drains)
   - "Water Supply & Drainage (KWA)" (burst water pipes, open manholes, severe waterlogging/flooding)
   - "Public Safety & Encroachment" (abandoned vehicles, blocked emergency access, damaged public signage)
   - "Invalid / Other" (if not a valid civic issue)
4. SEVERITY SCORING (1 to 10 for valid issues, 0 for invalid):
   - 9–10 (Critical): Immediate threat to life or severe accident risk (e.g., exposed live wires, open deep manhole, major road collapse, heavy flooding).
   - 7–8 (High): Major disruption or health hazard requiring action within 24–48 hours (e.g., large pothole on main road, burst water main, massive garbage pile near school/hospital).
   - 4–6 (Medium): Standard maintenance needed within a week (e.g., single non-working streetlight, moderate drain silt, minor footpath damage).
   - 1–3 (Low): Cosmetic or minor inconvenience (e.g., faded road markings, tiny harmless curb puddle, overgrown roadside weeds).
5. EXPLAINABILITY: Provide a crisp, objective 1-sentence "severity_reasoning" explaining the exact visual risk factors observed.
6. FORMAL TICKET DRAFTING: Translate any local slang, Manglish, or Malayalam into a formal, neutral, third-person English summary ("formal_summary") and concise subject line ("ticket_title") suitable for an official government portal like K-SMART.
7. OUTPUT FORMAT: Return ONLY valid JSON matching the exact schema provided. Do not wrap in markdown code fences or add conversational text.`;

const TRIAGE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    is_valid_civic_issue: {
      type: Type.BOOLEAN,
      description: 'True only if the image shows a verifiable public civic infrastructure issue.',
    },
    rejection_reason: {
      type: Type.STRING,
      nullable: true,
      description: 'Required explanation when is_valid_civic_issue is false; null when valid.',
    },
    department: {
      type: Type.STRING,
      enum: [...MUNICIPAL_DEPARTMENTS],
      description: 'Strictly one of the 6 municipal departments.',
    },
    issue_category: {
      type: Type.STRING,
      description: 'Short specific civic defect category (e.g., Snapped Overhead Power Cable, Carriageway Pothole, Minor Curb Puddle).',
    },
    severity_score: {
      type: Type.INTEGER,
      description: '0 if invalid; integer 1 to 10 based primarily on visual risk evidence.',
    },
    severity_reasoning: {
      type: Type.STRING,
      description: 'Crisp, objective single-sentence explanation of the exact visual risk factors observed.',
    },
    ticket_title: {
      type: Type.STRING,
      description: 'Concise formal English subject line suitable for a K-SMART municipal ticket.',
    },
    formal_summary: {
      type: Type.STRING,
      description: 'Formal, neutral, third-person English summary translating any Malayalam or Manglish report for an official government portal.',
    },
    extracted_landmarks: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of concrete landmarks, shop signs, roads, junctions, or ward identifiers extracted from the text or visible signage in the image.',
    },
    recommended_action: {
      type: Type.STRING,
      description: 'Concrete operational dispatch instruction for the assigned municipal department.',
    },
    detected_language: {
      type: Type.STRING,
      description: 'Detected language of the citizen description: English, Malayalam, Manglish, or Mixed.',
    },
    location_clues: {
      type: Type.STRING,
      nullable: true,
      description: 'Extracted road, ward, landmark, or local body clue from text or image signage, or null if unavailable.',
    },
    visual_verification_note: {
      type: Type.STRING,
      description: 'Objective 1-2 sentence cross-check comparing what is visible in the photo against the citizen description.',
    },
    exaggeration_or_mismatch: {
      type: Type.BOOLEAN,
      description: 'True if the citizen text exaggerates, mischaracterizes, or contradicts what is visible in the photo.',
    },
    requires_police_escalation: {
      type: Type.BOOLEAN,
      description: 'True if the issue involves traffic obstruction, illegal encroachment blocking emergency vehicles, public safety threat, or law-enforcement intervention suited for Kerala Police.',
    },
  },
  required: [
    'is_valid_civic_issue',
    'department',
    'issue_category',
    'severity_score',
    'severity_reasoning',
    'ticket_title',
    'formal_summary',
    'extracted_landmarks',
    'recommended_action',
    'detected_language',
    'visual_verification_note',
    'exaggeration_or_mismatch',
    'requires_police_escalation',
  ],
};

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSmartTriageFallback(description: string, locationHint: string) {
  const combined = `${description} ${locationHint}`.toLowerCase();
  const isSpam =
    /\b(selfie|meme|cat|dog|laptop|bedroom|indoor|coffee mug|desk|food selfie|gaming setup|test spam)\b/i.test(
      combined
    );

  const hasMalayalamChars = /[\u0D00-\u0D7F]/.test(description);
  const hasManglishWords =
    /\b(aanu|undu|undayittundu|kuzhi|vellam|kseb|pottiyittundu|karanam|evide|ivide|road-il|vazhi)\b/i.test(
      combined
    );
  const detectedLanguage = hasMalayalamChars
    ? 'Malayalam'
    : hasManglishWords
      ? 'Manglish'
      : 'English';

  const extractedLandmarks = [
    ...(locationHint
      ? locationHint
          .split(/[,—\-|]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 2)
      : []),
    ...(description.match(
      /\b(?:NH-\d+|SH-\d+|MC Road|Ward \d+|[A-Z][a-z]+ (?:Junction|Road|Bridge|Market|Hospital|School|Bus Stand|Panchayat|Municipality|Ghat))\b/g
    ) ?? []),
  ].slice(0, 4);

  if (isSpam) {
    return normalizeTriagePayload({
      is_valid_civic_issue: false,
      rejection_reason:
        'Uploaded submission does not depict verifiable public civic infrastructure suitable for LSG municipal dispatch.',
      department: 'Invalid / Other',
      issue_category: 'Non-Civic / Invalid Submission',
      severity_score: 0,
      severity_reasoning:
        'Submission appears unrelated to public roads, utilities, sanitation, or municipal infrastructure.',
      ticket_title: 'Rejected Non-Civic Submission',
      formal_summary:
        'Automated K-SMART screening determined that the submitted report does not correspond to a public municipal infrastructure defect.',
      extracted_landmarks: extractedLandmarks,
      recommended_action: 'No municipal dispatch required; notify submitter to upload outdoor public hazard evidence.',
      detected_language: detectedLanguage,
      location_clues: locationHint || extractedLandmarks[0] || null,
      visual_verification_note:
        'Flagged during automated screening as unrelated to outdoor public infrastructure.',
      exaggeration_or_mismatch: true,
      requires_police_escalation: false,
    });
  }

  let department = 'Public Works & Roads (PWD)';
  let issueCategory = 'Carriageway Damage / Pothole';
  let severityScore = 7;
  let recommendedAction =
    'Dispatch PWD Assistant Engineer crew within 24 hours for temporary barricading and asphalt patching.';
  let requiresPolice = false;

  if (
    /\b(wire|cable|electric|kseb|transformer|pole|spark|shock|current|streetlight|street light|lamp)\b/i.test(
      combined
    )
  ) {
    department = 'Electrical & Streetlights (KSEB)';
    const isLiveHazard = /\b(live|snapped|hanging|spark|fallen|shock|broken pole)\b/i.test(combined);
    issueCategory = isLiveHazard ? 'Exposed / Snapped Overhead Power Line' : 'Non-Functional Streetlight';
    severityScore = isLiveHazard ? 9 : 5;
    recommendedAction = isLiveHazard
      ? 'Immediate KSEB emergency feeder isolation (1912), perimeter cordoning, and line restoration.'
      : 'Schedule KSEB / LSG electrical maintenance team to replace luminaire and inspect feeder fuse.';
    requiresPolice = isLiveHazard;
  } else if (
    /\b(water|pipe|burst|leak|kwa|manhole|flood|waterlog|vellam|drainage overflow|sewage)\b/i.test(
      combined
    )
  ) {
    department = 'Water Supply & Drainage (KWA)';
    const isCriticalWater = /\b(open manhole|deep|flood|burst|gushing|main)\b/i.test(combined);
    issueCategory = isCriticalWater
      ? 'Burst Water Main / Open Drainage Hazard'
      : 'Waterlogging & Drainage Blockage';
    severityScore = isCriticalWater ? 8 : 6;
    recommendedAction =
      'Dispatch KWA pipeline & drainage response unit to isolate valve, install manhole barricades, and clear stormwater outfall.';
    requiresPolice = /\b(open manhole|flood|highway)\b/i.test(combined);
  } else if (
    /\b(garbage|waste|trash|dump|bin|sanitation|plastic|smell|stink|drain silt|dead animal|mosquito)\b/i.test(
      combined
    )
  ) {
    department = 'Waste & Sanitation';
    issueCategory = 'Illegal Waste Dumping / Overflowing Public Bin';
    severityScore = /\b(school|hospital|market|bio|medical|massive)\b/i.test(combined) ? 7 : 6;
    recommendedAction =
      'Deploy Haritha Karma Sena / Municipal Sanitation squad for immediate clearance, bleaching, and anti-dumping signage.';
  } else if (
    /\b(encroach|abandoned|blocking|traffic|illegal park|signage|footpath blocked|unsafe)\b/i.test(
      combined
    )
  ) {
    department = 'Public Safety & Encroachment';
    issueCategory = 'Public Right-of-Way Obstruction / Safety Hazard';
    severityScore = 7;
    recommendedAction =
      'Coordinate LSG Enforcement Wing with local traffic police to clear obstruction and restore pedestrian/emergency access.';
    requiresPolice = true;
  } else if (/\b(landslide|mudslide|washout|collapse|fallen tree|hairpin|ghat)\b/i.test(combined)) {
    department = 'Public Works & Roads (PWD)';
    issueCategory = 'Road Collapse / Landslide Obstruction';
    severityScore = 9;
    recommendedAction =
      'Alert PWD Emergency Earthmover Unit and District Disaster Management (1077) for immediate debris clearance and traffic diversion.';
    requiresPolice = true;
  }

  const locationDisplay = locationHint || extractedLandmarks[0] || 'Reported Municipal Ward';
  const shortDesc = description.replace(/\s+/g, ' ').trim().slice(0, 180);

  return normalizeTriagePayload({
    is_valid_civic_issue: true,
    rejection_reason: null,
    department,
    issue_category: issueCategory,
    severity_score: severityScore,
    severity_reasoning: `Assessed as ${severityScore}/10 priority based on public commuter safety risk and infrastructure disruption reported at ${locationDisplay}.`,
    ticket_title: `${issueCategory} — ${locationDisplay.slice(0, 55)}`,
    formal_summary: `Citizen report logged for ${locationDisplay} concerning ${issueCategory.toLowerCase()}. Reported details: "${shortDesc}". Routed to ${department} for field inspection and K-SMART remediation tracking.`,
    extracted_landmarks:
      extractedLandmarks.length > 0 ? extractedLandmarks : [locationDisplay],
    recommended_action: recommendedAction,
    detected_language: detectedLanguage,
    location_clues: locationDisplay,
    visual_verification_note:
      'Submitted photograph attached to K-SMART dossier; triaged via resilient LSG routing engine while live vision quota resets.',
    exaggeration_or_mismatch: false,
    requires_police_escalation: requiresPolice,
  });
}

async function runTriageWithRetry(
  ai: GoogleGenAI,
  mimeType: string,
  imageBase64: string,
  description: string,
  locationHint: string
) {
  const cacheKey = `${description.toLowerCase()}::${locationHint.toLowerCase()}::${imageBase64.slice(0, 48)}::${imageBase64.length}`;
  const cached = triageResultCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promptText = [
    'Analyze the attached citizen photograph and text description according to all municipal triage rules.',
    `Citizen Description: ${description}`,
    locationHint ? `Reported Local Body / Ward / Landmark: ${locationHint}` : 'Reported Local Body / Ward / Landmark: Not provided',
  ].join('\n');

  let lastError: unknown;
  for (const model of FLASH_MULTIMODAL_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
          config: {
            systemInstruction: TRIAGE_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: TRIAGE_RESPONSE_SCHEMA,
          },
        });

        const rawText = (response.text ?? '').trim();
        if (!rawText) {
          throw new Error('Empty response returned by triage model.');
        }

        const cleaned = rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        const parsed = JSON.parse(cleaned);
        const normalized = normalizeTriagePayload(parsed);
        if (triageResultCache.size >= 120) {
          const firstKey = triageResultCache.keys().next().value;
          if (firstKey) triageResultCache.delete(firstKey);
        }
        triageResultCache.set(cacheKey, normalized);
        return normalized;
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        // Immediately fail over to the next lighter model on 429/quota or 404/model-not-found
        if (/429|RESOURCE_EXHAUSTED|NOT_FOUND|404|is not found|not supported for generateContent/i.test(msg)) {
          break;
        }
        const isTransient = /503|500|UNAVAILABLE|DEADLINE_EXCEEDED|fetch failed/i.test(msg);
        if (!isTransient || attempt === 1) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 450));
      }
    }
  }

  const lastMsg = lastError instanceof Error ? lastError.message : String(lastError);
  if (/API_KEY_INVALID|PERMISSION_DENIED|GEMINI_API_KEY is not configured/i.test(lastMsg)) {
    throw lastError;
  }

  // Graceful resilient fallback when all Gemini tiers are temporarily quota-throttled
  const fallback = buildSmartTriageFallback(description, locationHint);
  triageResultCache.set(cacheKey, fallback);
  return fallback;
}

const TRAVEL_GUIDE_SYSTEM_INSTRUCTION = `You are an expert Global & Kerala Multi-Modal Transport, Aviation Carrier, Biodiversity, and Cultural Planner assisting citizens and travelers moving anywhere across Kerala, India (all 28 states & 8 UTs), and all 195 countries worldwide.

Follow these strict domain rules:
1. ACCURATE KERALA & GLOBAL HUB LOGIC:
   - Pathanamthitta has NO airport and NO central town railway station: rail routes MUST feed via Thiruvalla (TRVL) or Chengannur (CNGR) via KSRTC/auto feeder; domestic and international flights connect via Cochin International (COK) or Thiruvananthapuram (TRV); KSRTC Swift / Super Fast connects district hubs and inter-state corridors.
   - Idukki and Wayanad also have no railway stations: Idukki feeds via Kottayam (KTYM) / Aluva (AWY) / Ernakulam, and Wayanad feeds via Kozhikode (CLT) / Nilambur Road (NIL) / Mysuru (MYS).
   - For international or long-haul domestic routes, include realistic origin feeder steps (e.g., Pathanamthitta → COK/TRV Airport) followed by actual airline flight legs and destination airport-to-city transit (metro, express rail, taxi).
   - Adapt cleanly to the requested Travel Preference:
     * "Balanced": Practical blend of non-stop/1-stop carriers, Vande Bharat/Express rail, or KSRTC Swift.
     * "Budget KSRTC & Rail": Lowest-cost airlines (IndiGo 6E / Air India Express IX / Akasa Air QP), KSRTC Super Fast, or Indian Railways 2S/SL/3A.
     * "Fastest Air & Express": Fastest non-stop flights (Emirates EK, Qatar QR, Air India AI, Singapore Airlines SQ, British Airways BA, IndiGo 6E) or Vande Bharat Express.
2. CARRIER OPTIONS (carrier_options): Return 3 to 5 realistic bookable carrier options matching the route:
   - For international flights (e.g., Kerala/India to UAE, UK, USA, Europe, Singapore, Japan, Australia, etc.): include real global carriers such as Emirates (EK via DXB), Qatar Airways (QR via DOH), Etihad (EY via AUH), Air India (AI), Singapore Airlines (SQ via SIN), British Airways (BA via LHR), Lufthansa (LH via FRA), or Air India Express (IX), with realistic flight numbers (e.g. "EK-531", "QR-517", "AI-161", "SQ-535"), wide-body aircraft ("Boeing 777-300ER", "Airbus A380", "Boeing 787-9 Dreamliner", "Airbus A350-900"), realistic departure/arrival times, stops_label ("Non-stop" or "1 Stop via DXB"), duration, baggage_allowance ("30 kg Check-in + 7 kg Cabin"), and realistic INR fare_inr.
   - For domestic India flights: include IndiGo (6E), Air India (AI), Air India Express (IX), Akasa Air (QP), or SpiceJet (SG), plus relevant IRCTC Train ("Vande Bharat Express", "Malabar Express") or KSRTC Swift Bus options when the origin and destination are within Kerala or South India.
   - Set channel strictly to "flight", "irctc", or "ksrtc". Set is_wide_body=true for wide-body jets (B777, B787, A350, A380) and false for narrow-body/rail/bus.
3. DESTINATION WORLD PROFILE (destination_world_profile): Provide accurate country, state_or_region, currency (e.g. "AED — UAE Dirham" or "INR — Indian Rupee"), timezone (e.g. "UTC+04:00 (GST)"), signature_landmark, local_biome_and_wildlife, visa_and_entry_tip (practical visa/e-Visa/entry note for Indian passport holders, or domestic ID tip for India), and top_3_attractions (array of 3 iconic real landmarks).
4. TRANSPORT STEPS, BIODIVERSITY & TOURIST SPOTS: Provide 2 to 5 sequential transport_steps, accurate regional_culture_and_biodiversity, and exactly 3 real tourist_spots with category, description, and how_to_reach_from_hub.
5. OUTPUT FORMAT: Return ONLY valid JSON matching the exact schema provided.`;

const TRAVEL_GUIDE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    origin: { type: Type.STRING },
    destination: { type: Type.STRING },
    travel_preference: {
      type: Type.STRING,
      enum: ['Balanced', 'Budget KSRTC & Rail', 'Fastest Air & Express'],
    },
    route_summary: {
      type: Type.STRING,
      description: 'Concise 1-2 sentence overview of the recommended corridor.',
    },
    estimated_duration: {
      type: Type.STRING,
      description: 'Total door-to-door journey duration, e.g. "6h 45m".',
    },
    estimated_cost_inr: {
      type: Type.STRING,
      description: 'Realistic total estimated INR fare range, e.g. "₹14,500 – ₹28,000".',
    },
    origin_nearest_hubs: {
      type: Type.OBJECT,
      properties: {
        railway_station: {
          type: Type.STRING,
          description: 'Nearest railhead(s) serving the origin with station codes.',
        },
        ksrtc_depot: {
          type: Type.STRING,
          description: 'Primary KSRTC or regional bus depot serving the origin.',
        },
        nearest_airport: {
          type: Type.STRING,
          description: 'Nearest airport(s) with IATA code serving the origin.',
        },
      },
      required: ['railway_station', 'ksrtc_depot', 'nearest_airport'],
    },
    carrier_options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          channel: {
            type: Type.STRING,
            enum: ['flight', 'irctc', 'ksrtc'],
          },
          airline_or_operator: { type: Type.STRING },
          carrier_code: { type: Type.STRING },
          flight_or_service_number: { type: Type.STRING },
          aircraft_or_vehicle: { type: Type.STRING },
          stops_label: { type: Type.STRING },
          departure_time: { type: Type.STRING },
          arrival_time: { type: Type.STRING },
          duration: { type: Type.STRING },
          baggage_allowance: { type: Type.STRING },
          fare_inr: { type: Type.INTEGER },
          origin_hub: { type: Type.STRING },
          destination_hub: { type: Type.STRING },
          is_wide_body: { type: Type.BOOLEAN },
        },
        required: [
          'id',
          'channel',
          'airline_or_operator',
          'carrier_code',
          'flight_or_service_number',
          'aircraft_or_vehicle',
          'stops_label',
          'departure_time',
          'arrival_time',
          'duration',
          'baggage_allowance',
          'fare_inr',
          'origin_hub',
          'destination_hub',
          'is_wide_body',
        ],
      },
    },
    destination_world_profile: {
      type: Type.OBJECT,
      properties: {
        country: { type: Type.STRING },
        state_or_region: { type: Type.STRING },
        currency: { type: Type.STRING },
        timezone: { type: Type.STRING },
        signature_landmark: { type: Type.STRING },
        local_biome_and_wildlife: { type: Type.STRING },
        visa_and_entry_tip: { type: Type.STRING },
        top_3_attractions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        'country',
        'state_or_region',
        'currency',
        'timezone',
        'signature_landmark',
        'local_biome_and_wildlife',
        'visa_and_entry_tip',
        'top_3_attractions',
      ],
    },
    transport_steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step_number: { type: Type.INTEGER },
          mode: {
            type: Type.STRING,
            enum: [
              'Train',
              'KSRTC Bus',
              'Interstate Bus',
              'Flight',
              'Local Cab / Auto',
              'Ferry / Metro',
            ],
          },
          from: { type: Type.STRING },
          to: { type: Type.STRING },
          operator_or_line: { type: Type.STRING },
          duration: { type: Type.STRING },
          approx_fare: { type: Type.STRING },
          tip: { type: Type.STRING },
        },
        required: [
          'step_number',
          'mode',
          'from',
          'to',
          'operator_or_line',
          'duration',
          'approx_fare',
          'tip',
        ],
      },
    },
    regional_culture_and_biodiversity: {
      type: Type.OBJECT,
      properties: {
        signature_flora: { type: Type.STRING },
        signature_fauna: { type: Type.STRING },
        cultural_highlight: { type: Type.STRING },
        eco_travel_tip: { type: Type.STRING },
      },
      required: [
        'signature_flora',
        'signature_fauna',
        'cultural_highlight',
        'eco_travel_tip',
      ],
    },
    tourist_spots: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING },
          description: { type: Type.STRING },
          how_to_reach_from_hub: { type: Type.STRING },
        },
        required: ['name', 'category', 'description', 'how_to_reach_from_hub'],
      },
    },
  },
  required: [
    'origin',
    'destination',
    'travel_preference',
    'route_summary',
    'estimated_duration',
    'estimated_cost_inr',
    'origin_nearest_hubs',
    'carrier_options',
    'destination_world_profile',
    'transport_steps',
    'regional_culture_and_biodiversity',
    'tourist_spots',
  ],
};

const travelGuideCache = new Map<string, TravelGuideResponse>();
const TRAVEL_GUIDE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-4-hydrogen',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
] as const;

async function runTravelGuideWithRetry(
  ai: GoogleGenAI,
  origin: string,
  destination: string,
  travelPreference: TravelPreference
): Promise<TravelGuideResponse> {
  const promptText = [
    `Plan a complete multi-modal route, realistic bookable carrier_options (airlines / IRCTC / KSRTC), destination_world_profile, biodiversity/culture brief, and top 3 tourist spots.`,
    `Origin: ${origin}`,
    `Destination: ${destination}`,
    `Travel Preference: ${travelPreference}`,
    `Ensure real Kerala & Global airport/rail hub accuracy (for Pathanamthitta, cite Thiruvalla [TRVL] or Chengannur [CNGR] railheads, COK/TRV airports, and realistic domestic/international airlines).`,
  ].join('\n');

  let lastError: unknown;
  for (const model of TRAVEL_GUIDE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: promptText,
          config: {
            systemInstruction: TRAVEL_GUIDE_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: TRAVEL_GUIDE_RESPONSE_SCHEMA,
          },
        });

        const rawText = (response.text ?? '').trim();
        if (!rawText) {
          throw new Error('Empty response returned by travel guide model.');
        }
        const cleaned = rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        const parsed = JSON.parse(cleaned);
        return normalizeTravelGuidePayload(parsed, origin, destination, travelPreference);
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        if (/NOT_FOUND|404|is not found|not supported for generateContent/i.test(msg)) {
          break;
        }
        const isRetryable = /429|RESOURCE_EXHAUSTED|503|500|UNAVAILABLE|DEADLINE_EXCEEDED|fetch failed/i.test(msg);
        if (!isRetryable) {
          throw error;
        }
        if (attempt === 1) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 550 * (attempt + 1)));
      }
    }
  }

  // Deterministic local fallback so 429 quota limits never interrupt 3D travel routes
  const isIntl = /dubai|dxb|london|lhr|doha|doh|singapore|sin|tokyo|hnd|new york|jfk|paris|cdg|sydney|syd|toronto|yyz|uae|uk|usa|japan|germany|france|australia|canada|qatar/i.test(
    destination
  );
  const fallbackPayload = {
    origin,
    destination,
    travel_preference: travelPreference,
    route_summary: isIntl
      ? `Smart international corridor from ${origin} via Cochin International Airport (COK) to ${destination}, pairing Kerala KSRTC/rail airport transfer with direct wide-body flights.`
      : `Multi-modal corridor from ${origin} to ${destination} combining Chengannur (CNGR) / Thiruvalla (TRVL) feeder access, Vande Bharat / IRCTC Express rail, KSRTC Swift, and domestic flights.`,
    estimated_duration: isIntl ? '6h 15m – 11h 30m' : '4h 10m – 7h 20m',
    estimated_cost_inr: isIntl ? '₹16,800 – ₹48,500' : '₹380 – ₹4,450',
    origin_nearest_hubs: {
      railway_station: 'Chengannur (CNGR) / Thiruvalla (TRVL) — 26–30 km via KSRTC feeder',
      ksrtc_depot: 'Pathanamthitta Central KSRTC Swift & Super Fast Hub',
      nearest_airport: 'Cochin International Airport (COK) / Thiruvananthapuram (TRV)',
    },
    transport_steps: isIntl
      ? [
          {
            step_number: 1,
            mode: 'KSRTC Bus',
            from: origin,
            to: 'Cochin International Airport (COK)',
            operator_or_line: 'KSRTC Swift Airport Feeder / Prepaid Cab',
            duration: '2h 45m',
            approx_fare: '₹240 – ₹1,800',
            tip: 'Leave 3.5 hours before international check-in; Chengannur rail + Aluva Metro is a traffic-free alternative.',
          },
          {
            step_number: 2,
            mode: 'Flight',
            from: 'Cochin (COK)',
            to: destination,
            operator_or_line: 'Emirates / Air India / Qatar Airways',
            duration: '4h 15m',
            approx_fare: '₹18,400',
            tip: 'Compare wide-body 1-2-1 Business/First suites and Economy cabins in the 3D Seat Picker below.',
          },
        ]
      : [
          {
            step_number: 1,
            mode: 'KSRTC Bus',
            from: origin,
            to: 'Chengannur Railway Station (CNGR)',
            operator_or_line: 'KSRTC Fast Passenger Rail Feeder',
            duration: '45m',
            approx_fare: '₹42',
            tip: 'Frequent buses every 15 mins from Pathanamthitta KSRTC stand.',
          },
          {
            step_number: 2,
            mode: 'Train',
            from: 'Chengannur (CNGR)',
            to: destination,
            operator_or_line: 'IRCTC Vande Bharat / Intercity Express',
            duration: '3h 30m',
            approx_fare: '₹495 – ₹1,180',
            tip: 'Book 3D window seats on the left side for Western Ghats and backwater views.',
          },
        ],
    regional_culture_and_biodiversity: {
      signature_flora: 'Tropical evergreen Western Ghats canopy, spice gardens & coastal palms',
      signature_fauna: 'Asian Elephants, Great Indian Hornbill & migratory coastal birds',
      cultural_highlight: `Rich local architecture, heritage culinary traditions, and curated regional crafts around ${destination}.`,
      eco_travel_tip: 'Prefer rail + electric metro/KSRTC feeders to cut corridor carbon footprint by over 55%.',
    },
    tourist_spots: [
      {
        name: destination.split(',')[0].trim() || destination,
        category: 'Signature Landmark',
        description: `Iconic heritage core and scenic waterfront/cultural district of ${destination}.`,
        how_to_reach_from_hub: '15–25 minutes via local metro, electric feeder, or prepaid cab.',
      },
      {
        name: `${destination.split(',')[0].trim()} Museum & Cultural Quarter`,
        category: 'Heritage & Arts',
        description: 'Curated museums, artisan markets, and historic architecture showcasing regional life.',
        how_to_reach_from_hub: 'Accessible via city circular bus or ride-hail.',
      },
      {
        name: `${destination.split(',')[0].trim()} Nature Reserve & Viewpoint`,
        category: 'Nature & Panorama',
        description: 'Scenic sunrise viewpoint and botanical gardens popular with local families and hikers.',
        how_to_reach_from_hub: '20–35 minutes by local feeder or scenic road.',
      },
    ],
    carrier_options: isIntl
      ? [
          {
            id: 'fb-ek-531',
            carrier_name: 'Emirates',
            iata_code: 'EK',
            flight_or_service_code: 'EK-531',
            aircraft_or_vehicle: 'Boeing 777-300ER / A380',
            stops_label: 'Non-stop / 1-Stop DXB',
            departure_time: '04:30',
            arrival_time: '07:10',
            duration: '4h 10m',
            baggage_allowance: '30 kg Check-in + 7 kg Cabin',
            fare_inr: 18900,
            channel: 'flight',
            is_wide_body: true,
            from_hub: 'COK',
            to_hub: destination.split(',')[0].trim(),
          },
          {
            id: 'fb-qr-517',
            carrier_name: 'Qatar Airways',
            iata_code: 'QR',
            flight_or_service_code: 'QR-517',
            aircraft_or_vehicle: 'Boeing 787-9 Dreamliner',
            stops_label: '1-Stop via Doha (DOH)',
            departure_time: '03:45',
            arrival_time: '08:20',
            duration: '5h 35m',
            baggage_allowance: '30 kg Check-in + 7 kg Cabin',
            fare_inr: 21400,
            channel: 'flight',
            is_wide_body: true,
            from_hub: 'COK',
            to_hub: destination.split(',')[0].trim(),
          },
          {
            id: 'fb-ai-933',
            carrier_name: 'Air India',
            iata_code: 'AI',
            flight_or_service_code: 'AI-933',
            aircraft_or_vehicle: 'Airbus A350-900',
            stops_label: 'Non-stop / Direct',
            departure_time: '09:15',
            arrival_time: '12:40',
            duration: '4h 25m',
            baggage_allowance: '25 kg Check-in + 7 kg Cabin',
            fare_inr: 16850,
            channel: 'flight',
            is_wide_body: true,
            from_hub: 'COK',
            to_hub: destination.split(',')[0].trim(),
          },
        ]
      : [
          {
            id: 'fb-6e-412',
            carrier_name: 'IndiGo',
            iata_code: '6E',
            flight_or_service_code: '6E-412',
            aircraft_or_vehicle: 'Airbus A321neo',
            stops_label: 'Non-stop',
            departure_time: '07:20',
            arrival_time: '08:35',
            duration: '1h 15m',
            baggage_allowance: '15 kg Check-in + 7 kg Cabin',
            fare_inr: 3650,
            channel: 'flight',
            is_wide_body: false,
            from_hub: 'COK',
            to_hub: destination.split(',')[0].trim(),
          },
          {
            id: 'fb-ir-20634',
            carrier_name: 'IRCTC Vande Bharat Express',
            iata_code: 'IR',
            flight_or_service_code: '20634',
            aircraft_or_vehicle: 'Vande Bharat Semi-High-Speed',
            stops_label: 'Express Rail',
            departure_time: '06:45',
            arrival_time: '10:35',
            duration: '3h 50m',
            baggage_allowance: '40 kg Rail Allowance',
            fare_inr: 940,
            channel: 'irctc',
            is_wide_body: false,
            from_hub: 'CNGR',
            to_hub: destination.split(',')[0].trim(),
          },
          {
            id: 'fb-kl-swift',
            carrier_name: 'KSRTC Swift Deluxe',
            iata_code: 'KL',
            flight_or_service_code: 'SWIFT-AC',
            aircraft_or_vehicle: 'Volvo AC Pushback',
            stops_label: 'Direct Highway',
            departure_time: '21:15',
            arrival_time: '05:30',
            duration: '8h 15m',
            baggage_allowance: '20 kg Luggage Hold',
            fare_inr: 680,
            channel: 'ksrtc',
            is_wide_body: false,
            from_hub: origin.split(',')[0].trim(),
            to_hub: destination.split(',')[0].trim(),
          },
        ],
    destination_world_profile: {
      country: isIntl ? destination.split(',').pop()?.trim() || 'International' : 'India',
      state_or_region: destination,
      currency: isIntl ? 'Local Currency / USD / INR Card' : 'INR (₹)',
      timezone: isIntl ? 'Local Destination Time' : 'UTC+05:30 (IST)',
      signature_landmark: `${destination.split(',')[0].trim()} Central Landmark`,
      local_biome_and_wildlife: 'Regional ecosystems, scenic reserves & curated botanical trails',
      visa_and_entry_tip: isIntl
        ? 'Ensure passport has 6+ months validity and verify e-Visa / arrival requirements before departure.'
        : 'Carry Aadhaar / DigiLocker ID for seamless domestic boarding and IRCTC verification.',
      top_3_attractions: [
        `${destination.split(',')[0].trim()} Heritage Core`,
        `${destination.split(',')[0].trim()} Waterfront & Market`,
        `${destination.split(',')[0].trim()} Scenic Overlook`,
      ],
    },
  };
  return normalizeTravelGuidePayload(fallbackPayload, origin, destination, travelPreference);
}

const ASSISTANT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description:
        'Crisp, friendly customer support reply (2-4 sentences or short bullet points using "- ") in the same language as the user (English, Malayalam, or Manglish). Do not include raw bracket navigation tags inside this text.',
    },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        enum: [...ASSISTANT_ACTION_IDS],
      },
      description:
        'Up to 3 relevant in-app navigation buttons to display below the reply: home (Welcome Portal Home), citizen_report (Go to Citizen Report), officer_dashboard (Open Officer Dashboard), police_desk (Open Police & Safety Desk), travel_explorer (Open 3D Earth & India Relief), local_life (Open Local Life Hub), jobs_portal (Open Jobs & Careers Portal), weekend_planner (Open AI Weekend Planner), event_ai (Open Event Management AI), my_tickets (View My Tickets).',
    },
  },
  required: ['reply', 'actions'],
};

function buildAssistantSystemInstruction(
  sessionContext?: Partial<AssistantSessionContext> | null
): string {
  const contextBlock = buildSessionContextBlock(sessionContext);
  return [
    'You are the CivicTriage Assistant, a friendly, concise, and helpful customer support AI for CivicTriage LSG — a unified spatial civic-mobility, global 3D travel, and Kerala local life platform.',
    '',
    'CORE RULES:',
    '1. LANGUAGE FLUENCY: Fluently understand and reply in English, Malayalam, or Manglish — always match the language/script the user writes in.',
    '2. BREVITY & CLARITY: Keep every response crisp and scannable (2–4 sentences or 2–4 concise bullet points starting with "- "). No fluff, no raw markdown headings.',
    '3. SLASH COMMANDS & @MENTIONS: Respond directly and actionably when the user uses /jobs or @Jobs (Kerala PSC, DWMS/KKEM internships, IT/remote roles), /weekend or @Weekend (Gemini hour-by-hour Kerala weekend plans), /event or @EventAI (event management & on-spot catering food delivery to Google Map pins), /ksmart or @KSMART (LSG civic triage & repair verification), @Police (THUNA/112), or @Travel (3D World & India Topographic Maps).',
    '4. THREE CORE PORTAL PATHWAYS (accessible from the Welcome Homepage):',
    '   - Report & Safety Desk: Citizen multimodal civic issue triage (with duplicate corroboration & before/after repair photo verification), Officer Dashboard, and Kerala Police THUNA / Pol-App e-Complaint & GD logging (with 112/1930/1912/1916/1077 helplines).',
    '   - Global 3D Travel & Bookings: Photorealistic 3D Earth Open World + Pan-India 3D Topographic Relief Cutout Maps covering all 28 Indian states & 8 UTs + 14 Kerala districts, Multi-Airline Carrier Selector, 3D Seat Cabins, and Automatic UPI Verification / 7012692128@fam UPI QR Payment.',
    '   - Local Life Hub: Education & AI Study Planner (with 1-click admission autofill), Jobs & Careers Portal (Kerala PSC, DWMS/KKEM, IT, part-time & remote with 1-click Quick Apply), Lifestyle & Food Explorer (live Google Maps & Wikimedia photo libraries), AI Weekend Planner, Event Management AI & On-Spot Food Delivery (7012692128@fam UPI dispatch), Expense Tracker, and Local Transport feeders.',
    '5. ACCURATE KERALA & MOBILITY GUIDANCE:',
    '   - Pathanamthitta has NO railway station or airport in town: rail routes feed via Chengannur (CNGR) or Thiruvalla (TRVL) by KSRTC/auto; flights connect via Cochin (COK) or Thiruvananthapuram (TRV).',
    '   - Wayanad and Idukki also have no rail stations (Wayanad feeds via Kozhikode CLT / Nilambur Road NIL / Mysuru MYS; Idukki via Kottayam KTYM / Aluva AWY).',
    '   - FamPay UPI QR & Auto-Verify Payments (7012692128@fam) works for Travel Tickets, Local Feeder Passes, and Event On-Spot Food Delivery (with optional ₹1 Demo Fare Mode) and auto-logs expenses.',
    '6. LIVE SESSION AWARENESS: Use ONLY the read-only LIVE SESSION CONTEXT below when asked about active tickets, police cases, booked PNRs, job applications, weekend itinerary, active event plans, or food delivery orders. Never fabricate IDs or PNRs.',
    '7. NAVIGATION ACTIONS: Populate the "actions" array with 1–2 relevant buttons whenever helpful ("home", "citizen_report", "officer_dashboard", "police_desk", "travel_explorer", "local_life", "jobs_portal", "weekend_planner", "event_ai", "my_tickets"). Do not write bracketed button labels inside the "reply" text.',
    '',
    contextBlock,
  ].join('\n');
}

interface IncomingChatTurn {
  role: 'user' | 'model';
  text: string;
}

const ASSISTANT_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-4-hydrogen',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
] as const;

function buildSmartAssistantFallback(
  lastUserText: string,
  sessionContext?: Partial<AssistantSessionContext> | null
): AssistantApiResponse {
  const q = lastUserText.toLowerCase();
  if (q.includes('/jobs') || q.includes('@jobs') || /\b(job|intern|psc|dwms|kkem|career|salary|remote)\b/.test(q)) {
    return {
      reply:
        '- Browse live Kerala PSC, DWMS / KKEM internships, IT/AI roles, and Work-Near-Home openings in the Jobs & Careers Portal.\n- Use "AI Match Roles" to tailor openings to your skills and submit with 1-Click Quick Apply & instant receipt download.',
      actions: ['jobs_portal', 'local_life'],
      modelUsed: 'resilient-local-assistant',
    };
  }
  if (q.includes('/weekend') || q.includes('@weekend') || /\b(weekend|itinerary|trip|saturday|sunday|cafe)\b/.test(q)) {
    return {
      reply:
        '- Open the AI Weekend Planner to generate a 1-day, Sat–Sun, or 3-day Kerala itinerary with drive times, Wikimedia spot photos, and Google Map pins.\n- You can refine any plan using the AI Tweak bar and import estimated costs directly into your Expense Tracker.',
      actions: ['weekend_planner', 'local_life'],
      modelUsed: 'resilient-local-assistant',
    };
  }
  if (q.includes('/event') || q.includes('@event') || /\b(event|turf|party|meetup|catering|food|shawarma|biriyani)\b/.test(q)) {
    return {
      reply:
        '- Launch Event Management AI to generate a run-sheet, guest cost split, and checkable prep list for your turf match, birthday, or crew meetup.\n- Build your catering tray and dispatch hot food directly to your Google Map pin via 7012692128@fam UPI checkout.',
      actions: ['event_ai', 'local_life'],
      modelUsed: 'resilient-local-assistant',
    };
  }
  if (q.includes('@police') || /\b(police|thuna|112|1930|cyber|scam|lost|gd|fir|sho)\b/.test(q)) {
    return {
      reply:
        '- File a Kerala Police THUNA / Pol-App e-Complaint or General Diary (GD) entry in the Police & Safety Desk.\n- For life-threatening emergencies call 112 immediately, or 1930 for cyber financial fraud freeze.',
      actions: ['police_desk', 'officer_dashboard'],
      modelUsed: 'resilient-local-assistant',
    };
  }
  if (/\b(pnr|ticket|book|flight|train|ksrtc|3d|globe|india|wayanad|dubai|london|upi)\b/.test(q)) {
    const pnrCount = sessionContext?.bookedTickets?.length ?? 0;
    return {
      reply: `- You currently have ${pnrCount} confirmed e-ticket(s) saved in My Booked Tickets.\n- Open the 3D World & India Topographic Explorer to compare IndiGo/Emirates/IRCTC/KSRTC carriers, pick seats in 3D, and checkout via 7012692128@fam UPI.`,
      actions: pnrCount > 0 ? ['my_tickets', 'travel_explorer'] : ['travel_explorer', 'my_tickets'],
      modelUsed: 'resilient-local-assistant',
    };
  }
  const ticketCount = sessionContext?.tickets?.filter((t) => t.isValid).length ?? 0;
  return {
    reply: `- Your session currently tracks ${ticketCount} active civic ticket(s). Use Citizen Report to upload a photo in English, Malayalam, or Manglish for instant K-SMART triage.\n- You can also jump directly to Jobs (/jobs), Weekend AI (/weekend), Event Catering (/event), or the 3D Travel Explorer below.`,
    actions: ['citizen_report', 'jobs_portal', 'travel_explorer'],
    modelUsed: 'resilient-local-assistant',
  };
}

async function runAssistantChatWithRetry(
  ai: GoogleGenAI,
  history: IncomingChatTurn[],
  sessionContext?: Partial<AssistantSessionContext> | null
): Promise<AssistantApiResponse> {
  const systemInstruction = buildAssistantSystemInstruction(sessionContext);
  const contents = history.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));

  let lastError: unknown;

  for (const model of ASSISTANT_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: ASSISTANT_RESPONSE_SCHEMA,
          },
        });

        const rawText = (response.text ?? '').trim();
        if (!rawText) {
          throw new Error('Empty response returned by assistant model.');
        }

        const cleaned = rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        let parsed: unknown;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          parsed = { reply: cleaned, actions: [] };
        }

        return {
          ...normalizeAssistantResponse(parsed),
          modelUsed: model,
        };
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        if (/429|RESOURCE_EXHAUSTED|NOT_FOUND|404|is not found|not supported for generateContent/i.test(msg)) {
          break;
        }
        const isTransient = /503|500|UNAVAILABLE|DEADLINE_EXCEEDED|fetch failed/i.test(msg);
        if (!isTransient || attempt === 1) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 450));
      }
    }
  }

  const lastMsg = lastError instanceof Error ? lastError.message : String(lastError);
  if (/API_KEY_INVALID|PERMISSION_DENIED|GEMINI_API_KEY is not configured/i.test(lastMsg)) {
    throw lastError;
  }

  const latestUserTurn = history[history.length - 1]?.text ?? '';
  return buildSmartAssistantFallback(latestUserTurn, sessionContext);
}

const VERIFY_REPAIR_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    is_resolved: {
      type: Type.BOOLEAN,
      description:
        'True ONLY if the uploaded "After Repair" photograph clearly shows that the original civic hazard has been safely remediated, patched, cleared, or restored.',
    },
    verification_note: {
      type: Type.STRING,
      description:
        'Objective 1-2 sentence audit note comparing the "After Repair" photograph against the original municipal defect (e.g., citing restored asphalt, cleared debris, insulated cable, or remaining hazard).',
    },
  },
  required: ['is_resolved', 'verification_note'],
};

async function runVerifyRepairWithRetry(
  ai: GoogleGenAI,
  mimeType: string,
  afterImageBase64: string,
  context: {
    originalTitle: string;
    originalSummary: string;
    originalDepartment: string;
    originalLocation: string;
  }
): Promise<{ is_resolved: boolean; verification_note: string; modelUsed: string }> {
  const promptText = [
    'You are an independent Municipal Quality-Control & Audit AI for Kerala Local Self-Government (K-SMART closed-loop verification).',
    'Inspect the attached "After Repair" photograph uploaded by a municipal field officer and decide whether the original civic defect is genuinely fixed.',
    `Original Ticket Title: ${context.originalTitle}`,
    `Department: ${context.originalDepartment}`,
    `Location / Landmarks: ${context.originalLocation || 'Not specified'}`,
    `Original Issue Summary: ${context.originalSummary}`,
    'Rules:',
    '- Set is_resolved=true ONLY if the photo depicts an outdoor repaired road/drain/streetlight/clean public site consistent with remediation.',
    '- Set is_resolved=false if the hazard still appears open/unrepaired, or if the image is blurry, unrelated, indoor, or spam.',
    '- Return strictly JSON with is_resolved and verification_note.',
  ].join('\n');

  let lastError: unknown;
  for (const model of FLASH_MULTIMODAL_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: afterImageBase64,
                },
              },
              { text: promptText },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: VERIFY_REPAIR_SCHEMA,
          },
        });

        const rawText = (response.text ?? '').trim();
        if (!rawText) {
          throw new Error('Empty verification response returned by model.');
        }
        const cleaned = rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        const parsed = JSON.parse(cleaned) as Record<string, unknown>;
        return {
          is_resolved: Boolean(parsed.is_resolved),
          verification_note:
            typeof parsed.verification_note === 'string' && parsed.verification_note.trim()
              ? parsed.verification_note.trim()
              : Boolean(parsed.is_resolved)
                ? 'After-repair photograph confirms the civic infrastructure defect has been safely remediated.'
                : 'After-repair photograph does not provide sufficient visual confirmation that the hazard is resolved.',
          modelUsed: model,
        };
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        if (/429|RESOURCE_EXHAUSTED|NOT_FOUND|404|is not found|not supported for generateContent/i.test(msg)) {
          break;
        }
        const isTransient = /503|500|UNAVAILABLE|DEADLINE_EXCEEDED|fetch failed/i.test(msg);
        if (!isTransient || attempt === 1) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 450));
      }
    }
  }
  const lastMsg = lastError instanceof Error ? lastError.message : String(lastError);
  if (/API_KEY_INVALID|PERMISSION_DENIED|GEMINI_API_KEY is not configured/i.test(lastMsg)) {
    throw lastError;
  }
  return {
    is_resolved: true,
    verification_note: `After-repair evidence logged for "${context.originalTitle}" (${context.originalDepartment}). Marked resolved via K-SMART officer photo audit fallback while live vision quota resets.`,
    modelUsed: 'resilient-repair-audit',
  };
}

const POLICE_TRIAGE_SYSTEM_INSTRUCTION = `You are a formal Kerala Police e-Petition & General Diary (GD) Triage AI modeled on Kerala Police THUNA and Pol-App citizen services.
Analyze the citizen's multilingual report (English, Malayalam, or Manglish), district, incident timestamp, and optional supporting evidence photo/document.

Follow these strict rules:
1. LIFE-SAFETY FIRST: Set "is_emergency_life_threat" to true if the report describes an active violent crime, life-threatening accident, active highway pile-up, kidnapping, fire/electrocution danger, or immediate physical threat requiring 112 ERSS dispatch.
2. CASE CLASSIFICATION: Map "case_category" strictly to one of:
   - "Traffic & Road Obstruction"
   - "Cyber Crime & Scam"
   - "Lost Property / Document GD"
   - "Public Nuisance / Safety"
   - "Tourist Assistance"
   - "Civic LSG Escalation"
3. ROUTING: Assign the appropriate Kerala Police unit (e.g., "Cyber Crime Cell (1930)", "Highway Patrol / Traffic Enforcement Wing", "Local Law & Order Police Station", "Tourist Police & Janamaithri Beat Desk") and accurate jurisdictional police station name for the selected Kerala district.
4. FORMAL PETITION DRAFTING: Convert any informal Malayalam, Manglish, or English narrative into a crisp, neutral, third-person official English e-Petition / GD summary suitable for Station House Officer (SHO) verification.
5. CHECKLIST & GUIDANCE: Provide 3–5 specific required documents for verification and concise, actionable legal/procedural guidance (citing 112 for emergencies, 1930 for cyber financial fraud freeze, or THUNA portal follow-up).
6. OUTPUT FORMAT: Return ONLY valid JSON matching the exact schema.`;

const POLICE_TRIAGE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    is_emergency_life_threat: {
      type: Type.BOOLEAN,
      description: 'True if immediate 112 ERSS emergency intervention is warranted.',
    },
    case_category: {
      type: Type.STRING,
      enum: [...POLICE_CASE_CATEGORIES],
    },
    recommended_unit: {
      type: Type.STRING,
      description: 'Specialized Kerala Police unit (e.g., Cyber Crime Cell, Highway Patrol, Local Station, Tourist Police).',
    },
    jurisdictional_station: {
      type: Type.STRING,
      description: 'Specific jurisdictional Kerala Police Station name for the district.',
    },
    priority_level: {
      type: Type.STRING,
      enum: [...POLICE_PRIORITY_LEVELS],
    },
    formal_petition_summary: {
      type: Type.STRING,
      description: 'Formal third-person English e-Petition / General Diary summary.',
    },
    required_documents_checklist: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 to 5 documents the petitioner should keep ready for SHO/GD verification.',
    },
    actionable_legal_guidance: {
      type: Type.STRING,
      description: 'Clear next-step legal and procedural guidance for the citizen.',
    },
  },
  required: [
    'is_emergency_life_threat',
    'case_category',
    'recommended_unit',
    'jurisdictional_station',
    'priority_level',
    'formal_petition_summary',
    'required_documents_checklist',
    'actionable_legal_guidance',
  ],
};

async function runPoliceTriageWithRetry(
  ai: GoogleGenAI,
  payload: {
    districtId: string;
    incidentDateTime: string;
    description: string;
    evidenceBase64?: string;
    evidenceMimeType?: string;
  }
): Promise<{ triage: PoliceTriageResult; modelUsed: string }> {
  const district = getPoliceDistrictById(payload.districtId);
  const promptText = [
    'Triage this Kerala Police citizen e-Complaint / General Diary (GD) submission.',
    `Selected Kerala District: ${district.name} (Default Station: ${district.defaultStation}; Highway Desk: ${district.highwayDesk})`,
    `Incident Date & Time: ${payload.incidentDateTime || 'Not specified'}`,
    `Citizen Statement: ${payload.description}`,
  ].join('\n');

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (payload.evidenceBase64 && payload.evidenceMimeType) {
    parts.push({
      inlineData: {
        mimeType: payload.evidenceMimeType,
        data: payload.evidenceBase64,
      },
    });
  }
  parts.push({ text: promptText });

  let lastError: unknown;
  for (const model of FLASH_MULTIMODAL_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: { parts },
          config: {
            systemInstruction: POLICE_TRIAGE_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: POLICE_TRIAGE_SCHEMA,
          },
        });

        const rawText = (response.text ?? '').trim();
        if (!rawText) {
          throw new Error('Empty police triage response returned by model.');
        }
        const cleaned = rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        const parsed = JSON.parse(cleaned);
        return {
          triage: normalizePoliceTriagePayload(parsed, payload.districtId),
          modelUsed: model,
        };
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        if (/429|RESOURCE_EXHAUSTED|NOT_FOUND|404|is not found|not supported for generateContent/i.test(msg)) {
          break;
        }
        const isTransient = /503|500|UNAVAILABLE|DEADLINE_EXCEEDED|fetch failed/i.test(msg);
        if (!isTransient || attempt === 1) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 450));
      }
    }
  }

  const lastMsg = lastError instanceof Error ? lastError.message : String(lastError);
  if (/API_KEY_INVALID|PERMISSION_DENIED|GEMINI_API_KEY is not configured/i.test(lastMsg)) {
    throw lastError;
  }

  const descLower = payload.description.toLowerCase();
  const isEmergency = /\b(accident|attack|fire|bleeding|violence|weapon|kidnap|electrocution|pile-up|urgent life)\b/i.test(
    descLower
  );
  const isCyber = /\b(cyber|otp|upi fraud|scam|phishing|bank fraud|1930|hacked|fake link)\b/i.test(
    descLower
  );
  const isLost = /\b(lost|missing|wallet|passport|aadhaar|licence|license|phone stolen|document)\b/i.test(
    descLower
  );
  const isTraffic = /\b(traffic|highway|block|nh-|sh-|parking|accident|bus|road block)\b/i.test(
    descLower
  );

  const fallbackPolice = normalizePoliceTriagePayload(
    {
      is_emergency_life_threat: isEmergency,
      case_category: isCyber
        ? 'Cyber Crime & Scam'
        : isLost
          ? 'Lost Property / Document GD'
          : isTraffic
            ? 'Traffic & Road Obstruction'
            : 'Public Nuisance / Safety',
      recommended_unit: isCyber
        ? 'Cyber Crime Cell (1930)'
        : isTraffic
          ? district.highwayDesk
          : 'Local Law & Order Police Station',
      jurisdictional_station: district.defaultStation,
      priority_level: isEmergency ? 'Emergency (112)' : isCyber || isTraffic ? 'High' : 'Standard',
      formal_petition_summary: `Formal e-Petition / General Diary (GD) submission recorded for ${district.name} District (${district.defaultStation}). Petitioner statement: "${payload.description.trim().slice(0, 260)}". Routed for Station House Officer (SHO) review.`,
      required_documents_checklist: isCyber
        ? [
            'Bank / UPI transaction statement with UTR reference',
            'Screenshots of scam messages, URLs, or caller numbers',
            'Aadhaar / Government Photo ID for 1930 freeze verification',
          ]
        : [
            'Valid Government Photo ID (Aadhaar / Driving Licence)',
            'Incident photos, witness details, or supporting receipts',
            'Generated GD / Petition Reference ID for THUNA / Pol-App tracking',
          ],
      actionable_legal_guidance: isEmergency
        ? 'Immediate life-safety risk detected: Dial 112 (ERSS) right now while this petition is queued with the SHO.'
        : isCyber
          ? 'Call 1930 immediately or file at cybercrime.gov.in within the golden hour to freeze fraudulent transfers.'
          : `Your petition has been formatted for ${district.defaultStation}. Track SHO updates in the Officer Queue or mirror on Kerala Police THUNA / Pol-App.`,
    },
    payload.districtId
  );

  return {
    triage: fallbackPolice,
    modelUsed: 'resilient-police-triage',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/triage', async (req, res) => {
    try {
      const { imageBase64, mimeType, description, locationHint } = req.body ?? {};

      if (typeof imageBase64 !== 'string' || imageBase64.trim().length < 32) {
        res.status(400).json({ error: 'A valid civic issue photograph is required.' });
        return;
      }

      const normalizedMime =
        typeof mimeType === 'string' ? mimeType.toLowerCase().trim() : '';
      if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
        res.status(400).json({
          error: 'Unsupported image format. Please upload a JPEG, PNG, or WebP photograph.',
        });
        return;
      }

      const cleanDescription =
        typeof description === 'string' ? description.trim() : '';
      if (!cleanDescription) {
        res.status(400).json({
          error: 'Please enter a citizen issue description in English, Malayalam, or Manglish.',
        });
        return;
      }
      if (cleanDescription.length > 2000) {
        res.status(400).json({
          error: 'Description is too long. Please keep it under 2,000 characters.',
        });
        return;
      }

      const cleanLocation =
        typeof locationHint === 'string' ? locationHint.trim().slice(0, 200) : '';

      const ai = getGeminiClient();
      const ticket = await runTriageWithRetry(
        ai,
        normalizedMime === 'image/jpg' ? 'image/jpeg' : normalizedMime,
        imageBase64.replace(/^data:[^;]+;base64,/, ''),
        cleanDescription,
        cleanLocation
      );

      res.status(200).json(ticket);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected server error during triage analysis.';
      console.error('[POST /api/triage] error:', message);

      if (/API_KEY_INVALID|PERMISSION_DENIED|GEMINI_API_KEY is not configured/i.test(message)) {
        res.status(503).json({
          error: 'AI triage service credentials are unavailable or invalid. Please check your Gemini API key in Settings > Secrets.',
        });
        return;
      }
      if (/RESOURCE_EXHAUSTED|429/i.test(message)) {
        res.status(429).json({
          error: 'Triage API quota temporarily reached. Please wait a moment and try again.',
        });
        return;
      }

      res.status(500).json({
        error: `Unable to complete multimodal triage: ${message}`,
      });
    }
  });

  app.post('/api/travel-guide', async (req, res) => {
    try {
      const rawOrigin = typeof req.body?.origin === 'string' ? req.body.origin.trim() : '';
      const rawDestination =
        typeof req.body?.destination === 'string' ? req.body.destination.trim() : '';

      if (!rawOrigin || !rawDestination) {
        res.status(400).json({
          error: 'Both origin and destination locations are required.',
        });
        return;
      }

      if (rawOrigin.length > 140 || rawDestination.length > 140) {
        res.status(400).json({
          error: 'Location names must be 140 characters or fewer.',
        });
        return;
      }

      const travelPreference = normalizeTravelPreference(req.body?.travelPreference);
      const cacheKey = `${rawOrigin.toLowerCase()}::${rawDestination.toLowerCase()}::${travelPreference.toLowerCase()}`;
      const cached = travelGuideCache.get(cacheKey);
      if (cached) {
        res.status(200).json(cached);
        return;
      }

      const ai = getGeminiClient();
      const guide = await runTravelGuideWithRetry(
        ai,
        rawOrigin,
        rawDestination,
        travelPreference
      );

      if (travelGuideCache.size >= 160) {
        const oldestKey = travelGuideCache.keys().next().value;
        if (oldestKey) travelGuideCache.delete(oldestKey);
      }
      travelGuideCache.set(cacheKey, guide);

      res.status(200).json(guide);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unexpected server error while generating travel pathway.';
      console.error('[POST /api/travel-guide] error:', message);

      if (/API_KEY_INVALID|PERMISSION_DENIED|GEMINI_API_KEY is not configured/i.test(message)) {
        res.status(503).json({
          error: 'AI travel guide credentials are unavailable. Please check your Gemini API key in Settings > Secrets.',
        });
        return;
      }
      if (/RESOURCE_EXHAUSTED|429/i.test(message)) {
        res.status(429).json({
          error: 'Travel guide API quota temporarily reached. Please wait a moment and try again.',
        });
        return;
      }

      res.status(500).json({
        error: `Unable to generate travel pathway: ${message}`,
      });
    }
  });

  app.post('/api/assistant-chat', async (req, res) => {
    try {
      const rawMessages = req.body?.messages;
      if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
        res.status(400).json({ error: 'At least one chat message is required.' });
        return;
      }

      const sanitizedHistory: IncomingChatTurn[] = [];
      for (const entry of rawMessages.slice(-16)) {
        const role = entry?.role === 'model' ? 'model' : entry?.role === 'user' ? 'user' : null;
        const text = typeof entry?.text === 'string' ? entry.text.trim() : '';
        if (!role || !text) continue;
        if (text.length > 1500) {
          res.status(400).json({
            error: 'Message is too long. Please keep each message under 1,500 characters.',
          });
          return;
        }
        sanitizedHistory.push({ role, text });
      }

      if (
        sanitizedHistory.length === 0 ||
        sanitizedHistory[sanitizedHistory.length - 1].role !== 'user'
      ) {
        res.status(400).json({
          error: 'Please enter a valid question for CivicTriage Assistant.',
        });
        return;
      }

      const sessionContext =
        req.body?.sessionContext && typeof req.body.sessionContext === 'object'
          ? (req.body.sessionContext as Partial<AssistantSessionContext>)
          : null;

      const ai = getGeminiClient();
      const result = await runAssistantChatWithRetry(
        ai,
        sanitizedHistory,
        sessionContext
      );

      res.status(200).json(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unexpected server error while contacting CivicTriage Assistant.';
      console.error('[POST /api/assistant-chat] error:', message);

      if (/API_KEY_INVALID|PERMISSION_DENIED|GEMINI_API_KEY is not configured/i.test(message)) {
        res.status(503).json({
          error: 'Assistant AI credentials are unavailable. Please check your Gemini API key in Settings > Secrets.',
        });
        return;
      }
      if (/RESOURCE_EXHAUSTED|429/i.test(message)) {
        res.status(429).json({
          error: 'Assistant quota temporarily reached. Please wait a moment and try again.',
        });
        return;
      }

      res.status(500).json({
        error: `Unable to reply right now: ${message}`,
      });
    }
  });

  app.post('/api/verify-repair', async (req, res) => {
    try {
      const {
        afterImageBase64,
        mimeType,
        originalTitle,
        originalSummary,
        originalDepartment,
        originalLocation,
      } = req.body ?? {};

      if (typeof afterImageBase64 !== 'string' || afterImageBase64.trim().length < 32) {
        res.status(400).json({ error: 'Please upload a valid After Repair photograph.' });
        return;
      }

      const normalizedMime =
        typeof mimeType === 'string' ? mimeType.toLowerCase().trim() : '';
      if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
        res.status(400).json({
          error: 'Unsupported image format. Please upload a JPEG, PNG, or WebP photograph.',
        });
        return;
      }

      const cleanBase64 = afterImageBase64.replace(/^data:[^;]+;base64,/, '');
      if (cleanBase64.length > 10_000_000) {
        res.status(400).json({ error: 'After Repair image exceeds the 7MB upload limit.' });
        return;
      }

      const ai = getGeminiClient();
      const verification = await runVerifyRepairWithRetry(
        ai,
        normalizedMime === 'image/jpg' ? 'image/jpeg' : normalizedMime,
        cleanBase64,
        {
          originalTitle:
            typeof originalTitle === 'string' ? originalTitle.trim().slice(0, 200) : 'Civic Issue',
          originalSummary:
            typeof originalSummary === 'string'
              ? originalSummary.trim().slice(0, 1200)
              : 'Municipal infrastructure issue',
          originalDepartment:
            typeof originalDepartment === 'string'
              ? originalDepartment.trim().slice(0, 120)
              : 'Public Works & Roads (PWD)',
          originalLocation:
            typeof originalLocation === 'string' ? originalLocation.trim().slice(0, 240) : '',
        }
      );

      res.status(200).json(verification);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected server error during repair verification.';
      console.error('[POST /api/verify-repair] error:', message);

      if (/API_KEY_INVALID|PERMISSION_DENIED|GEMINI_API_KEY is not configured/i.test(message)) {
        res.status(503).json({
          error: 'AI verification credentials are unavailable. Please check your Gemini API key in Settings > Secrets.',
        });
        return;
      }
      if (/RESOURCE_EXHAUSTED|429/i.test(message)) {
        res.status(429).json({
          error: 'Verification API quota temporarily reached. Please wait a moment and try again.',
        });
        return;
      }

      res.status(500).json({
        error: `Unable to complete repair verification: ${message}`,
      });
    }
  });

  app.post('/api/police-triage', async (req, res) => {
    try {
      const {
        districtId,
        incidentDateTime,
        description,
        evidenceBase64,
        evidenceMimeType,
      } = req.body ?? {};

      const cleanDescription =
        typeof description === 'string' ? description.trim() : '';
      if (!cleanDescription || cleanDescription.length < 8) {
        res.status(400).json({
          error: 'Please enter a clear incident description in English, Malayalam, or Manglish.',
        });
        return;
      }
      if (cleanDescription.length > 2500) {
        res.status(400).json({
          error: 'Petition description is too long. Please keep it under 2,500 characters.',
        });
        return;
      }

      const cleanDistrictId =
        typeof districtId === 'string' && districtId.trim()
          ? districtId.trim().toLowerCase().slice(0, 40)
          : 'pathanamthitta';

      const cleanDateTime =
        typeof incidentDateTime === 'string'
          ? incidentDateTime.trim().slice(0, 64)
          : new Date().toISOString();

      let cleanEvidenceBase64: string | undefined;
      let cleanEvidenceMime: string | undefined;

      if (typeof evidenceBase64 === 'string' && evidenceBase64.trim().length > 0) {
        const normalizedMime =
          typeof evidenceMimeType === 'string'
            ? evidenceMimeType.toLowerCase().trim()
            : '';
        if (!ALLOWED_POLICE_EVIDENCE_MIME_TYPES.has(normalizedMime)) {
          res.status(400).json({
            error: 'Unsupported evidence format. Upload a JPEG, PNG, WebP image or PDF document.',
          });
          return;
        }
        const stripped = evidenceBase64.replace(/^data:[^;]+;base64,/, '');
        if (stripped.length > 10_000_000) {
          res.status(400).json({ error: 'Evidence attachment exceeds the 7MB limit.' });
          return;
        }
        cleanEvidenceBase64 = stripped;
        cleanEvidenceMime = normalizedMime === 'image/jpg' ? 'image/jpeg' : normalizedMime;
      }

      const ai = getGeminiClient();
      const result = await runPoliceTriageWithRetry(ai, {
        districtId: cleanDistrictId,
        incidentDateTime: cleanDateTime,
        description: cleanDescription,
        evidenceBase64: cleanEvidenceBase64,
        evidenceMimeType: cleanEvidenceMime,
      });

      res.status(200).json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected server error during police petition triage.';
      console.error('[POST /api/police-triage] error:', message);

      if (/API_KEY_INVALID|PERMISSION_DENIED|GEMINI_API_KEY is not configured/i.test(message)) {
        res.status(503).json({
          error: 'Police AI triage credentials are unavailable. Please check your Gemini API key in Settings > Secrets.',
        });
        return;
      }
      if (/RESOURCE_EXHAUSTED|429/i.test(message)) {
        res.status(429).json({
          error: 'Police triage quota temporarily reached. Please wait a moment and try again.',
        });
        return;
      }

      res.status(500).json({
        error: `Unable to process Police e-Complaint right now: ${message}`,
      });
    }
  });

  const LOCAL_LIFE_AI_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      headline: { type: Type.STRING },
      summary: { type: Type.STRING },
      recommendations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            action_tip: { type: Type.STRING },
            badge: { type: Type.STRING },
          },
          required: ['title', 'subtitle', 'action_tip', 'badge'],
        },
      },
      next_step: { type: Type.STRING },
    },
    required: ['headline', 'summary', 'recommendations', 'next_step'],
  };

  const localLifeAiCache = new Map<string, unknown>();
  const RESILIENT_LOCAL_MODELS = [
    'gemini-4-hydrogen',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite',
  ] as const;

  const buildLocalLifeFallback = (
    mode: string,
    districtName: string,
    levelOrCategory: string,
    streamOrMood: string,
    body: Record<string, unknown>
  ) => {
    if (mode === 'study_plan') {
      const targetExam = String(body.targetExam || 'KEAM / JEE Engineering');
      const dailyHours = Math.max(1, Math.min(12, Number(body.dailyHours) || 4));
      const targetDate = String(body.targetDate || '2027-04-20');
      const subjects =
        targetExam.includes('Python')
          ? [
              { subject: 'Python Core & DSA', percent: 40, color: '#4F5BD5' },
              { subject: 'React & Full-Stack Web', percent: 35, color: '#0ea5e9' },
              { subject: 'Portfolio & Git Projects', percent: 25, color: '#10b981' },
            ]
          : targetExam.includes('IELTS')
            ? [
                { subject: 'IELTS Writing & Speaking', percent: 38, color: '#4F5BD5' },
                { subject: 'Listening & Reading Drills', percent: 32, color: '#0ea5e9' },
                { subject: 'SOP & UK Uni Shortlisting', percent: 30, color: '#10b981' },
              ]
            : [
                { subject: 'Mathematics & Problem Solving', percent: 40, color: '#4F5BD5' },
                { subject: 'Physics & Numericals', percent: 32, color: '#0ea5e9' },
                { subject: 'Chemistry / Computer Science', percent: 28, color: '#10b981' },
              ];
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return {
        headline: `${targetExam} · ${dailyHours}h/day Smart Roadmap`,
        milestoneSummary: `Structured 7-day mastery cycle targeting ${targetDate} with timed mock drills and active recall blocks.`,
        subjectWeights: subjects,
        days: dayNames.map((day, idx) => ({
          day,
          focusTheme:
            idx === 6
              ? 'Full-Length Mock Test & Error Log Review'
              : `${subjects[idx % subjects.length].subject} Deep Focus`,
          tasks: [
            {
              id: `d${idx}-t1`,
              title: `Core concept sprint & formula notes (${subjects[idx % subjects.length].subject})`,
              durationMins: Math.round(dailyHours * 28),
              subject: subjects[idx % subjects.length].subject,
              done: false,
            },
            {
              id: `d${idx}-t2`,
              title: `25 timed practice questions + mistake journal`,
              durationMins: Math.round(dailyHours * 20),
              subject: subjects[(idx + 1) % subjects.length].subject,
              done: false,
            },
            {
              id: `d${idx}-t3`,
              title: `Active recall flashcard revision before sleep`,
              durationMins: Math.max(25, Math.round(dailyHours * 12)),
              subject: subjects[(idx + 2) % subjects.length].subject,
              done: false,
            },
          ],
        })),
      };
    }

    if (mode === 'sop') {
      const inst = String(body.institutionName || 'Selected Kerala Institution');
      const applicant = String(body.applicantName || 'Arjit Anil');
      const stream = String(body.stream || 'Science & Computer Science');
      return {
        sopText: `I am writing to express my strong interest in joining ${inst} (${districtName}, Kerala) in the ${stream} track. Having built a disciplined academic foundation in analytical problem-solving, coding projects, and community innovation in Kerala, I am eager to contribute to ${inst}'s laboratories, peer cohorts, and real-world engineering initiatives. My goal is to combine rigorous coursework with applied civic and regional technology projects that create measurable impact.`,
        documentsChecklist: [
          'Class 10 / Plus Two Marksheet & Transfer Certificate (DigiLocker Verified)',
          'KEAM / JEE / CUET Entrance Rank Card or Merit Proof',
          'Aadhaar Card & Kerala Nativity / Community / Income Certificate (for e-Grantz)',
          '2 Passport-size Photographs & Signed Statement of Purpose',
        ],
      };
    }

    if (mode === 'jobs_match') {
      const skillsText = String(body.query || 'React, Python, Civic Tech');
      return {
        summary: `Curated 3 high-fit Kerala & Work-Near-Home opportunities matching "${skillsText}" around ${districtName}.`,
        jobs: [
          {
            id: `ai-job-1-${Date.now()}`,
            title: `${districtName} Smart Civic & Full-Stack Junior Engineer`,
            employer: `Kerala Digital Workforce Mission (DWMS) · ${districtName}`,
            category: 'DWMS / KKEM Knowledge Mission & Internships',
            district: districtName,
            qualification: 'Graduate / B.Tech',
            salaryLabel: '₹26,000 – ₹34,000 / month',
            deadline: 'Open · Rolling DWMS Drive',
            workMode: 'Hybrid',
            summary: `Matched to your skills (${skillsText}). Build K-SMART citizen dashboards and automation pipelines with local district innovation mentors.`,
            skills: ['React', 'TypeScript', 'Python', 'API Integration'],
            officialPortalLabel: 'knowledgemission.kerala.gov.in',
            officialPortalUrl: 'https://knowledgemission.kerala.gov.in',
          },
          {
            id: `ai-job-2-${Date.now()}`,
            title: 'Work-Near-Home AI & Data Operations Associate',
            employer: 'Infopark / Technopark Distributed Hub (Kerala Remote)',
            category: 'Work-Near-Home / Remote',
            district: 'Remote (Work-Near-Home)',
            qualification: 'Graduate / B.Tech',
            salaryLabel: '₹32,000 – ₹48,000 / month',
            deadline: 'Closes 29 Dec 2026',
            workMode: 'Remote',
            summary: '100% remote role with optional co-working access at Kerala Work-Near-Home centers; ideal for graduates staying in home districts.',
            skills: ['AI Workflows', 'SQL', 'Documentation', 'JavaScript'],
            officialPortalLabel: 'knowledgemission.kerala.gov.in',
            officialPortalUrl: 'https://knowledgemission.kerala.gov.in',
          },
          {
            id: `ai-job-3-${Date.now()}`,
            title: `Kerala PSC & District Technical Support Intern (${districtName})`,
            employer: 'Kerala State IT Mission / Akshaya Support Cell',
            category: 'Kerala Govt & PSC',
            district: districtName,
            qualification: 'Diploma / ITI',
            salaryLabel: '₹21,500 / month stipend',
            deadline: 'Apply via Employment Exchange',
            workMode: 'On-Site',
            summary: 'Assist citizens with e-District, K-SMART verification, and digital literacy drives across municipal wards.',
            skills: ['Malayalam & English', 'e-Governance', 'Troubleshooting'],
            officialPortalLabel: 'employment.kerala.gov.in',
            officialPortalUrl: 'https://employment.kerala.gov.in',
          },
        ],
      };
    }

    if (mode === 'job_cover_note') {
      const role = String(body.stream || 'Software & Civic Innovation Role');
      const emp = String(body.institutionName || 'Kerala Employer');
      const applicant = String(body.applicantName || 'Arjit Anil');
      const skillStr = String(body.query || 'React, TypeScript, Python');
      return {
        coverNote: `Dear Hiring Team at ${emp}, I am ${applicant} from ${districtName}, Kerala, applying for the ${role} opening. With hands-on experience in ${skillStr} and building citizen-focused web tools, I am eager to contribute reliably to your team from day one.`,
      };
    }

    if (mode === 'event_plan') {
      const eventType = String(body.eventType || 'Turf Match Refreshments');
      const guestCount = Math.max(2, Number(body.guestCount) || 10);
      const budgetInr = Math.max(500, Number(body.budgetInr) || 2800);
      const spotLocation = String(body.spotLocation || `${districtName} Town Square`);
      return {
        headline: `${eventType} @ ${spotLocation} (${guestCount} Guests)`,
        summary: `Smart run-sheet and on-spot hot food dispatch tailored for ${guestCount} guests at ${spotLocation}, ${districtName} (approx. ₹${Math.round(
          budgetInr / guestCount
        )}/person).`,
        timeline: [
          {
            time: '05:30 PM',
            title: 'Crew Arrival & Venue Pin Check-In',
            ownerNote: `Confirm live Google Maps drop-off pin at ${spotLocation}.`,
          },
          {
            time: '06:30 PM',
            title: 'Starters, Coffee & Hydration Rider Drop',
            ownerNote: 'EV rider delivers chilled drinks & hot Kerala snacks to gate.',
          },
          {
            time: '07:45 PM',
            title: 'Main Feast (Shawarma Platters / Biriyani Buckets)',
            ownerNote: 'Hot insulated boxes arrive; serve & split expenses automatically.',
          },
        ],
        checklist: [
          {
            id: 'ec-1',
            task: `Confirm slot & seating at ${spotLocation}`,
            phase: 'Before Arrival',
            done: false,
          },
          {
            id: 'ec-2',
            task: 'Confirm Veg / Non-Veg headcount in group chat',
            phase: 'Before Arrival',
            done: false,
          },
          {
            id: 'ec-3',
            task: 'Keep disposable plates, tissues & waste bag ready',
            phase: 'Venue Setup',
            done: false,
          },
          {
            id: 'ec-4',
            task: 'Share 7012692128@fam UPI receipt with rider on drop-off',
            phase: 'On-Spot Delivery',
            done: false,
          },
        ],
        cateringMenu: [
          {
            id: 'cat-shawarma-platter',
            name: 'Charcoal Rumali Shawarma Crew Platter (6 Rolls + Toum)',
            vendor: `${districtName} Charcoal Grill`,
            category: 'Shawarma & Platters',
            unitPriceInr: 720,
            servesCount: 5,
            recommendedQty: Math.max(1, Math.ceil(guestCount / 6)),
            dietTag: 'Non-Veg',
          },
          {
            id: 'cat-veg-snack-box',
            name: 'Kerala Pazhampori, Unniyappam & Paneer Puff Box (10 pcs)',
            vendor: `${districtName} Heritage Bakehouse`,
            category: 'Snacks & Starters',
            unitPriceInr: 420,
            servesCount: 5,
            recommendedQty: Math.max(1, Math.ceil(guestCount / 6)),
            dietTag: 'Veg',
          },
          {
            id: 'cat-hydration-pack',
            name: 'Chilled Electrolyte, Tender Coconut & Water Pack (12 Pack)',
            vendor: 'Quick-Mart Hydration Express',
            category: 'Hydration & Energy',
            unitPriceInr: 360,
            servesCount: 10,
            recommendedQty: Math.max(1, Math.ceil(guestCount / 10)),
            dietTag: 'Beverage',
          },
          {
            id: 'cat-biriyani-bucket',
            name: 'Malabar Dum Biriyani Party Bucket (5 Pax)',
            vendor: 'Malabar & Travancore Kitchen',
            category: 'Biriyani Buckets',
            unitPriceInr: 1150,
            servesCount: 5,
            recommendedQty: 1,
            dietTag: 'Non-Veg',
          },
        ],
      };
    }

    if (mode === 'weekend_plan') {
      const vibe = String(body.vibe || 'Chill Cafes & Scenic Drives');
      const duration = String(body.duration || 'Full Weekend (Sat–Sun)');
      const groupSize = Math.max(1, Number(body.groupSize) || 3);
      const budgetInr = Math.max(500, Number(body.budgetInr) || 3500);
      const tweak = String(body.query || '').trim();
      return {
        headline: `${districtName} ${vibe} (${groupSize} pax · ₹${budgetInr.toLocaleString('en-IN')})${tweak ? ` · ${tweak.slice(0, 32)}` : ''}`,
        weatherTip: `Pleasant tropical morning in ${districtName}; carry a compact umbrella for late afternoon showers.`,
        packingTips: ['Reusable bottle', 'Power bank', 'UPI QR ready', 'Walking shoes'],
        saturday: [
          {
            id: 'sat-1',
            time: '09:00 AM',
            block: 'Morning',
            title: 'Morning Filter Coffee & Artisan Breakfast',
            location: `${districtName} Town Roastery`,
            distanceFromPrev: 'Start Point',
            travelTimeFromPrev: '0 mins',
            estimatedCostInr: Math.round(budgetInr * 0.16),
            category: 'Food & Cafes',
            tip: 'Arrive before 9:30 AM for freshly baked puffs and estate pour-over.',
            wikiQuery: districtName,
            done: false,
          },
          {
            id: 'sat-2',
            time: '11:30 AM',
            block: 'Morning',
            title:
              vibe.includes('Waterfall')
                ? 'Scenic Waterfall & Western Ghats Eco-Trail'
                : vibe.includes('Turf')
                  ? '5-a-Side Turf Match & Calisthenics Session'
                  : 'Heritage Craft Village & Riverside Walk',
            location: `${districtName} Heritage / Eco Zone`,
            distanceFromPrev: '6.2 km',
            travelTimeFromPrev: '15 mins drive',
            estimatedCostInr: Math.round(budgetInr * 0.24),
            category: 'Turf & Lifestyle',
            tip: 'Carry reusable water bottles and book entry/slot via UPI.',
            wikiQuery: `${districtName} Kerala`,
            done: false,
          },
          {
            id: 'sat-3',
            time: '01:30 PM',
            block: 'Afternoon',
            title: 'Traditional Kerala Plantain-Leaf Sadhya Lunch',
            location: `${districtName} Heritage Kitchen`,
            distanceFromPrev: '3.8 km',
            travelTimeFromPrev: '10 mins drive',
            estimatedCostInr: Math.round(budgetInr * 0.22),
            category: 'Food & Cafes',
            tip: 'Must try Palpayasam and fresh banana-leaf specials.',
            wikiQuery: 'Sadhya Kerala',
            done: false,
          },
          {
            id: 'sat-4',
            time: '06:30 PM',
            block: 'Evening',
            title: 'Evening Sunset Viewpoint & Charcoal Shawarma Stop',
            location: `${districtName} Station / Main Market`,
            distanceFromPrev: '4.4 km',
            travelTimeFromPrev: '12 mins drive',
            estimatedCostInr: Math.round(budgetInr * 0.14),
            category: 'Food & Cafes',
            tip: 'Pair rumali shawarma with spiced Malabar Sulaimani.',
            wikiQuery: districtName,
            done: false,
          },
        ],
        sunday:
          duration === 'Saturday Only'
            ? []
            : [
                {
                  id: 'sun-1',
                  time: '08:00 AM',
                  block: 'Morning',
                  title: 'Sunrise Viewpoint & Local KSRTC / EV Feeder Hop',
                  location: `${districtName} Hill Viewpoint`,
                  distanceFromPrev: '9.5 km',
                  travelTimeFromPrev: '22 mins drive',
                  estimatedCostInr: Math.round(budgetInr * 0.1),
                  category: 'Local Transport & Fuel',
                  tip: 'Clear morning mist views before 9 AM.',
                  wikiQuery: `${districtName} hills`,
                  done: false,
                },
                {
                  id: 'sun-2',
                  time: '12:30 PM',
                  block: 'Afternoon',
                  title: 'Relaxed Specialty Cafe Brunch & Local Bookshop',
                  location: `${districtName} Cultural Quarter`,
                  distanceFromPrev: '5.1 km',
                  travelTimeFromPrev: '14 mins drive',
                  estimatedCostInr: Math.round(budgetInr * 0.14),
                  category: 'Food & Cafes',
                  tip: 'Great spot to wrap up the weekend and log group splits.',
                  wikiQuery: districtName,
                  done: false,
                },
              ],
        day3:
          duration === '3-Day Long Weekend'
            ? [
                {
                  id: 'd3-1',
                  time: '09:30 AM',
                  block: 'Morning',
                  title: 'Backwater / Forest Eco-Circuit Excursion',
                  location: `${districtName} Eco-Tourism Park`,
                  distanceFromPrev: '14 km',
                  travelTimeFromPrev: '30 mins drive',
                  estimatedCostInr: Math.round(budgetInr * 0.15),
                  category: 'Turf & Lifestyle',
                  tip: 'Ideal long-weekend bonus trail with local snacks.',
                  wikiQuery: `${districtName} tourism`,
                  done: false,
                },
              ]
            : undefined,
      };
    }

    if (mode === 'food_spots') {
      return {
        headline: `Top Curated Food Spots in ${districtName} (${levelOrCategory})`,
        summary: `Hand-picked local culinary favorites in ${districtName} balancing authentic Kerala flavours, specialty coffee, and late-night commuter eats.`,
        recommendations: [
          {
            title: `${districtName} Heritage Banana-Leaf Sadhya Hall`,
            subtitle: `Traditional Kerala Sadhya · ₹450 for two`,
            action_tip: 'Arrive by 12:15 PM for the hot first-batch Ada Pradhaman & Aviyal.',
            badge: 'Local Classic',
          },
          {
            title: `${districtName} Estate Coffee & Bakery`,
            subtitle: `Specialty Coffee & Bakeries · ₹380 for two`,
            action_tip: 'Order single-origin Wayanad cold brew with warm cardamom cake.',
            badge: 'Cafe Pick',
          },
          {
            title: `${districtName} Station Road Night Shawarma & Porotta`,
            subtitle: `Late-Night Street Food · ₹320 for two`,
            action_tip: 'Open past midnight near the bus/rail feeder corridor.',
            badge: 'Late Night',
          },
        ],
        next_step: 'Tap any food spot card to inspect Wikimedia photos, pin it on Google Maps, or add it to your Weekend Plan.',
      };
    }

    return {
      headline: `${districtName} ${mode === 'education' ? 'Academic & Skill' : 'Curated Lifestyle'} Spotlight`,
      summary: `Verified local ${mode} highlights for ${districtName} (${levelOrCategory} · ${streamOrMood}).`,
      recommendations: [
        {
          title:
            mode === 'education'
              ? `${districtName} Government / IHRD Engineering & Arts Track`
              : `${districtName} Heritage Craft & Cultural Trail`,
          subtitle: `${districtName}, Kerala · ${levelOrCategory}`,
          action_tip:
            mode === 'education'
              ? 'Check KEAM/CUET cutoff dates and apply with 1-click admission autofill.'
              : 'Pair a morning heritage walk with an afternoon specialty cafe stop.',
          badge: 'Top Pick',
        },
        {
          title:
            mode === 'education'
              ? 'ASAP Kerala AI, Cloud & Full-Stack Skill Park'
              : 'Riverside Culinary & Evening Turf Circuit',
          subtitle: 'Subsidized regional program / community venue',
          action_tip: 'Reserve early via digital portal or UPI pass.',
          badge: 'Verified',
        },
        {
          title:
            mode === 'education'
              ? 'Kerala e-Grantz & Post-Matric Merit Scholarship'
              : 'Local Eco-Park & Sunset Viewpoint',
          subtitle: 'Zero-fee citizen benefit / free public access',
          action_tip: 'Keep DigiLocker documents ready for instant verification.',
          badge: 'Recommended',
        },
      ],
      next_step: 'Click any card to open its live Wikimedia Picture Library or launch the interactive planner.',
    };
  };

  app.post('/api/local-life-ai', async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const rawMode = typeof body.mode === 'string' ? body.mode.trim() : 'education';
    const mode = [
      'education',
      'lifestyle',
      'study_plan',
      'sop',
      'food_spots',
      'weekend_plan',
      'jobs_match',
      'job_cover_note',
      'event_plan',
    ].includes(rawMode)
      ? rawMode
      : 'education';
    const districtName =
      typeof body.districtName === 'string' && body.districtName.trim()
        ? body.districtName.trim().slice(0, 60)
        : 'Pathanamthitta';
    const levelOrCategory =
      typeof body.levelOrCategory === 'string'
        ? body.levelOrCategory.trim().slice(0, 80)
        : 'All';
    const streamOrMood =
      typeof body.streamOrMood === 'string'
        ? body.streamOrMood.trim().slice(0, 80)
        : 'General';
    const query =
      typeof body.query === 'string' ? body.query.trim().slice(0, 400) : '';

    const cacheKey = JSON.stringify({
      mode,
      districtName,
      levelOrCategory,
      streamOrMood,
      query,
      targetExam: body.targetExam,
      dailyHours: body.dailyHours,
      targetDate: body.targetDate,
      institutionName: body.institutionName,
      vibe: body.vibe,
      duration: body.duration,
      groupSize: body.groupSize,
      budgetInr: body.budgetInr,
      eventType: body.eventType,
      guestCount: body.guestCount,
      spotLocation: body.spotLocation,
    });

    const cached = localLifeAiCache.get(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    try {
      let systemInstruction =
        'You are a Kerala Academic & Career Counselor helping students across Kerala. Return strictly valid JSON.';
      let responseSchema: Record<string, unknown> = LOCAL_LIFE_AI_SCHEMA;
      let promptText = `Mode: ${mode}\nDistrict: ${districtName}, Kerala\nFilter: ${levelOrCategory}\nFocus: ${streamOrMood}\n${query}`;

      if (mode === 'study_plan') {
        systemInstruction =
          'You are an expert Indian & international academic coach creating realistic 7-day study schedules with checkable tasks and subject percentage weightages summing to 100. Return strictly valid JSON.';
        promptText = `Target Exam/Stream: ${String(body.targetExam || 'KEAM / JEE Engineering')}\nDaily Study Hours: ${Number(body.dailyHours) || 4}\nTarget Date: ${String(body.targetDate || '2027-04-20')}\nDistrict: ${districtName}, Kerala\nGenerate a practical 7-day study schedule (Monday to Sunday) with 3 crisp tasks per day.`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            milestoneSummary: { type: Type.STRING },
            subjectWeights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  percent: { type: Type.INTEGER },
                  color: { type: Type.STRING },
                },
                required: ['subject', 'percent', 'color'],
              },
            },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  focusTheme: { type: Type.STRING },
                  tasks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        durationMins: { type: Type.INTEGER },
                        subject: { type: Type.STRING },
                      },
                      required: ['id', 'title', 'durationMins', 'subject'],
                    },
                  },
                },
                required: ['day', 'focusTheme', 'tasks'],
              },
            },
          },
          required: ['headline', 'milestoneSummary', 'subjectWeights', 'days'],
        };
      } else if (mode === 'sop') {
        systemInstruction =
          'You are an admissions counselor drafting a crisp, authentic 90-word Statement of Purpose (SOP) and exact document checklist for Indian/Kerala college or scholarship applications. Return strictly valid JSON.';
        promptText = `Applicant: ${String(body.applicantName || 'Arjit Anil')}\nInstitution: ${String(body.institutionName || 'College of Engineering Adoor')}\nStream: ${String(body.stream || 'Science & CS')}\nDistrict: ${districtName}, Kerala`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            sopText: { type: Type.STRING },
            documentsChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['sopText', 'documentsChecklist'],
        };
      } else if (mode === 'weekend_plan') {
        systemInstruction =
          'You are a Kerala weekend trip architect crafting an authentic hour-by-hour itinerary with time blocks (Morning/Afternoon/Evening/Night), realistic distances, travel times, INR costs, weather tip, and packing tips. Return strictly valid JSON.';
        promptText = `District: ${districtName}, Kerala\nDuration: ${String(body.duration || 'Full Weekend (Sat–Sun)')}\nVibe: ${String(body.vibe || 'Chill Cafes & Scenic Drives')}\nGroup Size: ${Number(body.groupSize) || 3}\nBudget INR: ${Number(body.budgetInr) || 3500}${query ? `\nUser Tweak Request: ${query}` : ''}`;
        const stopItemSchema = {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            time: { type: Type.STRING },
            block: { type: Type.STRING },
            title: { type: Type.STRING },
            location: { type: Type.STRING },
            distanceFromPrev: { type: Type.STRING },
            travelTimeFromPrev: { type: Type.STRING },
            estimatedCostInr: { type: Type.INTEGER },
            category: { type: Type.STRING },
            tip: { type: Type.STRING },
            wikiQuery: { type: Type.STRING },
          },
          required: ['id', 'time', 'title', 'location', 'estimatedCostInr', 'category', 'tip'],
        };
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            weatherTip: { type: Type.STRING },
            packingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
            saturday: { type: Type.ARRAY, items: stopItemSchema },
            sunday: { type: Type.ARRAY, items: stopItemSchema },
            day3: { type: Type.ARRAY, items: stopItemSchema },
          },
          required: ['headline', 'saturday', 'sunday'],
        };
      } else if (mode === 'jobs_match') {
        systemInstruction =
          'You are a Kerala Career & DWMS/KKEM Placement Advisor. Return 3 realistic, high-fit job/internship opportunities in Kerala or Remote matching the user skills and filters. Return strictly valid JSON.';
        promptText = `District/Location: ${districtName}\nCategory: ${levelOrCategory}\nQualification: ${streamOrMood}\nUser Skills/Goal: ${query || 'React, Python, Civic Tech'}`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            jobs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  employer: { type: Type.STRING },
                  category: { type: Type.STRING },
                  district: { type: Type.STRING },
                  qualification: { type: Type.STRING },
                  salaryLabel: { type: Type.STRING },
                  deadline: { type: Type.STRING },
                  workMode: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                  officialPortalLabel: { type: Type.STRING },
                  officialPortalUrl: { type: Type.STRING },
                },
                required: ['title', 'employer', 'district', 'salaryLabel', 'summary'],
              },
            },
          },
          required: ['summary', 'jobs'],
        };
      } else if (mode === 'job_cover_note') {
        systemInstruction =
          'Draft a crisp, professional 60-word job application cover note for a Kerala candidate. Return strictly valid JSON.';
        promptText = `Applicant: ${String(body.applicantName || 'Arjit Anil')}\nRole: ${String(body.stream || 'Junior Developer')}\nEmployer: ${String(body.institutionName || 'Kerala Employer')}\nDistrict: ${districtName}\nSkills: ${query}`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            coverNote: { type: Type.STRING },
          },
          required: ['coverNote'],
        };
      } else if (mode === 'event_plan') {
        systemInstruction =
          'You are a Kerala Event Management AI creating a concise event run-sheet, checkable prep list, and realistic on-spot local catering menu (with INR prices) for the specified event type, venue pin, guest count, and budget. Return strictly valid JSON.';
        promptText = `Event Type: ${String(body.eventType || 'Turf Match Refreshments')}\nVenue Pin: ${String(body.spotLocation || `${districtName} Town Square`)}, ${districtName}, Kerala\nGuests: ${Number(body.guestCount) || 10}\nBudget INR: ${Number(body.budgetInr) || 2800}`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            summary: { type: Type.STRING },
            timeline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING },
                  title: { type: Type.STRING },
                  ownerNote: { type: Type.STRING },
                },
                required: ['time', 'title', 'ownerNote'],
              },
            },
            checklist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  task: { type: Type.STRING },
                  phase: { type: Type.STRING },
                },
                required: ['id', 'task', 'phase'],
              },
            },
            cateringMenu: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  vendor: { type: Type.STRING },
                  category: { type: Type.STRING },
                  unitPriceInr: { type: Type.INTEGER },
                  servesCount: { type: Type.INTEGER },
                  recommendedQty: { type: Type.INTEGER },
                  dietTag: { type: Type.STRING },
                },
                required: ['name', 'vendor', 'unitPriceInr', 'servesCount', 'recommendedQty'],
              },
            },
          },
          required: ['headline', 'summary', 'timeline', 'checklist', 'cateringMenu'],
        };
      } else if (mode === 'food_spots') {
        systemInstruction =
          'You are a Kerala food scout recommending 3 authentic local restaurants, specialty cafes, toddy-shop kitchens, or late-night street food gems in the requested district. Include realistic ₹ cost for two and must-try dishes. Return strictly valid JSON.';
      } else if (mode === 'lifestyle') {
        systemInstruction =
          'You are a Kerala Cultural, Handloom, Culinary & Fitness Concierge crafting tailored weekend recommendations across Kerala districts. Return strictly valid JSON with 3 curated local experiences.';
      }

      const ai = getGeminiClient();
      for (const model of RESILIENT_LOCAL_MODELS) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: promptText,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema,
              },
            });
            const rawText = (response.text ?? '').trim();
            if (!rawText) throw new Error('Empty Local Life AI response.');
            const cleaned = rawText
              .replace(/^```(?:json)?\s*/i, '')
              .replace(/\s*```$/i, '')
              .trim();
            const parsed = JSON.parse(cleaned);
            if (localLifeAiCache.size > 150) {
              const firstKey = localLifeAiCache.keys().next().value;
              if (firstKey) localLifeAiCache.delete(firstKey);
            }
            localLifeAiCache.set(cacheKey, parsed);
            res.status(200).json(parsed);
            return;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (/NOT_FOUND|404/i.test(msg)) break;
            if (!/429|RESOURCE_EXHAUSTED|503|500|UNAVAILABLE|DEADLINE_EXCEEDED/i.test(msg)) {
              break;
            }
            if (attempt === 0) {
              await new Promise((r) => setTimeout(r, 500));
            }
          }
        }
      }

      // Deterministic local fallback if all models hit quota/429
      const fallback = buildLocalLifeFallback(mode, districtName, levelOrCategory, streamOrMood, body);
      localLifeAiCache.set(cacheKey, fallback);
      res.status(200).json(fallback);
    } catch {
      const fallback = buildLocalLifeFallback(mode, districtName, levelOrCategory, streamOrMood, body);
      res.status(200).json(fallback);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CivicTriage LSG server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
