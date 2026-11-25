import type { StoredTicket } from '../shared/triageSchema';

export interface SampleScenario {
  id: string;
  label: string;
  languageTag: string;
  ruleFocus: string;
  imageUrl: string;
  imageName: string;
  localBodyHint: string;
  description: string;
}

export const SAMPLE_SCENARIOS: SampleScenario[] = [
  {
    id: 'kseb-live-wire',
    label: 'Snapped Power Cable',
    languageTag: 'Manglish',
    ruleFocus: 'Critical KSEB Routing',
    imageUrl: '/src/assets/images/civic_live_wire_1795569144900.jpg',
    imageName: 'anil_bakery_live_wire.jpg',
    localBodyHint: 'Aluva Municipality — Ward 14 (Near Anil Bakery)',
    description:
      'Anil Bakery-ude munnile KSEB post-il ninnu wire potti road-il kidakkunnu. Mazha peythu road nananju kidakkukayanu, aalkkarkku shock adikkaan chance undu. Vegam vannu sheri aakku!',
  },
  {
    id: 'pwd-pothole',
    label: 'Main Road Pothole',
    languageTag: 'Malayalam',
    ruleFocus: 'Malayalam to K-SMART Translation',
    imageUrl: '/src/assets/images/civic_road_pothole_1795569135619.jpg',
    imageName: 'mg_road_pothole.jpg',
    localBodyHint: 'Kochi Corporation — Ward 28 (Near Kerala Bakery)',
    description:
      'കേരള ബേക്കറിക്ക് മുന്നിലുള്ള മെയിൻ റോഡിൽ വലിയ കുഴി രൂപപ്പെട്ടിട്ടുണ്ട്. വെള്ളം കെട്ടിനിൽക്കുന്നതിനാൽ ഇരുചക്ര വാഹനങ്ങൾ കുഴിയിൽ വീഴുന്നു. അടിയന്തരമായി നന്നാക്കണം.',
  },
  {
    id: 'puddle-exaggeration',
    label: 'Small Curb Puddle',
    languageTag: 'English',
    ruleFocus: 'Exaggeration Cross-Check',
    imageUrl: '/src/assets/images/civic_small_puddle_1795569135284.jpg',
    imageName: 'ward09_curb_puddle.jpg',
    localBodyHint: 'Kozhikode Corporation — Ward 9',
    description:
      'MASSIVE FLOOD!! The entire main road is completely submerged underwater, vehicles cannot pass and houses are about to drown! Send emergency rescue immediately!!',
  },
  {
    id: 'waste-overflow',
    label: 'Overflowing Waste Bin',
    languageTag: 'Manglish',
    ruleFocus: 'Sanitation & Drain Risk',
    imageUrl: '/src/assets/images/civic_waste_pile_1795569134749.jpg',
    imageName: 'ward19_waste_bin.jpg',
    localBodyHint: 'Thrissur Corporation — Ward 19 (Near Primary Health Centre)',
    description:
      'Health centre gate-inte aduthulla municipal waste bin niranjhu kavinju road-ilum drain-ilum waste kidakkunnu. Stray dogs okke undu, bhayankara naattam aanu.',
  },
  {
    id: 'spam-indoor-mug',
    label: 'Indoor Coffee Mug',
    languageTag: 'English',
    ruleFocus: 'Spam Guardrail Rejection',
    imageUrl: '/src/assets/images/spam_coffee_mug_1795569135365.jpg',
    imageName: 'desk_coffee_photo.jpg',
    localBodyHint: 'Kottayam Municipality — Ward 7',
    description:
      'Urgent civic complaint please fix this problem immediately in our ward.',
  },
];

