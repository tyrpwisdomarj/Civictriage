export type LocalLifeTab =
  | 'education'
  | 'jobs'
  | 'healthcare'
  | 'lifestyle'
  | 'weekend'
  | 'events'
  | 'expenses'
  | 'transport';
export type LocalLifeSection = LocalLifeTab;

export type EducationLevel =
  | 'All Levels'
  | 'Schools / Higher Secondary'
  | 'Engineering & Arts Colleges'
  | 'Skill & Coding Bootcamps'
  | 'Scholarships & Exam Alerts';

export type EducationStream =
  | 'All Streams'
  | 'Science & CS'
  | 'Commerce'
  | 'Humanities'
  | 'Skill Dev';

export type LifestyleCategory =
  | 'All Categories'
  | 'Heritage & Handloom'
  | 'Local Cafes & Culinary Trails'
  | 'Fitness, Turf & Calisthenics'
  | 'Events & Festivals';

export type LocalTransportMode =
  | 'All Modes'
  | 'KSRTC Ordinary / Fast Passenger'
  | 'Private Stage Carriage Buses'
  | 'Nearest Rail Feeders [CNGR / TRVL]'
  | 'Auto / EV Feeder Stands';

export interface EducationEntry {
  id: string;
  name: string;
  districtId: string;
  districtName: string;
  level: Exclude<EducationLevel, 'All Levels'>;
  stream: Exclude<EducationStream, 'All Streams'>;
  affiliation: string;
  highlights: string;
  location: string;
  deadlineOrIntake: string;
}

export interface LifestyleEntry {
  id: string;
  name: string;
  districtId: string;
  districtName: string;
  category: Exclude<LifestyleCategory, 'All Categories'>;
  neighborhood: string;
  timing: string;
  priceRange: string;
  description: string;
  signatureTag: string;
}

export interface LocalFeederRoute {
  id: string;
  routeName: string;
  districtId: string;
  districtName: string;
  mode: Exclude<LocalTransportMode, 'All Modes'>;
  fromStop: string;
  toStop: string;
  frequency: string;
  firstLastService: string;
  fareInr: number;
  passFareInr: number;
  operator: string;
  note: string;
}

export const EDUCATION_LEVELS: readonly EducationLevel[] = [
  'All Levels',
  'Schools / Higher Secondary',
  'Engineering & Arts Colleges',
  'Skill & Coding Bootcamps',
  'Scholarships & Exam Alerts',
];

export const EDUCATION_STREAMS: readonly EducationStream[] = [
  'All Streams',
  'Science & CS',
  'Commerce',
  'Humanities',
  'Skill Dev',
];

export const LIFESTYLE_CATEGORIES: readonly LifestyleCategory[] = [
  'All Categories',
  'Heritage & Handloom',
  'Local Cafes & Culinary Trails',
  'Fitness, Turf & Calisthenics',
  'Events & Festivals',
];

export const LOCAL_TRANSPORT_MODES: readonly LocalTransportMode[] = [
  'All Modes',
  'KSRTC Ordinary / Fast Passenger',
  'Private Stage Carriage Buses',
  'Nearest Rail Feeders [CNGR / TRVL]',
  'Auto / EV Feeder Stands',
];

export const EDUCATION_DIRECTORY: EducationEntry[] = [
  {
    id: 'edu-bhavans-pta',
    name: "Bhavan's Vidya Mandir, Pathanamthitta",
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    level: 'Schools / Higher Secondary',
    stream: 'Science & CS',
    affiliation: 'CBSE Senior Secondary · Science, CS & Commerce',
    highlights: 'Robotics & AI tinkering lab, strong JEE/NEET/CUET foundation, district athletics track.',
    location: 'Makkamkunnu, Pathanamthitta',
    deadlineOrIntake: 'Admissions Open · Apr–Jun',
  },
  {
    id: 'edu-cea-adoor',
    name: 'College of Engineering Adoor (IHRD)',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    level: 'Engineering & Arts Colleges',
    stream: 'Science & CS',
    affiliation: 'APJ Abdul Kalam Technological University (KTU)',
    highlights: 'B.Tech CSE, ECE, EEE, Mechanical; IEEE & TinkerHub campus chapter with active placement cell.',
    location: 'Manakala, Adoor, Pathanamthitta',
    deadlineOrIntake: 'KEAM Counselling · Jul–Aug',
  },
  {
    id: 'edu-marthoma-trvl',
    name: 'Mar Thoma College, Thiruvalla',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    level: 'Engineering & Arts Colleges',
    stream: 'Humanities',
    affiliation: 'Mahatma Gandhi University · NAAC A+ Autonomous',
    highlights: 'Renowned UG/PG programmes in Economics, English, Physics, Commerce, and Botanical research.',
    location: 'Kuttapuzha, Thiruvalla',
    deadlineOrIntake: 'CAP MG Univ · May–Jul',
  },
  {
    id: 'edu-asap-pta',
    name: 'ASAP Kerala Community Skill Park, Kunnamthanam',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    level: 'Skill & Coding Bootcamps',
    stream: 'Skill Dev',
    affiliation: 'Govt. of Kerala Higher Education · NSQF Certified',
    highlights: 'Full-Stack Web, AI/ML Foundations, EV Technician, and Cloud DevOps intensive bootcamps.',
    location: 'KINFRA Park, Kunnamthanam, Pathanamthitta',
    deadlineOrIntake: 'Rolling Monthly Batches',
  },
  {
    id: 'edu-saintgits-ktm',
    name: 'Saintgits College of Engineering, Kottayam',
    districtId: 'kottayam',
    districtName: 'Kottayam',
    level: 'Engineering & Arts Colleges',
    stream: 'Science & CS',
    affiliation: 'KTU Autonomous · NBA Accredited',
    highlights: 'Robotics, AI & Data Science labs, startup incubator, and direct feeder buses from Thiruvalla/Pathanamthitta.',
    location: 'Pathamuttom, Kottayam',
    deadlineOrIntake: 'KEAM / Management · Jun–Aug',
  },
  {
    id: 'edu-cet-tvm',
    name: 'College of Engineering Trivandrum (CET)',
    districtId: 'thiruvananthapuram',
    districtName: 'Thiruvananthapuram',
    level: 'Engineering & Arts Colleges',
    stream: 'Science & CS',
    affiliation: 'Govt. of Kerala · KTU Flagship Campus',
    highlights: 'Premier engineering institution in Kerala with strong CS, Architecture, MBA, and research fellowships.',
    location: 'Sreekariyam, Thiruvananthapuram',
    deadlineOrIntake: 'KEAM Top-Rank Intake · Jul',
  },
  {
    id: 'edu-cusat-ekm',
    name: 'CUSAT School of Engineering & TinkerHub',
    districtId: 'ernakulam',
    districtName: 'Ernakulam',
    level: 'Engineering & Arts Colleges',
    stream: 'Science & CS',
    affiliation: 'Cochin University of Science & Technology',
    highlights: 'CUSAT CAT national intake, naval architecture, photonics, and Kochi startup ecosystem access.',
    location: 'Kalamassery, Kochi',
    deadlineOrIntake: 'CUSAT CAT · Feb–May',
  },
  {
    id: 'edu-nit-kkd',
    name: 'NIT Calicut & Digital Makerspace',
    districtId: 'kozhikode',
    districtName: 'Kozhikode',
    level: 'Engineering & Arts Colleges',
    stream: 'Science & CS',
    affiliation: 'Institute of National Importance · JoSAA',
    highlights: 'National-rank B.Tech/M.Tech programmes, Tathva techfest, and Technology Business Incubator.',
    location: 'Chathamangalam, Kozhikode',
    deadlineOrIntake: 'JEE Main / JoSAA · Jun',
  },
  {
    id: 'edu-egrantz-alert',
    name: 'Kerala e-Grantz, KEAM & Pratibha Scholarship Desk',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    level: 'Scholarships & Exam Alerts',
    stream: 'Commerce',
    affiliation: 'Govt. of Kerala DCE / KSCSTE Scholarships',
    highlights: 'Consolidated alerts for Post-Matric e-Grantz, CH Muhammed Koya, Pratibha Science & KEAM fee waivers.',
    location: 'Statewide Online Portal + LSG Akshaya Centres',
    deadlineOrIntake: 'Portal Renewal Window Active',
  },
  {
    id: 'edu-gec-wnd',
    name: 'Government Engineering College Wayanad',
    districtId: 'wayanad',
    districtName: 'Wayanad',
    level: 'Engineering & Arts Colleges',
    stream: 'Science & CS',
    affiliation: 'Govt. of Kerala · KTU',
    highlights: 'Highland residential campus offering CSE, ECE, EEE & ME with strong FOSS & open-source community.',
    location: 'Thalappuzha, Mananthavady, Wayanad',
    deadlineOrIntake: 'KEAM State Quota · Jul',
  },
];

