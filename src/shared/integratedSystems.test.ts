import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyTicketCorroboration,
  computeDashboardAnalytics,
  findDuplicateTicketMatch,
  normalizeTriagePayload,
  type StoredTicket,
} from './triageSchema.ts';
import {
  generatePoliceCaseRefId,
  normalizePoliceTriagePayload,
} from './policeSchema.ts';
import { evaluateCorridorHazards } from './corridorHazardMatcher.ts';
import { buildDemoScenarioBundle } from './demoScenarioData.ts';
import {
  sendPoliceCaseAlertEmail,
  sendRepairResolutionEmail,
} from '../utils/emailAlert.ts';

test('duplicate report clustering matches open same-department ticket & boosts severity capped at 10', () => {
  const baseTicket: StoredTicket = {
    id: 'KSM-20261125-1001',
    createdAt: '2026-11-25T05:00:00.000Z',
    workflowStatus: 'Triaged',
    imageUrl: 'data:image/jpeg;base64,test',
    imageName: 'wire.jpg',
    citizenDescription: 'Snapped live KSEB wire near Ranni bus stand',
    localBodyHint: 'Pathanamthitta — Ranni Ward 4',
    corroborationCount: 1,
    triage: normalizeTriagePayload({
      is_valid_civic_issue: true,
      department: 'Electrical & Streetlights (KSEB)',
      issue_category: 'Snapped Overhead Cable',
      severity_score: 9,
      severity_reasoning: 'Live wire across carriageway.',
      ticket_title: 'Snapped Overhead KSEB Cable at Ranni Bus Stand',
      formal_summary: 'Exposed live cable hanging near Ranni Bus Stand.',
      extracted_landmarks: ['Ranni Bus Stand', 'Pathanamthitta'],
      recommended_action: 'Isolate feeder immediately.',
      detected_language: 'English',
      location_clues: 'Ranni Bus Stand, Pathanamthitta',
      visual_verification_note: 'Confirmed visually.',
      exaggeration_or_mismatch: false,
    }),
  };

  const incoming = normalizeTriagePayload({
    is_valid_civic_issue: true,
    department: 'Electrical & Streetlights (KSEB)',
    issue_category: 'Hanging Live Wire',
    severity_score: 8,
    severity_reasoning: 'Hanging wire near Ranni junction.',
    ticket_title: 'Hanging Electric Wire near Ranni Bus Stand',
    formal_summary: 'Another citizen reported the same live cable.',
    extracted_landmarks: ['Ranni Bus Stand'],
    recommended_action: 'Dispatch KSEB crew.',
    detected_language: 'Manglish',
    location_clues: 'Ranni Bus Stand',
    visual_verification_note: 'Confirmed.',
    exaggeration_or_mismatch: false,
  });

  const matched = findDuplicateTicketMatch([baseTicket], incoming, 'Ranni', 'live wire');
  assert.ok(matched, 'Should match existing open KSEB ticket at Ranni Bus Stand');
  assert.equal(matched.id, baseTicket.id);

  const boostedOnce = applyTicketCorroboration(matched);
  assert.equal(boostedOnce.corroborationCount, 2);
  assert.equal(boostedOnce.triage.severity_score, 10);
  assert.equal(boostedOnce.wasCorroborationBoosted, true);

  const boostedTwice = applyTicketCorroboration(boostedOnce);
  assert.equal(boostedTwice.corroborationCount, 3);
  assert.equal(boostedTwice.triage.severity_score, 10, 'Severity must remain capped at 10');
});

test('police case ref ID format and payload normalization work accurately', () => {
  const refId = generatePoliceCaseRefId('pathanamthitta', new Date('2026-11-25'), 42);
  assert.equal(refId, 'KL-PTA-2026-0042');

  const normalized = normalizePoliceTriagePayload(
    {
      is_emergency_life_threat: true,
      case_category: 'traffic accident blocking highway',
      priority_level: 'Standard',
      formal_petition_summary: 'Overturned truck blocking NH-766.',
    },
    'wayanad'
  );
  assert.equal(normalized.is_emergency_life_threat, true);
  assert.equal(normalized.case_category, 'Traffic & Road Obstruction');
  assert.equal(normalized.priority_level, 'Critical / Immediate');
  assert.ok(normalized.jurisdictional_station.includes('Kalpetta'));
  assert.ok(normalized.required_documents_checklist.length >= 3);
});

test('demo scenario bundle populates 4 tickets, 2 police cases, 1 booked PNR and triggers corridor hazard alerts', () => {
  const bundle = buildDemoScenarioBundle();
  assert.equal(bundle.tickets.length, 4);
  assert.equal(bundle.policeCases.length, 2);
  assert.equal(bundle.bookedTickets.length, 1);
  assert.equal(bundle.travelOriginId, 'pathanamthitta');
  assert.equal(bundle.travelDestinationId, 'wayanad');

  const analytics = computeDashboardAnalytics(bundle.tickets);
  assert.equal(analytics.totalValidTickets, 4);
  assert.equal(analytics.resolvedCount, 1);
  assert.equal(analytics.totalActiveHazards, 3);
  assert.equal(analytics.resolutionRatePercent, 25);

  const report = evaluateCorridorHazards(
    bundle.tickets,
    bundle.policeCases,
    bundle.travelOriginId,
    bundle.travelDestinationId
  );
  assert.ok(
    report.routeHazards.length >= 2,
    'Pathanamthitta -> Wayanad corridor should flag active civic and police hazards'
  );
  assert.ok(report.districtHazardsMap['wayanad']?.length, 'Wayanad must have 3D map hazard markers');
  assert.ok(report.alternateFeederAdvice?.includes('Nilambur Road'));
});

test('EmailJS repair resolution and police alert helpers handle success and failure safely', async () => {
  const bundle = buildDemoScenarioBundle();
  let calls = 0;
  const mockOk = async () => {
    calls += 1;
    return { status: 200 };
  };
  const mockFail = async () => {
    throw new Error('Network unreachable');
  };

  const repairOk = await sendRepairResolutionEmail(bundle.tickets[0], 'Asphalt restored', mockOk);
  assert.equal(repairOk, 'sent');
  assert.equal(calls, 1);

  const repairFail = await sendRepairResolutionEmail(bundle.tickets[0], 'Asphalt restored', mockFail);
  assert.equal(repairFail, 'skipped');

  // High/Critical police case sends email; Standard case returns not_applicable
  const highCase = bundle.policeCases.find((c) => c.triage.priority_level === 'Critical / Immediate');
  const stdCase = bundle.policeCases.find((c) => c.triage.priority_level === 'Standard');
  assert.ok(highCase && stdCase);

  assert.equal(await sendPoliceCaseAlertEmail(highCase, mockOk), 'sent');
  assert.equal(await sendPoliceCaseAlertEmail(stdCase, mockOk), 'not_applicable');
  assert.equal(await sendPoliceCaseAlertEmail(highCase, mockFail), 'skipped');
});
