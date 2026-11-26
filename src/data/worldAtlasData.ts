export type WorldBiome = 'tropical' | 'temperate' | 'desert' | 'alpine' | 'polar' | 'coastal';

export interface WorldCityHub {
  id: string;
  name: string;
  iata: string;
  airportName: string;
  lat: number;
  lon: number;
  keralaDistrictId?: string;
}

export interface WorldStateRegion {
  id: string;
  name: string;
  cities: WorldCityHub[];
}

export interface WorldCountryEntry {
  isoNumeric: string;
  iso2: string;
  name: string;
  continent: string;
  currency: string;
  timezone: string;
  lat: number;
  lon: number;
  biome: WorldBiome;
  states: WorldStateRegion[];
}

export interface AirlineLiverySpec {
  code: string;
  name: string;
  accentHex: string;
  secondaryHex: string;
  cabinCarpetHex: string;
  hubIata: string;
  isInternational: boolean;
  defaultAircraft: string;
  isWideBody: boolean;
}

export interface LiveAirspaceFlight {
  id: string;
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  aircraft: string;
  fromCity: string;
  fromIata: string;
  fromLat: number;
  fromLon: number;
  toCity: string;
  toIata: string;
  toLat: number;
  toLon: number;
  altitudeFt: string;
  speedKts: string;
  baseFareInr: number;
  accentHex: string;
  isWideBody: boolean;
  speedMultiplier: number;
  phaseOffset: number;
}

export const AIRLINE_LIVERIES: Record<string, AirlineLiverySpec> = {
  '6E': {
    code: '6E',
    name: 'IndiGo',
    accentHex: '#1D4ED8',
    secondaryHex: '#60A5FA',
    cabinCarpetHex: '#1E40AF',
    hubIata: 'DEL',
    isInternational: false,
    defaultAircraft: 'Airbus A321neo',
    isWideBody: false,
  },
  AI: {
    code: 'AI',
    name: 'Air India',
    accentHex: '#B91C1C',
    secondaryHex: '#F59E0B',
    cabinCarpetHex: '#7F1D1D',
    hubIata: 'DEL',
    isInternational: true,
    defaultAircraft: 'Boeing 787-9 Dreamliner',
    isWideBody: true,
  },
  IX: {
    code: 'IX',
    name: 'Air India Express',
    accentHex: '#EA580C',
    secondaryHex: '#FACC15',
    cabinCarpetHex: '#C2410C',
    hubIata: 'COK',
    isInternational: false,
    defaultAircraft: 'Boeing 737 MAX 8',
    isWideBody: false,
  },
  QP: {
    code: 'QP',
    name: 'Akasa Air',
    accentHex: '#F97316',
    secondaryHex: '#7C3AED',
    cabinCarpetHex: '#4C1D95',
    hubIata: 'BLR',
    isInternational: false,
    defaultAircraft: 'Boeing 737 MAX 8',
    isWideBody: false,
  },
  SG: {
    code: 'SG',
    name: 'SpiceJet',
    accentHex: '#DC2626',
    secondaryHex: '#FCA5A5',
    cabinCarpetHex: '#991B1B',
    hubIata: 'DEL',
    isInternational: false,
    defaultAircraft: 'Boeing 737-800',
    isWideBody: false,
  },
  EK: {
    code: 'EK',
    name: 'Emirates',
    accentHex: '#D71921',
    secondaryHex: '#D4AF37',
    cabinCarpetHex: '#8C1D24',
    hubIata: 'DXB',
    isInternational: true,
    defaultAircraft: 'Airbus A380-800',
    isWideBody: true,
  },
  QR: {
    code: 'QR',
    name: 'Qatar Airways',
    accentHex: '#5C0632',
    secondaryHex: '#E5C158',
    cabinCarpetHex: '#4B082B',
    hubIata: 'DOH',
    isInternational: true,
    defaultAircraft: 'Boeing 777-300ER',
    isWideBody: true,
  },
  EY: {
    code: 'EY',
    name: 'Etihad Airways',
    accentHex: '#8E6F3E',
    secondaryHex: '#E5D3B3',
    cabinCarpetHex: '#5A4627',
    hubIata: 'AUH',
    isInternational: true,
    defaultAircraft: 'Airbus A350-1000',
    isWideBody: true,
  },
  SQ: {
    code: 'SQ',
    name: 'Singapore Airlines',
    accentHex: '#1D2951',
    secondaryHex: '#F4A900',
    cabinCarpetHex: '#162044',
    hubIata: 'SIN',
    isInternational: true,
    defaultAircraft: 'Airbus A350-900',
    isWideBody: true,
  },
  BA: {
    code: 'BA',
    name: 'British Airways',
    accentHex: '#075AAA',
    secondaryHex: '#EB2226',
    cabinCarpetHex: '#0A3B6B',
    hubIata: 'LHR',
    isInternational: true,
    defaultAircraft: 'Boeing 777-300ER',
    isWideBody: true,
  },
  LH: {
    code: 'LH',
    name: 'Lufthansa',
    accentHex: '#05164D',
    secondaryHex: '#FFAD00',
    cabinCarpetHex: '#0B1E5B',
    hubIata: 'FRA',
    isInternational: true,
    defaultAircraft: 'Airbus A350-900',
    isWideBody: true,
  },
};

export function getAirlineLivery(codeOrName: string): AirlineLiverySpec {
  const upper = codeOrName.trim().toUpperCase();
  if (AIRLINE_LIVERIES[upper]) return AIRLINE_LIVERIES[upper];
  const prefix = upper.split(/[-\s]/)[0];
  if (AIRLINE_LIVERIES[prefix]) return AIRLINE_LIVERIES[prefix];
  const byName = Object.values(AIRLINE_LIVERIES).find((l) =>
    upper.includes(l.name.toUpperCase())
  );
  return byName ?? AIRLINE_LIVERIES['6E'];
}

export const LIVE_AIRSPACE_FLIGHTS: LiveAirspaceFlight[] = [
  {
    id: 'air-ek531',
    airlineCode: 'EK',
    airlineName: 'Emirates',
    flightNumber: 'EK-531',
    aircraft: 'Airbus A380-800',
    fromCity: 'Kochi (COK)',
    fromIata: 'COK',
    fromLat: 10.15,
    fromLon: 76.4,
    toCity: 'Dubai (DXB)',
    toIata: 'DXB',
    toLat: 25.25,
    toLon: 55.36,
    altitudeFt: '38,000 ft',
    speedKts: '492 kts',
    baseFareInr: 18400,
    accentHex: '#D71921',
    isWideBody: true,
    speedMultiplier: 0.085,
    phaseOffset: 0.12,
  },
  {
    id: 'air-6e412',
    airlineCode: '6E',
    airlineName: 'IndiGo',
    flightNumber: '6E-412',
    aircraft: 'Airbus A321neo',
    fromCity: 'Kochi (COK)',
    fromIata: 'COK',
    fromLat: 10.15,
    fromLon: 76.4,
    toCity: 'Bengaluru (BLR)',
    toIata: 'BLR',
    toLat: 13.19,
    toLon: 77.7,
    altitudeFt: '29,000 ft',
    speedKts: '430 kts',
    baseFareInr: 3650,
    accentHex: '#1D4ED8',
    isWideBody: false,
    speedMultiplier: 0.13,
    phaseOffset: 0.45,
  },
  {
    id: 'air-qr517',
    airlineCode: 'QR',
    airlineName: 'Qatar Airways',
    flightNumber: 'QR-517',
    aircraft: 'Boeing 777-300ER',
    fromCity: 'Thiruvananthapuram (TRV)',
    fromIata: 'TRV',
    fromLat: 8.48,
    fromLon: 76.92,
    toCity: 'Doha (DOH)',
    toIata: 'DOH',
    toLat: 25.27,
    toLon: 51.61,
    altitudeFt: '37,000 ft',
    speedKts: '485 kts',
    baseFareInr: 19200,
    accentHex: '#5C0632',
    isWideBody: true,
    speedMultiplier: 0.08,
    phaseOffset: 0.68,
  },
  {
    id: 'air-sq535',
    airlineCode: 'SQ',
    airlineName: 'Singapore Airlines',
    flightNumber: 'SQ-535',
    aircraft: 'Airbus A350-900',
    fromCity: 'Kochi (COK)',
    fromIata: 'COK',
    fromLat: 10.15,
    fromLon: 76.4,
    toCity: 'Singapore (SIN)',
    toIata: 'SIN',
    toLat: 1.36,
    toLon: 103.99,
    altitudeFt: '39,000 ft',
    speedKts: '504 kts',
    baseFareInr: 22900,
    accentHex: '#1D2951',
    isWideBody: true,
    speedMultiplier: 0.075,
    phaseOffset: 0.3,
  },
  {
    id: 'air-ai161',
    airlineCode: 'AI',
    airlineName: 'Air India',
    flightNumber: 'AI-161',
    aircraft: 'Boeing 787-9 Dreamliner',
    fromCity: 'New Delhi (DEL)',
    fromIata: 'DEL',
    fromLat: 28.56,
    fromLon: 77.1,
    toCity: 'London (LHR)',
    toIata: 'LHR',
    toLat: 51.47,
    toLon: -0.45,
    altitudeFt: '40,000 ft',
    speedKts: '512 kts',
    baseFareInr: 44800,
    accentHex: '#B91C1C',
    isWideBody: true,
    speedMultiplier: 0.055,
    phaseOffset: 0.55,
  },
  {
    id: 'air-ba118',
    airlineCode: 'BA',
    airlineName: 'British Airways',
    flightNumber: 'BA-118',
    aircraft: 'Boeing 777-300ER',
    fromCity: 'Bengaluru (BLR)',
    fromIata: 'BLR',
    fromLat: 13.19,
    fromLon: 77.7,
    toCity: 'London (LHR)',
    toIata: 'LHR',
    toLat: 51.47,
    toLon: -0.45,
    altitudeFt: '38,000 ft',
    speedKts: '508 kts',
    baseFareInr: 49500,
    accentHex: '#075AAA',
    isWideBody: true,
    speedMultiplier: 0.052,
    phaseOffset: 0.85,
  },
];

