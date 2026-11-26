import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Compass,
  FileWarning,
  GraduationCap,
  HeartPulse,
  Home,
  LogOut,
  Menu,
  Moon,
  Search,
  Shield,
  Sparkles,
  Store,
  Sun,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import type { ThemeMode } from '../hooks/useThemeMode';
import type { WorkspaceTab } from './SidebarNav';
import { WORLD_ATLAS_COUNTRIES } from '../data/worldAtlasData';
import {
  EDUCATION_DIRECTORY,
  LIFESTYLE_DIRECTORY,
  LOCAL_FEEDER_ROUTES,
} from '../data/localLifeData';
import { DOCTORS_DIRECTORY, HOSPITAL_DIRECTORY } from '../data/healthcareData';
import type { StoredTicket } from '../shared/triageSchema';
import type { StoredPoliceCase } from '../shared/policeSchema';
import { getAvatarInitials, type UserProfile } from '../shared/authSchema';

export interface GlobalSearchResult {
  id: string;
  category:
    | 'world'
    | 'civic'
    | 'police'
    | 'education'
    | 'lifestyle'
    | 'transport'
    | 'healthcare';
  title: string;
  subtitle: string;
  payload: string;
}

interface TopBarProps {
  activeTab: WorkspaceTab;
  activeUser: UserProfile;
  onOpenDrawer: () => void;
  onGoHome: () => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  onLoadDemoData?: () => void;
  demoLoaded?: boolean;
  tickets?: StoredTicket[];
  policeCases?: StoredPoliceCase[];
  onSelectSearchResult?: (result: GlobalSearchResult) => void;
  themeMode?: ThemeMode;
  onToggleTheme?: () => void;
  onOpenProfileModal?: () => void;
  onOpenSwitchAccountModal?: () => void;
  onSignOut?: () => void;
}

const BREADCRUMB_MAP: Record<WorkspaceTab, { title: string }> = {
  home: { title: 'Welcome Portal' },
  intake: { title: 'Citizen Report' },
  queue: { title: 'Officer Dashboard' },
  police: { title: 'Police & Safety Desk' },
  travel: { title: 'Global 3D Travel & Bookings' },
  local_life: { title: 'Local Life Hub' },
  policy: { title: 'Routing Policy & Schema' },
};

