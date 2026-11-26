export type UserRole = 'Citizen' | 'LSG / Police Officer';
export type AuthProviderKind = 'google' | 'password' | 'guest';

export type VaultSectionKey =
  | 'tickets'
  | 'policeCases'
  | 'bookings'
  | 'studyPlans'
  | 'admissions'
  | 'jobApps'
  | 'hospitalBookings'
  | 'weekendPlans'
  | 'eventPlan'
  | 'foodOrders'
  | 'expenses'
  | 'budgetGoal'
  | 'chatHistory';

export interface UserProfile {
  userId: string;
  fullName: string;
  email: string;
  homeDistrictId: string;
  homeDistrictName: string;
  role: UserRole;
  abhaHealthId?: string;
  academicStream?: string;
  authProvider: AuthProviderKind;
  createdAt?: string;
}

export const GUEST_DEMO_USER: UserProfile = {
  userId: 'guest_demo_citizen',
  fullName: 'Demo Citizen (Pathanamthitta)',
  email: 'demo.citizen@civictriage.kerala.gov.in',
  homeDistrictId: 'pathanamthitta',
  homeDistrictName: 'Pathanamthitta, Kerala',
  role: 'Citizen',
  abhaHealthId: '91-4821-7703-1129',
  academicStream: 'Science & CS (PCM + Computer Science)',
  authProvider: 'guest',
};

export const ACADEMIC_STREAM_OPTIONS = [
  'Science & CS (PCM + Computer Science)',
  'Biology & Medical (PCB / NEET)',
  'Commerce & Finance',
  'Humanities & Civil Services',
  'B.Tech / Engineering (KTU / NIT)',
  'Skill Dev / Full-Stack & Applied AI',
] as const;

export function getAvatarInitials(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'CT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function sanitizeUserId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return cleaned || 'guest_demo_citizen';
}

export function getUserVaultStorageKey(
  userId: string,
  section: VaultSectionKey
): string {
  return `civictriage_${sanitizeUserId(userId)}_${section}`;
}

export function loadUserVaultJson<T>(
  userId: string,
  section: VaultSectionKey,
  fallback: T
): T {
  try {
    const key = getUserVaultStorageKey(userId, section);
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveUserVaultJson<T>(
  userId: string,
  section: VaultSectionKey,
  value: T
): void {
  try {
    const key = getUserVaultStorageKey(userId, section);
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Ignore browser quota errors
  }
}
