import type { StoredTicket } from './triageSchema';
import type { StoredPoliceCase } from './policeSchema';
import { getTomorrowIsoDate, UPI_MERCHANT_VPA, type BookedETicket } from './bookingSchema';

export interface DemoScenarioBundle {
  tickets: StoredTicket[];
  policeCases: StoredPoliceCase[];
  bookedTickets: BookedETicket[];
  travelOriginId: string;
  travelDestinationId: string;
}

/**
 * Generates a cohesive presentation-ready Kerala municipal, police, and mobility dataset:
 * - 4 realistic Kerala civic tickets (including Pathanamthitta/Wayanad corridor landslide & waterlogging)
 * - 2 realistic Police e-Complaint records (1 Lost Document GD + 1 Highway Traffic Obstruction)
 * - 1 confirmed QR E-Ticket in My Booked Tickets
 */
export function buildDemoScenarioBundle(): DemoScenarioBundle {
  const nowIso = new Date().toISOString();
  const tomorrow = getTomorrowIsoDate();

  const tickets: StoredTicket[] = [
    {
      id: 'KSM-20261125-9012',
      createdAt: nowIso,
      workflowStatus: 'Dispatched',
      emailAlertStatus: 'sent',
      corroborationCount: 4,
      wasCorroborationBoosted: true,
      imageUrl: '/src/assets/images/civic_road_pothole_1795569135619.jpg',
      imageName: 'wayanad_thamarassery_landslide_washout.jpg',
      citizenDescription:
        'Wayanad Thamarassery Ghat NH-766 6th hairpin bend-il heavy rain karanam mudslide-um road shoulder washout-um undayittundu. Pathanamthitta–Wayanad KSRTC buses stuck aanu!',
      localBodyHint: 'Wayanad District — Vythiri Panchayat (NH-766 Thamarassery Ghat)',
      triage: {
        is_valid_civic_issue: true,
        rejection_reason: null,
        department: 'Public Works & Roads (PWD)',
        issue_category: 'Landslide Debris & Severe Road Washout',
        severity_score: 9,
        severity_level: 'Critical',
        recommended_sla: 'Immediate (0–4 hours)',
        severity_reasoning:
          'Active monsoon slope slippage and severe carriageway waterlogging have narrowed the NH-766 ghat corridor into Wayanad, endangering buses and highland commuters.',
        ticket_title:
          'Critical Landslide Washout & Waterlogging on NH-766 Wayanad Ghat Corridor',
        formal_summary:
          'Multiple citizen reports from Vythiri Panchayat along the NH-766 Thamarassery Ghat corridor entering Wayanad confirm heavy road-shoulder erosion, mudslide debris, and deep waterlogging obstructing interstate and Pathanamthitta–Wayanad bus services. Immediate PWD earthmover clearance and KSDMA slope stabilization are required.',
        extracted_landmarks: [
          'NH-766 Thamarassery Ghat 6th Hairpin Bend',
          'Vythiri Panchayat, Wayanad',
        ],
        recommended_action:
          'Deploy PWD JCB earthmovers immediately, coordinate one-way traffic control with Kalpetta Highway Police, and issue alternate feeder advisory via Nilambur / Kuttiady Ghat.',
        detected_language: 'Manglish',
        location_clues: 'Wayanad — Vythiri / NH-766 Thamarassery Ghat Corridor',
        visual_verification_note:
          'Visual evidence confirms severe asphalt failure and deep standing rainwater across the active lane.',
        exaggeration_or_mismatch: false,
        requires_police_escalation: true,
      },
    },
    {
      id: 'KSM-20261125-9008',
      createdAt: nowIso,
      workflowStatus: 'Triaged',
      emailAlertStatus: 'sent',
      corroborationCount: 2,
      imageUrl: '/src/assets/images/civic_live_wire_1795569144900.jpg',
      imageName: 'pathanamthitta_ranni_live_wire.jpg',
      citizenDescription:
        'Pathanamthitta Kozhencherry–Ranni road-il KSEB transformer pole-il ninnu wire potti vellathil kidakkunnu. Urgent-aayi power cut cheyyuka!',
      localBodyHint: 'Pathanamthitta Municipality — Ward 11 (Kozhencherry–Ranni Road)',
      triage: {
        is_valid_civic_issue: true,
        rejection_reason: null,
        department: 'Electrical & Streetlights (KSEB)',
        issue_category: 'Snapped Live Conductor on Flooded Road',
        severity_score: 10,
        severity_level: 'Critical',
        recommended_sla: 'Immediate (0–4 hours)',
        severity_reasoning:
          'An energized overhead distribution wire has snapped onto a wet public carriageway along the Pathanamthitta–Ranni corridor, creating an acute electrocution hazard.',
        ticket_title:
          'Snapped Live KSEB Wire Across Wet Road on Pathanamthitta–Ranni Corridor',
        formal_summary:
          'A critical electrical safety hazard has been verified along the Kozhencherry–Ranni road in Pathanamthitta Ward 11, where a detached overhead power line rests across a rain-soaked road shoulder. Immediate feeder isolation and emergency KSEB restoration are requested.',
        extracted_landmarks: [
          'Kozhencherry–Ranni Road',
          'Pathanamthitta Municipality Ward 11',
        ],
        recommended_action:
          'Trip the Ward 11 feeder immediately via KSEB 1912 control and barricade the carriageway until crew completes restringing.',
        detected_language: 'Manglish',
        location_clues: 'Pathanamthitta — Ward 11, Kozhencherry–Ranni Road',
        visual_verification_note:
          'Photograph clearly confirms a hanging snapped utility cable touching a wet road surface with active traffic nearby.',
        exaggeration_or_mismatch: false,
      },
    },
    {
      id: 'KSM-20261125-9004',
      createdAt: nowIso,
      workflowStatus: 'Dispatched',
      emailAlertStatus: 'sent',
      corroborationCount: 3,
      imageUrl: '/src/assets/images/civic_waste_pile_1795569134749.jpg',
      imageName: 'thrissur_phc_waste_overflow.jpg',
      citizenDescription:
        'Thrissur Primary Health Centre gate-inte aduthu waste bin niranjhu drain block aayittundu. Mazha vellam kettu nikkunnu.',
      localBodyHint: 'Thrissur Corporation — Ward 19 (Near Primary Health Centre)',
      triage: {
        is_valid_civic_issue: true,
        rejection_reason: null,
        department: 'Waste & Sanitation',
        issue_category: 'Overflowing Municipal Bin & Blocked Stormwater Drain',
        severity_score: 7,
        severity_level: 'High',
        recommended_sla: 'Priority (24–48 hours)',
        severity_reasoning:
          'Uncollected solid waste spilling outside a public health centre entrance is obstructing the adjacent open stormwater drain and attracting stray animals.',
        ticket_title:
          'Overflowing Waste Bin & Blocked Drain Outside Thrissur Ward 19 Health Centre',
        formal_summary:
          'Solid waste has overflowed around the municipal collection point near the Primary Health Centre in Thrissur Corporation Ward 19, blocking stormwater flow and creating a public health risk. Priority Haritha Karma Sena / sanitation truck clearance is advised.',
        extracted_landmarks: ['Primary Health Centre', 'Thrissur Ward 19'],
        recommended_action:
          'Dispatch sanitation compactor truck and desilt the open roadside drain within 24 hours.',
        detected_language: 'Manglish',
        location_clues: 'Thrissur Corporation — Ward 19, Primary Health Centre',
        visual_verification_note:
          'Photo verifies significant refuse overflow encroaching onto the road edge and storm gutter.',
        exaggeration_or_mismatch: false,
      },
    },
    {
      id: 'KSM-20261125-8996',
      createdAt: nowIso,
      workflowStatus: 'Resolved',
      emailAlertStatus: 'sent',
      corroborationCount: 1,
      imageUrl: '/src/assets/images/civic_small_puddle_1795569135284.jpg',
      imageName: 'kochi_ward28_repaired_curb.jpg',
      citizenDescription:
        'Kochi MG Road side drain inlet was choked causing minor waterlogging near the bus bay.',
      localBodyHint: 'Ernakulam — Kochi Corporation Ward 28',
      triage: {
        is_valid_civic_issue: true,
        rejection_reason: null,
        department: 'Water Supply & Drainage (KWA)',
        issue_category: 'Choked Roadside Stormwater Inlet',
        severity_score: 5,
        severity_level: 'Medium',
        recommended_sla: 'Standard (3–5 days)',
        severity_reasoning:
          'Localized water accumulation near the curb inlet slows pedestrian boarding at the bus bay without blocking main traffic.',
        ticket_title: 'Cleared Stormwater Drain Inlet Near Kochi MG Road Bus Bay',
        formal_summary:
          'A choked stormwater inlet along Kochi Corporation Ward 28 MG Road caused localized curb ponding and has been cleared and verified by field engineers.',
        extracted_landmarks: ['MG Road Bus Bay', 'Kochi Ward 28'],
        recommended_action: 'Completed desilting and verified clear drainage flow.',
        detected_language: 'English',
        location_clues: 'Ernakulam — Kochi Corporation Ward 28',
        visual_verification_note:
          'Initial photo confirmed minor localized curb ponding.',
        exaggeration_or_mismatch: false,
      },
      repairVerification: {
        verifiedAt: nowIso,
        afterImageUrl: '/src/assets/images/civic_small_puddle_1795569135284.jpg',
        isResolved: true,
        verificationNote:
          'Gemini Repair Verification confirmed silt and debris cleared from curb grating with normal surface runoff restored.',
        emailStatus: 'sent',
      },
    },
  ];

  const policeCases: StoredPoliceCase[] = [
    {
      id: 'pol-demo-1',
      caseRefId: 'KL-WND-2026-8492',
      createdAt: nowIso,
      districtId: 'wayanad',
      districtName: 'Wayanad',
      incidentDateTime: `${nowIso.slice(0, 16)}`,
      description:
        'Overturned timber transport lorry near NH-766 Thamarassery–Vythiri Ghat viewpoint blocking both lanes amid heavy fog; urgent Highway Police crane and traffic diversion needed.',
      evidenceImageUrl: '/src/assets/images/civic_road_pothole_1795569135619.jpg',
      evidenceFileName: 'nh766_ghat_obstruction.jpg',
      status: 'Assigned to SHO / Beat Officer',
      disposalRemarks:
        'Highway Patrol Unit-4 & recovery crane dispatched from Kalpetta; temporary single-lane regulation active.',
      emailAlertStatus: 'sent',
      triage: {
        is_emergency_life_threat: true,
        case_category: 'Traffic & Road Obstruction',
        recommended_unit: 'Traffic Enforcement Wing & Highway Patrol (NH-766)',
        jurisdictional_station: 'Vythiri / Kalpetta Police Station',
        priority_level: 'Critical / Immediate',
        formal_petition_summary:
          'An emergency traffic obstruction report has been filed regarding an overturned timber lorry near the NH-766 Thamarassery–Vythiri Ghat viewpoint in Wayanad, blocking bidirectional movement in low-visibility fog. Immediate Highway Patrol deployment, crane recovery, and diversion advisories for Wayanad-bound commuters are requested.',
        required_documents_checklist: [
          'Exact GPS / km stone location on NH-766 Ghat section',
          'Vehicle registration number if safely visible from a distance',
          'Caller mobile number for Highway Patrol coordination',
        ],
        actionable_legal_guidance:
          'Dial 112 (ERSS) immediately for on-scene emergency rescue and highway recovery; stay clear of blind ghat curves and switch on hazard indicators.',
      },
    },
    {
      id: 'pol-demo-2',
      caseRefId: 'KL-PTA-2026-8415',
      createdAt: nowIso,
      districtId: 'pathanamthitta',
      districtName: 'Pathanamthitta',
      incidentDateTime: `${nowIso.slice(0, 16)}`,
      description:
        'Lost my brown leather wallet containing Indian Driving Licence (KL-03) and original Aadhaar card while boarding a KSRTC Super Fast bus at Pathanamthitta KSRTC Bus Stand around 08:30 AM.',
      status: 'Submitted',
      disposalRemarks: '',
      emailAlertStatus: 'not_applicable',
      triage: {
        is_emergency_life_threat: false,
        case_category: 'Lost Property / Document GD',
        recommended_unit: 'Janamaithri Beat Desk & General Diary (GD) Cell',
        jurisdictional_station: 'Pathanamthitta Police Station',
        priority_level: 'Standard',
        formal_petition_summary:
          'The petitioner reports the accidental loss of a brown leather wallet containing an original Kerala Driving Licence (KL-03 series) and Aadhaar card at the Pathanamthitta KSRTC Bus Stand during morning boarding. A General Diary (GD) abstract / Non-Traceable acknowledgement is requested to facilitate duplicate document re-issuance.',
        required_documents_checklist: [
          'Copy or number of lost Driving Licence / Aadhaar (if available)',
          'KSRTC bus ticket or approximate departure timing',
          'Alternate Photo ID proof for GD verification on Kerala Police THUNA',
        ],
        actionable_legal_guidance:
          'Use this Case Reference ID to download your Lost Document Acknowledgement on the Kerala Police THUNA portal (thuna.keralapolice.gov.in) and apply for duplicate DL via Parivahan Sarathi.',
      },
    },
  ];

  const bookedTickets: BookedETicket[] = [
    {
      id: 'tkt-demo-1',
      pnr: '4829104756',
      bookingRef: 'KSM704921',
      channel: 'irctc',
      from: 'Chengannur (CNGR) — Pathanamthitta Railhead',
      to: 'Kozhikode (CLT) — Wayanad Feeder Hub',
      operatorOrLine: '16649 Parasuram / Malabar Express (IRCTC)',
      classOrTier: '3A',
      seatAssignment: 'B1-18 Lower',
      travelDate: tomorrow,
      passengerName: 'Arjit Anil',
      passengerAge: 26,
      passengerCount: 1,
      actualFareInr: 685,
      paidAmountInr: 1,
      isDemoFare: true,
      utrNumber: '632918472910',
      upiVpa: UPI_MERCHANT_VPA,
      issuedAt: nowIso,
      status: 'CONFIRMED',
    },
  ];

  return {
    tickets,
    policeCases,
    bookedTickets,
    travelOriginId: 'pathanamthitta',
    travelDestinationId: 'wayanad',
  };
}