export const LIFESTYLE_DIRECTORY: LifestyleEntry[] = [
  {
    id: 'life-aranmula-heritage',
    name: 'Aranmula Heritage Village & Metal Mirror Guild',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    category: 'Heritage & Handloom',
    neighborhood: 'Aranmula, Pamba Riverbank',
    timing: '09:00 AM – 06:00 PM Daily',
    priceRange: 'Free Walk · GI Craft Studios ₹1,200+',
    description:
      'Explore GI-tagged Aranmula Kannadi bell-metal mirror ateliers, Vijnana Kalavedi Kathakali/mural studios, and traditional Kasavu Set-Mundu handloom weavers.',
    signatureTag: 'GI Heritage & Set-Mundu',
  },
  {
    id: 'life-pta-coffee-trail',
    name: 'Thiruvalla–Kozhencherry Specialty Coffee & Naadan Trail',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    category: 'Local Cafes & Culinary Trails',
    neighborhood: 'MC Road Thiruvalla & Kozhencherry',
    timing: '08:00 AM – 10:30 PM',
    priceRange: '₹180 – ₹550 per person',
    description:
      'Single-estate Wayanad/Idukki pour-over coffee bars paired with classic Central Travancore appam, duck roast, and kappa-meen curry kitchens.',
    signatureTag: 'Craft Coffee & Travancore Cuisine',
  },
  {
    id: 'life-pta-turf-calisthenics',
    name: 'Pamba Arena Football Turf & Calisthenics Park',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    category: 'Fitness, Turf & Calisthenics',
    neighborhood: 'Ring Road Pathanamthitta & Adoor',
    timing: '05:30 AM – 11:00 PM',
    priceRange: '₹900/hr 7-a-side Turf · Open Pull-up Bars',
    description:
      'FIFA-grade synthetic 7s football turf, floodlit badminton courts, and community calisthenics rig with parallel bars & rings for dawn workouts.',
    signatureTag: '7s Turf & Calisthenics',
  },
  {
    id: 'life-aranmula-vallamkali',
    name: 'Aranmula Uthrittathi Vallamkali & Padayani Calendar',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    category: 'Events & Festivals',
    neighborhood: 'Aranmula & Kadammanitta',
    timing: 'Seasonal Cultural Calendar',
    priceRange: 'Open Public Viewing',
    description:
      'Iconic Palliyodam snake boat pageant on the Pamba River alongside Kadammanitta Padayani torchlit folk theatre and Valla Sadya feasts.',
    signatureTag: 'Snake Boat & Padayani',
  },
  {
    id: 'life-balaramapuram-handloom',
    name: 'Balaramapuram Kasavu Handloom Weaver Cluster',
    districtId: 'thiruvananthapuram',
    districtName: 'Thiruvananthapuram',
    category: 'Heritage & Handloom',
    neighborhood: 'Balaramapuram, South TVM',
    timing: '09:30 AM – 06:30 PM',
    priceRange: 'Direct Loom ₹950 – ₹6,500',
    description:
      'Centuries-old Travancore handloom cooperative crafting authentic unbleached cotton Kasavu Set-Mundu and zari borders directly from pit-looms.',
    signatureTag: 'Authentic Kasavu Looms',
  },
  {
    id: 'life-fort-kochi-cafes',
    name: 'Fort Kochi Art Cafes & Mattancherry Spice Walk',
    districtId: 'ernakulam',
    districtName: 'Ernakulam',
    category: 'Local Cafes & Culinary Trails',
    neighborhood: 'Fort Kochi & Jew Town',
    timing: '08:30 AM – 10:00 PM',
    priceRange: '₹250 – ₹850 per person',
    description:
      'Heritage Dutch courtyard espresso roasteries, Kochi-Muziris Biennale galleries, and coastal seafood kitchens overlooking Chinese fishing nets.',
    signatureTag: 'Biennale & Specialty Roasters',
  },
  {
    id: 'life-kuthampully-handloom',
    name: 'Kuthampully Handloom Village & Thrissur Cultural Circuit',
    districtId: 'thrissur',
    districtName: 'Thrissur',
    category: 'Heritage & Handloom',
    neighborhood: 'Thiruvilwamala, Thrissur',
    timing: '09:00 AM – 07:00 PM',
    priceRange: 'Weaver Direct ₹850+',
    description:
      'GI-registered Kuthampully dhoties, Kasavu sarees, and traditional set-mundu weaving families along the Bharathapuzha basin.',
    signatureTag: 'GI Handloom Cooperative',
  },
  {
    id: 'life-wayanad-coffee-estates',
    name: 'Kalpetta Shade-Grown Coffee Roasters & Trail Runs',
    districtId: 'wayanad',
    districtName: 'Wayanad',
    category: 'Fitness, Turf & Calisthenics',
    neighborhood: 'Vythiri & Kalpetta Highlands',
    timing: '06:00 AM – 08:00 PM',
    priceRange: '₹200 – ₹600',
    description:
      'High-altitude morning trail running loops through misty bamboo & coffee estates followed by fresh Arabica/Robusta estate brews.',
    signatureTag: 'Highland Trail & Coffee',
  },
];

