import {
  computePolygonCentroid,
  type MapRegionNode,
  type RegionBiodiversityInfo,
} from '../shared/travelSchema';

export const DEFAULT_ORIGIN_ID = 'pathanamthitta';

export const ROUTE_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  originId: string;
  destinationId: string;
  subtitle: string;
}> = [
  {
    id: 'preset-wayanad',
    label: 'Pathanamthitta → Wayanad',
    originId: 'pathanamthitta',
    destinationId: 'wayanad',
    subtitle: 'Western Ghats highland corridor',
  },
  {
    id: 'preset-bengaluru',
    label: 'Pathanamthitta → Bengaluru',
    originId: 'pathanamthitta',
    destinationId: 'bengaluru',
    subtitle: 'Inter-state Rail / KSRTC Swift / Air',
  },
] as const;

interface DistrictSpec {
  id: string;
  name: string;
  regionLabel: string;
  code: string;
  tagline: string;
  elevation: number;
  accentHex: string;
  polygon: Array<[number, number]>;
  biodiversity: RegionBiodiversityInfo;
}

const DISTRICT_SPECS: DistrictSpec[] = [
  {
    id: 'kasaragod',
    name: 'Kasaragod',
    regionLabel: 'North Malabar',
    code: 'KL-14',
    tagline: 'Bekal Fort coast & northernmost Karnataka gateway',
    elevation: 0.34,
    accentHex: '#1e3a5f',
    polygon: [
      [-2.85, -6.45],
      [-2.08, -6.52],
      [-1.58, -6.02],
      [-1.52, -5.02],
      [-2.48, -5.02],
      [-2.82, -5.75],
    ],
    biodiversity: {
      biome: 'coastal_backwaters',
      flora: 'Coconut palm groves & Kavvayi estuary mangroves',
      fauna: 'White-throated Kingfisher & estuarine otters',
      culture: 'Bekal Fort heritage, Theyyam & Yakshagana',
      badgeText: 'Bekal Fort · Mangroves',
    },
  },
  {
    id: 'kannur',
    name: 'Kannur',
    regionLabel: 'North Malabar',
    code: 'KL-13',
    tagline: 'Theyyam heritage, Muzhappilangad drive-in beach & Kannur Airport',
    elevation: 0.38,
    accentHex: '#1b4363',
    polygon: [
      [-2.46, -4.90],
      [-1.48, -4.90],
      [-0.86, -4.18],
      [-0.95, -3.50],
      [-1.92, -3.50],
      [-2.38, -4.18],
    ],
    biodiversity: {
      biome: 'coastal_backwaters',
      flora: 'Coastal mangroves & dense coconut palm groves',
      fauna: 'White-throated Kingfisher & Olive Ridley coast',
      culture: 'Theyyam ritual art & handloom heritage',
      badgeText: 'Theyyam · Coastal Palms',
    },
  },
  {
    id: 'wayanad',
    name: 'Wayanad',
    regionLabel: 'Malabar Highlands',
    code: 'KL-12',
    tagline: 'Western Ghats misty plateau, Edakkal Caves & Nilgiri corridor',
    elevation: 0.62,
    accentHex: '#17545a',
    polygon: [
      [-0.78, -3.96],
      [0.08, -4.02],
      [0.44, -3.45],
      [0.30, -2.62],
      [-0.70, -2.58],
      [-0.88, -3.38],
    ],
    biodiversity: {
      biome: 'western_ghats',
      flora: 'Evergreen spice, bamboo & Rosewood forests',
      fauna: 'Asian Elephant, Great Hornbill & Nilgiri Tahr',
      culture: 'Edakkal Neolithic heritage & Theyyam traditions',
      badgeText: 'Asian Elephant · Rosewood',
    },
  },
  {
    id: 'kozhikode',
    name: 'Kozhikode',
    regionLabel: 'Malabar Coast',
    code: 'KL-11',
    tagline: 'Historic spice port, Kappad shore & Malabar rail hub',
    elevation: 0.36,
    accentHex: '#1c4966',
    polygon: [
      [-1.90, -3.38],
      [-0.96, -3.38],
      [-0.82, -2.52],
      [-1.48, -2.14],
      [-1.82, -2.68],
    ],
    biodiversity: {
      biome: 'coastal_backwaters',
      flora: 'Kadalundi mangroves & coastal coconut palm groves',
      fauna: 'White-throated Kingfisher & migratory estuary terns',
      culture: 'Malabar spice-trade heritage & Kalaripayattu',
      badgeText: 'Kadalundi Mangroves · Kingfisher',
    },
  },
  {
    id: 'malappuram',
    name: 'Malappuram',
    regionLabel: 'Central Malabar',
    code: 'KL-10',
    tagline: 'Nilambur teak valleys, Karipur International Airport & Kadalundi',
    elevation: 0.42,
    accentHex: '#1d4d63',
    polygon: [
      [-1.46, -2.04],
      [-0.74, -2.44],
      [0.14, -2.44],
      [0.12, -1.78],
      [-0.36, -1.08],
      [-1.34, -1.08],
      [-1.56, -1.56],
    ],
    biodiversity: {
      biome: 'western_ghats',
      flora: 'Nilambur Conolly teak & Western Ghats rainforest',
      fauna: 'Malabar Giant Squirrel & Asian Elephant foothills',
      culture: 'Mappila heritage, Kottakkal Ayurveda & folk arts',
      badgeText: 'Nilambur Teak · Rainforest',
    },
  },
  {
    id: 'palakkad',
    name: 'Palakkad',
    regionLabel: 'Palakkad Gap',
    code: 'KL-09',
    tagline: 'Major Tamil Nadu rail & highway pass, Silent Valley & Fort',
    elevation: 0.50,
    accentHex: '#18595d',
    polygon: [
      [0.24, -1.86],
      [1.18, -1.72],
      [1.42, -0.94],
      [1.16, -0.18],
      [0.22, -0.18],
      [-0.26, -0.98],
    ],
    biodiversity: {
      biome: 'western_ghats',
      flora: 'Silent Valley tropical evergreens & Palmyra plains',
      fauna: 'Lion-tailed Macaque & Great Hornbill',
      culture: 'Kalpathy Ratholsavam & Carnatic music heritage',
      badgeText: 'Silent Valley · Hornbill',
    },
  },
  {
    id: 'thrissur',
    name: 'Thrissur',
    regionLabel: 'Central Kerala',
    code: 'KL-08',
    tagline: 'Cultural capital, Athirappilly Falls & central rail junction',
    elevation: 0.40,
    accentHex: '#1d4c68',
    polygon: [
      [-1.32, -0.96],
      [-0.36, -0.96],
      [0.14, -0.16],
      [0.12, 0.30],
      [-1.12, 0.30],
      [-1.38, -0.35],
    ],
    biodiversity: {
      biome: 'coastal_backwaters',
      flora: 'Athirappilly riparian evergreens & Kole wetlands',
      fauna: 'Great Hornbill & wetland waterbirds',
      culture: 'Thrissur Pooram, Kathakali & Kerala Kalamandalam',
      badgeText: 'Kalamandalam · Hornbill',
    },
  },
  {
    id: 'ernakulam',
    name: 'Ernakulam',
    regionLabel: 'Central Kerala',
    code: 'KL-07',
    tagline: 'Kochi Metro, Water Metro, Fort Kochi & Cochin International Airport',
    elevation: 0.44,
    accentHex: '#18546d',
    polygon: [
      [-1.12, 0.42],
      [0.20, 0.42],
      [0.24, 1.62],
      [-1.08, 1.62],
      [-1.22, 1.02],
    ],
    biodiversity: {
      biome: 'coastal_backwaters',
      flora: 'Mangalavanam mangroves & coconut palm lagoons',
      fauna: 'White-throated Kingfisher & estuarine dolphins',
      culture: 'Muziris maritime heritage, Fort Kochi & Kathakali',
      badgeText: 'Muziris · Kathakali',
    },
  },
  {
    id: 'idukki',
    name: 'Idukki',
    regionLabel: 'High Ranges',
    code: 'KL-06',
    tagline: 'Munnar tea estates, Thekkady Periyar Reserve & Idukki Arch Dam',
    elevation: 0.72,
    accentHex: '#145c59',
    polygon: [
      [0.34, -0.06],
      [1.22, -0.06],
      [1.76, 0.85],
      [1.62, 2.02],
      [1.26, 2.86],
      [0.54, 2.86],
      [0.36, 1.68],
    ],
    biodiversity: {
      biome: 'western_ghats',
      flora: 'Evergreen spice, cardamom, Neelakurinji & Rosewood',
      fauna: 'Nilgiri Tahr, Asian Elephant & Great Hornbill',
      culture: 'High-range spice estates & Periyar eco-heritage',
      badgeText: 'Nilgiri Tahr · Spice Hills',
    },
  },
  {
    id: 'kottayam',
    name: 'Kottayam',
    regionLabel: 'South-Central Kerala',
    code: 'KL-05',
    tagline: 'Kumarakom backwaters, Vembanad Lake & central rail corridor',
    elevation: 0.42,
    accentHex: '#1d4f6a',
    polygon: [
      [-0.44, 1.74],
      [0.32, 1.74],
      [0.44, 2.90],
      [-0.42, 2.90],
      [-0.56, 2.32],
    ],
    biodiversity: {
      biome: 'coastal_backwaters',
      flora: 'Vembanad lakeside mangroves & rubber-palm groves',
      fauna: 'White-throated Kingfisher & Kumarakom migratory birds',
      culture: 'Akshara Nagari literary & backwater boat heritage',
      badgeText: 'Kumarakom · Bird Sanctuary',
    },
  },
  {
    id: 'alappuzha',
    name: 'Alappuzha',
    regionLabel: 'Coastal Backwaters',
    code: 'KL-04',
    tagline: 'Venice of the East, Kuttanad canals & Alleppey houseboat hubs',
    elevation: 0.28,
    accentHex: '#1a5a78',
    polygon: [
      [-1.12, 1.74],
      [-0.56, 1.74],
      [-0.68, 2.34],
      [-0.52, 2.96],
      [-0.46, 3.74],
      [-0.92, 3.74],
      [-1.18, 2.75],
    ],
    biodiversity: {
      biome: 'coastal_backwaters',
      flora: 'Coconut palm groves, Kuttanad paddies & mangroves',
      fauna: 'White-throated Kingfisher & Brahminy Kite',
      culture: 'Nehru Trophy Snake Boat Race & Kathakali',
      badgeText: 'Coconut Palms · Kingfisher',
    },
  },
  {
    id: 'pathanamthitta',
    name: 'Pathanamthitta',
    regionLabel: 'South-Central Highlands',
    code: 'KL-03',
    tagline: 'Sabarimala forest corridor, Gavi eco-tourism & Pamba River basin',
    elevation: 0.56,
    accentHex: '#126458',
    polygon: [
      [-0.38, 3.02],
      [1.22, 3.02],
      [1.34, 3.74],
      [1.06, 4.22],
      [-0.36, 4.18],
    ],
    biodiversity: {
      biome: 'western_ghats',
      flora: 'Gavi evergreen spice, Rosewood & Pamba rainforests',
      fauna: 'Asian Elephant, Great Hornbill & Nilgiri Tahr',
      culture: 'Aranmula Vallamkali (Snake Boat Race) & Padayani',
      badgeText: 'Aranmula Vallamkali · Hornbill',
    },
  },
  {
    id: 'kollam',
    name: 'Kollam',
    regionLabel: 'South Kerala',
    code: 'KL-02',
    tagline: 'Ashtamudi Lake, Jatayu Earth’s Center & historic cashew port',
    elevation: 0.40,
    accentHex: '#1d4d66',
    polygon: [
      [-0.84, 3.86],
      [-0.46, 3.86],
      [-0.34, 4.30],
      [1.10, 4.34],
      [1.24, 5.18],
      [-0.34, 5.22],
      [-0.72, 4.58],
    ],
    biodiversity: {
      biome: 'coastal_backwaters',
      flora: 'Munroe Island mangroves & coconut palm backwaters',
      fauna: 'White-throated Kingfisher & Shendurney wildlife',
      culture: 'Kathakali birthplace (Kottarakkara) & Ashtamudi heritage',
      badgeText: 'Munroe Mangroves · Kathakali',
    },
  },
  {
    id: 'thiruvananthapuram',
    name: 'Thiruvananthapuram',
    regionLabel: 'Capital Region',
    code: 'KL-01',
    tagline: 'State capital, Technopark, Kovalam coast & Trivandrum Airport',
    elevation: 0.44,
    accentHex: '#1b4a68',
    polygon: [
      [-0.28, 5.34],
      [1.18, 5.30],
      [1.14, 6.08],
      [0.64, 6.68],
      [0.08, 6.48],
      [-0.24, 5.90],
    ],
    biodiversity: {
      biome: 'coastal_backwaters',
      flora: 'Agasthyamala biosphere herbs & Kovalam palm coast',
      fauna: 'Malabar Trogon & coastal kingfishers',
      culture: 'Padmanabhaswamy heritage, Swathi music & Kathakali',
      badgeText: 'Agasthyamala · Travancore Heritage',
    },
  },
];