// Detailed multi-state countries with deep regional cities & IATA hubs
const DETAILED_COUNTRIES: WorldCountryEntry[] = [
  {
    isoNumeric: '356',
    iso2: 'IN',
    name: 'India',
    continent: 'Asia',
    currency: 'INR (₹)',
    timezone: 'UTC+05:30 (IST)',
    lat: 20.59,
    lon: 78.96,
    biome: 'tropical',
    states: [
      {
        id: 'in-kl',
        name: 'Kerala',
        cities: [
          { id: 'in-kl-pta', name: 'Pathanamthitta (via COK / TRV)', iata: 'COK', airportName: 'Cochin / Trivandrum Intl', lat: 9.2648, lon: 76.787, keralaDistrictId: 'pathanamthitta' },
          { id: 'in-kl-tvm', name: 'Thiruvananthapuram', iata: 'TRV', airportName: 'Trivandrum Intl', lat: 8.5241, lon: 76.9366, keralaDistrictId: 'thiruvananthapuram' },
          { id: 'in-kl-klm', name: 'Kollam', iata: 'TRV', airportName: 'Trivandrum Intl', lat: 8.8932, lon: 76.6141, keralaDistrictId: 'kollam' },
          { id: 'in-kl-alp', name: 'Alappuzha', iata: 'COK', airportName: 'Cochin Intl', lat: 9.4981, lon: 76.3388, keralaDistrictId: 'alappuzha' },
          { id: 'in-kl-ktm', name: 'Kottayam', iata: 'COK', airportName: 'Cochin Intl', lat: 9.5916, lon: 76.5222, keralaDistrictId: 'kottayam' },
          { id: 'in-kl-idk', name: 'Idukki (Munnar / Thekkady)', iata: 'COK', airportName: 'Cochin Intl', lat: 9.8497, lon: 76.9798, keralaDistrictId: 'idukki' },
          { id: 'in-kl-ekm', name: 'Ernakulam / Kochi', iata: 'COK', airportName: 'Cochin Intl', lat: 9.9312, lon: 76.2673, keralaDistrictId: 'ernakulam' },
          { id: 'in-kl-tsr', name: 'Thrissur', iata: 'COK', airportName: 'Cochin Intl', lat: 10.5276, lon: 76.2144, keralaDistrictId: 'thrissur' },
          { id: 'in-kl-pkd', name: 'Palakkad', iata: 'CJB', airportName: 'Coimbatore Intl', lat: 10.7867, lon: 76.6548, keralaDistrictId: 'palakkad' },
          { id: 'in-kl-mlp', name: 'Malappuram', iata: 'CCJ', airportName: 'Calicut Intl', lat: 11.051, lon: 76.0711, keralaDistrictId: 'malappuram' },
          { id: 'in-kl-kkd', name: 'Kozhikode', iata: 'CCJ', airportName: 'Calicut Intl', lat: 11.2588, lon: 75.7804, keralaDistrictId: 'kozhikode' },
          { id: 'in-kl-wnd', name: 'Wayanad (Kalpetta)', iata: 'CCJ', airportName: 'Calicut / Kannur Intl', lat: 11.6854, lon: 76.132, keralaDistrictId: 'wayanad' },
          { id: 'in-kl-knr', name: 'Kannur', iata: 'CNN', airportName: 'Kannur Intl', lat: 11.8745, lon: 75.3704, keralaDistrictId: 'kannur' },
          { id: 'in-kl-ksd', name: 'Kasaragod', iata: 'IXE', airportName: 'Mangaluru / Kannur Intl', lat: 12.4996, lon: 74.9869, keralaDistrictId: 'kasaragod' },
        ],
      },
      {
        id: 'in-ka',
        name: 'Karnataka',
        cities: [
          { id: 'in-ka-blr', name: 'Bengaluru', iata: 'BLR', airportName: 'Kempegowda Intl', lat: 12.9716, lon: 77.5946, keralaDistrictId: 'bengaluru' },
          { id: 'in-ka-myq', name: 'Mysuru', iata: 'MYQ', airportName: 'Mysore Airport', lat: 12.2958, lon: 76.6394, keralaDistrictId: 'mysuru' },
          { id: 'in-ka-ixe', name: 'Mangaluru', iata: 'IXE', airportName: 'Mangaluru Intl', lat: 12.9141, lon: 74.856, keralaDistrictId: 'mangaluru' },
        ],
      },
      {
        id: 'in-tn',
        name: 'Tamil Nadu',
        cities: [
          { id: 'in-tn-maa', name: 'Chennai', iata: 'MAA', airportName: 'Chennai Intl', lat: 13.0827, lon: 80.2707, keralaDistrictId: 'chennai' },
          { id: 'in-tn-cjb', name: 'Coimbatore', iata: 'CJB', airportName: 'Coimbatore Intl', lat: 11.0168, lon: 76.9558, keralaDistrictId: 'coimbatore' },
          { id: 'in-tn-ooty', name: 'Ooty (Nilgiris)', iata: 'CJB', airportName: 'Coimbatore Intl', lat: 11.4102, lon: 76.695, keralaDistrictId: 'ooty' },
          { id: 'in-tn-ixm', name: 'Madurai', iata: 'IXM', airportName: 'Madurai Airport', lat: 9.9252, lon: 78.1198 },
        ],
      },
      { id: 'in-mh', name: 'Maharashtra', cities: [{ id: 'in-mh-bom', name: 'Mumbai', iata: 'BOM', airportName: 'Chhatrapati Shivaji Intl', lat: 19.076, lon: 72.8777 }, { id: 'in-mh-pnq', name: 'Pune', iata: 'PNQ', airportName: 'Pune Intl', lat: 18.5204, lon: 73.8567 }] },
      { id: 'in-dl', name: 'Delhi (NCT)', cities: [{ id: 'in-dl-del', name: 'New Delhi', iata: 'DEL', airportName: 'Indira Gandhi Intl', lat: 28.6139, lon: 77.209 }] },
      { id: 'in-ts', name: 'Telangana', cities: [{ id: 'in-ts-hyd', name: 'Hyderabad', iata: 'HYD', airportName: 'Rajiv Gandhi Intl', lat: 17.385, lon: 78.4867 }] },
      { id: 'in-wb', name: 'West Bengal', cities: [{ id: 'in-wb-ccu', name: 'Kolkata', iata: 'CCU', airportName: 'Netaji Subhas Intl', lat: 22.5726, lon: 88.3639 }] },
      { id: 'in-ga', name: 'Goa', cities: [{ id: 'in-ga-goi', name: 'Panaji / Goa', iata: 'GOX', airportName: 'Manohar Intl (Mopa)', lat: 15.2993, lon: 74.124 }] },
      { id: 'in-gj', name: 'Gujarat', cities: [{ id: 'in-gj-amd', name: 'Ahmedabad', iata: 'AMD', airportName: 'Sardar Vallabhbhai Intl', lat: 23.0225, lon: 72.5714 }] },
      { id: 'in-rj', name: 'Rajasthan', cities: [{ id: 'in-rj-jai', name: 'Jaipur', iata: 'JAI', airportName: 'Jaipur Intl', lat: 26.9124, lon: 75.7873 }, { id: 'in-rj-udr', name: 'Udaipur', iata: 'UDR', airportName: 'Maharana Pratap Airport', lat: 24.5854, lon: 73.7125 }] },
      { id: 'in-up', name: 'Uttar Pradesh', cities: [{ id: 'in-up-lko', name: 'Lucknow', iata: 'LKO', airportName: 'Chaudhary Charan Singh Intl', lat: 26.8467, lon: 80.9462 }, { id: 'in-up-vns', name: 'Varanasi', iata: 'VNS', airportName: 'Lal Bahadur Shastri Intl', lat: 25.3176, lon: 82.9739 }] },
      { id: 'in-ap', name: 'Andhra Pradesh', cities: [{ id: 'in-ap-vtz', name: 'Visakhapatnam', iata: 'VTZ', airportName: 'Visakhapatnam Intl', lat: 17.6868, lon: 83.2185 }] },
      { id: 'in-as', name: 'Assam', cities: [{ id: 'in-as-gau', name: 'Guwahati', iata: 'GAU', airportName: 'Lokpriya Gopinath Intl', lat: 26.1445, lon: 91.7362 }] },
      { id: 'in-br', name: 'Bihar', cities: [{ id: 'in-br-pat', name: 'Patna', iata: 'PAT', airportName: 'Jay Prakash Narayan Intl', lat: 25.5941, lon: 85.1376 }] },
      { id: 'in-cg', name: 'Chhattisgarh', cities: [{ id: 'in-cg-rpr', name: 'Raipur', iata: 'RPR', airportName: 'Swami Vivekananda Airport', lat: 21.2514, lon: 81.6296 }] },
      { id: 'in-hp', name: 'Himachal Pradesh', cities: [{ id: 'in-hp-slv', name: 'Shimla / Manali', iata: 'SLV', airportName: 'Shimla / Kullu Airport', lat: 31.1048, lon: 77.1734 }] },
      { id: 'in-hr', name: 'Haryana', cities: [{ id: 'in-hr-ixc', name: 'Gurugram / Chandigarh', iata: 'IXC', airportName: 'Shaheed Bhagat Singh Intl', lat: 30.7333, lon: 76.7794 }] },
      { id: 'in-jh', name: 'Jharkhand', cities: [{ id: 'in-jh-ixr', name: 'Ranchi', iata: 'IXR', airportName: 'Birsa Munda Airport', lat: 23.3441, lon: 85.3096 }] },
      { id: 'in-mp', name: 'Madhya Pradesh', cities: [{ id: 'in-mp-idr', name: 'Indore / Bhopal', iata: 'IDR', airportName: 'Devi Ahilya Bai Holkar Intl', lat: 22.7196, lon: 75.8577 }] },
      { id: 'in-od', name: 'Odisha', cities: [{ id: 'in-od-bbi', name: 'Bhubaneswar', iata: 'BBI', airportName: 'Biju Patnaik Intl', lat: 20.2961, lon: 85.8245 }] },
      { id: 'in-pb', name: 'Punjab', cities: [{ id: 'in-pb-atq', name: 'Amritsar', iata: 'ATQ', airportName: 'Sri Guru Ram Dass Jee Intl', lat: 31.634, lon: 74.8723 }] },
      { id: 'in-uk', name: 'Uttarakhand', cities: [{ id: 'in-uk-ded', name: 'Dehradun / Rishikesh', iata: 'DED', airportName: 'Jolly Grant Airport', lat: 30.3165, lon: 78.0322 }] },
      { id: 'in-jk', name: 'Jammu & Kashmir (UT)', cities: [{ id: 'in-jk-sxr', name: 'Srinagar', iata: 'SXR', airportName: 'Sheikh ul-Alam Intl', lat: 34.0837, lon: 74.7973 }] },
      { id: 'in-la', name: 'Ladakh (UT)', cities: [{ id: 'in-la-ixl', name: 'Leh', iata: 'IXL', airportName: 'Kushok Bakula Rimpochee', lat: 34.1526, lon: 77.5771 }] },
      { id: 'in-sk', name: 'Sikkim', cities: [{ id: 'in-sk-pyg', name: 'Gangtok', iata: 'PYG', airportName: 'Pakyong / Bagdogra', lat: 27.3389, lon: 88.6065 }] },
      { id: 'in-ml', name: 'Meghalaya', cities: [{ id: 'in-ml-shl', name: 'Shillong', iata: 'SHL', airportName: 'Shillong Airport', lat: 25.5788, lon: 91.8933 }] },
      { id: 'in-ar', name: 'Arunachal Pradesh', cities: [{ id: 'in-ar-hgi', name: 'Itanagar', iata: 'HGI', airportName: 'Donyi Polo Airport', lat: 27.0844, lon: 93.6053 }] },
      { id: 'in-mn', name: 'Manipur', cities: [{ id: 'in-mn-imf', name: 'Imphal', iata: 'IMF', airportName: 'Bir Tikendrajit Intl', lat: 24.817, lon: 93.9368 }] },
      { id: 'in-mz', name: 'Mizoram', cities: [{ id: 'in-mz-ajl', name: 'Aizawl', iata: 'AJL', airportName: 'Lengpui Airport', lat: 23.7271, lon: 92.7176 }] },
      { id: 'in-nl', name: 'Nagaland', cities: [{ id: 'in-nl-dmu', name: 'Kohima / Dimapur', iata: 'DMU', airportName: 'Dimapur Airport', lat: 25.6751, lon: 94.1086 }] },
      { id: 'in-tr', name: 'Tripura', cities: [{ id: 'in-tr-ixa', name: 'Agartala', iata: 'IXA', airportName: 'Maharaja Bir Bikram Airport', lat: 23.8315, lon: 91.2868 }] },
      { id: 'in-an', name: 'Andaman & Nicobar (UT)', cities: [{ id: 'in-an-ixz', name: 'Port Blair', iata: 'IXZ', airportName: 'Veer Savarkar Intl', lat: 11.6234, lon: 92.7265 }] },
      { id: 'in-ld', name: 'Lakshadweep (UT)', cities: [{ id: 'in-ld-agx', name: 'Agatti / Kavaratti', iata: 'AGX', airportName: 'Agatti Aerodrome', lat: 10.8236, lon: 72.176 }] },
      { id: 'in-py', name: 'Puducherry (UT)', cities: [{ id: 'in-py-pny', name: 'Puducherry', iata: 'PNY', airportName: 'Puducherry Airport', lat: 11.9416, lon: 79.8083 }] },
      { id: 'in-ch', name: 'Chandigarh (UT)', cities: [{ id: 'in-ch-ixc', name: 'Chandigarh', iata: 'IXC', airportName: 'Chandigarh Intl', lat: 30.7333, lon: 76.7794 }] },
      { id: 'in-dn', name: 'Dadra & Nagar Haveli and Daman & Diu (UT)', cities: [{ id: 'in-dn-nmb', name: 'Daman / Silvassa', iata: 'STV', airportName: 'Surat / Daman Airport', lat: 20.3974, lon: 72.8328 }] },
    ],
  },
  {
    isoNumeric: '784',
    iso2: 'AE',
    name: 'United Arab Emirates',
    continent: 'Asia',
    currency: 'AED',
    timezone: 'UTC+04:00 (GST)',
    lat: 24.45,
    lon: 54.37,
    biome: 'desert',
    states: [
      { id: 'ae-du', name: 'Dubai', cities: [{ id: 'ae-du-dxb', name: 'Dubai', iata: 'DXB', airportName: 'Dubai Intl', lat: 25.2048, lon: 55.2708 }] },
      { id: 'ae-az', name: 'Abu Dhabi', cities: [{ id: 'ae-az-auh', name: 'Abu Dhabi', iata: 'AUH', airportName: 'Zayed Intl', lat: 24.4539, lon: 54.3773 }] },
      { id: 'ae-sh', name: 'Sharjah', cities: [{ id: 'ae-sh-shj', name: 'Sharjah', iata: 'SHJ', airportName: 'Sharjah Intl', lat: 25.3463, lon: 55.4209 }] },
    ],
  },
  {
    isoNumeric: '634',
    iso2: 'QA',
    name: 'Qatar',
    continent: 'Asia',
    currency: 'QAR',
    timezone: 'UTC+03:00 (AST)',
    lat: 25.29,
    lon: 51.53,
    biome: 'desert',
    states: [
      { id: 'qa-da', name: 'Ad Dawhah', cities: [{ id: 'qa-da-doh', name: 'Doha', iata: 'DOH', airportName: 'Hamad Intl', lat: 25.2854, lon: 51.531 }] },
    ],
  },
  {
    isoNumeric: '826',
    iso2: 'GB',
    name: 'United Kingdom',
    continent: 'Europe',
    currency: 'GBP (£)',
    timezone: 'UTC+00:00 (GMT)',
    lat: 54.0,
    lon: -2.0,
    biome: 'temperate',
    states: [
      { id: 'gb-eng', name: 'England', cities: [{ id: 'gb-eng-lhr', name: 'London', iata: 'LHR', airportName: 'Heathrow Intl', lat: 51.5072, lon: -0.1276 }, { id: 'gb-eng-man', name: 'Manchester', iata: 'MAN', airportName: 'Manchester Airport', lat: 53.4808, lon: -2.2426 }] },
      { id: 'gb-sct', name: 'Scotland', cities: [{ id: 'gb-sct-edi', name: 'Edinburgh', iata: 'EDI', airportName: 'Edinburgh Airport', lat: 55.9533, lon: -3.1883 }] },
      { id: 'gb-wls', name: 'Wales', cities: [{ id: 'gb-wls-cwl', name: 'Cardiff', iata: 'CWL', airportName: 'Cardiff Airport', lat: 51.4816, lon: -3.1791 }] },
      { id: 'gb-nir', name: 'Northern Ireland', cities: [{ id: 'gb-nir-bfs', name: 'Belfast', iata: 'BFS', airportName: 'Belfast Intl', lat: 54.5973, lon: -5.9301 }] },
    ],
  },
  {
    isoNumeric: '840',
    iso2: 'US',
    name: 'United States',
    continent: 'North America',
    currency: 'USD ($)',
    timezone: 'UTC-05:00 to -08:00',
    lat: 39.83,
    lon: -98.58,
    biome: 'temperate',
    states: [
      { id: 'us-ny', name: 'New York', cities: [{ id: 'us-ny-jfk', name: 'New York City', iata: 'JFK', airportName: 'John F. Kennedy Intl', lat: 40.7128, lon: -74.006 }] },
      { id: 'us-ca', name: 'California', cities: [{ id: 'us-ca-sfo', name: 'San Francisco', iata: 'SFO', airportName: 'San Francisco Intl', lat: 37.7749, lon: -122.4194 }, { id: 'us-ca-lax', name: 'Los Angeles', iata: 'LAX', airportName: 'Los Angeles Intl', lat: 34.0522, lon: -118.2437 }] },
      { id: 'us-tx', name: 'Texas', cities: [{ id: 'us-tx-dfw', name: 'Dallas / Houston', iata: 'DFW', airportName: 'Dallas/Fort Worth Intl', lat: 32.7767, lon: -96.797 }] },
      { id: 'us-il', name: 'Illinois', cities: [{ id: 'us-il-ord', name: 'Chicago', iata: 'ORD', airportName: "O'Hare Intl", lat: 41.8781, lon: -87.6298 }] },
      { id: 'us-wa', name: 'Washington', cities: [{ id: 'us-wa-sea', name: 'Seattle', iata: 'SEA', airportName: 'Seattle-Tacoma Intl', lat: 47.6062, lon: -122.3321 }] },
    ],
  },
  {
    isoNumeric: '702',
    iso2: 'SG',
    name: 'Singapore',
    continent: 'Asia',
    currency: 'SGD (S$)',
    timezone: 'UTC+08:00 (SGT)',
    lat: 1.35,
    lon: 103.82,
    biome: 'tropical',
    states: [
      { id: 'sg-ce', name: 'Central Region', cities: [{ id: 'sg-ce-sin', name: 'Singapore', iata: 'SIN', airportName: 'Changi Intl', lat: 1.3521, lon: 103.8198 }] },
    ],
  },
  {
    isoNumeric: '276',
    iso2: 'DE',
    name: 'Germany',
    continent: 'Europe',
    currency: 'EUR (€)',
    timezone: 'UTC+01:00 (CET)',
    lat: 51.16,
    lon: 10.45,
    biome: 'temperate',
    states: [
      { id: 'de-he', name: 'Hesse', cities: [{ id: 'de-he-fra', name: 'Frankfurt', iata: 'FRA', airportName: 'Frankfurt Intl', lat: 50.1109, lon: 8.6821 }] },
      { id: 'de-by', name: 'Bavaria', cities: [{ id: 'de-by-muc', name: 'Munich', iata: 'MUC', airportName: 'Munich Intl', lat: 48.1351, lon: 11.582 }] },
      { id: 'de-be', name: 'Berlin', cities: [{ id: 'de-be-ber', name: 'Berlin', iata: 'BER', airportName: 'Berlin Brandenburg', lat: 52.52, lon: 13.405 }] },
    ],
  },
  {
    isoNumeric: '250',
    iso2: 'FR',
    name: 'France',
    continent: 'Europe',
    currency: 'EUR (€)',
    timezone: 'UTC+01:00 (CET)',
    lat: 46.23,
    lon: 2.21,
    biome: 'temperate',
    states: [
      { id: 'fr-idf', name: 'Île-de-France', cities: [{ id: 'fr-idf-cdg', name: 'Paris', iata: 'CDG', airportName: 'Charles de Gaulle Intl', lat: 48.8566, lon: 2.3522 }] },
      { id: 'fr-pac', name: "Provence-Alpes-Côte d'Azur", cities: [{ id: 'fr-pac-nce', name: 'Nice', iata: 'NCE', airportName: "Nice Côte d'Azur", lat: 43.7102, lon: 7.262 }] },
    ],
  },
  {
    isoNumeric: '392',
    iso2: 'JP',
    name: 'Japan',
    continent: 'Asia',
    currency: 'JPY (¥)',
    timezone: 'UTC+09:00 (JST)',
    lat: 36.2,
    lon: 138.25,
    biome: 'temperate',
    states: [
      { id: 'jp-tyo', name: 'Tokyo Metropolis', cities: [{ id: 'jp-tyo-hnd', name: 'Tokyo', iata: 'HND', airportName: 'Haneda / Narita Intl', lat: 35.6762, lon: 139.6503 }] },
      { id: 'jp-osk', name: 'Kansai (Osaka / Kyoto)', cities: [{ id: 'jp-osk-kix', name: 'Osaka & Kyoto', iata: 'KIX', airportName: 'Kansai Intl', lat: 34.6937, lon: 135.5023 }] },
    ],
  },
  {
    isoNumeric: '036',
    iso2: 'AU',
    name: 'Australia',
    continent: 'Oceania',
    currency: 'AUD (A$)',
    timezone: 'UTC+10:00 (AEST)',
    lat: -25.27,
    lon: 133.78,
    biome: 'desert',
    states: [
      { id: 'au-nsw', name: 'New South Wales', cities: [{ id: 'au-nsw-syd', name: 'Sydney', iata: 'SYD', airportName: 'Kingsford Smith Intl', lat: -33.8688, lon: 151.2093 }] },
      { id: 'au-vic', name: 'Victoria', cities: [{ id: 'au-vic-mel', name: 'Melbourne', iata: 'MEL', airportName: 'Melbourne Airport', lat: -37.8136, lon: 144.9631 }] },
    ],
  },
  {
    isoNumeric: '124',
    iso2: 'CA',
    name: 'Canada',
    continent: 'North America',
    currency: 'CAD (C$)',
    timezone: 'UTC-05:00 to -08:00',
    lat: 56.13,
    lon: -106.35,
    biome: 'alpine',
    states: [
      { id: 'ca-on', name: 'Ontario', cities: [{ id: 'ca-on-yyz', name: 'Toronto', iata: 'YYZ', airportName: 'Pearson Intl', lat: 43.6532, lon: -79.3832 }] },
      { id: 'ca-bc', name: 'British Columbia', cities: [{ id: 'ca-bc-yvr', name: 'Vancouver', iata: 'YVR', airportName: 'Vancouver Intl', lat: 49.2827, lon: -123.1207 }] },
    ],
  },
  {
    isoNumeric: '756',
    iso2: 'CH',
    name: 'Switzerland',
    continent: 'Europe',
    currency: 'CHF',
    timezone: 'UTC+01:00 (CET)',
    lat: 46.82,
    lon: 8.23,
    biome: 'alpine',
    states: [
      { id: 'ch-zh', name: 'Zürich', cities: [{ id: 'ch-zh-zrh', name: 'Zürich', iata: 'ZRH', airportName: 'Zürich Intl', lat: 47.3769, lon: 8.5417 }] },
      { id: 'ch-ge', name: 'Geneva', cities: [{ id: 'ch-ge-gva', name: 'Geneva', iata: 'GVA', airportName: 'Geneva Airport', lat: 46.2044, lon: 6.1432 }] },
    ],
  },
];