export const LOCAL_FEEDER_ROUTES: LocalFeederRoute[] = [
  {
    id: 'loc-pta-cngr',
    routeName: 'Pathanamthitta → Chengannur Railhead (CNGR) Express Feeder',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    mode: 'Nearest Rail Feeders [CNGR / TRVL]',
    fromStop: 'Pathanamthitta KSRTC Stand',
    toStop: 'Chengannur Railway Station (CNGR)',
    frequency: 'Every 15 mins',
    firstLastService: '04:45 AM – 10:45 PM',
    fareInr: 34,
    passFareInr: 65,
    operator: 'KSRTC Fast Passenger / Rail Feeder',
    note: 'Direct timed connection for Vande Bharat, Venad, Parasuram & Sabari Express departures at CNGR.',
  },
  {
    id: 'loc-pta-trvl',
    routeName: 'Pathanamthitta → Thiruvalla Railhead (TRVL) via Kozhencherry',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    mode: 'Nearest Rail Feeders [CNGR / TRVL]',
    fromStop: 'Pathanamthitta Central Bus Stand',
    toStop: 'Thiruvalla Railway Station (TRVL)',
    frequency: 'Every 12 mins',
    firstLastService: '05:00 AM – 10:30 PM',
    fareInr: 38,
    passFareInr: 72,
    operator: 'KSRTC & Private Stage Carriage',
    note: 'Fastest corridor to MC Road, Mar Thoma College, Pushpagiri Medical Centre & TRVL station.',
  },
  {
    id: 'loc-pta-adoor',
    routeName: 'Pathanamthitta ↔ Adoor via Kaipattoor & Pandalam Link',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    mode: 'KSRTC Ordinary / Fast Passenger',
    fromStop: 'Pathanamthitta KSRTC Depot',
    toStop: 'Adoor Central Junction',
    frequency: 'Every 10 mins',
    firstLastService: '05:15 AM – 11:00 PM',
    fareInr: 22,
    passFareInr: 45,
    operator: 'KSRTC Ordinary / Fast Passenger',
    note: 'Primary student & office commuter spine serving College of Engineering Adoor and MC Road.',
  },
  {
    id: 'loc-pta-ranni',
    routeName: 'Pathanamthitta ↔ Ranni ↔ Kozhencherry Loop',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    mode: 'Private Stage Carriage Buses',
    fromStop: 'Pathanamthitta Private Bus Stand',
    toStop: 'Ranni Ittiyappara / Kozhencherry',
    frequency: 'Every 8 mins',
    firstLastService: '05:30 AM – 09:30 PM',
    fareInr: 18,
    passFareInr: 38,
    operator: 'Pathanamthitta Private Stage Carriages',
    note: 'High-frequency everyday market and college loop connecting Ranni, Mylapra, and Kozhencherry.',
  },
  {
    id: 'loc-ev-pta',
    routeName: 'Pathanamthitta Town & Thiruvalla Station E-Auto Feeder Stand',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    mode: 'Auto / EV Feeder Stands',
    fromStop: 'Pathanamthitta / TRVL / CNGR Prepaid Stands',
    toStop: 'Ward Last-Mile (up to 6 km)',
    frequency: 'Instant (2–4 min wait)',
    firstLastService: '24×7 Prepaid Stand',
    fareInr: 50,
    passFareInr: 95,
    operator: 'Kerala Neem-G / Municipal EV Auto Stand',
    note: 'Metered zero-emission EV autos with digital UPI QR payment and night-safe station drop.',
  },
  {
    id: 'loc-ekm-metro-feeder',
    routeName: 'Aluva / Edappally Metro ↔ Infopark Kakkanad EV Feeder',
    districtId: 'ernakulam',
    districtName: 'Ernakulam',
    mode: 'Auto / EV Feeder Stands',
    fromStop: 'Aluva / JLN Stadium Metro',
    toStop: 'Infopark Phase 1 & 2, Kakkanad',
    frequency: 'Every 10 mins',
    firstLastService: '06:00 AM – 10:30 PM',
    fareInr: 30,
    passFareInr: 60,
    operator: 'KMRL Electric Feeder Bus & Water Metro',
    note: 'Seamless air-conditioned last-mile shuttle linked with Kochi Metro and Water Metro terminals.',
  },
  {
    id: 'loc-wnd-kalpetta-clt',
    routeName: 'Kalpetta ↔ Vythiri ↔ Thamarassery Ghat Commuter Shuttle',
    districtId: 'wayanad',
    districtName: 'Wayanad',
    mode: 'KSRTC Ordinary / Fast Passenger',
    fromStop: 'Kalpetta New Bus Stand',
    toStop: 'Thamarassery / Kozhikode Feeder',
    frequency: 'Every 20 mins',
    firstLastService: '05:00 AM – 09:45 PM',
    fareInr: 45,
    passFareInr: 85,
    operator: 'KSRTC Wayanad Depot',
    note: 'Monitored against live NH-766 corridor hazard advisories with alternate Kuttiady Ghat link.',
  },
  {
    id: 'loc-tvm-techpark',
    routeName: 'Thampanoor Railhead ↔ Technopark Kazhakootam Circular',
    districtId: 'thiruvananthapuram',
    districtName: 'Thiruvananthapuram',
    mode: 'KSRTC Ordinary / Fast Passenger',
    fromStop: 'Thiruvananthapuram Central (TVC)',
    toStop: 'Technopark Phase 1–3, Kazhakootam',
    frequency: 'Every 10 mins',
    firstLastService: '05:30 AM – 10:30 PM',
    fareInr: 25,
    passFareInr: 50,
    operator: 'KSRTC City Circular Electric',
    note: 'Zero-emission electric circular connecting CET, Technopark, and Trivandrum Central.',
  },
];

