import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';

export type IndiaBiome =
  | 'himalayan'
  | 'desert'
  | 'ghats'
  | 'coastal'
  | 'plains'
  | 'deccan'
  | 'northeast'
  | 'island';

export interface IndiaStateSpec {
  id: string;
  slug: string;
  name: string;
  isUT: boolean;
  capital: string;
  code: string;
  lat: number;
  lon: number;
  biome: IndiaBiome;
  peakElevation: number;
  majorCities: Array<{ name: string; lat: number; lon: number; isCapital?: boolean }>;
  districts: string[];
  /** Geographic [lon, lat] fallback outline polygon so Whole India & State Relief render cleanly offline */
  fallbackPolygon: Array<[number, number]>;
}

export interface IndiaRiverPath {
  id: string;
  name: string;
  points: Array<[number, number]>; // [lon, lat]
}

export interface GeoFeatureSimple {
  id: string;
  name: string;
  rings: Array<Array<[number, number]>>; // array of rings of [lon, lat]
}

// Helper to build clean organic regional polygons around a centroid when remote TopoJSON is offline
function makeFallbackOutline(
  lon: number,
  lat: number,
  rx: number,
  ry: number,
  seed: number
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const wobble =
      1 +
      0.16 * Math.sin(angle * 3 + seed * 1.7) +
      0.09 * Math.cos(angle * 5 - seed * 0.9);
    pts.push([
      Number((lon + Math.cos(angle) * rx * wobble).toFixed(3)),
      Number((lat + Math.sin(angle) * ry * wobble).toFixed(3)),
    ]);
  }
  return pts;
}

