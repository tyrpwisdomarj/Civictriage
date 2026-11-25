import { Check, Menu, Sparkles } from 'lucide-react';
import type { WorkspaceTab } from './SidebarNav';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onOpenMobileMenu: () => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  onLoadDemoData?: () => void;
  demoLoaded?: boolean;
}

const BREADCRUMB_MAP: Record<WorkspaceTab, { title: string; accent: string }> = {
  intake: {
    title: 'Citizen Report',
    accent: 'from-emerald-600 to-teal-600',
  },
  queue: {
    title: 'Officer Dashboard',
    accent: 'from-sky-600 to-blue-600',
  },
  police: {
    title: 'Police & Safety Desk',
    accent: 'from-indigo-600 to-blue-600',
  },
  travel: {
    title: 'Travel & 3D Explorer',
    accent: 'from-emerald-600 via-sky-600 to-amber-500',
  },
  policy: {
    title: 'Routing Policy & Schema',
    accent: 'from-amber-600 to-rose-600',
  },
};

export function TopBar({
  activeTab,
  onOpenMobileMenu,
  onPrimaryAction,
  primaryActionLabel,
  onLoadDemoData,
  demoLoaded = false,
}: TopBarProps) {
  const crumb = BREADCRUMB_MAP[activeTab];

  return (
    <header className="h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs shadow-sky-900/[0.03]">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-sky-50 rounded-lg"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-slate-500 font-medium hidden sm:inline whitespace-nowrap">
            LSG Civic &amp; Mobility Console
          </span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
            /
          </span>
          <span
            className={`font-bold bg-gradient-to-r ${crumb.accent} bg-clip-text text-transparent truncate`}
          >
            {crumb.title}
          </span>
        </nav>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {onLoadDemoData && (
          <button
            type="button"
            onClick={onLoadDemoData}
            data-testid="load-demo-data-btn"
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
              demoLoaded
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50/90 text-amber-900 border-amber-200/90 hover:bg-amber-100 hover:border-amber-300'
            }`}
            title="Populate realistic Kerala civic hazards, Police petitions, and a booked IRCTC PNR for presentation mode"
          >
            {demoLoaded ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Demo Loaded</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                <span>✨ Load Demo Data</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onPrimaryAction}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-600 hover:via-teal-600 hover:to-sky-600 rounded-xl shadow-sm shadow-teal-500/20 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          {primaryActionLabel}
        </button>
      </div>
    </header>
  );
}