/* ============================================================================
 * EDUCATION PORTAL METADATA, STUDY PLAN & ADMISSION RECEIPT TYPES
 * ========================================================================== */

export interface EducationPortalMeta {
  feesSummary: string;
  entranceExams: string[];
  eligibility: string;
  officialPortal: string;
  wikiQuery: string;
  lat: number;
  lon: number;
}

export function getEducationPortalMeta(item: EducationEntry): EducationPortalMeta {
  const lower = item.name.toLowerCase();
  if (lower.includes('bhavan') || item.level === 'Schools / Higher Secondary') {
    return {
      feesSummary: '₹42,000 – ₹68,000 / year (Tuition + Lab & Robotics Club)',
      entranceExams: ['School Entrance Assessment', 'CBSE Board Readiness', 'NTSE / Olympiad Prep'],
      eligibility: 'Pass in Class 10 (CBSE/ICSE/Kerala SSLC) with ≥ 75% in Maths & Science for CS stream.',
      officialPortal: 'https://www.cbse.gov.in/',
      wikiQuery: item.districtName + ' Kerala education campus',
      lat: 9.2648,
      lon: 76.787,
    };
  }
  if (lower.includes('asap') || item.level === 'Skill & Coding Bootcamps') {
    return {
      feesSummary: '₹6,500 – ₹18,000 (Up to 70% Kerala Govt ASAP Subsidy)',
      entranceExams: ['ASAP Aptitude Screening', 'Basic Coding & Logic Assessment'],
      eligibility: 'Plus Two / Diploma / Undergraduate students & recent graduates across Kerala.',
      officialPortal: 'https://asapkerala.gov.in/',
      wikiQuery: 'Kerala startup mission technology campus',
      lat: 9.9312,
      lon: 76.2673,
    };
  }
  if (item.level === 'Scholarships & Exam Alerts') {
    return {
      feesSummary: '₹0 Application Fee · Grants up to ₹50,000 / year + Hostel Stipend',
      entranceExams: ['KEAM Rank Card / Plus Two Merit', 'Income & Domicile Verification'],
      eligibility: 'Kerala domiciled students enrolled in recognized higher secondary, UG, or PG programs.',
      officialPortal: 'https://egrantz.kerala.gov.in/',
      wikiQuery: 'University of Kerala Thiruvananthapuram',
      lat: 8.5241,
      lon: 76.9366,
    };
  }
  return {
    feesSummary: '₹35,000 – ₹82,500 / year (Government / KTU / University Merit Quota)',
    entranceExams: ['KEAM Engineering / Architecture', 'JEE Main', 'CUET-UG / CUSAT CAT'],
    eligibility: 'Plus Two with 45%+ aggregate in Physics, Chemistry & Mathematics (or relevant stream).',
    officialPortal: 'https://cee.kerala.gov.in/',
    wikiQuery: item.name,
    lat: item.districtId === 'ernakulam' ? 10.045 : item.districtId === 'thiruvananthapuram' ? 8.546 : 9.152,
    lon: item.districtId === 'ernakulam' ? 76.328 : item.districtId === 'thiruvananthapuram' ? 76.906 : 76.735,
  };
}

export type StudyTargetExam =
  | 'Class 11–12 Science & CS'
  | 'KEAM / JEE Engineering'
  | 'Python & Web Dev'
  | "UK Master's / IELTS Prep";

export const STUDY_TARGET_EXAMS: readonly StudyTargetExam[] = [
  'Class 11–12 Science & CS',
  'KEAM / JEE Engineering',
  'Python & Web Dev',
  "UK Master's / IELTS Prep",
];

export interface StudyTaskItem {
  id: string;
  title: string;
  durationMins: number;
  subject: string;
  done: boolean;
}

export interface StudyDayPlan {
  day: string;
  focusTheme: string;
  tasks: StudyTaskItem[];
}

export interface StudyPlanData {
  id: string;
  targetExam: StudyTargetExam;
  dailyHours: number;
  targetDate: string;
  milestoneSummary: string;
  subjectWeights: Array<{ subject: string; percent: number; color: string }>;
  days: StudyDayPlan[];
  createdAt: string;
}

export interface AdmissionApplicationRecord {
  receiptId: string;
  institutionId: string;
  institutionName: string;
  districtName: string;
  level: string;
  applicantName: string;
  email: string;
  phone: string;
  stream: string;
  districtState: string;
  qualification: string;
  documentsChecklist: string[];
  sopText: string;
  submittedAt: string;
  status: 'SUBMITTED · AUTO-VERIFIED';
}

/* ============================================================================
 * FOOD SPOTS & CULINARY DISCOVERY ENGINE
 * ========================================================================== */

export type FoodSpotCategory =
  | 'All Food Spots'
  | 'Traditional Kerala Sadhya & Toddy Shop Cuisine'
  | 'Specialty Coffee & Bakeries'
  | 'Late-Night Shawarma & Street Food'
  | 'Family & Veg Restaurants';

export const FOOD_SPOT_CATEGORIES: readonly FoodSpotCategory[] = [
  'All Food Spots',
  'Traditional Kerala Sadhya & Toddy Shop Cuisine',
  'Specialty Coffee & Bakeries',
  'Late-Night Shawarma & Street Food',
  'Family & Veg Restaurants',
];