export const INDIA_STATES_AND_UTS: IndiaStateSpec[] = [
  {
    id: 'kerala',
    slug: 'kerala',
    name: 'Kerala',
    isUT: false,
    capital: 'Thiruvananthapuram',
    code: 'KL',
    lat: 10.35,
    lon: 76.45,
    biome: 'ghats',
    peakElevation: 0.72,
    majorCities: [
      { name: 'Thiruvananthapuram', lat: 8.52, lon: 76.93, isCapital: true },
      { name: 'Pathanamthitta', lat: 9.26, lon: 76.78 },
      { name: 'Kochi', lat: 9.93, lon: 76.26 },
      { name: 'Kozhikode', lat: 11.25, lon: 75.78 },
      { name: 'Wayanad', lat: 11.68, lon: 76.13 },
    ],
    districts: [
      'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam',
      'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram',
      'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod',
    ],
    fallbackPolygon: [
      [74.9, 12.75], [75.45, 12.4], [76.25, 11.85], [76.75, 10.9], [77.25, 10.15],
      [77.25, 9.25], [77.15, 8.32], [76.85, 8.45], [76.55, 8.95], [76.28, 9.65],
      [76.15, 10.35], [75.8, 11.25], [75.3, 12.0], [74.9, 12.75],
    ],
  },
  {
    id: 'tamil-nadu',
    slug: 'tamilnadu',
    name: 'Tamil Nadu',
    isUT: false,
    capital: 'Chennai',
    code: 'TN',
    lat: 11.12,
    lon: 78.65,
    biome: 'coastal',
    peakElevation: 0.56,
    majorCities: [
      { name: 'Chennai', lat: 13.08, lon: 80.27, isCapital: true },
      { name: 'Coimbatore', lat: 11.01, lon: 76.95 },
      { name: 'Madurai', lat: 9.92, lon: 78.12 },
      { name: 'Ooty', lat: 11.41, lon: 76.69 },
    ],
    districts: ['Chennai', 'Coimbatore', 'Madurai', 'Nilgiris', 'Kanyakumari', 'Salem', 'Tiruchirappalli', 'Thanjavur'],
    fallbackPolygon: [
      [77.2, 8.1], [78.2, 8.7], [79.85, 10.3], [80.32, 13.35], [79.1, 13.15],
      [77.6, 12.6], [76.6, 11.5], [77.25, 10.15], [77.2, 8.1],
    ],
  },
  {
    id: 'karnataka',
    slug: 'karnataka',
    name: 'Karnataka',
    isUT: false,
    capital: 'Bengaluru',
    code: 'KA',
    lat: 15.1,
    lon: 75.9,
    biome: 'ghats',
    peakElevation: 0.62,
    majorCities: [
      { name: 'Bengaluru', lat: 12.97, lon: 77.59, isCapital: true },
      { name: 'Mysuru', lat: 12.29, lon: 76.63 },
      { name: 'Mangaluru', lat: 12.91, lon: 74.85 },
      { name: 'Hubballi', lat: 15.36, lon: 75.12 },
    ],
    districts: ['Bengaluru Urban', 'Mysuru', 'Kodagu', 'Dakshina Kannada', 'Udupi', 'Belagavi', 'Shivamogga', 'Ballari'],
    fallbackPolygon: [
      [74.1, 15.8], [75.8, 17.8], [77.5, 17.9], [77.8, 15.1], [78.4, 13.1],
      [77.4, 11.8], [75.9, 11.9], [74.85, 12.75], [74.4, 14.5], [74.1, 15.8],
    ],
  },
  {
    id: 'goa',
    slug: 'goa',
    name: 'Goa',
    isUT: false,
    capital: 'Panaji',
    code: 'GA',
    lat: 15.35,
    lon: 74.05,
    biome: 'coastal',
    peakElevation: 0.35,
    majorCities: [
      { name: 'Panaji', lat: 15.49, lon: 73.82, isCapital: true },
      { name: 'Madgaon', lat: 15.28, lon: 73.95 },
    ],
    districts: ['North Goa', 'South Goa'],
    fallbackPolygon: makeFallbackOutline(74.05, 15.35, 0.42, 0.52, 4),
  },
  {
    id: 'andhra-pradesh',
    slug: 'andhrapradesh',
    name: 'Andhra Pradesh',
    isUT: false,
    capital: 'Amaravati',
    code: 'AP',
    lat: 15.9,
    lon: 79.75,
    biome: 'coastal',
    peakElevation: 0.46,
    majorCities: [
      { name: 'Amaravati', lat: 16.51, lon: 80.51, isCapital: true },
      { name: 'Visakhapatnam', lat: 17.68, lon: 83.21 },
      { name: 'Tirupati', lat: 13.62, lon: 79.41 },
    ],
    districts: ['Visakhapatnam', 'Guntur', 'Krishna', 'Tirupati', 'Kurnool', 'Anantapur', 'East Godavari'],
    fallbackPolygon: [
      [77.6, 13.6], [79.9, 13.5], [80.9, 15.8], [83.6, 17.9], [84.6, 19.0],
      [81.6, 17.7], [79.5, 16.6], [77.4, 15.4], [77.6, 13.6],
    ],
  },
  {
    id: 'telangana',
    slug: 'telangana',
    name: 'Telangana',
    isUT: false,
    capital: 'Hyderabad',
    code: 'TS',
    lat: 17.85,
    lon: 79.05,
    biome: 'deccan',
    peakElevation: 0.44,
    majorCities: [
      { name: 'Hyderabad', lat: 17.38, lon: 78.48, isCapital: true },
      { name: 'Warangal', lat: 17.96, lon: 79.59 },
    ],
    districts: ['Hyderabad', 'Rangareddy', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar'],
    fallbackPolygon: makeFallbackOutline(79.05, 17.85, 1.55, 1.4, 6),
  },
  {
    id: 'maharashtra',
    slug: 'maharashtra',
    name: 'Maharashtra',
    isUT: false,
    capital: 'Mumbai',
    code: 'MH',
    lat: 19.4,
    lon: 75.7,
    biome: 'deccan',
    peakElevation: 0.58,
    majorCities: [
      { name: 'Mumbai', lat: 19.07, lon: 72.87, isCapital: true },
      { name: 'Pune', lat: 18.52, lon: 73.85 },
      { name: 'Nagpur', lat: 21.14, lon: 79.08 },
      { name: 'Nashik', lat: 19.99, lon: 73.78 },
    ],
    districts: ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Chhatrapati Sambhajinagar', 'Kolhapur', 'Ratnagiri'],
    fallbackPolygon: [
      [72.8, 20.2], [74.4, 21.6], [78.2, 21.4], [80.6, 21.0], [80.2, 18.9],
      [77.5, 18.0], [74.3, 16.0], [73.4, 16.0], [72.85, 18.9], [72.8, 20.2],
    ],
  },
  {
    id: 'gujarat',
    slug: 'gujarat',
    name: 'Gujarat',
    isUT: false,
    capital: 'Gandhinagar',
    code: 'GJ',
    lat: 22.45,
    lon: 71.45,
    biome: 'desert',
    peakElevation: 0.42,
    majorCities: [
      { name: 'Gandhinagar', lat: 23.21, lon: 72.63, isCapital: true },
      { name: 'Ahmedabad', lat: 23.02, lon: 72.57 },
      { name: 'Surat', lat: 21.17, lon: 72.83 },
      { name: 'Kutch (Bhuj)', lat: 23.24, lon: 69.66 },
    ],
    districts: ['Ahmedabad', 'Gandhinagar', 'Surat', 'Vadodara', 'Rajkot', 'Kutch', 'Junagadh', 'Jamnagar'],
    fallbackPolygon: [
      [68.4, 23.6], [71.2, 24.5], [73.8, 24.2], [74.2, 21.5], [72.8, 20.3],
      [72.2, 21.6], [70.2, 20.9], [68.9, 22.4], [68.4, 23.6],
    ],
  },
  {
    id: 'rajasthan',
    slug: 'rajasthan',
    name: 'Rajasthan',
    isUT: false,
    capital: 'Jaipur',
    code: 'RJ',
    lat: 26.6,
    lon: 73.8,
    biome: 'desert',
    peakElevation: 0.48,
    majorCities: [
      { name: 'Jaipur', lat: 26.91, lon: 75.78, isCapital: true },
      { name: 'Jodhpur', lat: 26.23, lon: 73.02 },
      { name: 'Udaipur', lat: 24.58, lon: 73.71 },
      { name: 'Jaisalmer', lat: 26.91, lon: 70.9 },
    ],
    districts: ['Jaipur', 'Jodhpur', 'Udaipur', 'Jaisalmer', 'Bikaner', 'Ajmer', 'Kota', 'Mount Abu (Sirohi)'],
    fallbackPolygon: [
      [69.6, 26.8], [73.6, 29.9], [76.2, 28.1], [77.9, 26.7], [76.6, 24.3],
      [74.0, 23.4], [71.1, 24.6], [69.6, 26.8],
    ],
  },
  {
    id: 'madhya-pradesh',
    slug: 'madhyapradesh',
    name: 'Madhya Pradesh',
    isUT: false,
    capital: 'Bhopal',
    code: 'MP',
    lat: 23.4,
    lon: 78.1,
    biome: 'deccan',
    peakElevation: 0.5,
    majorCities: [
      { name: 'Bhopal', lat: 23.25, lon: 77.41, isCapital: true },
      { name: 'Indore', lat: 22.71, lon: 75.85 },
      { name: 'Gwalior', lat: 26.21, lon: 78.18 },
      { name: 'Jabalpur', lat: 23.18, lon: 79.98 },
    ],
    districts: ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Rewa', 'Khajuraho (Chhatarpur)'],
    fallbackPolygon: [
      [74.3, 22.8], [76.5, 25.1], [78.6, 26.3], [82.5, 24.4], [81.6, 21.9],
      [78.2, 21.5], [74.4, 21.6], [74.3, 22.8],
    ],
  },
  {
    id: 'chhattisgarh',
    slug: 'chhattisgarh',
    name: 'Chhattisgarh',
    isUT: false,
    capital: 'Raipur',
    code: 'CG',
    lat: 21.3,
    lon: 81.9,
    biome: 'deccan',
    peakElevation: 0.48,
    majorCities: [
      { name: 'Raipur', lat: 21.25, lon: 81.62, isCapital: true },
      { name: 'Bilaspur', lat: 22.07, lon: 82.14 },
    ],
    districts: ['Raipur', 'Bilaspur', 'Durg', 'Bastar', 'Korba', 'Raigarh'],
    fallbackPolygon: makeFallbackOutline(81.9, 21.3, 1.3, 2.2, 11),
  },
  {
    id: 'odisha',
    slug: 'odisha',
    name: 'Odisha',
    isUT: false,
    capital: 'Bhubaneswar',
    code: 'OD',
    lat: 20.5,
    lon: 84.5,
    biome: 'coastal',
    peakElevation: 0.48,
    majorCities: [
      { name: 'Bhubaneswar', lat: 20.29, lon: 85.82, isCapital: true },
      { name: 'Puri', lat: 19.81, lon: 85.83 },
      { name: 'Cuttack', lat: 20.46, lon: 85.88 },
    ],
    districts: ['Khordha', 'Puri', 'Cuttack', 'Ganjam', 'Sambalpur', 'Koraput'],
    fallbackPolygon: makeFallbackOutline(84.6, 20.4, 2.0, 1.5, 12),
  },
  {
    id: 'west-bengal',
    slug: 'westbengal',
    name: 'West Bengal',
    isUT: false,
    capital: 'Kolkata',
    code: 'WB',
    lat: 23.4,
    lon: 87.9,
    biome: 'plains',
    peakElevation: 0.52,
    majorCities: [
      { name: 'Kolkata', lat: 22.57, lon: 88.36, isCapital: true },
      { name: 'Darjeeling', lat: 27.04, lon: 88.26 },
      { name: 'Siliguri', lat: 26.72, lon: 88.39 },
    ],
    districts: ['Kolkata', 'Darjeeling', 'Howrah', 'North 24 Parganas', 'Siliguri', 'Purba Medinipur'],
    fallbackPolygon: [
      [86.5, 22.0], [88.9, 21.7], [89.2, 26.7], [88.1, 27.1], [87.8, 25.0],
      [86.1, 23.5], [86.5, 22.0],
    ],
  },
  {
    id: 'jharkhand',
    slug: 'jharkhand',
    name: 'Jharkhand',
    isUT: false,
    capital: 'Ranchi',
    code: 'JH',
    lat: 23.6,
    lon: 85.3,
    biome: 'deccan',
    peakElevation: 0.46,
    majorCities: [
      { name: 'Ranchi', lat: 23.34, lon: 85.31, isCapital: true },
      { name: 'Jamshedpur', lat: 22.8, lon: 86.2 },
    ],
    districts: ['Ranchi', 'East Singhbhum', 'Dhanbad', 'Bokaro', 'Hazaribagh'],
    fallbackPolygon: makeFallbackOutline(85.3, 23.6, 1.6, 1.1, 14),
  },
  {
    id: 'bihar',
    slug: 'bihar',
    name: 'Bihar',
    isUT: false,
    capital: 'Patna',
    code: 'BR',
    lat: 25.7,
    lon: 85.6,
    biome: 'plains',
    peakElevation: 0.34,
    majorCities: [
      { name: 'Patna', lat: 25.59, lon: 85.13, isCapital: true },
      { name: 'Gaya', lat: 24.79, lon: 85.0 },
    ],
    districts: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Nalanda', 'Darbhanga'],
    fallbackPolygon: makeFallbackOutline(85.6, 25.7, 2.0, 1.1, 15),
  },
  {
    id: 'uttar-pradesh',
    slug: 'uttarpradesh',
    name: 'Uttar Pradesh',
    isUT: false,
    capital: 'Lucknow',
    code: 'UP',
    lat: 27.0,
    lon: 80.5,
    biome: 'plains',
    peakElevation: 0.38,
    majorCities: [
      { name: 'Lucknow', lat: 26.84, lon: 80.94, isCapital: true },
      { name: 'Varanasi', lat: 25.31, lon: 82.97 },
      { name: 'Agra', lat: 27.17, lon: 78.0 },
      { name: 'Prayagraj', lat: 25.43, lon: 81.84 },
    ],
    districts: ['Lucknow', 'Varanasi', 'Agra', 'Prayagraj', 'Gautam Buddha Nagar (Noida)', 'Kanpur', 'Ayodhya'],
    fallbackPolygon: [
      [77.4, 29.8], [80.8, 28.6], [84.3, 26.9], [83.4, 24.3], [78.4, 25.5],
      [77.4, 27.2], [77.4, 29.8],
    ],
  },
  {
    id: 'delhi',
    slug: 'delhi',
    name: 'Delhi (NCT)',
    isUT: true,
    capital: 'New Delhi',
    code: 'DL',
    lat: 28.61,
    lon: 77.21,
    biome: 'plains',
    peakElevation: 0.36,
    majorCities: [{ name: 'New Delhi', lat: 28.61, lon: 77.21, isCapital: true }],
    districts: ['New Delhi', 'Central Delhi', 'South Delhi', 'North Delhi', 'West Delhi', 'East Delhi'],
    fallbackPolygon: makeFallbackOutline(77.21, 28.61, 0.32, 0.32, 17),
  },
  {
    id: 'haryana',
    slug: 'haryana',
    name: 'Haryana',
    isUT: false,
    capital: 'Chandigarh',
    code: 'HR',
    lat: 29.1,
    lon: 76.1,
    biome: 'plains',
    peakElevation: 0.36,
    majorCities: [
      { name: 'Gurugram', lat: 28.45, lon: 77.02 },
      { name: 'Chandigarh', lat: 30.73, lon: 76.77, isCapital: true },
    ],
    districts: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Hisar', 'Kurukshetra'],
    fallbackPolygon: makeFallbackOutline(76.1, 29.1, 1.1, 1.15, 18),
  },
  {
    id: 'punjab',
    slug: 'punjab',
    name: 'Punjab',
    isUT: false,
    capital: 'Chandigarh',
    code: 'PB',
    lat: 31.0,
    lon: 75.3,
    biome: 'plains',
    peakElevation: 0.4,
    majorCities: [
      { name: 'Amritsar', lat: 31.63, lon: 74.87 },
      { name: 'Ludhiana', lat: 30.9, lon: 75.85 },
      { name: 'Chandigarh', lat: 30.73, lon: 76.77, isCapital: true },
    ],
    districts: ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Mohali', 'Bathinda'],
    fallbackPolygon: makeFallbackOutline(75.3, 31.0, 1.2, 1.0, 19),
  },
  {
    id: 'chandigarh',
    slug: 'chandigarh',
    name: 'Chandigarh',
    isUT: true,
    capital: 'Chandigarh',
    code: 'CH',
    lat: 30.73,
    lon: 76.78,
    biome: 'plains',
    peakElevation: 0.36,
    majorCities: [{ name: 'Chandigarh', lat: 30.73, lon: 76.78, isCapital: true }],
    districts: ['Chandigarh'],
    fallbackPolygon: makeFallbackOutline(76.78, 30.73, 0.2, 0.2, 20),
  },
  {
    id: 'uttarakhand',
    slug: 'uttarakhand',
    name: 'Uttarakhand',
    isUT: false,
    capital: 'Dehradun',
    code: 'UK',
    lat: 30.2,
    lon: 79.2,
    biome: 'himalayan',
    peakElevation: 0.92,
    majorCities: [
      { name: 'Dehradun', lat: 30.31, lon: 78.03, isCapital: true },
      { name: 'Nainital', lat: 29.39, lon: 79.45 },
      { name: 'Rishikesh', lat: 30.08, lon: 78.26 },
    ],
    districts: ['Dehradun', 'Nainital', 'Haridwar', 'Chamoli', 'Uttarkashi', 'Almora'],
    fallbackPolygon: makeFallbackOutline(79.2, 30.2, 1.45, 0.95, 21),
  },
  {
    id: 'himachal-pradesh',
    slug: 'himachalpradesh',
    name: 'Himachal Pradesh',
    isUT: false,
    capital: 'Shimla',
    code: 'HP',
    lat: 32.0,
    lon: 77.2,
    biome: 'himalayan',
    peakElevation: 0.96,
    majorCities: [
      { name: 'Shimla', lat: 31.1, lon: 77.17, isCapital: true },
      { name: 'Manali', lat: 32.24, lon: 77.18 },
      { name: 'Dharamshala', lat: 32.21, lon: 76.32 },
    ],
    districts: ['Shimla', 'Kullu', 'Kangra', 'Lahaul & Spiti', 'Kinnaur', 'Mandi'],
    fallbackPolygon: makeFallbackOutline(77.2, 32.0, 1.35, 1.05, 22),
  },
  {
    id: 'jammu-kashmir',
    slug: 'jammukashmir',
    name: 'Jammu & Kashmir',
    isUT: true,
    capital: 'Srinagar',
    code: 'JK',
    lat: 33.7,
    lon: 75.1,
    biome: 'himalayan',
    peakElevation: 1.05,
    majorCities: [
      { name: 'Srinagar', lat: 34.08, lon: 74.79, isCapital: true },
      { name: 'Jammu', lat: 32.72, lon: 74.85 },
      { name: 'Gulmarg', lat: 34.04, lon: 74.38 },
    ],
    districts: ['Srinagar', 'Jammu', 'Baramulla', 'Anantnag', 'Udhampur', 'Kupwara'],
    fallbackPolygon: makeFallbackOutline(75.1, 33.7, 1.5, 1.3, 23),
  },
  {
    id: 'ladakh',
    slug: 'ladakh',
    name: 'Ladakh',
    isUT: true,
    capital: 'Leh',
    code: 'LA',
    lat: 34.5,
    lon: 77.9,
    biome: 'himalayan',
    peakElevation: 1.15,
    majorCities: [
      { name: 'Leh', lat: 34.15, lon: 77.57, isCapital: true },
      { name: 'Kargil', lat: 34.55, lon: 76.13 },
    ],
    districts: ['Leh', 'Kargil'],
    fallbackPolygon: makeFallbackOutline(77.9, 34.5, 1.85, 1.5, 24),
  },
  {
    id: 'sikkim',
    slug: 'sikkim',
    name: 'Sikkim',
    isUT: false,
    capital: 'Gangtok',
    code: 'SK',
    lat: 27.53,
    lon: 88.51,
    biome: 'himalayan',
    peakElevation: 0.98,
    majorCities: [{ name: 'Gangtok', lat: 27.33, lon: 88.61, isCapital: true }],
    districts: ['Gangtok', 'Mangan', 'Namchi', 'Gyalshing'],
    fallbackPolygon: makeFallbackOutline(88.51, 27.53, 0.45, 0.55, 25),
  },
  {
    id: 'assam',
    slug: 'assam',
    name: 'Assam',
    isUT: false,
    capital: 'Dispur',
    code: 'AS',
    lat: 26.2,
    lon: 92.9,
    biome: 'northeast',
    peakElevation: 0.55,
    majorCities: [
      { name: 'Guwahati', lat: 26.14, lon: 91.73 },
      { name: 'Dispur', lat: 26.14, lon: 91.78, isCapital: true },
      { name: 'Dibrugarh', lat: 27.47, lon: 94.91 },
    ],
    districts: ['Kamrup Metropolitan', 'Jorhat', 'Dibrugarh', 'Kaziranga (Golaghat)', 'Silchar (Cachar)'],
    fallbackPolygon: makeFallbackOutline(92.9, 26.2, 2.3, 1.0, 26),
  },
  {
    id: 'arunachal-pradesh',
    slug: 'arunachalpradesh',
    name: 'Arunachal Pradesh',
    isUT: false,
    capital: 'Itanagar',
    code: 'AR',
    lat: 28.1,
    lon: 94.6,
    biome: 'himalayan',
    peakElevation: 0.95,
    majorCities: [
      { name: 'Itanagar', lat: 27.08, lon: 93.6, isCapital: true },
      { name: 'Tawang', lat: 27.58, lon: 91.86 },
    ],
    districts: ['Tawang', 'Papum Pare', 'Lower Subansiri', 'West Kameng', 'Lohit'],
    fallbackPolygon: makeFallbackOutline(94.6, 28.1, 2.3, 1.1, 27),
  },
  {
    id: 'meghalaya',
    slug: 'meghalaya',
    name: 'Meghalaya',
    isUT: false,
    capital: 'Shillong',
    code: 'ML',
    lat: 25.5,
    lon: 91.3,
    biome: 'northeast',
    peakElevation: 0.72,
    majorCities: [
      { name: 'Shillong', lat: 25.57, lon: 91.89, isCapital: true },
      { name: 'Cherrapunji', lat: 25.27, lon: 91.73 },
    ],
    districts: ['East Khasi Hills', 'West Garo Hills', 'Ri-Bhoi', 'Jaintia Hills'],
    fallbackPolygon: makeFallbackOutline(91.3, 25.5, 1.15, 0.52, 28),
  },
  {
    id: 'nagaland',
    slug: 'nagaland',
    name: 'Nagaland',
    isUT: false,
    capital: 'Kohima',
    code: 'NL',
    lat: 26.1,
    lon: 94.5,
    biome: 'northeast',
    peakElevation: 0.74,
    majorCities: [{ name: 'Kohima', lat: 25.67, lon: 94.1, isCapital: true }],
    districts: ['Kohima', 'Dimapur', 'Mokokchung', 'Mon'],
    fallbackPolygon: makeFallbackOutline(94.5, 26.1, 0.65, 0.85, 29),
  },
  {
    id: 'manipur',
    slug: 'manipur',
    name: 'Manipur',
    isUT: false,
    capital: 'Imphal',
    code: 'MN',
    lat: 24.7,
    lon: 93.9,
    biome: 'northeast',
    peakElevation: 0.7,
    majorCities: [{ name: 'Imphal', lat: 24.81, lon: 93.93, isCapital: true }],
    districts: ['Imphal West', 'Imphal East', 'Bishnupur', 'Ukhrul'],
    fallbackPolygon: makeFallbackOutline(93.9, 24.7, 0.68, 0.78, 30),
  },
  {
    id: 'mizoram',
    slug: 'mizoram',
    name: 'Mizoram',
    isUT: false,
    capital: 'Aizawl',
    code: 'MZ',
    lat: 23.2,
    lon: 92.8,
    biome: 'northeast',
    peakElevation: 0.68,
    majorCities: [{ name: 'Aizawl', lat: 23.72, lon: 92.71, isCapital: true }],
    districts: ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip'],
    fallbackPolygon: makeFallbackOutline(92.8, 23.2, 0.55, 0.92, 31),
  },
  {
    id: 'tripura',
    slug: 'tripura',
    name: 'Tripura',
    isUT: false,
    capital: 'Agartala',
    code: 'TR',
    lat: 23.8,
    lon: 91.7,
    biome: 'northeast',
    peakElevation: 0.48,
    majorCities: [{ name: 'Agartala', lat: 23.83, lon: 91.28, isCapital: true }],
    districts: ['West Tripura', 'South Tripura', 'Gomati', 'North Tripura'],
    fallbackPolygon: makeFallbackOutline(91.7, 23.8, 0.52, 0.68, 32),
  },
  {
    id: 'puducherry',
    slug: 'puducherry',
    name: 'Puducherry',
    isUT: true,
    capital: 'Puducherry',
    code: 'PY',
    lat: 11.94,
    lon: 79.81,
    biome: 'coastal',
    peakElevation: 0.28,
    majorCities: [{ name: 'Puducherry', lat: 11.94, lon: 79.81, isCapital: true }],
    districts: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
    fallbackPolygon: makeFallbackOutline(79.81, 11.94, 0.28, 0.28, 33),
  },
  {
    id: 'dnh-dd',
    slug: 'dnh-and-dd',
    name: 'Dadra & Nagar Haveli and Daman & Diu',
    isUT: true,
    capital: 'Daman',
    code: 'DN',
    lat: 20.39,
    lon: 72.83,
    biome: 'coastal',
    peakElevation: 0.28,
    majorCities: [{ name: 'Daman', lat: 20.39, lon: 72.83, isCapital: true }],
    districts: ['Daman', 'Diu', 'Dadra & Nagar Haveli'],
    fallbackPolygon: makeFallbackOutline(72.83, 20.39, 0.28, 0.25, 34),
  },
  {
    id: 'lakshadweep',
    slug: 'lakshadweep',
    name: 'Lakshadweep',
    isUT: true,
    capital: 'Kavaratti',
    code: 'LD',
    lat: 10.57,
    lon: 72.64,
    biome: 'island',
    peakElevation: 0.24,
    majorCities: [{ name: 'Kavaratti', lat: 10.57, lon: 72.64, isCapital: true }],
    districts: ['Kavaratti', 'Agatti', 'Minicoy', 'Bangaram'],
    fallbackPolygon: makeFallbackOutline(72.64, 10.57, 0.35, 0.45, 35),
  },
  {
    id: 'andaman-nicobar',
    slug: 'andamannicobar',
    name: 'Andaman & Nicobar Islands',
    isUT: true,
    capital: 'Sri Vijaya Puram (Port Blair)',
    code: 'AN',
    lat: 11.62,
    lon: 92.73,
    biome: 'island',
    peakElevation: 0.45,
    majorCities: [{ name: 'Port Blair', lat: 11.62, lon: 92.73, isCapital: true }],
    districts: ['South Andaman', 'North & Middle Andaman', 'Nicobar'],
    fallbackPolygon: makeFallbackOutline(92.73, 11.62, 0.45, 1.35, 36),
  },
];

export const INDIA_MAJOR_RIVERS: IndiaRiverPath[] = [
  {
    id: 'ganga',
    name: 'Ganga',
    points: [[78.9, 30.8], [78.1, 29.9], [80.3, 26.5], [82.9, 25.3], [85.2, 25.6], [88.3, 22.4]],
  },
  {
    id: 'brahmaputra',
    name: 'Brahmaputra',
    points: [[95.3, 28.0], [94.1, 27.1], [92.6, 26.5], [91.7, 26.2], [90.1, 26.0]],
  },
  {
    id: 'narmada',
    name: 'Narmada',
    points: [[81.7, 22.7], [79.5, 23.0], [76.8, 22.3], [74.5, 21.8], [72.9, 21.7]],
  },
  {
    id: 'godavari',
    name: 'Godavari',
    points: [[73.8, 19.9], [76.5, 19.2], [79.1, 18.8], [81.6, 17.0], [82.2, 16.7]],
  },
  {
    id: 'krishna',
    name: 'Krishna',
    points: [[73.7, 17.9], [76.2, 16.2], [78.8, 16.0], [80.6, 16.5], [81.0, 15.8]],
  },
  {
    id: 'kaveri',
    name: 'Kaveri',
    points: [[75.5, 12.4], [76.8, 12.2], [77.8, 11.6], [78.8, 10.9], [79.8, 11.1]],
  },
  {
    id: 'periyar-pamba',
    name: 'Periyar & Pamba',
    points: [[77.15, 9.45], [76.95, 9.75], [76.6, 10.05], [76.22, 10.18]],
  },
];

export function getIndiaStateByIdOrSlug(key: string): IndiaStateSpec {
  const norm = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const found = INDIA_STATES_AND_UTS.find((s) => {
    const idNorm = s.id.replace(/[^a-z0-9]/g, '');
    const slugNorm = s.slug.replace(/[^a-z0-9]/g, '');
    const nameNorm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      idNorm === norm ||
      slugNorm === norm ||
      nameNorm === norm ||
      nameNorm.includes(norm) ||
      norm.includes(slugNorm)
    );
  });
  return found ?? INDIA_STATES_AND_UTS[0]; // Default Kerala
}

