import {
  ClipboardList,
  FilePlus2,
  BookOpen,
  X,
} from 'lucide-react';
import {
  MUNICIPAL_DEPARTMENTS,
  type MunicipalDepartment,
  type QueueMetrics,
} from '../shared/triageSchema';

export type WorkspaceTab = 'intake' | 'queue' | 'policy';

interface SidebarNavProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onSelectDepartmentFilter: (department: MunicipalDepartment) => void;
  metrics: QueueMetrics;
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

export function SidebarNav({
  activeTab,
  onSelectTab,
  onSelectDepartmentFilter,
  metrics,
  mobileOpen,
  onCloseMobile,
}: SidebarNavProps) {
  const navItems: Array<{
    id: WorkspaceTab;
    label: string;
    icon: typeof FilePlus2;
    count?: number;
  }> = [
    { id: 'intake', label: 'New Triage', icon: FilePlus2 },
    { id: 'queue', label: 'Ticket Queue', icon: ClipboardList, count: metrics.total },
    { id: 'policy', label: 'Routing Policy', icon: BookOpen },
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
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('intake');
          }}
          className="font-semibold text-[16px] tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          CivicTriage LSG
        </a>
        {mobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md focus-visible:outline-2"
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
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 whitespace-nowrap ${
                isActive
                  ? 'bg-[#0F5257] text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </span>
              {typeof item.count === 'number' && (
                <span
                  className={`font-mono text-xs tabular-nums ${
                    isActive ? 'text-white/85' : 'text-slate-500'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-5 pt-4 pb-2 border-t border-slate-200 mt-2">
        <p className="text-xs font-semibold text-slate-500">Municipal Departments</p>
      </div>

      <div className="px-3 pb-4 space-y-0.5 flex-1 overflow-y-auto">
        {MUNICIPAL_DEPARTMENTS.map((dept) => {
          const count = metrics.byDepartment[dept] ?? 0;
          return (
            <button
              key={dept}
              type="button"
              onClick={() => handleDeptClick(dept)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors duration-150 text-left"
            >
              <span className="truncate">{DEPARTMENT_SHORT_LABELS[dept]}</span>
              <span className="font-mono text-slate-500 tabular-nums shrink-0">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="px-5 py-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-700">K-SMART Triage Standard</p>
        <p className="leading-relaxed">
          Multimodal visual cross-check for Municipalities &amp; Grama Panchayats.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[252px] shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-[272px] max-w-[85vw] h-full z-10 shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