export interface FoodSpotEntry {
  id: string;
  name: string;
  districtId: string;
  districtName: string;
  town: string;
  category: Exclude<FoodSpotCategory, 'All Food Spots'>;
  costForTwoInr: number;
  rating: string;
  timing: string;
  mustTryDishes: string[];
  description: string;
  wikiQuery: string;
}

export const FOOD_SPOTS_DIRECTORY: FoodSpotEntry[] = [
  {
    id: 'food-pta-aranmula-sadhya',
    name: 'Aranmula Valla Sadhya Heritage Kitchen',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    town: 'Aranmula',
    category: 'Traditional Kerala Sadhya & Toddy Shop Cuisine',
    costForTwoInr: 480,
    rating: '4.8',
    timing: '11:30 AM – 03:30 PM',
    mustTryDishes: ['28-Course Plantain Leaf Sadhya', 'Ambalappuzha Palpayasam', 'Inji Puli & Avial'],
    description: 'Authentic Central Travancore heritage banana-leaf feast inspired by the sacred Aranmula Valla Sadhya tradition.',
    wikiQuery: 'Sadhya Kerala',
  },
  {
    id: 'food-tvla-kappayum-meen',
    name: 'Manimala Riverside Toddy & Kappa Shack',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    town: 'Thiruvalla',
    category: 'Traditional Kerala Sadhya & Toddy Shop Cuisine',
    costForTwoInr: 620,
    rating: '4.7',
    timing: '11:00 AM – 09:00 PM',
    mustTryDishes: ['Karimeen Pollichathu', 'Kappa & Spicy Duck Mappas', 'Kallappam & Beef Roast'],
    description: 'Family-friendly riverside Kerala shaap kitchen famous for pearl spot wrapped in smoked banana leaf and slow-cooked duck curry.',
    wikiQuery: 'Karimeen pollichathu',
  },
  {
    id: 'food-pta-roast-brew',
    name: 'Western Ghats Roast & Bakehouse',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    town: 'Pathanamthitta Town',
    category: 'Specialty Coffee & Bakeries',
    costForTwoInr: 420,
    rating: '4.6',
    timing: '08:00 AM – 10:30 PM',
    mustTryDishes: ['Wayanad Pour-Over Coffee', 'Cardamom Tres Leches', 'Malabar Chicken Puff'],
    description: 'Sunlit specialty roastery & artisan bakery near College Road with high-speed Wi-Fi and single-estate Kerala beans.',
    wikiQuery: 'Filter coffee India',
  },
  {
    id: 'food-cngr-shawarma-hub',
    name: 'Chengannur Midnight Charcoal Shawarma',
    districtId: 'alappuzha',
    districtName: 'Chengannur / Alappuzha',
    town: 'Chengannur Station Road',
    category: 'Late-Night Shawarma & Street Food',
    costForTwoInr: 340,
    rating: '4.7',
    timing: '05:00 PM – 01:30 AM',
    mustTryDishes: ['Rumali Whole-Meat Shawarma', 'Al-Faham Peri-Peri', 'Sulaimani Mint Tea'],
    description: 'Late-night commuter favourite 300m from Chengannur Railway Station (CNGR) serving charcoal-grilled rolls and spiced Sulaimani.',
    wikiQuery: 'Shawarma',
  },
  {
    id: 'food-adoor-aryaas',
    name: 'Adoor Heritage Veg & Tiffin House',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    town: 'Adoor MC Road',
    category: 'Family & Veg Restaurants',
    costForTwoInr: 300,
    rating: '4.5',
    timing: '07:00 AM – 10:00 PM',
    mustTryDishes: ['Ghee Roast Masala Dosa', 'Mini Tiffin Combo', 'Brass Davara Filter Coffee'],
    description: 'Clean MC Road family vegetarian stopover loved by morning KSRTC travellers and students heading toward Adoor & Kottarakkara.',
    wikiQuery: 'Masala dosa',
  },
  {
    id: 'food-kochi-kashi',
    name: 'Fort Kochi Art Courtyard Cafe',
    districtId: 'ernakulam',
    districtName: 'Ernakulam',
    town: 'Fort Kochi',
    category: 'Specialty Coffee & Bakeries',
    costForTwoInr: 850,
    rating: '4.8',
    timing: '08:30 AM – 09:30 PM',
    mustTryDishes: ['Cold Brew Tonic', 'Chocolate Walnut Torte', 'Spiced Coconut Smoothie Bowl'],
    description: 'Iconic open-courtyard art gallery and cafe housed in a restored colonial bungalow in Fort Kochi.',
    wikiQuery: 'Fort Kochi',
  },
  {
    id: 'food-clt-paragon',
    name: 'Kozhikode Beach Biriyani & Halwa Lane',
    districtId: 'kozhikode',
    districtName: 'Kozhikode',
    town: 'Kozhikode Beach / SM Street',
    category: 'Traditional Kerala Sadhya & Toddy Shop Cuisine',
    costForTwoInr: 680,
    rating: '4.9',
    timing: '11:30 AM – 11:00 PM',
    mustTryDishes: ['Malabar Dum Chicken Biriyani', 'Fish Mango Curry', 'Black Kozhikodan Halwa'],
    description: 'Legendary Malabar culinary landmark celebrating kaima rice dum biriyani, appam-stew, and warm coconut-oil halwa.',
    wikiQuery: 'Malabar biryani',
  },
  {
    id: 'food-tvla-street-wok',
    name: 'Thiruvalla TK Road Night Street Kitchen',
    districtId: 'pathanamthitta',
    districtName: 'Pathanamthitta',
    town: 'Thiruvalla',
    category: 'Late-Night Shawarma & Street Food',
    costForTwoInr: 360,
    rating: '4.6',
    timing: '04:30 PM – 12:30 AM',
    mustTryDishes: ['Nool Porotta & Pepper Beef', 'Loaded Falafel Wrap', 'Avil Milk'],
    description: 'Bustling evening food street near Thiruvalla Railway Station (TRVL) known for flaky Nool Porotta and chilled Malabar Avil Milk.',
    wikiQuery: 'Parotta',
  },
];

/* ============================================================================
 * WEEKEND PLANNER & EXPENSE TRACKER TYPES (UPGRADED GEMINI ARCHITECT)
 * ========================================================================== */

