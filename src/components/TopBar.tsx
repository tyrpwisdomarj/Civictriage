import { Menu } from 'lucide-react';
import type { WorkspaceTab } from './SidebarNav';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onOpenMobileMenu: () => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
}

const BREADCRUMB_MAP: Record<WorkspaceTab, string> = {
  intake: 'New Issue Intake',
  queue: 'Municipal Ticket Queue',
  policy: 'Routing Policy & Schema',
};

export function TopBar({
  activeTab,
  onOpenMobileMenu,
  onPrimaryAction,
  primaryActionLabel,
}: TopBarProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-md"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
            LSG Triage Console
          </span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
            /
          </span>
          <span className="font-semibold text-slate-900 truncate">
            {BREADCRUMB_MAP[activeTab]}
          </span>
        </nav>
      </div>

      <div className="shrink-0">
        <button
          type="button"
          onClick={onPrimaryAction}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#0F5257] hover:bg-[#0B3F43] rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {primaryActionLabel}
        </button>
      </div>
    </header>
  );
}
