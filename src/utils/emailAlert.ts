import emailjs from '@emailjs/browser';
import type { EmailAlertStatus, TriageTicketJSON } from '../shared/triageSchema';

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