export type WeekendDuration =
  | 'Saturday Only'
  | 'Full Weekend (Sat–Sun)'
  | '3-Day Long Weekend';

export const WEEKEND_DURATIONS: readonly WeekendDuration[] = [
  'Saturday Only',
  'Full Weekend (Sat–Sun)',
  '3-Day Long Weekend',
];

export type WeekendVibe =
  | 'Chill Cafes & Scenic Drives'
  | 'Waterfall & Hill Trekking'
  | 'Heritage & Temple/Culture Trail'
  | 'Sports Turf & Friends Hangout'
  | 'Family Outing';

export const WEEKEND_VIBES: readonly WeekendVibe[] = [
  'Chill Cafes & Scenic Drives',
  'Waterfall & Hill Trekking',
  'Heritage & Temple/Culture Trail',
  'Sports Turf & Friends Hangout',
  'Family Outing',
];

export type DayTimeBlock = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export interface WeekendStopItem {
  id: string;
  time: string;
  block?: DayTimeBlock;
  title: string;
  location: string;
  distanceFromPrev?: string;
  travelTimeFromPrev?: string;
  estimatedCostInr: number;
  category: ExpenseCategory;
  tip: string;
  wikiQuery?: string;
  done: boolean;
}

export interface WeekendItineraryData {
  id: string;
  districtName: string;
  duration?: WeekendDuration;
  vibe: WeekendVibe;
  groupSize: number;
  budgetInr: number;
  headline: string;
  weatherTip?: string;
  packingTips?: string[];
  lastTweakPrompt?: string;
  saturday: WeekendStopItem[];
  sunday: WeekendStopItem[];
  day3?: WeekendStopItem[];
  createdAt: string;
}

export type ExpenseCategory =
  | 'Food & Cafes'
  | 'Local Transport & Fuel'
  | 'Travel Tickets'
  | 'Turf & Lifestyle'
  | 'Education & Books'
  | 'Healthcare & OP';

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  'Food & Cafes',
  'Local Transport & Fuel',
  'Travel Tickets',
  'Turf & Lifestyle',
  'Education & Books',
  'Healthcare & OP',
];

export interface ExpenseEntry {
  id: string;
  title: string;
  category: ExpenseCategory;
  amountInr: number;
  date: string;
  source: 'Manual' | 'Auto-Booked' | 'Weekend Plan' | 'Event Order' | 'Hospital Booking';
  note?: string;
}

/* ============================================================================
 * JOBS & CAREER OPPORTUNITIES PORTAL
 * ========================================================================== */

export type JobCategory =
  | 'All Categories'
  | 'Kerala Govt & PSC'
  | 'DWMS / KKEM Knowledge Mission & Internships'
  | 'IT, AI & Software Engineering'
  | 'Part-Time & Student Gigs'
  | 'Work-Near-Home / Remote';

export const JOB_CATEGORIES: readonly JobCategory[] = [
  'All Categories',
  'Kerala Govt & PSC',
  'DWMS / KKEM Knowledge Mission & Internships',
  'IT, AI & Software Engineering',
  'Part-Time & Student Gigs',
  'Work-Near-Home / Remote',
];

export type JobQualification =
  | 'All Qualifications'
  | '10th / Plus Two'
  | 'Diploma / ITI'
  | 'Graduate / B.Tech'
  | 'Post-Graduate';

export const JOB_QUALIFICATIONS: readonly JobQualification[] = [
  'All Qualifications',
  '10th / Plus Two',
  'Diploma / ITI',
  'Graduate / B.Tech',
  'Post-Graduate',
];

export const JOB_LOCATION_OPTIONS: readonly string[] = [
  'Pathanamthitta & Kerala',
  'All Kerala & Remote',
  'Pathanamthitta',
  'Thiruvananthapuram',
  'Ernakulam',
  'Kottayam',
  'Alappuzha',
  'Kozhikode',
  'Thrissur',
  'Kollam',
  'Idukki',
  'Palakkad',
  'Malappuram',
  'Wayanad',
  'Kannur',
  'Kasaragod',
  'Bengaluru / Hybrid',
  'Remote (Work-Near-Home)',
];

export interface JobListingEntry {
  id: string;
  title: string;
  employer: string;
  category: Exclude<JobCategory, 'All Categories'>;
  district: string;
  qualification: Exclude<JobQualification, 'All Qualifications'>;
  salaryLabel: string;
  deadline: string;
  workMode: 'On-Site' | 'Hybrid' | 'Remote' | 'Field / Flexible';
  summary: string;
  skills: string[];
  officialPortalLabel: string;
  officialPortalUrl: string;
  isAiMatched?: boolean;
}

export interface JobApplicationRecord {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  employer: string;
  district: string;
  salaryLabel: string;
  applicantName: string;
  email: string;
  phone: string;
  qualification: string;
  skills: string;
  coverNote: string;
  submittedAt: string;
  status: 'APPLIED · PROFILE VERIFIED';
}