const INDIA_TOPO_CACHE = new Map<string, GeoFeatureSimple[]>();

function extractSimpleFeaturesFromTopo(raw: unknown): GeoFeatureSimple[] {
  if (!raw || typeof raw !== 'object') return [];
  const topo = raw as Topology<Record<string, GeometryCollection>>;
  if (topo.type !== 'Topology' || !topo.objects) return [];
  const objectKey = Object.keys(topo.objects)[0];
  if (!objectKey) return [];
  const fc = feature(topo, topo.objects[objectKey]);
  if (!fc || fc.type !== 'FeatureCollection') return [];

  const out: GeoFeatureSimple[] = [];
  for (let i = 0; i < fc.features.length; i++) {
    const f = fc.features[i];
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const rawName = String(
      props.st_nm || props.ST_NM || props.district || props.DISTRICT || props.name || props.NAME_1 || props.NAME_2 || `Region ${i + 1}`
    ).trim();
    const geom = f.geometry;
    if (!geom) continue;
    const rings: Array<Array<[number, number]>> = [];
    if (geom.type === 'Polygon') {
      if (geom.coordinates[0]?.length >= 3) {
        rings.push(geom.coordinates[0].map((pt) => [pt[0], pt[1]]));
      }
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        if (poly[0]?.length >= 3) {
          rings.push(poly[0].map((pt) => [pt[0], pt[1]]));
        }
      }
    }
    if (rings.length > 0) {
      out.push({
        id: `${rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i}`,
        name: rawName,
        rings,
      });
    }
  }
  return out;
}

