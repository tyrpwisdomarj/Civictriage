import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BookOpen,
  Briefcase,
  Bus,
  Calendar,
  Check,
  ClipboardList,
  Compass,
  FilePlus2,
  Globe2,
  GraduationCap,
  HeartPulse,
  Home,
  Layers,
  LogOut,
  Map,
  MapPin,
  Moon,
  Shield,
  Sparkles,
  Store,
  Sun,
  UserCog,
  Wallet,
  X,
} from 'lucide-react';
import type { QueueMetrics, MunicipalDepartment } from '../shared/triageSchema';
import type { LocalLifeSection } from '../data/localLifeData';
import type { ExplorerViewMode } from './travel/Kerala3DMapScene';
import type { ThemeMode } from '../hooks/useThemeMode';
import { getAvatarInitials, type UserProfile } from '../shared/authSchema';
import { PWAInstallButton } from './PWAInstallButton';

export type WorkspaceTab =
  | 'home'
  | 'intake'
  | 'queue'
  | 'police'
  | 'travel'
  | 'local_life'
  | 'policy';

interface SidebarNavProps {
  open: boolean;
  onClose: () => void;
  activeTab: WorkspaceTab;
  activeTravelMode?: ExplorerViewMode;
  activeLocalLifeSection?: LocalLifeSection;
  activeUser: UserProfile;
  metrics: QueueMetrics;
  activePoliceCount?: number;
  bookedTicketsCount?: number;
  themeMode: ThemeMode;
  demoLoaded?: boolean;
  onSelectTab: (tab: WorkspaceTab) => void;
  onSelectTravelMode: (mode: ExplorerViewMode) => void;
  onSelectLocalLifeSection: (section: LocalLifeSection) => void;
  onSelectDepartmentFilter?: (department: MunicipalDepartment) => void;
  onToggleTheme: () => void;
  onLoadDemoData: () => void;
  onOpenAccountModal: (mode: 'profile' | 'signin') => void;
  onSignOut: () => void;
}