// Compact tuple catalog for all remaining 183 UN-recognized countries (total = 195 countries)
// Format: [isoNumeric, iso2, name, continent, currency, tz, lat, lon, biome, stateName, cityName, iata]
type CompactCountryTuple = [
  string, string, string, string, string, string, number, number, WorldBiome, string, string, string
];

const REMAINING_183_COUNTRIES: CompactCountryTuple[] = [
  ['004', 'AF', 'Afghanistan', 'Asia', 'AFN', 'UTC+04:30', 33.94, 67.71, 'desert', 'Kabul Province', 'Kabul', 'KBL'],
  ['008', 'AL', 'Albania', 'Europe', 'ALL', 'UTC+01:00', 41.15, 20.17, 'temperate', 'Tirana County', 'Tirana', 'TIA'],
  ['012', 'DZ', 'Algeria', 'Africa', 'DZD', 'UTC+01:00', 28.03, 1.66, 'desert', 'Algiers Province', 'Algiers', 'ALG'],
  ['020', 'AD', 'Andorra', 'Europe', 'EUR', 'UTC+01:00', 42.55, 1.6, 'alpine', 'Andorra la Vella', 'Andorra la Vella', 'LEU'],
  ['024', 'AO', 'Angola', 'Africa', 'AOA', 'UTC+01:00', -11.2, 17.87, 'tropical', 'Luanda Province', 'Luanda', 'LAD'],
  ['028', 'AG', 'Antigua and Barbuda', 'North America', 'XCD', 'UTC-04:00', 17.06, -61.8, 'coastal', 'Saint John', "Saint John's", 'ANU'],
  ['032', 'AR', 'Argentina', 'South America', 'ARS', 'UTC-03:00', -38.42, -63.62, 'temperate', 'Buenos Aires', 'Buenos Aires', 'EZE'],
  ['051', 'AM', 'Armenia', 'Asia', 'AMD', 'UTC+04:00', 40.07, 45.04, 'alpine', 'Yerevan', 'Yerevan', 'EVN'],
  ['040', 'AT', 'Austria', 'Europe', 'EUR', 'UTC+01:00', 47.52, 14.55, 'alpine', 'Vienna', 'Vienna', 'VIE'],
  ['031', 'AZ', 'Azerbaijan', 'Asia', 'AZN', 'UTC+04:00', 40.14, 47.58, 'temperate', 'Baku', 'Baku', 'GYD'],
  ['044', 'BS', 'Bahamas', 'North America', 'BSD', 'UTC-05:00', 25.03, -77.4, 'coastal', 'New Providence', 'Nassau', 'NAS'],
  ['048', 'BH', 'Bahrain', 'Asia', 'BHD', 'UTC+03:00', 26.07, 50.56, 'desert', 'Capital Governorate', 'Manama', 'BAH'],
  ['050', 'BD', 'Bangladesh', 'Asia', 'BDT', 'UTC+06:00', 23.68, 90.36, 'tropical', 'Dhaka Division', 'Dhaka', 'DAC'],
  ['052', 'BB', 'Barbados', 'North America', 'BBD', 'UTC-04:00', 13.19, -59.54, 'coastal', 'Saint Michael', 'Bridgetown', 'BGI'],
  ['112', 'BY', 'Belarus', 'Europe', 'BYN', 'UTC+03:00', 53.71, 27.95, 'temperate', 'Minsk Region', 'Minsk', 'MSQ'],
  ['056', 'BE', 'Belgium', 'Europe', 'EUR', 'UTC+01:00', 50.5, 4.47, 'temperate', 'Brussels-Capital', 'Brussels', 'BRU'],
  ['084', 'BZ', 'Belize', 'North America', 'BZD', 'UTC-06:00', 17.19, -88.5, 'tropical', 'Belize District', 'Belize City', 'BZE'],
  ['204', 'BJ', 'Benin', 'Africa', 'XOF', 'UTC+01:00', 9.31, 2.32, 'tropical', 'Littoral', 'Cotonou', 'COO'],
  ['064', 'BT', 'Bhutan', 'Asia', 'BTN', 'UTC+06:00', 27.51, 90.43, 'alpine', 'Thimphu / Paro', 'Thimphu', 'PBH'],
  ['068', 'BO', 'Bolivia', 'South America', 'BOB', 'UTC-04:00', -16.29, -63.59, 'alpine', 'La Paz Department', 'La Paz', 'LPB'],
  ['070', 'BA', 'Bosnia and Herzegovina', 'Europe', 'BAM', 'UTC+01:00', 43.92, 17.68, 'temperate', 'Sarajevo Canton', 'Sarajevo', 'SJJ'],
  ['072', 'BW', 'Botswana', 'Africa', 'BWP', 'UTC+02:00', -22.33, 24.68, 'desert', 'South-East District', 'Gaborone', 'GBE'],
  ['076', 'BR', 'Brazil', 'South America', 'BRL', 'UTC-03:00', -14.24, -51.93, 'tropical', 'São Paulo / Rio', 'São Paulo', 'GRU'],
  ['096', 'BN', 'Brunei', 'Asia', 'BND', 'UTC+08:00', 4.54, 114.73, 'tropical', 'Brunei-Muara', 'Bandar Seri Begawan', 'BWN'],
  ['100', 'BG', 'Bulgaria', 'Europe', 'BGN', 'UTC+02:00', 42.73, 25.49, 'temperate', 'Sofia City', 'Sofia', 'SOF'],
  ['854', 'BF', 'Burkina Faso', 'Africa', 'XOF', 'UTC+00:00', 12.24, -1.56, 'desert', 'Centre Region', 'Ouagadougou', 'OUA'],
  ['108', 'BI', 'Burundi', 'Africa', 'BIF', 'UTC+02:00', -3.37, 29.92, 'tropical', 'Bujumbura Mairie', 'Bujumbura', 'BJM'],
  ['132', 'CV', 'Cabo Verde', 'Africa', 'CVE', 'UTC-01:00', 16.54, -23.04, 'coastal', 'Santiago', 'Praia', 'RAI'],
  ['116', 'KH', 'Cambodia', 'Asia', 'KHR', 'UTC+07:00', 12.57, 104.99, 'tropical', 'Phnom Penh', 'Phnom Penh', 'PNH'],
  ['120', 'CM', 'Cameroon', 'Africa', 'XAF', 'UTC+01:00', 7.37, 12.35, 'tropical', 'Centre Region', 'Yaoundé', 'NSI'],
  ['140', 'CF', 'Central African Republic', 'Africa', 'XAF', 'UTC+01:00', 6.61, 20.94, 'tropical', 'Bangui', 'Bangui', 'BGF'],
  ['148', 'TD', 'Chad', 'Africa', 'XAF', 'UTC+01:00', 15.45, 18.73, 'desert', "N'Djamena", "N'Djamena", 'NDJ'],
  ['152', 'CL', 'Chile', 'South America', 'CLP', 'UTC-04:00', -35.68, -71.54, 'alpine', 'Santiago Metropolitan', 'Santiago', 'SCL'],
  ['156', 'CN', 'China', 'Asia', 'CNY', 'UTC+08:00', 35.86, 104.2, 'temperate', 'Beijing / Shanghai', 'Beijing', 'PEK'],
  ['170', 'CO', 'Colombia', 'South America', 'COP', 'UTC-05:00', 4.57, -74.3, 'tropical', 'Bogotá D.C.', 'Bogotá', 'BOG'],
  ['174', 'KM', 'Comoros', 'Africa', 'KMF', 'UTC+03:00', -11.65, 43.33, 'coastal', 'Grande Comore', 'Moroni', 'HAH'],
  ['178', 'CG', 'Congo', 'Africa', 'XAF', 'UTC+01:00', -0.23, 15.83, 'tropical', 'Brazzaville', 'Brazzaville', 'BZV'],
  ['180', 'CD', 'Democratic Republic of the Congo', 'Africa', 'CDF', 'UTC+01:00', -4.04, 21.76, 'tropical', 'Kinshasa', 'Kinshasa', 'FIH'],
  ['188', 'CR', 'Costa Rica', 'North America', 'CRC', 'UTC-06:00', 9.75, -83.75, 'tropical', 'San José Province', 'San José', 'SJO'],
  ['384', 'CI', "Côte d'Ivoire", 'Africa', 'XOF', 'UTC+00:00', 7.54, -5.55, 'tropical', 'Abidjan', 'Abidjan', 'ABJ'],
  ['191', 'HR', 'Croatia', 'Europe', 'EUR', 'UTC+01:00', 45.1, 15.2, 'coastal', 'Zagreb', 'Zagreb', 'ZAG'],
  ['192', 'CU', 'Cuba', 'North America', 'CUP', 'UTC-05:00', 21.52, -77.78, 'coastal', 'Havana', 'Havana', 'HAV'],
  ['196', 'CY', 'Cyprus', 'Europe', 'EUR', 'UTC+02:00', 35.13, 33.43, 'coastal', 'Nicosia / Larnaca', 'Larnaca', 'LCA'],
  ['203', 'CZ', 'Czechia', 'Europe', 'CZK', 'UTC+01:00', 49.82, 15.47, 'temperate', 'Prague', 'Prague', 'PRG'],
  ['208', 'DK', 'Denmark', 'Europe', 'DKK', 'UTC+01:00', 56.26, 9.5, 'temperate', 'Capital Region', 'Copenhagen', 'CPH'],
  ['262', 'DJ', 'Djibouti', 'Africa', 'DJF', 'UTC+03:00', 11.83, 42.59, 'desert', 'Djibouti City', 'Djibouti', 'JIB'],
  ['212', 'DM', 'Dominica', 'North America', 'XCD', 'UTC-04:00', 15.41, -61.37, 'coastal', 'Saint George', 'Roseau', 'DOM'],
  ['214', 'DO', 'Dominican Republic', 'North America', 'DOP', 'UTC-04:00', 18.74, -70.16, 'coastal', 'Distrito Nacional', 'Santo Domingo', 'SDQ'],
  ['218', 'EC', 'Ecuador', 'South America', 'USD', 'UTC-05:00', -1.83, -78.18, 'alpine', 'Pichincha', 'Quito', 'UIO'],
  ['818', 'EG', 'Egypt', 'Africa', 'EGP', 'UTC+02:00', 26.82, 30.8, 'desert', 'Cairo Governorate', 'Cairo', 'CAI'],
  ['222', 'SV', 'El Salvador', 'North America', 'USD', 'UTC-06:00', 13.79, -88.9, 'tropical', 'San Salvador', 'San Salvador', 'SAL'],
  ['226', 'GQ', 'Equatorial Guinea', 'Africa', 'XAF', 'UTC+01:00', 1.65, 10.27, 'tropical', 'Bioko Norte', 'Malabo', 'SSG'],
  ['232', 'ER', 'Eritrea', 'Africa', 'ERN', 'UTC+03:00', 15.18, 39.78, 'desert', 'Maekel', 'Asmara', 'ASM'],
  ['233', 'EE', 'Estonia', 'Europe', 'EUR', 'UTC+02:00', 58.6, 25.01, 'temperate', 'Harju County', 'Tallinn', 'TLL'],
  ['748', 'SZ', 'Eswatini', 'Africa', 'SZL', 'UTC+02:00', -26.52, 31.47, 'temperate', 'Hhohho', 'Mbabane', 'SHO'],
  ['231', 'ET', 'Ethiopia', 'Africa', 'ETB', 'UTC+03:00', 9.15, 40.49, 'alpine', 'Addis Ababa', 'Addis Ababa', 'ADD'],
  ['242', 'FJ', 'Fiji', 'Oceania', 'FJD', 'UTC+12:00', -17.71, 178.07, 'coastal', 'Western Division', 'Nadi / Suva', 'NAN'],
  ['246', 'FI', 'Finland', 'Europe', 'EUR', 'UTC+02:00', 61.92, 25.75, 'polar', 'Uusimaa', 'Helsinki', 'HEL'],
  ['266', 'GA', 'Gabon', 'Africa', 'XAF', 'UTC+01:00', -0.8, 11.61, 'tropical', 'Estuaire', 'Libreville', 'LBV'],
  ['270', 'GM', 'Gambia', 'Africa', 'GMD', 'UTC+00:00', 13.44, -15.31, 'coastal', 'Banjul', 'Banjul', 'BJL'],
  ['268', 'GE', 'Georgia', 'Asia', 'GEL', 'UTC+04:00', 42.32, 43.36, 'alpine', 'Tbilisi', 'Tbilisi', 'TBS'],
  ['288', 'GH', 'Ghana', 'Africa', 'GHS', 'UTC+00:00', 7.95, -1.02, 'tropical', 'Greater Accra', 'Accra', 'ACC'],
  ['300', 'GR', 'Greece', 'Europe', 'EUR', 'UTC+02:00', 39.07, 21.82, 'coastal', 'Attica', 'Athens', 'ATH'],
  ['308', 'GD', 'Grenada', 'North America', 'XCD', 'UTC-04:00', 12.12, -61.68, 'coastal', 'Saint George', "St. George's", 'GND'],
  ['320', 'GT', 'Guatemala', 'North America', 'GTQ', 'UTC-06:00', 15.78, -90.23, 'tropical', 'Guatemala Dept', 'Guatemala City', 'GUA'],
  ['324', 'GN', 'Guinea', 'Africa', 'GNF', 'UTC+00:00', 9.95, -9.7, 'tropical', 'Conakry', 'Conakry', 'CKY'],
  ['624', 'GW', 'Guinea-Bissau', 'Africa', 'XOF', 'UTC+00:00', 11.8, -15.18, 'tropical', 'Bissau', 'Bissau', 'OXB'],
  ['328', 'GY', 'Guyana', 'South America', 'GYD', 'UTC-04:00', 4.86, -58.93, 'tropical', 'Demerara-Mahaica', 'Georgetown', 'GEO'],
  ['332', 'HT', 'Haiti', 'North America', 'HTG', 'UTC-05:00', 18.97, -72.29, 'coastal', 'Ouest', 'Port-au-Prince', 'PAP'],
  ['340', 'HN', 'Honduras', 'North America', 'HNL', 'UTC-06:00', 15.2, -86.24, 'tropical', 'Francisco Morazán', 'Tegucigalpa', 'XPL'],
  ['348', 'HU', 'Hungary', 'Europe', 'HUF', 'UTC+01:00', 47.16, 19.5, 'temperate', 'Budapest', 'Budapest', 'BUD'],
  ['352', 'IS', 'Iceland', 'Europe', 'ISK', 'UTC+00:00', 64.96, -19.02, 'polar', 'Capital Region', 'Reykjavik', 'KEF'],
  ['360', 'ID', 'Indonesia', 'Asia', 'IDR', 'UTC+07:00', -0.79, 113.92, 'tropical', 'Jakarta / Bali', 'Jakarta', 'CGK'],
  ['364', 'IR', 'Iran', 'Asia', 'IRR', 'UTC+03:30', 32.43, 53.69, 'desert', 'Tehran Province', 'Tehran', 'IKA'],
  ['368', 'IQ', 'Iraq', 'Asia', 'IQD', 'UTC+03:00', 33.22, 43.68, 'desert', 'Baghdad Governorate', 'Baghdad', 'BGW'],
  ['372', 'IE', 'Ireland', 'Europe', 'EUR', 'UTC+00:00', 53.14, -7.69, 'temperate', 'Leinster', 'Dublin', 'DUB'],
  ['376', 'IL', 'Israel', 'Asia', 'ILS', 'UTC+02:00', 31.05, 34.85, 'desert', 'Tel Aviv District', 'Tel Aviv', 'TLV'],
  ['380', 'IT', 'Italy', 'Europe', 'EUR', 'UTC+01:00', 41.87, 12.57, 'temperate', 'Lazio / Lombardy', 'Rome', 'FCO'],
  ['388', 'JM', 'Jamaica', 'North America', 'JMD', 'UTC-05:00', 18.11, -77.3, 'coastal', 'Kingston Parish', 'Kingston', 'KIN'],
  ['400', 'JO', 'Jordan', 'Asia', 'JOD', 'UTC+03:00', 30.59, 36.24, 'desert', 'Amman Governorate', 'Amman', 'AMM'],
  ['398', 'KZ', 'Kazakhstan', 'Asia', 'KZT', 'UTC+05:00', 48.02, 66.92, 'desert', 'Astana / Almaty', 'Almaty', 'ALA'],
  ['404', 'KE', 'Kenya', 'Africa', 'KES', 'UTC+03:00', -0.02, 37.91, 'tropical', 'Nairobi County', 'Nairobi', 'NBO'],
  ['296', 'KI', 'Kiribati', 'Oceania', 'AUD', 'UTC+12:00', 1.87, -157.36, 'coastal', 'Gilbert Islands', 'Tarawa', 'TRW'],
  ['408', 'KP', 'North Korea', 'Asia', 'KPW', 'UTC+09:00', 40.34, 127.51, 'temperate', 'Pyongyang', 'Pyongyang', 'FNJ'],
  ['410', 'KR', 'South Korea', 'Asia', 'KRW', 'UTC+09:00', 35.91, 127.77, 'temperate', 'Seoul Capital Area', 'Seoul', 'ICN'],
  ['414', 'KW', 'Kuwait', 'Asia', 'KWD', 'UTC+03:00', 29.31, 47.48, 'desert', 'Al Asimah', 'Kuwait City', 'KWI'],
  ['417', 'KG', 'Kyrgyzstan', 'Asia', 'KGS', 'UTC+06:00', 41.2, 74.77, 'alpine', 'Chüy', 'Bishkek', 'FRU'],
  ['418', 'LA', 'Laos', 'Asia', 'LAK', 'UTC+07:00', 19.86, 102.5, 'tropical', 'Vientiane', 'Vientiane', 'VTE'],
  ['428', 'LV', 'Latvia', 'Europe', 'EUR', 'UTC+02:00', 56.88, 24.6, 'temperate', 'Riga', 'Riga', 'RIX'],
  ['422', 'LB', 'Lebanon', 'Asia', 'LBP', 'UTC+02:00', 33.85, 35.86, 'coastal', 'Beirut', 'Beirut', 'BEY'],
  ['426', 'LS', 'Lesotho', 'Africa', 'LSL', 'UTC+02:00', -29.61, 28.23, 'alpine', 'Maseru', 'Maseru', 'MSU'],
  ['430', 'LR', 'Liberia', 'Africa', 'LRD', 'UTC+00:00', 6.43, -9.43, 'tropical', 'Montserrado', 'Monrovia', 'ROB'],
  ['434', 'LY', 'Libya', 'Africa', 'LYD', 'UTC+02:00', 26.34, 17.23, 'desert', 'Tripoli', 'Tripoli', 'MJI'],
  ['438', 'LI', 'Liechtenstein', 'Europe', 'CHF', 'UTC+01:00', 47.17, 9.56, 'alpine', 'Vaduz', 'Vaduz', 'ZRH'],
  ['440', 'LT', 'Lithuania', 'Europe', 'EUR', 'UTC+02:00', 55.17, 23.88, 'temperate', 'Vilnius County', 'Vilnius', 'VNO'],
  ['442', 'LU', 'Luxembourg', 'Europe', 'EUR', 'UTC+01:00', 49.82, 6.13, 'temperate', 'Luxembourg District', 'Luxembourg City', 'LUX'],
  ['450', 'MG', 'Madagascar', 'Africa', 'MGA', 'UTC+03:00', -18.77, 46.87, 'tropical', 'Analamanga', 'Antananarivo', 'TNR'],
  ['454', 'MW', 'Malawi', 'Africa', 'MWK', 'UTC+02:00', -13.25, 34.3, 'tropical', 'Central Region', 'Lilongwe', 'LLW'],
  ['458', 'MY', 'Malaysia', 'Asia', 'MYR', 'UTC+08:00', 4.21, 101.98, 'tropical', 'Kuala Lumpur / Selangor', 'Kuala Lumpur', 'KUL'],
  ['462', 'MV', 'Maldives', 'Asia', 'MVR', 'UTC+05:00', 3.2, 73.22, 'coastal', 'Kaafu Atoll', 'Malé', 'MLE'],
  ['466', 'ML', 'Mali', 'Africa', 'XOF', 'UTC+00:00', 17.57, -4.0, 'desert', 'Bamako', 'Bamako', 'BKO'],
  ['470', 'MT', 'Malta', 'Europe', 'EUR', 'UTC+01:00', 35.94, 14.38, 'coastal', 'Valletta', 'Valletta', 'MLA'],
  ['584', 'MH', 'Marshall Islands', 'Oceania', 'USD', 'UTC+12:00', 7.13, 171.18, 'coastal', 'Majuro Atoll', 'Majuro', 'MAJ'],
  ['478', 'MR', 'Mauritania', 'Africa', 'MRU', 'UTC+00:00', 21.01, -10.94, 'desert', 'Nouakchott', 'Nouakchott', 'NKC'],
  ['480', 'MU', 'Mauritius', 'Africa', 'MUR', 'UTC+04:00', -20.35, 57.55, 'coastal', 'Port Louis', 'Port Louis', 'MRU'],
  ['484', 'MX', 'Mexico', 'North America', 'MXN', 'UTC-06:00', 23.63, -102.55, 'desert', 'Mexico City', 'Mexico City', 'MEX'],
  ['583', 'FM', 'Micronesia', 'Oceania', 'USD', 'UTC+11:00', 7.43, 150.55, 'coastal', 'Pohnpei', 'Palikir', 'PNI'],
  ['498', 'MD', 'Moldova', 'Europe', 'MDL', 'UTC+02:00', 47.41, 28.37, 'temperate', 'Chișinău', 'Chișinău', 'RMO'],
  ['492', 'MC', 'Monaco', 'Europe', 'EUR', 'UTC+01:00', 43.73, 7.42, 'coastal', 'Monte Carlo', 'Monaco', 'MCM'],
  ['496', 'MN', 'Mongolia', 'Asia', 'MNT', 'UTC+08:00', 46.86, 103.85, 'desert', 'Ulaanbaatar', 'Ulaanbaatar', 'UBN'],
  ['499', 'ME', 'Montenegro', 'Europe', 'EUR', 'UTC+01:00', 42.71, 19.37, 'coastal', 'Podgorica', 'Podgorica', 'TGD'],
  ['504', 'MA', 'Morocco', 'Africa', 'MAD', 'UTC+01:00', 31.79, -7.09, 'desert', 'Casablanca-Settat', 'Casablanca', 'CMN'],
  ['508', 'MZ', 'Mozambique', 'Africa', 'MZN', 'UTC+02:00', -18.67, 35.53, 'tropical', 'Maputo', 'Maputo', 'MPM'],
  ['104', 'MM', 'Myanmar', 'Asia', 'MMK', 'UTC+06:30', 21.92, 95.96, 'tropical', 'Yangon Region', 'Yangon', 'RGN'],
  ['516', 'NA', 'Namibia', 'Africa', 'NAD', 'UTC+02:00', -22.96, 18.49, 'desert', 'Khomas', 'Windhoek', 'WDH'],
  ['520', 'NR', 'Nauru', 'Oceania', 'AUD', 'UTC+12:00', -0.52, 166.93, 'coastal', 'Yaren', 'Yaren', 'INU'],
  ['524', 'NP', 'Nepal', 'Asia', 'NPR', 'UTC+05:45', 28.39, 84.12, 'alpine', 'Bagmati Province', 'Kathmandu', 'KTM'],
  ['528', 'NL', 'Netherlands', 'Europe', 'EUR', 'UTC+01:00', 52.13, 5.29, 'temperate', 'North Holland', 'Amsterdam', 'AMS'],
  ['554', 'NZ', 'New Zealand', 'Oceania', 'NZD', 'UTC+12:00', -40.9, 174.89, 'temperate', 'Auckland Region', 'Auckland', 'AKL'],
  ['558', 'NI', 'Nicaragua', 'North America', 'NIO', 'UTC-06:00', 12.87, -85.21, 'tropical', 'Managua', 'Managua', 'MGA'],
  ['562', 'NE', 'Niger', 'Africa', 'XOF', 'UTC+01:00', 17.61, 8.08, 'desert', 'Niamey', 'Niamey', 'NIM'],
  ['566', 'NG', 'Nigeria', 'Africa', 'NGN', 'UTC+01:00', 9.08, 8.68, 'tropical', 'Lagos / Abuja', 'Lagos', 'LOS'],
  ['807', 'MK', 'North Macedonia', 'Europe', 'MKD', 'UTC+01:00', 41.61, 21.75, 'temperate', 'Skopje', 'Skopje', 'SKP'],
  ['578', 'NO', 'Norway', 'Europe', 'NOK', 'UTC+01:00', 60.47, 8.47, 'polar', 'Oslo', 'Oslo', 'OSL'],
  ['512', 'OM', 'Oman', 'Asia', 'OMR', 'UTC+04:00', 21.47, 55.98, 'desert', 'Muscat Governorate', 'Muscat', 'MCT'],
  ['586', 'PK', 'Pakistan', 'Asia', 'PKR', 'UTC+05:00', 30.38, 69.35, 'desert', 'Islamabad / Karachi', 'Islamabad', 'ISB'],
  ['585', 'PW', 'Palau', 'Oceania', 'USD', 'UTC+09:00', 7.51, 134.58, 'coastal', 'Koror', 'Koror', 'ROR'],
  ['275', 'PS', 'Palestine', 'Asia', 'ILS', 'UTC+02:00', 31.95, 35.23, 'desert', 'West Bank', 'Ramallah', 'AMM'],
  ['591', 'PA', 'Panama', 'North America', 'PAB', 'UTC-05:00', 8.54, -80.78, 'tropical', 'Panamá Province', 'Panama City', 'PTY'],
  ['598', 'PG', 'Papua New Guinea', 'Oceania', 'PGK', 'UTC+10:00', -6.31, 143.96, 'tropical', 'National Capital', 'Port Moresby', 'POM'],
  ['600', 'PY', 'Paraguay', 'South America', 'PYG', 'UTC-04:00', -23.44, -58.44, 'tropical', 'Asunción', 'Asunción', 'ASU'],
  ['604', 'PE', 'Peru', 'South America', 'PEN', 'UTC-05:00', -9.19, -75.02, 'alpine', 'Lima / Cusco', 'Lima', 'LIM'],
  ['608', 'PH', 'Philippines', 'Asia', 'PHP', 'UTC+08:00', 12.88, 121.77, 'tropical', 'Metro Manila', 'Manila', 'MNL'],
  ['616', 'PL', 'Poland', 'Europe', 'PLN', 'UTC+01:00', 51.92, 19.15, 'temperate', 'Masovian', 'Warsaw', 'WAW'],
  ['620', 'PT', 'Portugal', 'Europe', 'EUR', 'UTC+00:00', 39.4, -8.22, 'coastal', 'Lisbon District', 'Lisbon', 'LIS'],
  ['642', 'RO', 'Romania', 'Europe', 'RON', 'UTC+02:00', 45.94, 24.97, 'temperate', 'Bucharest', 'Bucharest', 'OTP'],
  ['643', 'RU', 'Russia', 'Europe', 'RUB', 'UTC+03:00', 61.52, 105.32, 'polar', 'Moscow / St. Petersburg', 'Moscow', 'SVO'],
  ['646', 'RW', 'Rwanda', 'Africa', 'RWF', 'UTC+02:00', -1.94, 29.87, 'tropical', 'Kigali Province', 'Kigali', 'KGL'],
  ['659', 'KN', 'Saint Kitts and Nevis', 'North America', 'XCD', 'UTC-04:00', 17.36, -62.78, 'coastal', 'Saint George Basseterre', 'Basseterre', 'SKB'],
  ['662', 'LC', 'Saint Lucia', 'North America', 'XCD', 'UTC-04:00', 13.91, -60.98, 'coastal', 'Castries', 'Castries', 'UVF'],
  ['670', 'VC', 'Saint Vincent and the Grenadines', 'North America', 'XCD', 'UTC-04:00', 12.98, -61.29, 'coastal', 'Saint George', 'Kingstown', 'SVD'],
  ['882', 'WS', 'Samoa', 'Oceania', 'WST', 'UTC+13:00', -13.76, -172.1, 'coastal', 'Tuamasaga', 'Apia', 'APW'],
  ['674', 'SM', 'San Marino', 'Europe', 'EUR', 'UTC+01:00', 43.94, 12.46, 'temperate', 'City of San Marino', 'San Marino', 'RMI'],
  ['678', 'ST', 'São Tomé and Príncipe', 'Africa', 'STN', 'UTC+00:00', 0.19, 6.61, 'tropical', 'Água Grande', 'São Tomé', 'TMS'],
  ['682', 'SA', 'Saudi Arabia', 'Asia', 'SAR', 'UTC+03:00', 23.89, 45.08, 'desert', 'Riyadh / Makkah', 'Riyadh', 'RUH'],
  ['686', 'SN', 'Senegal', 'Africa', 'XOF', 'UTC+00:00', 14.5, -14.45, 'desert', 'Dakar', 'Dakar', 'DSS'],
  ['688', 'RS', 'Serbia', 'Europe', 'RSD', 'UTC+01:00', 44.02, 21.01, 'temperate', 'Belgrade', 'Belgrade', 'BEG'],
  ['690', 'SC', 'Seychelles', 'Africa', 'SCR', 'UTC+04:00', -4.68, 55.49, 'coastal', 'Mahé', 'Victoria', 'SEZ'],
  ['694', 'SL', 'Sierra Leone', 'Africa', 'SLE', 'UTC+00:00', 8.46, -11.78, 'tropical', 'Western Area', 'Freetown', 'FNA'],
  ['703', 'SK', 'Slovakia', 'Europe', 'EUR', 'UTC+01:00', 48.67, 19.7, 'temperate', 'Bratislava', 'Bratislava', 'BTS'],
  ['705', 'SI', 'Slovenia', 'Europe', 'EUR', 'UTC+01:00', 46.15, 15.0, 'alpine', 'Central Slovenia', 'Ljubljana', 'LJU'],
  ['090', 'SB', 'Solomon Islands', 'Oceania', 'SBD', 'UTC+11:00', -9.65, 160.16, 'tropical', 'Guadalcanal', 'Honiara', 'HIR'],
  ['706', 'SO', 'Somalia', 'Africa', 'SOS', 'UTC+03:00', 5.15, 46.2, 'desert', 'Banaadir', 'Mogadishu', 'MGQ'],
  ['710', 'ZA', 'South Africa', 'Africa', 'ZAR', 'UTC+02:00', -30.56, 22.94, 'temperate', 'Gauteng / Western Cape', 'Johannesburg', 'JNB'],
  ['728', 'SS', 'South Sudan', 'Africa', 'SSP', 'UTC+02:00', 6.88, 31.31, 'tropical', 'Central Equatoria', 'Juba', 'JUB'],
  ['724', 'ES', 'Spain', 'Europe', 'EUR', 'UTC+01:00', 40.46, -3.75, 'temperate', 'Madrid / Catalonia', 'Madrid', 'MAD'],
  ['144', 'LK', 'Sri Lanka', 'Asia', 'LKR', 'UTC+05:30', 7.87, 80.77, 'tropical', 'Western Province', 'Colombo', 'CMB'],
  ['729', 'SD', 'Sudan', 'Africa', 'SDG', 'UTC+02:00', 12.86, 30.22, 'desert', 'Khartoum', 'Khartoum', 'KRT'],
  ['740', 'SR', 'Suriname', 'South America', 'SRD', 'UTC-03:00', 3.92, -56.03, 'tropical', 'Paramaribo', 'Paramaribo', 'PBM'],
  ['752', 'SE', 'Sweden', 'Europe', 'SEK', 'UTC+01:00', 60.13, 18.64, 'polar', 'Stockholm County', 'Stockholm', 'ARN'],
  ['760', 'SY', 'Syria', 'Asia', 'SYP', 'UTC+03:00', 34.8, 39.0, 'desert', 'Damascus', 'Damascus', 'DAM'],
  ['762', 'TJ', 'Tajikistan', 'Asia', 'TJS', 'UTC+05:00', 38.86, 71.28, 'alpine', 'Dushanbe', 'Dushanbe', 'DYU'],
  ['834', 'TZ', 'Tanzania', 'Africa', 'TZS', 'UTC+03:00', -6.37, 34.89, 'tropical', 'Dar es Salaam', 'Dar es Salaam', 'DAR'],
  ['764', 'TH', 'Thailand', 'Asia', 'THB', 'UTC+07:00', 15.87, 100.99, 'tropical', 'Bangkok Metropolitan', 'Bangkok', 'BKK'],
  ['626', 'TL', 'Timor-Leste', 'Asia', 'USD', 'UTC+09:00', -8.87, 125.73, 'tropical', 'Dili', 'Dili', 'DIL'],
  ['768', 'TG', 'Togo', 'Africa', 'XOF', 'UTC+00:00', 8.62, 0.82, 'tropical', 'Maritime', 'Lomé', 'LFW'],
  ['776', 'TO', 'Tonga', 'Oceania', 'TOP', 'UTC+13:00', -21.18, -175.2, 'coastal', 'Tongatapu', "Nuku'alofa", 'TBU'],
  ['780', 'TT', 'Trinidad and Tobago', 'North America', 'TTD', 'UTC-04:00', 10.69, -61.22, 'coastal', 'Port of Spain', 'Port of Spain', 'POS'],
  ['788', 'TN', 'Tunisia', 'Africa', 'TND', 'UTC+01:00', 33.89, 9.54, 'desert', 'Tunis', 'Tunis', 'TUN'],
  ['792', 'TR', 'Turkey', 'Asia', 'TRY', 'UTC+03:00', 38.96, 35.24, 'temperate', 'Istanbul / Ankara', 'Istanbul', 'IST'],
  ['795', 'TM', 'Turkmenistan', 'Asia', 'TMT', 'UTC+05:00', 38.97, 59.56, 'desert', 'Ashgabat', 'Ashgabat', 'ASB'],
  ['798', 'TV', 'Tuvalu', 'Oceania', 'AUD', 'UTC+12:00', -7.11, 177.65, 'coastal', 'Funafuti', 'Funafuti', 'FUN'],
  ['800', 'UG', 'Uganda', 'Africa', 'UGX', 'UTC+03:00', 1.37, 32.29, 'tropical', 'Central Region', 'Kampala / Entebbe', 'EBB'],
  ['804', 'UA', 'Ukraine', 'Europe', 'UAH', 'UTC+02:00', 48.38, 31.17, 'temperate', 'Kyiv', 'Kyiv', 'KBP'],
  ['858', 'UY', 'Uruguay', 'South America', 'UYU', 'UTC-03:00', -32.52, -55.77, 'temperate', 'Montevideo', 'Montevideo', 'MVD'],
  ['860', 'UZ', 'Uzbekistan', 'Asia', 'UZS', 'UTC+05:00', 41.38, 64.59, 'desert', 'Tashkent', 'Tashkent', 'TAS'],
  ['548', 'VU', 'Vanuatu', 'Oceania', 'VUV', 'UTC+11:00', -15.38, 166.96, 'coastal', 'Shefa', 'Port Vila', 'VLI'],
  ['336', 'VA', 'Vatican City', 'Europe', 'EUR', 'UTC+01:00', 41.9, 12.45, 'temperate', 'Vatican City', 'Vatican City', 'FCO'],
  ['862', 'VE', 'Venezuela', 'South America', 'VES', 'UTC-04:00', 6.42, -66.59, 'tropical', 'Capital District', 'Caracas', 'CCS'],
  ['704', 'VN', 'Vietnam', 'Asia', 'VND', 'UTC+07:00', 14.06, 108.28, 'tropical', 'Hanoi / Ho Chi Minh', 'Ho Chi Minh City', 'SGN'],
  ['887', 'YE', 'Yemen', 'Asia', 'YER', 'UTC+03:00', 15.55, 48.52, 'desert', 'Sanaa / Aden', 'Aden', 'ADE'],
  ['894', 'ZM', 'Zambia', 'Africa', 'ZMW', 'UTC+02:00', -13.13, 27.85, 'tropical', 'Lusaka Province', 'Lusaka', 'LUN'],
  ['716', 'ZW', 'Zimbabwe', 'Africa', 'ZWL', 'UTC+02:00', -19.02, 29.15, 'tropical', 'Harare Province', 'Harare', 'HRE'],
];

