import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  MUNICIPAL_DEPARTMENTS,
  normalizeTriagePayload,
} from './src/shared/triageSchema.ts';

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