export function SidebarNav({
  open,
  onClose,
  activeTab,
  activeTravelMode = 'globe',
  activeLocalLifeSection = 'education',
  activeUser,
  metrics,
  activePoliceCount = 0,
  bookedTicketsCount = 0,
  themeMode,
  demoLoaded = false,
  onSelectTab,
  onSelectTravelMode,
  onSelectLocalLifeSection,
  onToggleTheme,
  onLoadDemoData,
  onOpenAccountModal,
  onSignOut,
}: SidebarNavProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const navigateAndClose = (fn: () => void) => {
    fn();
    onClose();
  };

  const navItemClass = (isActive: boolean) =>
    `w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl text-[13px] font-semibold transition-all duration-150 cursor-pointer ${
      isActive
        ? 'bg-[#4F5BD5]/14 dark:bg-[#8E96FF]/20 text-[#4F5BD5] dark:text-[#A5B4FC] border border-[#4F5BD5]/28 dark:border-[#8E96FF]/35 shadow-xs'
        : 'text-slate-700 dark:text-slate-200 border border-transparent hover:bg-white/75 dark:hover:bg-white/10 hover:text-[#111315] dark:hover:text-white'
    }`;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="CivicTriage Navigation Drawer"
        >
          {/* Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Slide-Out iOS Liquid Glass Drawer */}
          <motion.aside
            initial={{ x: -340, opacity: 0.85 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -340, opacity: 0.85 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            data-testid="liquid-side-drawer"
            className="relative z-10 w-80 max-w-[88vw] h-full flex flex-col bg-white/75 dark:bg-slate-900/75 backdrop-blur-2xl backdrop-saturate-[180%] border-r border-white/80 dark:border-white/15 shadow-[0_28px_80px_rgba(17,19,21,0.28)]"
          >
            {/* Brand Header + Close */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-black/6 dark:border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => navigateAndClose(() => onSelectTab('home'))}
                className="flex items-center gap-2.5 text-left cursor-pointer"
              >
                <span className="w-9 h-9 rounded-2xl bg-[#111315] dark:bg-white text-white dark:text-slate-950 flex items-center justify-center shadow-md shadow-black/15">
                  <Sparkles className="w-4 h-4 text-[#8E96FF] dark:text-[#4F5BD5]" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span
                    className="font-extrabold text-[15px] tracking-tight text-[#111315] dark:text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    CivicTriage LSG
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    Spatial Civic · Travel · Life OS
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation drawer"
                className="p-2 rounded-full bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-[#111315] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Active User Profile Card */}
            <div className="px-3.5 pt-3.5 pb-2 shrink-0">
              <div className="p-3.5 rounded-[22px] bg-white/70 dark:bg-slate-800/70 border border-white/90 dark:border-white/12 shadow-xs space-y-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-[#4F5BD5] dark:bg-[#8E96FF] text-white dark:text-slate-950 font-extrabold text-xs flex items-center justify-center shadow-sm shrink-0">
                    {getAvatarInitials(activeUser.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-[#111315] dark:text-white truncate">
                      {activeUser.fullName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4F5BD5]/12 dark:bg-[#8E96FF]/20 text-[#4F5BD5] dark:text-[#A5B4FC]">
                        {activeUser.role}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        {activeUser.homeDistrictName.replace(', Kerala', '')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigateAndClose(() => onOpenAccountModal('profile'))}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#EFECE8]/90 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 text-[11px] font-bold text-slate-700 dark:text-slate-200 border border-black/5 dark:border-white/10 transition-colors cursor-pointer"
                  >
                    <UserCog className="w-3.5 h-3.5 text-[#4F5BD5] dark:text-[#8E96FF]" />
                    Edit / Switch
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateAndClose(onSignOut)}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/18 text-[11px] font-bold text-rose-700 dark:text-rose-300 border border-rose-500/20 transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Grouped Navigation Tree */}
            <nav
              aria-label="Grouped workspace navigation"
              className="flex-1 overflow-y-auto px-3.5 py-2 space-y-4"
            >
              {/* Group A: Home & Civic */}
              <div className="space-y-1">
                <p className="px-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Home &amp; Civic
                </p>
                <button
                  type="button"
                  onClick={() => navigateAndClose(() => onSelectTab('home'))}
                  className={navItemClass(activeTab === 'home')}
                >
                  <span className="flex items-center gap-2.5">
                    <Home className="w-4 h-4 shrink-0" />
                    Welcome Hub
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateAndClose(() => onSelectTab('intake'))}
                  className={navItemClass(activeTab === 'intake')}
                >
                  <span className="flex items-center gap-2.5">
                    <FilePlus2 className="w-4 h-4 shrink-0" />
                    Citizen Report Triage
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateAndClose(() => onSelectTab('queue'))}
                  className={navItemClass(activeTab === 'queue')}
                >
                  <span className="flex items-center gap-2.5">
                    <ClipboardList className="w-4 h-4 shrink-0" />
                    Officer Queue
                  </span>
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#4F5BD5]/12 dark:bg-[#8E96FF]/20 text-[#4F5BD5] dark:text-[#A5B4FC]">
                    {metrics.total}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateAndClose(() => onSelectTab('police'))}
                  className={navItemClass(activeTab === 'police')}
                >
                  <span className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 shrink-0" />
                    Police &amp; Safety Desk
                  </span>
                  {activePoliceCount > 0 && (
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-300">
                      {activePoliceCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigateAndClose(() => onSelectTab('policy'))}
                  className={navItemClass(activeTab === 'policy')}
                >
                  <span className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    Routing Policy &amp; SLA
                  </span>
                </button>
              </div>

              {/* Group B: 3D Mobility */}
              <div className="space-y-1">
                <p className="px-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  3D Mobility
                </p>
                <button
                  type="button"
                  onClick={() => navigateAndClose(() => onSelectTravelMode('globe'))}
                  className={navItemClass(activeTab === 'travel' && activeTravelMode === 'globe')}
                >
                  <span className="flex items-center gap-2.5">
                    <Globe2 className="w-4 h-4 shrink-0" />
                    3D World Globe
                  </span>
                  {bookedTicketsCount > 0 && (
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#4F5BD5]/12 dark:bg-[#8E96FF]/20 text-[#4F5BD5] dark:text-[#A5B4FC]">
                      {bookedTicketsCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigateAndClose(() => onSelectTravelMode('india'))}
                  className={navItemClass(activeTab === 'travel' && activeTravelMode === 'india')}
                >
                  <span className="flex items-center gap-2.5">
                    <Map className="w-4 h-4 shrink-0" />
                    Whole India Relief
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateAndClose(() => onSelectTravelMode('state'))}
                  className={navItemClass(
                    activeTab === 'travel' &&
                      (activeTravelMode === 'state' || activeTravelMode === 'terrain')
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 shrink-0" />
                    State Topography
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateAndClose(() => onSelectLocalLifeSection('transport'))}
                  className={navItemClass(
                    activeTab === 'local_life' && activeLocalLifeSection === 'transport'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Bus className="w-4 h-4 shrink-0" />
                    Local Transport
                  </span>
                </button>
              </div>

              {/* Group C: Life & Services */}
              <div className="space-y-1">
                <p className="px-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Life &amp; Services
                </p>
                <button
                  type="button"
                  onClick={() => navigateAndClose(() => onSelectLocalLifeSection('healthcare'))}
                  className={navItemClass(
                    activeTab === 'local_life' && activeLocalLifeSection === 'healthcare'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <HeartPulse className="w-4 h-4 shrink-0 text-rose-500" />
                    Healthcare &amp; Hospitals
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateAndClose(() => onSelectLocalLifeSection('education'))}
                  className={navItemClass(
                    activeTab === 'local_life' &&
                      (activeLocalLifeSection === 'education' ||
                        activeLocalLifeSection === 'jobs')
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <GraduationCap className="w-4 h-4 shrink-0" />
                    Education &amp; Jobs
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateAndClose(() => onSelectLocalLifeSection('jobs'))}
                  className={navItemClass(
                    activeTab === 'local_life' && activeLocalLifeSection === 'jobs'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Briefcase className="w-4 h-4 shrink-0" />
                    DWMS &amp; PSC Jobs
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateAndClose(() => onSelectLocalLifeSection('lifestyle'))}
                  className={navItemClass(
                    activeTab === 'local_life' && activeLocalLifeSection === 'lifestyle'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Store className="w-4 h-4 shrink-0" />
                    Lifestyle &amp; Food
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateAndClose(() => onSelectLocalLifeSection('weekend'))}
                  className={navItemClass(
                    activeTab === 'local_life' &&
                      (activeLocalLifeSection === 'weekend' ||
                        activeLocalLifeSection === 'events')
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 shrink-0" />
                    Weekend &amp; Event AI
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateAndClose(() => onSelectLocalLifeSection('expenses'))}
                  className={navItemClass(
                    activeTab === 'local_life' && activeLocalLifeSection === 'expenses'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Wallet className="w-4 h-4 shrink-0" />
                    Expense Tracker
                  </span>
                </button>
              </div>
            </nav>

            {/* 3. Quick Utilities Footer */}
            <div className="p-3.5 border-t border-black/6 dark:border-white/10 space-y-2 shrink-0 bg-white/45 dark:bg-slate-950/45">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/85 dark:bg-slate-800/85 border border-black/8 dark:border-white/12 text-xs font-bold text-[#111315] dark:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {themeMode === 'dark' ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-[#4F5BD5]" />
                      Dark Mode
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigateAndClose(onLoadDemoData)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    demoLoaded
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : 'bg-[#4F5BD5]/12 dark:bg-[#8E96FF]/20 text-[#4F5BD5] dark:text-[#A5B4FC] border-[#4F5BD5]/25 dark:border-[#8E96FF]/30 hover:bg-[#4F5BD5]/20'
                  }`}
                >
                  {demoLoaded ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Demo Loaded
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Load Demo
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <Compass className="w-3.5 h-3.5 text-[#4F5BD5] dark:text-[#8E96FF]" />
                  <span>Install App</span>
                </div>
                <PWAInstallButton />
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