export const KERALA_DISTRICTS: MapRegionNode[] = DISTRICT_SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  kind: 'district',
  regionLabel: spec.regionLabel,
  code: spec.code,
  tagline: spec.tagline,
  elevation: spec.elevation,
  accentHex: spec.accentHex,
  centroid: computePolygonCentroid(spec.polygon),
  polygon: spec.polygon,
  biodiversity: spec.biodiversity,
}));

export const INTERSTATE_GATEWAYS: MapRegionNode[] = [
  {
    id: 'mangaluru',
    name: 'Mangaluru',
    kind: 'gateway',
    regionLabel: 'Karnataka Coastal Gateway',
    code: 'KA-IXE',
    tagline: 'NH-66 Konkan rail & coastal corridor north of Kasaragod',
    elevation: 0.85,
    accentHex: '#38bdf8',
    centroid: { x: -3.15, y: -7.55 },
    biodiversity: {
      biome: 'interstate_gateway',
      flora: 'Coastal casuarina & Western Ghats foothill palms',
      fauna: 'Estuarine kingfishers & Konkan coastal marine life',
      culture: 'Yakshagana theatre & Tuluva coastal heritage',
      badgeText: 'Yakshagana · Konkan Coast',
    },
  },
  {
    id: 'mysuru',
    name: 'Mysuru',
    kind: 'gateway',
    regionLabel: 'Karnataka Heritage Gateway',
    code: 'KA-MYQ',
    tagline: 'Bandipur–Wayanad NH-766 corridor & royal palace hub',
    elevation: 0.92,
    accentHex: '#38bdf8',
    centroid: { x: 1.45, y: -5.25 },
    biodiversity: {
      biome: 'interstate_gateway',
      flora: 'Sandalwood groves & Bandipur dry deciduous forests',
      fauna: 'Bengal Tiger & Asian Elephant (Bandipur Tiger Reserve)',
      culture: 'Mysuru Dasara royal heritage & silk-sandalwood craft',
      badgeText: 'Bandipur Tiger · Sandalwood',
    },
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    kind: 'gateway',
    regionLabel: 'Karnataka Tech Metropolis',
    code: 'KA-BLR',
    tagline: 'Major South India rail, air & overnight KSRTC/Volvo corridor',
    elevation: 1.05,
    accentHex: '#38bdf8',
    centroid: { x: 3.65, y: -6.15 },
    biodiversity: {
      biome: 'interstate_gateway',
      flora: 'Sandalwood heritage, Rain-tree avenues & Lalbagh botanicals',
      fauna: 'Bannerghatta & Bandipur wildlife corridor',
      culture: 'Garden City civic-tech & Carnatic–Deccan heritage',
      badgeText: 'Sandalwood · Bandipur Gateway',
    },
  },
  {
    id: 'ooty',
    name: 'Ooty',
    kind: 'gateway',
    regionLabel: 'Tamil Nadu Nilgiris Gateway',
    code: 'TN-UDH',
    tagline: 'Nilgiri mountain highway via Gudalur & Wayanad ghats',
    elevation: 0.95,
    accentHex: '#f59e0b',
    centroid: { x: 2.15, y: -2.95 },
    biodiversity: {
      biome: 'interstate_gateway',
      flora: 'Nilgiri Shola forests, montane grasslands & Blue Mountains',
      fauna: 'Nilgiri Tahr, Gaur & Nilgiri Laughingthrush',
      culture: 'Toda indigenous craft & UNESCO Nilgiri Mountain Railway',
      badgeText: 'Nilgiri Shola · Blue Mountains',
    },
  },
  {
    id: 'coimbatore',
    name: 'Coimbatore',
    kind: 'gateway',
    regionLabel: 'Tamil Nadu Palakkad Gap Hub',
    code: 'TN-CJB',
    tagline: 'Nearest inter-state rail & airport hub across the Palakkad Pass',
    elevation: 0.95,
    accentHex: '#f59e0b',
    centroid: { x: 3.15, y: -0.95 },
    biodiversity: {
      biome: 'interstate_gateway',
      flora: 'Nilgiri Shola foothills & Siruvani evergreen watershed',
      fauna: 'Asian Elephant corridors & Anamalai wildlife',
      culture: 'Kongu Nadu textiles & Western Ghats temple heritage',
      badgeText: 'Nilgiri Foothills · Siruvani',
    },
  },
  {
    id: 'chennai',
    name: 'Chennai',
    kind: 'gateway',
    regionLabel: 'Tamil Nadu East Coast Hub',
    code: 'TN-MAA',
    tagline: 'Southern Railway HQ, Chennai Central & East Coast air gateway',
    elevation: 1.05,
    accentHex: '#f59e0b',
    centroid: { x: 4.55, y: -3.45 },
    biodiversity: {
      biome: 'interstate_gateway',
      flora: 'Coromandel coastal scrub, Guindy forest & Pichavaram corridor',
      fauna: 'Blackbuck, Olive Ridley nesting coast & wetland pelicans',
      culture: 'Bharatanatyam, Margazhi music & Dravidian temple culture',
      badgeText: 'Bharatanatyam · Dravidian Heritage',
    },
  },
];

export const ALL_MAP_REGIONS: MapRegionNode[] = [
  ...KERALA_DISTRICTS,
  ...INTERSTATE_GATEWAYS,
];

export const QUICK_JUMP_IDS: string[] = [
  'wayanad',
  'idukki',
  'ernakulam',
  'alappuzha',
  'thiruvananthapuram',
  'bengaluru',
  'coimbatore',
  'ooty',
  'chennai',
];

/**
 * Curated subset of high-impact ecological/cultural badges displayed simultaneously
 * when the Biodiversity & Culture 3D overlay is enabled so badges stay clean and non-overlapping.
 */
export const FEATURED_BIODIVERSITY_BADGE_IDS = new Set<string>([
  'pathanamthitta',
  'idukki',
  'wayanad',
  'alappuzha',
  'ernakulam',
  'kasaragod',
  'mysuru',
  'ooty',
  'chennai',
]);

export function getRegionById(id: string): MapRegionNode | undefined {
  return ALL_MAP_REGIONS.find((r) => r.id === id);
}

export function getRegionByName(name: string): MapRegionNode | undefined {
  const normalized = name.trim().toLowerCase();
  return ALL_MAP_REGIONS.find((r) => r.name.toLowerCase() === normalized);
}