export const INITIAL_SEED_TICKETS: StoredTicket[] = [
  {
    id: 'KSM-20261124-1042',
    createdAt: '2026-11-24T09:18:00.000Z',
    workflowStatus: 'Triaged',
    emailAlertStatus: 'sent',
    imageUrl: '/src/assets/images/civic_live_wire_1795569144900.jpg',
    imageName: 'anil_bakery_live_wire.jpg',
    citizenDescription:
      'Anil Bakery-ude munnile KSEB post-il ninnu wire potti road-il kidakkunnu. Mazha peythu road nananju kidakkukayanu, vegam vannu sheri aakku!',
    localBodyHint: 'Aluva Municipality — Ward 14 (Near Anil Bakery)',
    triage: {
      is_valid_civic_issue: true,
      rejection_reason: null,
      department: 'Electrical & Streetlights (KSEB)',
      issue_category: 'Snapped Overhead Electrical Cable',
      severity_score: 10,
      severity_level: 'Critical',
      recommended_sla: 'Immediate (0–4 hours)',
      severity_reasoning:
        'A snapped overhead electrical cable with frayed conductors is hanging down onto a wet public carriageway adjacent to pedestrians and moving two-wheelers, creating an immediate electrocution hazard.',
      ticket_title: 'Snapped Overhead Electrical Wire Hanging onto Wet Carriageway Near Anil Bakery',
      formal_summary:
        'A citizen report from Aluva Municipality Ward 14 near Anil Bakery indicates that an overhead electrical cable has detached from a roadside concrete utility pole and is resting across a wet public road lane. Immediate isolation of power supply and emergency line restoration by KSEB personnel is required to prevent electrocution and vehicular entanglement.',
      extracted_landmarks: ['Anil Bakery', 'Aluva Municipality Ward 14'],
      recommended_action:
        'Isolate feeder power supply immediately, cordon off the wet carriageway near Anil Bakery, and dispatch KSEB emergency line restoration crew.',
      detected_language: 'Manglish',
      location_clues: 'Aluva Municipality — Ward 14, opposite Anil Bakery',
      visual_verification_note:
        'Photographic evidence fully corroborates the report, showing a detached black overhead cable suspended from a weathered concrete pole down onto a wet paved road with active pedestrian and motorist traffic.',
      exaggeration_or_mismatch: false,
    },
  },
  {
    id: 'KSM-20261124-1038',
    createdAt: '2026-11-24T08:42:00.000Z',
    workflowStatus: 'Dispatched',
    emailAlertStatus: 'sent',
    imageUrl: '/src/assets/images/civic_road_pothole_1795569135619.jpg',
    imageName: 'mg_road_pothole.jpg',
    citizenDescription:
      'കേരള ബേക്കറിക്ക് മുന്നിലുള്ള മെയിൻ റോഡിൽ വലിയ കുഴി രൂപപ്പെട്ടിട്ടുണ്ട്. ഇരുചക്ര വാഹനങ്ങൾ വീഴുന്നു.',
    localBodyHint: 'Kochi Corporation — Ward 28 (Near Kerala Bakery)',
    triage: {
      is_valid_civic_issue: true,
      rejection_reason: null,
      department: 'Public Works & Roads (PWD)',
      issue_category: 'Severe Carriageway Pothole',
      severity_score: 8,
      severity_level: 'High',
      recommended_sla: 'Priority (24–48 hours)',
      severity_reasoning:
        'A wide, deep, jagged pothole with loose aggregate and standing water occupies the active curbside lane of a busy commercial road used by buses and two-wheelers.',
      ticket_title: 'Large Water-Filled Carriageway Pothole Near Kerala Bakery, Ward 28',
      formal_summary:
        'Significant asphalt surface failure has formed a deep, jagged pothole along the main commercial road opposite Kerala Bakery in Kochi Corporation Ward 28. Water accumulation obscures the depth of the cavity, posing a high accident risk to two-wheelers and commuter traffic; priority bituminous patching by PWD is requested.',
      extracted_landmarks: ['Kerala Bakery', 'Kochi Corporation Ward 28 Main Road'],
      recommended_action:
        'Place reflective hazard cones around the cavity and schedule priority bituminous resurfacing within 24–48 hours.',
      detected_language: 'Malayalam',
      location_clues: 'Kochi Corporation — Ward 28, in front of Kerala Bakery',
      visual_verification_note:
        'Visual evidence confirms a deep, deteriorated asphalt cavity with exposed gravel directly in the path of oncoming two-wheelers and public transport.',
      exaggeration_or_mismatch: false,
    },
  },
  {
    id: 'KSM-20261124-1031',
    createdAt: '2026-11-24T07:55:00.000Z',
    workflowStatus: 'Triaged',
    emailAlertStatus: 'sent',
    imageUrl: '/src/assets/images/civic_small_puddle_1795569135284.jpg',
    imageName: 'ward09_curb_puddle.jpg',
    citizenDescription:
      'MASSIVE FLOOD!! The entire main road is completely submerged underwater, vehicles cannot pass and houses are about to drown!',
    localBodyHint: 'Kozhikode Corporation — Ward 9',
    triage: {
      is_valid_civic_issue: true,
      rejection_reason: null,
      department: 'Water Supply & Drainage (KWA)',
      issue_category: 'Minor Roadside Curb Ponding',
      severity_score: 2,
      severity_level: 'Low',
      recommended_sla: 'Scheduled (Within 14 days)',
      severity_reasoning:
        'Only a small, shallow rainwater puddle roughly 30 cm wide is visible along the concrete curb while the entire paved carriageway remains dry and unobstructed.',
      ticket_title: 'Minor Localized Water Ponding Along Roadside Curb in Ward 9',
      formal_summary:
        'A minor localized water accumulation has been observed along the edge of the paved carriageway beside the footpath curb in Kozhikode Corporation Ward 9. Traffic movement is unaffected and no flooding is present; routine inspection of curb camber and roadside drainage clearance is recommended during scheduled maintenance.',
      extracted_landmarks: ['Kozhikode Corporation Ward 9'],
      recommended_action:
        'Include curb drainage outlet check in the routine fortnightly Ward 9 maintenance schedule.',
      detected_language: 'English',
      location_clues: 'Kozhikode Corporation — Ward 9',
      visual_verification_note:
        'Significant exaggeration detected: although the citizen description claims a massive flood submerging the street, the photograph shows a dry, sunlit road with only a small shallow curb puddle.',
      exaggeration_or_mismatch: true,
    },
  },
  {
    id: 'KSM-20261124-1024',
    createdAt: '2026-11-24T07:10:00.000Z',
    workflowStatus: 'Rejected',
    emailAlertStatus: 'not_applicable',
    imageUrl: '/src/assets/images/spam_coffee_mug_1795569135365.jpg',
    imageName: 'desk_coffee_photo.jpg',
    citizenDescription: 'Urgent civic complaint please fix this problem immediately in our ward.',
    localBodyHint: 'Kottayam Municipality — Ward 7',
    triage: {
      is_valid_civic_issue: false,
      rejection_reason:
        'The uploaded photograph depicts an indoor wooden desk with a ceramic coffee mug and notebook inside a private residence, unrelated to public civic infrastructure.',
      department: 'Invalid / Other',
      issue_category: 'Non-Civic Indoor Photograph',
      severity_score: 0,
      severity_level: 'Rejected',
      recommended_sla: 'N/A',
      severity_reasoning:
        'No public infrastructure defect, safety hazard, or municipal asset is present in the submitted indoor photograph.',
      ticket_title: 'Rejected Submission — Unrelated Indoor Photograph',
      formal_summary:
        'This submission was rejected during automated civic triage because the attached photograph depicts private indoor household items rather than a public municipal infrastructure issue.',
      extracted_landmarks: [],
      recommended_action:
        'Reject submission without officer dispatch and log under spam guardrail analytics.',
      detected_language: 'English',
      location_clues: 'Kottayam Municipality — Ward 7',
      visual_verification_note:
        'Visual verification failed: the photo shows a domestic interior table rather than any public road, utility, drain, or sanitation facility.',
      exaggeration_or_mismatch: true,
    },
  },
];