export const JOBS_DIRECTORY: JobListingEntry[] = [
  {
    id: 'job-kkem-dwms-ai',
    title: 'Junior Full-Stack & AI Product Intern (KKEM DWMS)',
    employer: 'Kerala Knowledge Economy Mission (DWMS) · Kochi / Remote',
    category: 'DWMS / KKEM Knowledge Mission & Internships',
    district: 'Ernakulam',
    qualification: 'Graduate / B.Tech',
    salaryLabel: '₹22,000 – ₹28,000 / month stipend',
    deadline: 'Closes 18 Dec 2026',
    workMode: 'Hybrid',
    summary:
      '6-month mentored software & generative AI internship through Kerala DWMS Connect-Work placement cell with direct absorption path at Infopark startups.',
    skills: ['React', 'TypeScript', 'Python', 'REST APIs'],
    officialPortalLabel: 'knowledgemission.kerala.gov.in',
    officialPortalUrl: 'https://knowledgemission.kerala.gov.in',
  },
  {
    id: 'job-kdisc-stride-pta',
    title: 'K-DISC STRIDE Civic Innovation Fellow',
    employer: 'K-DISC & Pathanamthitta District Innovation Council',
    category: 'DWMS / KKEM Knowledge Mission & Internships',
    district: 'Pathanamthitta',
    qualification: 'Graduate / B.Tech',
    salaryLabel: '₹25,000 / month fellowship',
    deadline: 'Closes 24 Dec 2026',
    workMode: 'Hybrid',
    summary:
      'Collaborate with LSG engineers and local colleges in Pathanamthitta & Thiruvalla to deploy digital civic-mapping and K-SMART citizen automation prototypes.',
    skills: ['GIS / Mapping', 'JavaScript', 'Field Research', 'Civic Tech'],
    officialPortalLabel: 'knowledgemission.kerala.gov.in',
    officialPortalUrl: 'https://knowledgemission.kerala.gov.in',
  },
  {
    id: 'job-psc-lsg-overseer',
    title: 'Kerala PSC Overseer Grade III & LSG Technical Assistant',
    employer: 'Kerala Public Service Commission (LSGD Engineering Wing)',
    category: 'Kerala Govt & PSC',
    district: 'Pathanamthitta',
    qualification: 'Diploma / ITI',
    salaryLabel: '₹31,100 – ₹66,800 (Pay Scale)',
    deadline: 'Notification Active · Apply via Thulasi',
    workMode: 'On-Site',
    summary:
      'Statewide district-wise recruitment for Local Self-Government civil/electrical inspection, road-quality audits, and municipal project estimation.',
    skills: ['Civil / Electrical Diploma', 'AutoCAD', 'Site Survey', 'K-SMART'],
    officialPortalLabel: 'keralapsc.gov.in',
    officialPortalUrl: 'https://www.keralapsc.gov.in',
  },
  {
    id: 'job-technopark-dev',
    title: 'Associate Software Engineer (React / Node / Cloud)',
    employer: 'Technopark Phase III Digital Studio · Thiruvananthapuram',
    category: 'IT, AI & Software Engineering',
    district: 'Thiruvananthapuram',
    qualification: 'Graduate / B.Tech',
    salaryLabel: '₹5.4 – ₹7.8 LPA',
    deadline: 'Rolling Interviews · Dec 2026',
    workMode: 'Hybrid',
    summary:
      'Build high-throughput web dashboards and AI workflow integrations for enterprise fintech and mobility clients with 2-day hybrid flexibility.',
    skills: ['TypeScript', 'React', 'Node.js', 'SQL', 'Docker'],
    officialPortalLabel: 'employment.kerala.gov.in',
    officialPortalUrl: 'https://employment.kerala.gov.in',
  },
  {
    id: 'job-pta-retail-ops',
    title: 'District Retail, EV Fleet & Logistics Operations Coordinator',
    employer: 'Pathanamthitta & Thiruvalla Smart Commerce Hub',
    category: 'Part-Time & Student Gigs',
    district: 'Pathanamthitta',
    qualification: '10th / Plus Two',
    salaryLabel: '₹14,500 – ₹19,000 / month + incentives',
    deadline: 'Open Immediately',
    workMode: 'Field / Flexible',
    summary:
      'Flexible shift coordination for local grocery/cafe hyperlocal dispatch, inventory scanning, and evening turf/campus delivery routing around Pathanamthitta & Adoor.',
    skills: ['Malayalam & English', 'Smartphone Ops', 'Route Planning', 'UPI Billing'],
    officialPortalLabel: 'employment.kerala.gov.in',
    officialPortalUrl: 'https://employment.kerala.gov.in',
  },
  {
    id: 'job-wnh-ai-mentor',
    title: 'Work-Near-Home STEM & Coding Cohort Mentor (Remote)',
    employer: 'ASAP Kerala / KKEM Work-Near-Home Network',
    category: 'Work-Near-Home / Remote',
    district: 'Remote (Work-Near-Home)',
    qualification: 'Graduate / B.Tech',
    salaryLabel: '₹28,000 – ₹42,000 / month',
    deadline: 'Closes 30 Dec 2026',
    workMode: 'Remote',
    summary:
      'Mentor Plus Two and undergraduate Kerala students online in Python, Web Development, and KEAM/CUET analytical problem solving from home or your nearest WNH hub.',
    skills: ['Python', 'Communication', 'Teaching', 'Web Dev'],
    officialPortalLabel: 'knowledgemission.kerala.gov.in',
    officialPortalUrl: 'https://knowledgemission.kerala.gov.in',
  },
  {
    id: 'job-psc-univ-assistant',
    title: 'Kerala PSC University Assistant & Secretariat Clerk',
    employer: 'Kerala Public Service Commission (Statewide)',
    category: 'Kerala Govt & PSC',
    district: 'Thiruvananthapuram',
    qualification: 'Graduate / B.Tech',
    salaryLabel: '₹39,300 – ₹83,000 (Govt Scale)',
    deadline: 'Exam Calendar 2026–27 Open',
    workMode: 'On-Site',
    summary:
      'Degree-level permanent administrative post across Kerala State Universities and Secretariat departments with full pension and allowance benefits.',
    skills: ['Degree Level GK', 'Malayalam Drafting', 'Office IT', 'Quantitative Aptitude'],
    officialPortalLabel: 'keralapsc.gov.in',
    officialPortalUrl: 'https://www.keralapsc.gov.in',
  },
  {
    id: 'job-blr-ai-eng',
    title: 'Applied GenAI & Frontend Engineer (Bengaluru / Remote-Kerala)',
    employer: 'Koramangala Mobility AI Labs · Bengaluru',
    category: 'IT, AI & Software Engineering',
    district: 'Bengaluru / Hybrid',
    qualification: 'Post-Graduate',
    salaryLabel: '₹11.5 – ₹16.0 LPA',
    deadline: 'Closes 28 Dec 2026',
    workMode: 'Hybrid',
    summary:
      'Design spatial web applications, Gemini multimodal agents, and real-time transit interfaces with monthly work-from-Kerala weeks.',
    skills: ['Gemini API', 'React', 'Three.js', 'TypeScript', 'System Design'],
    officialPortalLabel: 'knowledgemission.kerala.gov.in',
    officialPortalUrl: 'https://knowledgemission.kerala.gov.in',
  },
  {
    id: 'job-student-campus-media',
    title: 'Weekend Campus Event & Social Media Creator Gig',
    employer: 'Central Travancore Student Collective · Thiruvalla / Kottayam',
    category: 'Part-Time & Student Gigs',
    district: 'Kottayam',
    qualification: '10th / Plus Two',
    salaryLabel: '₹6,500 – ₹11,000 / month (Weekends)',
    deadline: 'Rolling Student Intake',
    workMode: 'Field / Flexible',
    summary:
      'Shoot short-form reels, manage college fest check-ins, and coordinate cafe/turf community pop-ups on Saturdays & Sundays without affecting weekday classes.',
    skills: ['Mobile Videography', 'Canva / Reels', 'Event Coordination'],
    officialPortalLabel: 'employment.kerala.gov.in',
    officialPortalUrl: 'https://employment.kerala.gov.in',
  },
];

