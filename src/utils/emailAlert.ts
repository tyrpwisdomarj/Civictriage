import emailjs from '@emailjs/browser';
import type {
  EmailAlertStatus,
  StoredTicket,
  TriageTicketJSON,
} from '../shared/triageSchema';
import type { StoredPoliceCase } from '../shared/policeSchema';

export const EMAILJS_SERVICE_ID = 'service_g25zcy6';
export const EMAILJS_TEMPLATE_ID = 'template_avtam5t';
export const EMAILJS_PUBLIC_KEY = 'M0CXO-zaQNJ6uQjKY';

let isEmailJsInitialized = false;

export function initEmailJs(): void {
  if (!isEmailJsInitialized) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    isEmailJsInitialized = true;
  }
}

export interface OfficerEmailTemplateParams {
  [key: string]: string;
  ticket_title: string;
  department: string;
  urgency_level: string;
  severity_score: string;
  sla: string;
  landmarks: string;
  reasoning: string;
  description: string;
  recommended_action: string;
}

export function buildEmailTemplateParams(
  result: TriageTicketJSON
): OfficerEmailTemplateParams {
  const landmarks =
    Array.isArray(result.extracted_landmarks) && result.extracted_landmarks.length > 0
      ? result.extracted_landmarks.join(', ')
      : result.location_clues?.trim() || 'Not specified';

  return {
    ticket_title: result.ticket_title,
    department: result.department,
    urgency_level: result.severity_level,
    severity_score: String(result.severity_score),
    sla: result.recommended_sla,
    landmarks: landmarks || 'Not specified',
    reasoning: result.severity_reasoning,
    description: result.formal_summary,
    recommended_action: result.recommended_action,
  };
}

export type EmailSenderFn = (
  serviceId: string,
  templateId: string,
  templateParams: Record<string, unknown>,
  options?: { publicKey?: string }
) => Promise<unknown>;

export async function sendOfficerAlertEmail(
  result: TriageTicketJSON,
  sender: EmailSenderFn = emailjs.send
): Promise<EmailAlertStatus> {
  if (result.is_valid_civic_issue !== true) {
    return 'not_applicable';
  }

  try {
    if (sender === emailjs.send) {
      initEmailJs();
    }
    const params = buildEmailTemplateParams(result);
    await sender(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params, {
      publicKey: EMAILJS_PUBLIC_KEY,
    });
    return 'sent';
  } catch (err) {
    console.warn('[EmailJS] Alert email skipped due to error:', err);
    return 'skipped';
  }
}

export async function sendRepairResolutionEmail(
  ticket: StoredTicket,
  verificationNote: string,
  sender: EmailSenderFn = emailjs.send
): Promise<EmailAlertStatus> {
  try {
    if (sender === emailjs.send) {
      initEmailJs();
    }
    const landmarks =
      ticket.triage.extracted_landmarks.length > 0
        ? ticket.triage.extracted_landmarks.join(', ')
        : ticket.localBodyHint || 'Not specified';

    const params: OfficerEmailTemplateParams = {
      ticket_title: `[RESOLVED • AI VERIFIED] ${ticket.triage.ticket_title}`,
      department: ticket.triage.department,
      urgency_level: 'Resolved',
      severity_score: `${ticket.triage.severity_score} → 0 (Closed)`,
      sla: 'Closed-Loop Verified',
      landmarks,
      reasoning: verificationNote,
      description: `Ticket ${ticket.id} has passed Gemini Before/After visual repair audit. ${ticket.triage.formal_summary}`,
      recommended_action:
        'Ticket marked Resolved in K-SMART / Officer Dashboard. Archive before/after verification proof.',
    };

    await sender(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params, {
      publicKey: EMAILJS_PUBLIC_KEY,
    });
    return 'sent';
  } catch (err) {
    console.warn('[EmailJS] Repair resolution email skipped due to error:', err);
    return 'skipped';
  }
}

export async function sendPoliceCaseAlertEmail(
  policeCase: StoredPoliceCase,
  sender: EmailSenderFn = emailjs.send
): Promise<EmailAlertStatus> {
  const isHighOrCritical =
    policeCase.triage.priority_level === 'Critical / Immediate' ||
    policeCase.triage.priority_level === 'High' ||
    policeCase.triage.is_emergency_life_threat;

  if (!isHighOrCritical) {
    return 'not_applicable';
  }

  try {
    if (sender === emailjs.send) {
      initEmailJs();
    }

    const params: OfficerEmailTemplateParams = {
      ticket_title: `[KERALA POLICE ${policeCase.caseRefId}] ${policeCase.triage.case_category}`,
      department: `${policeCase.triage.recommended_unit} • ${policeCase.triage.jurisdictional_station}`,
      urgency_level: policeCase.triage.priority_level,
      severity_score: policeCase.triage.is_emergency_life_threat ? '10 (112 ERSS)' : '8 (High)',
      sla: policeCase.triage.is_emergency_life_threat
        ? 'Immediate 112 ERSS Dispatch'
        : 'Priority SHO Inquiry (24h)',
      landmarks: `${policeCase.districtName} • ${policeCase.triage.jurisdictional_station}`,
      reasoning: policeCase.triage.actionable_legal_guidance,
      description: policeCase.triage.formal_petition_summary,
      recommended_action: `SHO / Beat Officer to acknowledge petition ${policeCase.caseRefId} and update status in Police Desk.`,
    };

    await sender(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params, {
      publicKey: EMAILJS_PUBLIC_KEY,
    });
    return 'sent';
  } catch (err) {
    console.warn('[EmailJS] Police alert email skipped due to error:', err);
    return 'skipped';
  }
}

