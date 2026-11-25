import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStrictJsonOutput,
  computeQueueMetrics,
  filterTickets,
  generateTicketId,
  getRecommendedSla,
  getSeverityBand,
  normalizeTriagePayload,
  resolveMunicipalDepartment,
  type StoredTicket,
} from './triageSchema';

test('Rule 1: Spam guardrail forces severity 0, Rejected level, and Invalid / Other department', () => {
  const normalized = normalizeTriagePayload({
    is_valid_civic_issue: false,
    rejection_reason: 'Photo shows an indoor desk and coffee mug rather than public infrastructure.',
    department: 'Public Works & Roads (PWD)',
    severity_score: 8,
    severity_reasoning: 'Indoor object.',
    formal_summary: 'Rejected.',
  });

  assert.equal(normalized.is_valid_civic_issue, false);
  assert.equal(normalized.severity_score, 0);
  assert.equal(normalized.severity_level, 'Rejected');
  assert.equal(normalized.department, 'Invalid / Other');
  assert.equal(normalized.recommended_sla, 'N/A');
  assert.match(normalized.rejection_reason ?? '', /indoor desk/i);
});

test('Rule 3: Department routing strictly maps known departments and aliases', () => {
  assert.equal(
    resolveMunicipalDepartment('Electrical & Streetlights (KSEB)', true),
    'Electrical & Streetlights (KSEB)'
  );
  assert.equal(
    resolveMunicipalDepartment('Water Supply & Drainage (KWA)', true),
    'Water Supply & Drainage (KWA)'
  );
  assert.equal(
    resolveMunicipalDepartment('kseb broken pole', true),
    'Electrical & Streetlights (KSEB)'
  );
  assert.equal(
    resolveMunicipalDepartment('Public Works & Roads (PWD)', false),
    'Invalid / Other'
  );
});

test('Rule 4: Severity bands and SLAs map accurately across 0-10 scale', () => {
  assert.equal(getSeverityBand(10, true), 'Critical');
  assert.equal(getSeverityBand(9, true), 'Critical');
  assert.equal(getSeverityBand(8, true), 'High');
  assert.equal(getSeverityBand(7, true), 'High');
  assert.equal(getSeverityBand(5, true), 'Medium');
  assert.equal(getSeverityBand(2, true), 'Low');
  assert.equal(getSeverityBand(0, false), 'Rejected');

  assert.equal(getRecommendedSla('Critical'), 'Immediate (0–4 hours)');
  assert.equal(getRecommendedSla('High'), 'Priority (24–48 hours)');
  assert.equal(getRecommendedSla('Medium'), 'Standard (Within 7 days)');
  assert.equal(getRecommendedSla('Low'), 'Scheduled (Within 14 days)');
});

test('Rule 4 & Rule 7: Valid payload clamps out-of-range scores and serializes to clean JSON without markdown fences', () => {
  const normalized = normalizeTriagePayload({
    is_valid_civic_issue: true,
    rejection_reason: 'ignored when valid',
    department: 'Public Works & Roads (PWD)',
    issue_category: 'Road Pothole',
    severity_score: 14,
    severity_reasoning: 'A deep water-filled pothole spans the main traffic lane near the curb.',
    ticket_title: 'Deep Road Pothole on MG Road',
    formal_summary: 'A large pothole near the MG Road bus stop poses an immediate hazard to two-wheelers.',
    detected_language: 'Malayalam',
    location_clues: 'MG Road Bus Stop',
    visual_verification_note: 'Visual inspection confirms severe carriageway damage matching citizen report.',
    exaggeration_or_mismatch: false,
  });

  assert.equal(normalized.severity_score, 10);
  assert.equal(normalized.severity_level, 'Critical');
  assert.equal(normalized.rejection_reason, null);

  const json = buildStrictJsonOutput(normalized);
  assert.equal(json.startsWith('{'), true);
  assert.equal(json.includes('```'), false);
  const parsed = JSON.parse(json);
  assert.equal(parsed.department, 'Public Works & Roads (PWD)');
  assert.equal(parsed.severity_score, 10);
});

test('Queue filtering and metrics compute accurate counts across departments and statuses', () => {
  const sampleTickets: StoredTicket[] = [
    {
      id: generateTicketId(new Date('2026-11-24T10:00:00Z'), 1),
      createdAt: '2026-11-24T10:00:00Z',
      workflowStatus: 'Triaged',
      imageUrl: '/img1.jpg',
      imageName: 'wire.jpg',
      citizenDescription: 'KSEB wire potti kidakkunnu',
      localBodyHint: 'Kochi Corporation',
      triage: normalizeTriagePayload({
        is_valid_civic_issue: true,
        department: 'Electrical & Streetlights (KSEB)',
        severity_score: 10,
        ticket_title: 'Snapped Overhead Cable',
        formal_summary: 'Snapped power cable hanging over wet carriageway.',
      }),
    },
    {
      id: generateTicketId(new Date('2026-11-24T11:00:00Z'), 2),
      createdAt: '2026-11-24T11:00:00Z',
      workflowStatus: 'Dispatched',
      imageUrl: '/img2.jpg',
      imageName: 'pothole.jpg',
      citizenDescription: 'എം.ജി റോഡിൽ വലിയ കുഴി',
      localBodyHint: 'Thrissur Corporation',
      triage: normalizeTriagePayload({
        is_valid_civic_issue: true,
        department: 'Public Works & Roads (PWD)',
        severity_score: 8,
        ticket_title: 'Major Pothole Near Bus Stop',
        formal_summary: 'Deep pothole near bus stop.',
      }),
    },
    {
      id: generateTicketId(new Date('2026-11-24T12:00:00Z'), 3),
      createdAt: '2026-11-24T12:00:00Z',
      workflowStatus: 'Rejected',
      imageUrl: '/img3.jpg',
      imageName: 'mug.jpg',
      citizenDescription: 'Fix urgently',
      localBodyHint: 'Ward 12',
      triage: normalizeTriagePayload({
        is_valid_civic_issue: false,
        rejection_reason: 'Indoor coffee mug.',
      }),
    },
  ];

  const metrics = computeQueueMetrics(sampleTickets);
  assert.equal(metrics.total, 3);
  assert.equal(metrics.criticalAndHigh, 2);
  assert.equal(metrics.pendingDispatch, 1);
  assert.equal(metrics.spamRejected, 1);
  assert.equal(metrics.byDepartment['Electrical & Streetlights (KSEB)'], 1);
  assert.equal(metrics.byDepartment['Public Works & Roads (PWD)'], 1);
  assert.equal(metrics.byDepartment['Invalid / Other'], 1);

  const pwdOnly = filterTickets(sampleTickets, {
    query: '',
    department: 'Public Works & Roads (PWD)',
    status: 'ALL',
  });
  assert.equal(pwdOnly.length, 1);
  assert.equal(pwdOnly[0].id, 'KSM-20261124-0002');

  const malayalamSearch = filterTickets(sampleTickets, {
    query: 'കുഴി',
    department: 'ALL',
    status: 'ALL',
  });
  assert.equal(malayalamSearch.length, 1);
  assert.equal(malayalamSearch[0].triage.department, 'Public Works & Roads (PWD)');
});
