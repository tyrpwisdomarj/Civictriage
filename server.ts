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

const FLASH_MULTIMODAL_MODELS = ['gemini-4-hydrogen', 'gemini-2.5-flash'] as const;

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

async function runTriageWithRetry(
  ai: GoogleGenAI,
  mimeType: string,
  imageBase64: string,
  description: string,
  locationHint: string
) {
  const promptText = [
    'Analyze the attached citizen photograph and text description according to all municipal triage rules.',
    `Citizen Description: ${description}`,
    locationHint ? `Reported Local Body / Ward / Landmark: ${locationHint}` : 'Reported Local Body / Ward / Landmark: Not provided',
  ].join('\n');

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
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
      return normalizeTriagePayload(parsed);
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      const isTransient = /503|500|UNAVAILABLE|DEADLINE_EXCEEDED|fetch failed/i.test(msg);
      if (!isTransient || attempt === 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }
  throw lastError;
}

const TRAVEL_GUIDE_SYSTEM_INSTRUCTION = `You are an expert Kerala & South India Transport, Biodiversity, and Cultural Planner assisting citizens, municipal officers, and travelers across all 14 districts of Kerala and major Inter-State Gateways (Bengaluru, Chennai, Coimbatore, Mangaluru, Mysuru, Ooty).

Follow these strict domain rules:
1. ACCURATE REGIONAL HUB LOGIC:
   - Pathanamthitta has NO airport and NO central town railway station: rail routes MUST feed via Thiruvalla (TRVL) or Chengannur (CNGR) via KSRTC/auto feeder; flights connect via Thiruvananthapuram (TRV) or Cochin (COK); KSRTC Swift / Super Fast connects district hubs and inter-state corridors.
   - Idukki and Wayanad also have no railway stations: Idukki feeds via Kottayam (KTYM) / Aluva (AWY) / Ernakulam, and Wayanad feeds via Kozhikode (CLT) / Nilambur Road (NIL) / Mysuru (MYS).
   - Always adapt the route cleanly to the requested Travel Preference:
     * "Balanced": Practical blend of rail/KSRTC Swift with minimal transfers.
     * "Budget KSRTC & Rail": Lowest-cost KSRTC Super Fast / Fast Passenger + Indian Railways 2S/SL.
     * "Fastest Air & Express": Fastest Vande Bharat Express / Shatabdi / flight (TRV, COK, CCJ, CNN, BLR, MAA, CJB, IXE) + quick cab transfers.
2. TRANSPORT STEPS: Provide 2 to 5 sequential multi-modal steps with realistic Indian Railways train lines/numbers or KSRTC Swift/Super Fast services, realistic durations, approx INR fare ranges (e.g., "₹180 – ₹450"), and a practical local tip.
3. REGIONAL CULTURE & BIODIVERSITY: Provide accurate signature flora, signature fauna, cultural highlight, and eco-travel tip for the destination region.
4. TOURIST SPOTS: Provide exactly 3 iconic, real tourist spots with category, concise description, and exact how_to_reach_from_hub directions.
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
      description: 'Realistic total estimated INR fare range, e.g. "₹380 – ₹890".',
    },
    origin_nearest_hubs: {
      type: Type.OBJECT,
      properties: {
        railway_station: {
          type: Type.STRING,
          description: 'Nearest railhead(s) serving the origin with Indian Railways station codes.',
        },
        ksrtc_depot: {
          type: Type.STRING,
          description: 'Primary KSRTC bus stand / depot serving the origin.',
        },
        nearest_airport: {
          type: Type.STRING,
          description: 'Nearest airport(s) with IATA code serving the origin.',
        },
      },
      required: ['railway_station', 'ksrtc_depot', 'nearest_airport'],
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
    'transport_steps',
    'regional_culture_and_biodiversity',
    'tourist_spots',
  ],
};

const travelGuideCache = new Map<string, TravelGuideResponse>();

async function runTravelGuideWithRetry(
  ai: GoogleGenAI,
  origin: string,
  destination: string,
  travelPreference: TravelPreference
): Promise<TravelGuideResponse> {
  const promptText = [
    `Plan a multi-modal route, biodiversity/culture brief, and top 3 tourist spots.`,
    `Origin: ${origin}`,
    `Destination: ${destination}`,
    `Travel Preference: ${travelPreference}`,
    `Ensure real Kerala/South India hub accuracy (for Pathanamthitta, cite Thiruvalla [TRVL] or Chengannur [CNGR] railheads, TRV/COK airports, and KSRTC Swift/Super Fast corridors).`,
  ].join('\n');

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
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
      const isTransient = /503|500|UNAVAILABLE|DEADLINE_EXCEEDED|fetch failed/i.test(msg);
      if (!isTransient || attempt === 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw lastError;
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
        'Up to 3 relevant in-app navigation buttons to display below the reply: citizen_report (Go to Citizen Report), officer_dashboard (Open Officer Dashboard), police_desk (Open Police & Safety Desk), travel_explorer (Open 3D Explorer), my_tickets (View My Tickets).',
    },
  },
  required: ['reply', 'actions'],
};

function buildAssistantSystemInstruction(
  sessionContext?: Partial<AssistantSessionContext> | null
): string {
  const contextBlock = buildSessionContextBlock(sessionContext);
  return [
    'You are the CivicTriage Assistant, a friendly, concise, and helpful customer support AI for CivicTriage LSG & Mobility (Kerala Local Self-Government civic issue triage + Kerala Police THUNA/Pol-App Safety Desk + 3D Kerala & South India mobility booking portal).',
    '',
    'CORE RULES:',
    '1. LANGUAGE FLUENCY: Fluently understand and reply in English, Malayalam, or Manglish — always match the language/script the user writes in.',
    '2. BREVITY & CLARITY: Keep every response crisp and scannable (2–4 sentences or 2–4 concise bullet points starting with "- "). No fluff, no raw markdown headings.',
    '3. ACCURATE CIVIC TRIAGE GUIDANCE:',
    '   - To report potholes, broken streetlights, hanging live wires, garbage dumps, or burst pipes: open Citizen Report, upload a clear outdoor photo, add a short English/Malayalam/Manglish description (typing or voice mic), and submit.',
    '   - Duplicate reports for the same ward/landmark are automatically clustered to boost priority ("Confirmed by X citizens"), and officers can verify fixes using Gemini Before/After photo verification.',
    '   - Emergency Kerala Helplines: 112 (Police/ERSS), 1930 (Cyber Fraud), 1912 (KSEB Power), 1916 (KWA Water), 1077 (District Disaster Control Room).',
    '4. POLICE & SAFETY DESK (KERALA POLICE THUNA & POL-APP):',
    '   - Citizens can file e-Complaints / General Diary (GD) Logs (Lost Documents, Cyber Scams, Highway Obstructions, Locked House Travel Intimation) in the Police & Safety tab to receive a Digital Petition Acknowledgement Slip (KL-XXX-YYYY-XXXX) with QR verification and live SHO status tracking.',
    '   - For life-threatening emergencies, always urge immediate call to 112 ERSS. Mention official Kerala Police THUNA (thuna.keralapolice.gov.in) and Pol-App portals when appropriate.',
    '5. ACCURATE KERALA & MOBILITY GUIDANCE:',
    '   - Pathanamthitta has NO railway station or airport in town: rail routes feed via Chengannur (CNGR) or Thiruvalla (TRVL) by KSRTC/auto; flights connect via Thiruvananthapuram (TRV) or Cochin (COK).',
    '   - Wayanad and Idukki also have no rail stations (Wayanad feeds via Kozhikode CLT / Nilambur Road NIL / Mysuru MYS; Idukki via Kottayam KTYM / Aluva AWY).',
    '   - The 3D Travel Explorer cross-references active civic hazards (severity >= 7) and police traffic logs along the route to display live Corridor Hazard & Safety Alerts and alternate feeder routes, plus offers a Locked House Travel Intimation toggle.',
    '   - FamPay UPI QR Payments: In the Travel & 3D Explorer booking flow, pick seats in 3D (Flight / IRCTC / KSRTC), then scan the FamPay UPI QR for 7012692128@fam (or click Open in UPI App). Users can toggle "₹1 Demo Fare Mode" to safely test with ₹1 while still seeing the real calculated fare, optionally enter a 12-digit UTR, and immediately receive a confirmed PNR e-ticket saved in My Booked Tickets.',
    '6. LIVE SESSION AWARENESS: Use ONLY the read-only LIVE SESSION CONTEXT below when asked about active tickets, police cases/GD refs, statuses, departments, booked PNRs, seats, or current 3D map origin/destination. Never fabricate ticket IDs, police case refs, or PNRs.',
    '7. NAVIGATION ACTIONS: Populate the "actions" array with 1–2 relevant buttons whenever helpful ("citizen_report", "officer_dashboard", "police_desk", "travel_explorer", "my_tickets"). Do not write bracketed button labels like [Go to Citizen Report] inside the "reply" text.',
    '',
    contextBlock,
  ].join('\n');
}

interface IncomingChatTurn {
  role: 'user' | 'model';
  text: string;
}

const ASSISTANT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'] as const;

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
        const isModelNotFound = /NOT_FOUND|404|is not found|not supported for generateContent/i.test(
          msg
        );
        if (isModelNotFound) {
          // Try the next verified flash-lite model alias
          break;
        }
        const isTransient = /503|500|UNAVAILABLE|DEADLINE_EXCEEDED|fetch failed/i.test(msg);
        if (!isTransient || attempt === 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 450));
      }
    }
  }

  throw lastError;
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
        if (/NOT_FOUND|404|is not found|not supported for generateContent/i.test(msg)) {
          break;
        }
        const isTransient = /503|500|UNAVAILABLE|DEADLINE_EXCEEDED|fetch failed/i.test(msg);
        if (!isTransient) {
          throw error;
        }
        if (attempt === 1) {
          // Try next model fallback if this model is overloaded
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 450));
      }
    }
  }
  throw lastError;
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
        if (/NOT_FOUND|404|is not found|not supported for generateContent/i.test(msg)) {
          break;
        }
        const isTransient = /503|500|UNAVAILABLE|DEADLINE_EXCEEDED|fetch failed/i.test(msg);
        if (!isTransient) {
          throw error;
        }
        if (attempt === 1) {
          // Try next model fallback if this model is overloaded
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 450));
      }
    }
  }
  throw lastError;
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

      if (rawOrigin.length > 80 || rawDestination.length > 80) {
        res.status(400).json({
          error: 'Location names must be 80 characters or fewer.',
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
