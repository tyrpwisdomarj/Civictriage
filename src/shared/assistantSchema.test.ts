import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSISTANT_QUICK_PROMPTS,
  buildSessionContextBlock,
  normalizeAssistantResponse,
} from './assistantSchema.ts';

test('ASSISTANT_QUICK_PROMPTS contains the 4 expected one-click prompts', () => {
  assert.equal(ASSISTANT_QUICK_PROMPTS.length, 4);
  assert.equal(
    ASSISTANT_QUICK_PROMPTS[0],
    'How do I report a pothole or wire hazard?'
  );
  assert.equal(
    ASSISTANT_QUICK_PROMPTS[1],
    'Best route from Pathanamthitta to Wayanad?'
  );
  assert.equal(
    ASSISTANT_QUICK_PROMPTS[2],
    'Check my active tickets & booked PNRs'
  );
  assert.equal(
    ASSISTANT_QUICK_PROMPTS[3],
    'How does the UPI QR (₹1 demo) payment work?'
  );
});

test('buildSessionContextBlock serializes civic tickets, booked PNRs, and origin/destination', () => {
  const block = buildSessionContextBlock({
    activeTab: 'Travel & 3D Explorer',
    travelOriginName: 'Pathanamthitta',
    travelDestinationName: 'Wayanad',
    tickets: [
      {
        id: 'LSG-2026-101',
        title: 'Live Hanging Wire Near Junction',
        department: 'Electrical & Streetlights (KSEB)',
        severityScore: 9,
        urgencyLevel: 'Critical',
        workflowStatus: 'Dispatched',
        isValid: true,
      },
    ],
    bookedTickets: [
      {
        pnr: '4812093412',
        channel: 'irctc',
        from: 'Chengannur (CNGR)',
        to: 'Kozhikode (CLT)',
        classOrTier: '3A',
        seatAssignment: 'B2-14 Lower',
        travelDate: '2026-11-26',
        paidAmountInr: 1,
        actualFareInr: 685,
        isDemoFare: true,
      },
    ],
  });

  assert.match(block, /Origin = Pathanamthitta, Destination = Wayanad/);
  assert.match(block, /LSG-2026-101/);
  assert.match(block, /Electrical & Streetlights \(KSEB\)/);
  assert.match(block, /Severity 9\/10 \(Critical\)/);
  assert.match(block, /PNR 4812093412 \(IRCTC\)/);
  assert.match(block, /B2-14 Lower/);
  assert.match(block, /₹1 demo paid \(fare ₹685\)/);
});

test('buildSessionContextBlock handles empty session cleanly', () => {
  const block = buildSessionContextBlock(null);
  assert.match(block, /Submitted Civic Tickets: None/);
  assert.match(block, /Confirmed Travel Bookings: None/);
});

test('normalizeAssistantResponse deduplicates valid actions and strips inline bracket labels', () => {
  const res = normalizeAssistantResponse({
    reply:
      'Upload a clear photo in Citizen Report to trigger KSEB dispatch. [Go to Citizen Report] ',
    actions: ['citizen_report', 'citizen_report', 'invalid_action', 'travel_explorer'],
  });

  assert.equal(
    res.reply,
    'Upload a clear photo in Citizen Report to trigger KSEB dispatch.'
  );
  assert.deepEqual(res.actions, ['citizen_report', 'travel_explorer']);
});