const EXPANDED_REMAINING: WorldCountryEntry[] = REMAINING_183_COUNTRIES.map(
  ([isoNumeric, iso2, name, continent, currency, timezone, lat, lon, biome, stateName, cityName, iata]) => ({
    isoNumeric,
    iso2,
    name,
    continent,
    currency,
    timezone,
    lat,
    lon,
    biome,
    states: [
      {
        id: `${iso2.toLowerCase()}-primary`,
        name: stateName,
        cities: [
          {
            id: `${iso2.toLowerCase()}-${iata.toLowerCase()}`,
            name: cityName,
            iata,
            airportName: `${cityName} Intl Airport`,
            lat,
            lon,
          },
        ],
      },
    ],
  })
);

export const WORLD_ATLAS_COUNTRIES: WorldCountryEntry[] = [
  ...DETAILED_COUNTRIES,
  ...EXPANDED_REMAINING,
].sort((a, b) => (a.iso2 === 'IN' ? -1 : b.iso2 === 'IN' ? 1 : a.name.localeCompare(b.name)));

export interface SelectedWorldLocation {
  country: WorldCountryEntry;
  state: WorldStateRegion;
  city: WorldCityHub;
}

export const DEFAULT_WORLD_ORIGIN: SelectedWorldLocation = {
  country: DETAILED_COUNTRIES[0],
  state: DETAILED_COUNTRIES[0].states[0],
  city: DETAILED_COUNTRIES[0].states[0].cities[0], // India -> Kerala -> Pathanamthitta
};