/* ============================================================================
 * EVENT MANAGEMENT AI & ON-SPOT FOOD / CATERING DELIVERY
 * ========================================================================== */

export type EventType =
  | 'Birthday / Friends Meetup'
  | 'Turf Match Refreshments'
  | 'College Fest / Hackathon Crew'
  | 'Family Get-Together'
  | 'Picnic / Hill-Spot Outing';

export const EVENT_TYPES: readonly EventType[] = [
  'Birthday / Friends Meetup',
  'Turf Match Refreshments',
  'College Fest / Hackathon Crew',
  'Family Get-Together',
  'Picnic / Hill-Spot Outing',
];

export const QUICK_EVENT_SPOTS: readonly { label: string; district: string; query: string }[] = [
  { label: 'Pathanamthitta Town Square', district: 'Pathanamthitta', query: 'Pathanamthitta Town, Kerala' },
  { label: 'Aranmula Riverfront Pavilion', district: 'Pathanamthitta', query: 'Aranmula, Pathanamthitta, Kerala' },
  { label: 'Thiruvalla 7s Turf Arena', district: 'Pathanamthitta', query: 'Thiruvalla, Pathanamthitta, Kerala' },
  { label: 'Wagamon Pine Viewpoint', district: 'Idukki', query: 'Vagamon, Idukki, Kerala' },
  { label: 'Fort Kochi Waterfront Lawn', district: 'Ernakulam', query: 'Fort Kochi, Ernakulam, Kerala' },
];

export type CateringCategory =
  | 'Snacks & Starters'
  | 'Shawarma & Platters'
  | 'Biriyani Buckets'
  | 'Specialty Coffee & Drinks'
  | 'Hydration & Energy'
  | 'Cakes & Desserts';

export interface EventCateringItem {
  id: string;
  name: string;
  vendor: string;
  category: CateringCategory;
  unitPriceInr: number;
  servesCount: number;
  recommendedQty: number;
  dietTag: 'Veg' | 'Non-Veg' | 'Beverage';
}

export interface EventTimelineBlock {
  time: string;
  title: string;
  ownerNote: string;
}

export interface EventChecklistItem {
  id: string;
  task: string;
  phase: 'Before Arrival' | 'Venue Setup' | 'On-Spot Delivery';
  done: boolean;
}

export interface EventPlanData {
  id: string;
  eventType: EventType;
  guestCount: number;
  spotLocation: string;
  districtName: string;
  totalBudgetInr: number;
  perPersonSplitInr: number;
  headline: string;
  summary: string;
  timeline: EventTimelineBlock[];
  checklist: EventChecklistItem[];
  cateringMenu: EventCateringItem[];
  createdAt: string;
}

export type FoodDeliveryStage = 'Preparing' | 'Rider En Route to Pin' | 'Delivered';

export interface OnSpotFoodOrder {
  orderId: string;
  eventHeadline: string;
  spotLocation: string;
  districtName: string;
  items: Array<{
    id: string;
    name: string;
    vendor: string;
    qty: number;
    unitPriceInr: number;
  }>;
  totalInr: number;
  paidInr: number;
  isDemoFare: boolean;
  utrNumber: string | null;
  stage: FoodDeliveryStage;
  riderName: string;
  etaMinutes: number;
  createdAt: string;
}

export const DEFAULT_ONSPOT_FOOD_CATALOG: EventCateringItem[] = [
  {
    id: 'cat-shawarma-platter',
    name: 'Charcoal Rumali Shawarma Crew Platter (6 Rolls + Toum)',
    vendor: 'Chengannur / Thiruvalla Charcoal Grill',
    category: 'Shawarma & Platters',
    unitPriceInr: 720,
    servesCount: 5,
    recommendedQty: 2,
    dietTag: 'Non-Veg',
  },
  {
    id: 'cat-biriyani-bucket',
    name: 'Malabar Dum Chicken Biriyani Party Bucket (5 Pax)',
    vendor: 'Kozhikode & Travancore Heritage Kitchen',
    category: 'Biriyani Buckets',
    unitPriceInr: 1150,
    servesCount: 5,
    recommendedQty: 2,
    dietTag: 'Non-Veg',
  },
  {
    id: 'cat-veg-snack-box',
    name: 'Kerala Pazhampori, Unniyappam & Paneer Puff Assortment (10 pcs)',
    vendor: 'Western Ghats Roast & Bakehouse',
    category: 'Snacks & Starters',
    unitPriceInr: 420,
    servesCount: 5,
    recommendedQty: 2,
    dietTag: 'Veg',
  },
  {
    id: 'cat-specialty-coffee',
    name: 'Wayanad Cold Brew & Filter Coffee Insulated Flask (1.5L)',
    vendor: 'Western Ghats Roast & Bakehouse',
    category: 'Specialty Coffee & Drinks',
    unitPriceInr: 480,
    servesCount: 6,
    recommendedQty: 1,
    dietTag: 'Beverage',
  },
  {
    id: 'cat-hydration-pack',
    name: 'Turf Match Electrolyte, Tender Coconut & Chilled Water Pack (12 Pack)',
    vendor: 'Local Quick-Mart & Turf Hydration Express',
    category: 'Hydration & Energy',
    unitPriceInr: 360,
    servesCount: 10,
    recommendedQty: 1,
    dietTag: 'Beverage',
  },
  {
    id: 'cat-celebration-cake',
    name: 'Belgian Chocolate & Cardamom Celebration Cake (1 kg)',
    vendor: 'Thiruvalla Artisan Patisserie',
    category: 'Cakes & Desserts',
    unitPriceInr: 890,
    servesCount: 10,
    recommendedQty: 1,
    dietTag: 'Veg',
  },
];