export function TopBar({
  activeTab,
  activeUser,
  onOpenDrawer,
  onGoHome,
  onPrimaryAction,
  primaryActionLabel,
  onLoadDemoData,
  demoLoaded = false,
  tickets = [],
  policeCases = [],
  onSelectSearchResult,
  themeMode = 'light',
  onToggleTheme,
  onOpenProfileModal,
  onOpenSwitchAccountModal,
  onSignOut,
}: TopBarProps) {
  const crumb = BREADCRUMB_MAP[activeTab];
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onEsc);
    };
  }, [profileMenuOpen]);

  const searchResults = useMemo<GlobalSearchResult[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const results: GlobalSearchResult[] = [];

    for (const country of WORLD_ATLAS_COUNTRIES) {
      if (results.length >= 10) break;
      const primaryCity = country.states[0]?.cities[0]?.name ?? country.name;
      const countryMatch =
        country.name.toLowerCase().includes(q) ||
        country.iso2.toLowerCase() === q ||
        primaryCity.toLowerCase().includes(q);
      if (countryMatch) {
        results.push({
          id: `world-c-${country.isoNumeric}`,
          category: 'world',
          title: `${country.name} (${country.iso2})`,
          subtitle: `${primaryCity} · ${country.continent} · Fly in 3D Atlas`,
          payload: `${country.isoNumeric}::${country.states[0]?.id ?? ''}::${country.states[0]?.cities[0]?.id ?? ''}`,
        });
        continue;
      }
      for (const state of country.states) {
        if (state.name.toLowerCase().includes(q)) {
          results.push({
            id: `world-s-${country.isoNumeric}-${state.id}`,
            category: 'world',
            title: `${state.name}, ${country.name}`,
            subtitle: `${state.cities[0]?.name ?? primaryCity} · Explore in 3D Earth`,
            payload: `${country.isoNumeric}::${state.id}::${state.cities[0]?.id ?? ''}`,
          });
          break;
        }
        const city = state.cities.find(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.iata && c.iata.toLowerCase() === q)
        );
        if (city) {
          results.push({
            id: `world-city-${city.id}`,
            category: 'world',
            title: `${city.name}${city.iata ? ` (${city.iata})` : ''}`,
            subtitle: `${state.name}, ${country.name} · Plan flights & 3D route`,
            payload: `${country.isoNumeric}::${state.id}::${city.id}`,
          });
          break;
        }
      }
    }

    for (const t of tickets) {
      if (
        t.triage.ticket_title.toLowerCase().includes(q) ||
        t.triage.department.toLowerCase().includes(q) ||
        t.localBodyHint.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      ) {
        results.push({
          id: `civic-${t.id}`,
          category: 'civic',
          title: t.triage.ticket_title,
          subtitle: `${t.id} · ${t.triage.department} · ${t.workflowStatus}`,
          payload: t.id,
        });
      }
    }

    for (const p of policeCases) {
      if (
        p.caseRefId.toLowerCase().includes(q) ||
        p.districtName.toLowerCase().includes(q) ||
        p.triage.case_category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      ) {
        results.push({
          id: `police-${p.id}`,
          category: 'police',
          title: `${p.caseRefId} · ${p.triage.case_category}`,
          subtitle: `${p.districtName} · ${p.triage.jurisdictional_station}`,
          payload: p.id,
        });
      }
    }

    for (const ed of EDUCATION_DIRECTORY) {
      if (
        ed.name.toLowerCase().includes(q) ||
        ed.districtName.toLowerCase().includes(q) ||
        ed.level.toLowerCase().includes(q)
      ) {
        results.push({
          id: `edu-${ed.id}`,
          category: 'education',
          title: ed.name,
          subtitle: `${ed.districtName} · ${ed.level}`,
          payload: ed.districtId,
        });
      }
    }
    for (const life of LIFESTYLE_DIRECTORY) {
      if (
        life.name.toLowerCase().includes(q) ||
        life.districtName.toLowerCase().includes(q) ||
        life.category.toLowerCase().includes(q)
      ) {
        results.push({
          id: `life-${life.id}`,
          category: 'lifestyle',
          title: life.name,
          subtitle: `${life.districtName} · ${life.category}`,
          payload: life.districtId,
        });
      }
    }
    for (const route of LOCAL_FEEDER_ROUTES) {
      if (
        route.routeName.toLowerCase().includes(q) ||
        route.fromStop.toLowerCase().includes(q) ||
        route.toStop.toLowerCase().includes(q)
      ) {
        results.push({
          id: `tr-${route.id}`,
          category: 'transport',
          title: route.routeName,
          subtitle: `${route.mode} · ₹${route.fareInr} · ${route.frequency}`,
          payload: route.districtId,
        });
      }
    }

    for (const hosp of HOSPITAL_DIRECTORY) {
      if (
        hosp.name.toLowerCase().includes(q) ||
        hosp.districtName.toLowerCase().includes(q) ||
        hosp.departments.some((d) => d.toLowerCase().includes(q))
      ) {
        results.push({
          id: `hosp-${hosp.id}`,
          category: 'healthcare',
          title: hosp.name,
          subtitle: `${hosp.ownership} · ${hosp.districtName} · ${hosp.opFeeLabel}`,
          payload: hosp.districtId,
        });
      }
    }
    for (const docItem of DOCTORS_DIRECTORY) {
      if (
        docItem.name.toLowerCase().includes(q) ||
        docItem.specialty.toLowerCase().includes(q) ||
        docItem.hospitalName.toLowerCase().includes(q)
      ) {
        results.push({
          id: `doc-${docItem.id}`,
          category: 'healthcare',
          title: `${docItem.name} (${docItem.specialty})`,
          subtitle: `${docItem.hospitalName} · ${
            docItem.consultationFeeInr === 0 ? '₹0 Govt OP' : `₹${docItem.consultationFeeInr}`
          }`,
          payload: docItem.districtId,
        });
      }
    }

    return results.slice(0, 8);
  }, [searchQuery, tickets, policeCases]);

  const handleSelectResult = (res: GlobalSearchResult) => {
    setSearchQuery('');
    setSearchFocused(false);
    onSelectSearchResult?.(res);
  };

  return (
    <header className="h-16 bg-white/60 dark:bg-slate-950/65 backdrop-blur-2xl backdrop-saturate-[180%] border-b border-white/80 dark:border-white/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-[0_8px_30px_rgba(17,19,21,0.05)]">
      {/* Left: Persistent Liquid Glass Drawer Trigger, Home Pill & Breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onOpenDrawer}
          data-testid="drawer-menu-trigger"
          aria-label="Open navigation drawer"
          title="Open Navigation Drawer"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/85 dark:bg-slate-800/85 hover:bg-white dark:hover:bg-slate-700 text-[#111315] dark:text-white border border-black/8 dark:border-white/15 shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Menu className="w-4 h-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onGoHome}
          data-testid="topbar-home-btn"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            activeTab === 'home'
              ? 'bg-[#111315] dark:bg-white text-white dark:text-slate-950 shadow-sm'
              : 'bg-[#EFECE8]/90 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-black/5 dark:border-white/10'
          }`}
          title="Return to Welcome Portal Homepage"
        >
          <Home className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">CivicTriage</span>
        </button>

        <span className="text-slate-300 dark:text-slate-600 hidden md:inline" aria-hidden="true">
          /
        </span>
        <span className="text-xs sm:text-sm font-bold text-[#111315] dark:text-white truncate hidden md:inline">
          {crumb.title}
        </span>
      </div>

      {/* Center: Tactile Frosted Global Search Pill */}
      <div className="relative flex-1 max-w-md mx-1">
        <div className="relative flex items-center">
          <Search
            className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3.5 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
              setSearchFocused(true);
            }}
            onBlur={() => {
              blurTimeoutRef.current = window.setTimeout(() => setSearchFocused(false), 180);
            }}
            placeholder="Search 195 countries, hospitals, colleges, Aranmula..."
            aria-label="Global platform search"
            className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm bg-[#EFECE8]/90 dark:bg-slate-800/80 hover:bg-white/95 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 border border-black/5 dark:border-white/10 focus:border-[#4F5BD5]/40 rounded-full text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {searchFocused && searchQuery.trim().length >= 2 && (
          <div className="absolute left-0 right-0 mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/80 dark:border-white/15 rounded-3xl shadow-[0_24px_60px_rgba(17,19,21,0.18)] overflow-hidden z-50">
            {searchResults.length === 0 ? (
              <div className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
                No matches for &ldquo;{searchQuery}&rdquo;. Try &ldquo;Dubai&rdquo;, &ldquo;Muthoot&rdquo;, &ldquo;Wayanad&rdquo;, &ldquo;Bhavans&rdquo;, or &ldquo;CNGR&rdquo;.
              </div>
            ) : (
              <ul className="divide-y divide-black/5 dark:divide-white/10 max-h-80 overflow-y-auto py-1">
                {searchResults.map((res) => (
                  <li key={res.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectResult(res);
                      }}
                      className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-[#EFECE8]/70 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-xl bg-[#EFECE8] dark:bg-slate-800 text-[#4F5BD5] dark:text-[#A5B4FC] flex items-center justify-center shrink-0">
                          {res.category === 'world' && <Compass className="w-3.5 h-3.5" />}
                          {res.category === 'civic' && <FileWarning className="w-3.5 h-3.5" />}
                          {res.category === 'police' && <Shield className="w-3.5 h-3.5" />}
                          {res.category === 'education' && <GraduationCap className="w-3.5 h-3.5" />}
                          {(res.category === 'lifestyle' || res.category === 'transport') && (
                            <Store className="w-3.5 h-3.5" />
                          )}
                          {res.category === 'healthcare' && (
                            <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#111315] dark:text-white truncate">
                            {res.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {res.subtitle}
                          </p>
                        </div>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Right: Theme Toggle Pill, Demo Data, Primary CTA & Profile Pill */}
      <div className="shrink-0 flex items-center gap-2">
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            data-testid="theme-toggle-btn"
            role="switch"
            aria-checked={themeMode === 'dark'}
            aria-label={
              themeMode === 'dark'
                ? 'Switch to Sunlit Alabaster Light Mode'
                : 'Switch to Obsidian Spatial Dark Mode'
            }
            className="inline-flex items-center gap-1 p-1 rounded-full bg-[#EFECE8]/95 dark:bg-slate-900/90 border border-black/8 dark:border-white/15 shadow-xs transition-all cursor-pointer shrink-0"
          >
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold transition-all ${
                themeMode === 'light'
                  ? 'bg-white text-[#111315] shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
              <span className="hidden xl:inline">Light</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold transition-all ${
                themeMode === 'dark'
                  ? 'bg-[#8E96FF]/28 text-white border border-[#8E96FF]/50 shadow-[0_0_14px_rgba(142,150,255,0.3)]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-[#4F5BD5] dark:text-[#A5B4FC]" aria-hidden="true" />
              <span className="hidden xl:inline">Dark</span>
            </span>
          </button>
        )}

        {onLoadDemoData && (
          <button
            type="button"
            onClick={onLoadDemoData}
            data-testid="load-demo-data-btn"
            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-full border transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
              demoLoaded
                ? 'bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                : 'bg-white/80 dark:bg-slate-800/80 text-[#111315] dark:text-white border-black/8 dark:border-white/10 hover:bg-white dark:hover:bg-slate-800 shadow-xs'
            }`}
            title="Populate realistic Kerala civic hazards, Police petitions, Emirates & IRCTC bookings, Study Plan, Admission Receipt, Weekend Plan, and Expenses"
          >
            {demoLoaded ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>Demo Loaded</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#4F5BD5] dark:text-[#A5B4FC]" aria-hidden="true" />
                <span className="hidden xl:inline">Load Demo</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onPrimaryAction}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white dark:text-slate-950 bg-[#111315] dark:bg-white hover:opacity-90 rounded-full shadow-md shadow-black/15 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#A5B4FC] dark:text-[#4F5BD5]" aria-hidden="true" />
          <span>{primaryActionLabel}</span>
        </button>

        {/* Top-Right Liquid Glass Profile Pill */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setProfileMenuOpen((v) => !v)}
            data-testid="topbar-profile-pill"
            aria-expanded={profileMenuOpen}
            className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-white/85 dark:bg-slate-800/85 hover:bg-white dark:hover:bg-slate-800 border border-black/8 dark:border-white/15 shadow-xs transition-all cursor-pointer"
          >
            <span className="w-7 h-7 rounded-full bg-[#4F5BD5] dark:bg-[#8E96FF] text-white dark:text-slate-950 text-[11px] font-extrabold flex items-center justify-center shrink-0">
              {getAvatarInitials(activeUser.fullName)}
            </span>
            <span className="hidden lg:flex flex-col items-start leading-tight max-w-[110px]">
              <span className="text-[11px] font-bold text-[#111315] dark:text-white truncate w-full">
                {activeUser.fullName.split(' ')[0]}
              </span>
              <span className="text-[9.5px] font-semibold text-[#4F5BD5] dark:text-[#A5B4FC] truncate w-full">
                {activeUser.authProvider === 'guest' ? 'Guest Citizen' : activeUser.role}
              </span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-[24px] bg-white/92 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/90 dark:border-white/15 shadow-[0_24px_60px_rgba(17,19,21,0.22)] p-2 z-50 space-y-1">
              <div className="px-3 py-2.5 border-b border-black/6 dark:border-white/10">
                <p className="text-xs font-extrabold text-[#111315] dark:text-white truncate">
                  {activeUser.fullName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {activeUser.email}
                </p>
                <p className="mt-1 text-[10px] font-bold text-[#4F5BD5] dark:text-[#A5B4FC]">
                  {activeUser.role} · {activeUser.homeDistrictName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onOpenProfileModal?.();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EFECE8]/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <UserCog className="w-3.5 h-3.5 text-[#4F5BD5] dark:text-[#8E96FF]" />
                Edit Profile &amp; Autofills
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onOpenSwitchAccountModal?.();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EFECE8]/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-[#4F5BD5] dark:text-[#8E96FF]" />
                Switch / Create Account
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onSignOut?.();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