export async function fetchIndiaWholeTopoJson(): Promise<GeoFeatureSimple[]> {
  const cached = INDIA_TOPO_CACHE.get('__whole_india__');
  if (cached) return cached;
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5500);
    const resp = await fetch(
      'https://raw.githubusercontent.com/udit-001/india-maps-data/main/topojson/india.json',
      { signal: controller.signal }
    );
    window.clearTimeout(timer);
    if (resp.ok) {
      const json = await resp.json();
      const parsed = extractSimpleFeaturesFromTopo(json);
      if (parsed.length >= 20) {
        INDIA_TOPO_CACHE.set('__whole_india__', parsed);
        return parsed;
      }
    }
  } catch {
    // Fallback cleanly to built-in polygons
  }
  const fallback: GeoFeatureSimple[] = INDIA_STATES_AND_UTS.map((st) => ({
    id: st.id,
    name: st.name,
    rings: [st.fallbackPolygon],
  }));
  INDIA_TOPO_CACHE.set('__whole_india__', fallback);
  return fallback;
}

export async function fetchIndiaStateTopoJson(state: IndiaStateSpec): Promise<GeoFeatureSimple[]> {
  const cacheKey = `state:${state.slug}`;
  const cached = INDIA_TOPO_CACHE.get(cacheKey);
  if (cached) return cached;
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5500);
    const resp = await fetch(
      `https://raw.githubusercontent.com/udit-001/india-maps-data/main/topojson/states/${encodeURIComponent(
        state.slug
      )}.json`,
      { signal: controller.signal }
    );
    window.clearTimeout(timer);
    if (resp.ok) {
      const json = await resp.json();
      const parsed = extractSimpleFeaturesFromTopo(json);
      if (parsed.length > 0) {
        INDIA_TOPO_CACHE.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch {
    // Fallback cleanly to built-in state polygon + synthetic district sub-slabs
  }

  // Deterministic fallback state slab
  const fallback: GeoFeatureSimple[] = [
    {
      id: state.id,
      name: state.name,
      rings: [state.fallbackPolygon],
    },
  ];
  INDIA_TOPO_CACHE.set(cacheKey, fallback);
  return fallback;
}
