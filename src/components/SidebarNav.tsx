import {
  ClipboardList,
  Compass,
  FilePlus2,
  BookOpen,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import {
  MUNICIPAL_DEPARTMENTS,
  type MunicipalDepartment,
  type QueueMetrics,
} from '../shared/triageSchema';

export type WorkspaceTab = 'intake' | 'queue' | 'police' | 'travel' | 'policy';

interface SidebarNavProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onSelectDepartmentFilter: (department: MunicipalDepartment) => void;
  metrics: QueueMetrics;
  activePoliceCount?: number;
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
  'Public Safety & Encroachment': 'bg-indigo-500',
  'Invalid / Other': 'bg-slate-400',
};

export function SidebarNav({
  activeTab,
  onSelectTab,
  onSelectDepartmentFilter,
  metrics,
  activePoliceCount = 0,
  mobileOpen,
  onCloseMobile,
}: SidebarNavProps) {
  const navItems: Array<{
    id: WorkspaceTab;
    label: string;
    icon: typeof FilePlus2;
    count?: number;
    activeGradient: string;
  }> = [
    {
      id: 'intake',
      label: 'Citizen Report',
      icon: FilePlus2,
      activeGradient:
        'bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 text-white shadow-md shadow-emerald-500/20',
    },
    {
      id: 'queue',
      label: 'Officer Dashboard',
      icon: ClipboardList,
      count: metrics.total,
      activeGradient:
        'bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 text-white shadow-md shadow-sky-500/20',
    },
    {
      id: 'police',
      label: 'Police & Safety',
      icon: Shield,
      count: activePoliceCount > 0 ? activePoliceCount : undefined,
      activeGradient:
        'bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 text-white shadow-md shadow-indigo-500/20',
    },
    {
      id: 'travel',
      label: 'Travel & 3D Explorer',
      icon: Compass,
      activeGradient:
        'bg-gradient-to-r from-emerald-500 via-sky-500 to-amber-500 text-white shadow-md shadow-sky-500/20',
    },
    {
      id: 'policy',
      label: 'Routing Policy',
      icon: BookOpen,
      activeGradient:
        'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-md shadow-amber-500/20',
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
    <div className="flex flex-col h-full bg-white/95 backdrop-blur-md border-r border-slate-200/80 shadow-sm">
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200/80 bg-gradient-to-r from-emerald-50/80 via-sky-50/70 to-amber-50/60 shrink-0">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('intake');
          }}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group"
        >
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/25">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-tight">
            <span
              className="font-bold text-[15px] tracking-tight bg-gradient-to-r from-emerald-700 via-teal-700 to-sky-700 bg-clip-text text-transparent"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              CivicTriage LSG
            </span>
            <span className="text-[10px] font-medium text-slate-500">
              Kerala Smart Mobility &amp; Civic
            </span>
          </span>
        </a>
        {mobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-lg focus-visible:outline-2"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Primary workspace navigation" className="px-3 py-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-150 whitespace-nowrap cursor-pointer ${
                isActive
                  ? item.activeGradient
                  : 'text-slate-700 hover:bg-sky-50/80 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </span>
              {typeof item.count === 'number' && (
                <span
                  className={`font-mono text-xs tabular-nums px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-sky-100/80 text-sky-800'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-5 pt-4 pb-2 border-t border-slate-200/80 mt-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-emerald-50/70 rounded-lg transition-colors duration-150 text-left cursor-pointer"
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${DEPARTMENT_DOT_COLORS[dept]}`}
                  aria-hidden="true"
                />
                <span className="truncate">{DEPARTMENT_SHORT_LABELS[dept]}</span>
              </span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 tabular-nums shrink-0">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mx-3 mb-3 p-3.5 rounded-xl bg-gradient-to-br from-emerald-50 via-sky-50 to-amber-50/70 border border-emerald-200/70 text-xs text-slate-600 space-y-1">
        <p className="font-bold text-emerald-800">K-SMART Triage Standard</p>
        <p className="leading-relaxed text-[11px]">
          Multimodal visual cross-check &amp; 3D regional mobility for Kerala Local Self-Governments.
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
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-[276px] max-w-[85vw] h-full z-10 shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