export function findCountryByIsoNumeric(isoNumeric: string | number): WorldCountryEntry | undefined {
  const padded = String(isoNumeric).padStart(3, '0');
  return WORLD_ATLAS_COUNTRIES.find((c) => c.isoNumeric === padded);
}

export function findCountryByIso2(iso2: string): WorldCountryEntry | undefined {
  const upper = iso2.trim().toUpperCase();
  return WORLD_ATLAS_COUNTRIES.find((c) => c.iso2 === upper);
}

export function getWorldCountryByIso(iso: string | number): WorldCountryEntry | undefined {
  const raw = String(iso).trim();
  if (!raw) return undefined;
  if (/^\d+$/.test(raw)) {
    return findCountryByIsoNumeric(raw);
  }
  return findCountryByIso2(raw);
}

export function findWorldLocationByKeralaDistrict(districtId: string): SelectedWorldLocation | null {
  const india = DETAILED_COUNTRIES[0];
  for (const state of india.states) {
    for (const city of state.cities) {
      if (city.keralaDistrictId === districtId) {
        return { country: india, state, city };
      }
    }
  }
  return null;
}

export function formatWorldLocationLabel(loc: SelectedWorldLocation): string {
  if (loc.country.iso2 === 'IN' && loc.state.id === 'in-kl') {
    return `${loc.city.name}, Kerala`;
  }
  return `${loc.city.name}, ${loc.country.name} (${loc.city.iata})`;
}

