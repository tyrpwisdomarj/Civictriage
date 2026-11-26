import {
  BookOpen,
  ClipboardList,
  Globe2,
  FilePlus2,
  Home,
  Shield,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import {
  MUNICIPAL_DEPARTMENTS,
  type MunicipalDepartment,
  type QueueMetrics,
} from '../shared/triageSchema';

export type WorkspaceTab =
  | 'home'
  | 'intake'
  | 'queue'
  | 'police'
  | 'travel'
  | 'local_life'
  | 'policy';

interface SidebarNavProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onSelectDepartmentFilter: (department: MunicipalDepartment) => void;
  metrics: QueueMetrics;
  activePoliceCount?: number;
  bookedTicketsCount?: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const DEPARTMENT_SHORT_LABELS: Record<MunicipalDepartment, string> = {
  'Public Works & Roads (PWD)': 'Public Works (PWD)',
  'Electrical & Streetlights (KSEB)': 'Electrical (KSEB)',
  'Waste & Sanitation': 'Waste & Sanitation',
  'Water Supply & Drainage (KWA)': 'Water & Drainage (KWA)',
  'Public Safety & Encroachment': 'Public Safety',
  'Invalid / Other': 'Rejected / Invalid',
};

const DEPARTMENT_DOT_COLORS: Record<MunicipalDepartment, string> = {
  'Public Works & Roads (PWD)': 'bg-amber-500',
  'Electrical & Streetlights (KSEB)': 'bg-rose-500',
  'Waste & Sanitation': 'bg-emerald-500',
  'Water Supply & Drainage (KWA)': 'bg-sky-500',
  'Public Safety & Encroachment': 'bg-[#4F5BD5]',
  'Invalid / Other': 'bg-slate-400',
};

export function SidebarNav({
  activeTab,
  onSelectTab,
  onSelectDepartmentFilter,
  metrics,
  activePoliceCount = 0,
  bookedTicketsCount = 0,
  mobileOpen,
  onCloseMobile,
}: SidebarNavProps) {
  const navItems: Array<{
    id: WorkspaceTab;
    label: string;
    icon: typeof Home;
    count?: number;
    section: 'portal' | 'workspace';
  }> = [
    {
      id: 'home',
      label: 'Welcome Portal',
      icon: Home,
      section: 'portal',
    },
    {
      id: 'intake',
      label: 'Citizen Report',
      icon: FilePlus2,
      section: 'workspace',
    },
    {
      id: 'queue',
      label: 'Officer Dashboard',
      icon: ClipboardList,
      count: metrics.total,
      section: 'workspace',
    },
    {
      id: 'police',
      label: 'Police & Safety',
      icon: Shield,
      count: activePoliceCount > 0 ? activePoliceCount : undefined,
      section: 'workspace',
    },
    {
      id: 'travel',
      label: 'Global 3D Travel',
      icon: Globe2,
      count: bookedTicketsCount > 0 ? bookedTicketsCount : undefined,
      section: 'workspace',
    },
    {
      id: 'local_life',
      label: 'Local Life Hub',
      icon: Store,
      section: 'workspace',
    },
    {
      id: 'policy',
      label: 'Routing Policy',
      icon: BookOpen,
      section: 'workspace',
    },
  ];

  const handleNavClick = (tab: WorkspaceTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const handleDeptClick = (department: MunicipalDepartment) => {
    onSelectDepartmentFilter(department);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white/55 dark:bg-slate-950/65 backdrop-blur-2xl backdrop-saturate-[180%] border-r border-white/80 dark:border-white/10 shadow-[0_20px_50px_rgba(17,19,21,0.06)]">
      <div className="h-16 px-4 flex items-center justify-between border-b border-black/5 dark:border-white/10 shrink-0">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('home');
          }}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group"
        >
          <span className="w-9 h-9 rounded-2xl bg-[#111315] dark:bg-white text-white dark:text-slate-950 flex items-center justify-center shadow-md shadow-black/15 transition-colors">
            <Sparkles className="w-4 h-4 text-[#7B83EB] dark:text-[#4F5BD5]" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-tight">
            <span
              className="font-extrabold text-[15px] tracking-tight text-[#111315] dark:text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              CivicTriage LSG
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              Spatial Civic · Travel · Life
            </span>
          </span>
        </a>
        {mobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 text-slate-500 dark:text-slate-300 hover:text-[#111315] dark:hover:text-white rounded-xl focus-visible:outline-2"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Primary workspace navigation" className="px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold rounded-2xl transition-all duration-150 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#111315] dark:bg-white text-white dark:text-slate-950 shadow-md shadow-black/15'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-white/10 hover:text-[#111315] dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-[#A5B4FC] dark:text-[#4F5BD5]'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </span>
              {typeof item.count === 'number' && (
                <span
                  className={`font-mono text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-[#4F5BD5] text-white'
                      : 'bg-[#4F5BD5]/12 text-[#4F5BD5] dark:bg-[#7B83EB]/20 dark:text-[#A5B4FC]'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-5 pt-4 pb-2 border-t border-black/5 dark:border-white/10 mt-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Municipal Departments
        </p>
      </div>

      <div className="px-3 pb-4 space-y-0.5 flex-1 overflow-y-auto">
        {MUNICIPAL_DEPARTMENTS.map((dept) => {
          const count = metrics.byDepartment[dept] ?? 0;
          return (
            <button
              key={dept}
              type="button"
              onClick={() => handleDeptClick(dept)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-[#111315] dark:hover:text-white hover:bg-white/75 dark:hover:bg-white/10 rounded-xl transition-colors duration-150 text-left cursor-pointer"
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${DEPARTMENT_DOT_COLORS[dept]}`}
                  aria-hidden="true"
                />
                <span className="truncate">{DEPARTMENT_SHORT_LABELS[dept]}</span>
              </span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-lg bg-[#EFECE8] dark:bg-slate-800 text-slate-700 dark:text-slate-300 tabular-nums shrink-0">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mx-3 mb-3 p-3.5 rounded-[22px] bg-[#EFECE8]/85 dark:bg-slate-900/80 border border-white/80 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 space-y-1">
        <p className="font-bold text-[#111315] dark:text-white flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
          Kerala &amp; Pan-India Smart Portal
        </p>
        <p className="leading-relaxed text-[11px]">
          K-SMART triage, THUNA Police Desk, 3D Earth &amp; India Relief, and Local Life OS.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[264px] shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#111315]/35 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-[276px] max-w-[85vw] h-full z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
