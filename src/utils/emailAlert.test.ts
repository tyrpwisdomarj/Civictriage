import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTriagePayload } from '../shared/triageSchema';
import {
  buildEmailTemplateParams,
  EMAILJS_PUBLIC_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
  sendOfficerAlertEmail,
} from './emailAlert';

test('buildEmailTemplateParams maps exact required EmailJS keys and falls back to Not specified for empty landmarks', () => {
  const validTicket = normalizeTriagePayload({
    is_valid_civic_issue: true,
    department: 'Electrical & Streetlights (KSEB)',
    severity_score: 10,
    severity_reasoning: 'Snapped power cable hanging over wet road.',
    ticket_title: 'Snapped Power Cable Near Anil Bakery',
    formal_summary: 'Overhead power cable detached near Anil Bakery requiring emergency isolation.',
    extracted_landmarks: ['Anil Bakery', 'Aluva Ward 14'],
    recommended_action: 'Isolate 11kV feeder and dispatch KSEB emergency crew immediately.',
  });

  const params = buildEmailTemplateParams(validTicket);
  assert.deepEqual(Object.keys(params).sort(), [
    'department',
    'description',
    'landmarks',
    'reasoning',
    'recommended_action',
    'severity_score',
    'sla',
    'ticket_title',
    'urgency_level',
  ]);
  assert.equal(params.ticket_title, 'Snapped Power Cable Near Anil Bakery');
  assert.equal(params.department, 'Electrical & Streetlights (KSEB)');
  assert.equal(params.urgency_level, 'Critical');
  assert.equal(params.severity_score, '10');
  assert.equal(params.sla, 'Immediate (0–4 hours)');
  assert.equal(params.landmarks, 'Anil Bakery, Aluva Ward 14');
  assert.equal(params.reasoning, 'Snapped power cable hanging over wet road.');
  assert.equal(
    params.description,
    'Overhead power cable detached near Anil Bakery requiring emergency isolation.'
  );
  assert.equal(
    params.recommended_action,
    'Isolate 11kV feeder and dispatch KSEB emergency crew immediately.'
  );

  const noLandmarkTicket = normalizeTriagePayload({
    is_valid_civic_issue: true,
    department: 'Waste & Sanitation',
    severity_score: 6,
    extracted_landmarks: [],
    location_clues: null,
  });
  assert.equal(buildEmailTemplateParams(noLandmarkTicket).landmarks, 'Not specified');
});

test('sendOfficerAlertEmail never calls EmailJS when is_valid_civic_issue is false', async () => {
  const spamTicket = normalizeTriagePayload({
    is_valid_civic_issue: false,
    rejection_reason: 'Indoor coffee mug.',
  });

  let called = false;
  const status = await sendOfficerAlertEmail(spamTicket, async () => {
    called = true;
    return { status: 200 };
  });

  assert.equal(called, false);
  assert.equal(status, 'not_applicable');
});

test('sendOfficerAlertEmail sends with exact credentials and returns sent on success', async () => {
  const validTicket = normalizeTriagePayload({
    is_valid_civic_issue: true,
    department: 'Public Works & Roads (PWD)',
    severity_score: 8,
    ticket_title: 'Deep Pothole on MG Road',
    extracted_landmarks: ['MG Road Bus Stop'],
    recommended_action: 'Perform urgent bituminous patching.',
  });

  let capturedArgs: unknown[] = [];
  const status = await sendOfficerAlertEmail(validTicket, async (...args) => {
    capturedArgs = args;
    return { status: 200, text: 'OK' };
  });

  assert.equal(status, 'sent');
  assert.equal(capturedArgs[0], EMAILJS_SERVICE_ID);
  assert.equal(capturedArgs[1], EMAILJS_TEMPLATE_ID);
  assert.deepEqual(capturedArgs[3], { publicKey: EMAILJS_PUBLIC_KEY });
  const sentParams = capturedArgs[2] as Record<string, string>;
  assert.equal(sentParams.severity_score, '8');
  assert.equal(sentParams.landmarks, 'MG Road Bus Stop');
});

test('sendOfficerAlertEmail catches errors gracefully and returns skipped without throwing', async () => {
  const validTicket = normalizeTriagePayload({
    is_valid_civic_issue: true,
    department: 'Water Supply & Drainage (KWA)',
    severity_score: 7,
  });

  const status = await sendOfficerAlertEmail(validTicket, async () => {
    throw new Error('Network error / invalid public key');
  });

  assert.equal(status, 'skipped');
});