export const GLOBAL_FEATURED_DESTINATIONS: Array<{
  label: string;
  subtitle: string;
  countryIso2: string;
  cityIata?: string;
  keralaDistrictId?: string;
}> = [
  { label: 'Wayanad', subtitle: 'Kerala Highlands', countryIso2: 'IN', keralaDistrictId: 'wayanad' },
  { label: 'Dubai (DXB)', subtitle: 'Emirates A380 · UAE', countryIso2: 'AE', cityIata: 'DXB' },
  { label: 'Doha (DOH)', subtitle: 'Qatar B777 · Gulf', countryIso2: 'QA', cityIata: 'DOH' },
  { label: 'London (LHR)', subtitle: 'BA / Air India · UK', countryIso2: 'GB', cityIata: 'LHR' },
  { label: 'Singapore (SIN)', subtitle: 'SQ A350 · SE Asia', countryIso2: 'SG', cityIata: 'SIN' },
  { label: 'Tokyo (HND)', subtitle: 'Japan · East Asia', countryIso2: 'JP', cityIata: 'HND' },
  { label: 'New York (JFK)', subtitle: 'USA · Transatlantic', countryIso2: 'US', cityIata: 'JFK' },
  { label: 'Bengaluru (BLR)', subtitle: 'IndiGo 6E · Domestic', countryIso2: 'IN', keralaDistrictId: 'bengaluru' },
];
