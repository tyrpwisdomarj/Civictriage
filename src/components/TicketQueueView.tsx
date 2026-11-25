import { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Save,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  buildStrictJsonOutput,
  computeDashboardAnalytics,
  filterTickets,
  MUNICIPAL_DEPARTMENTS,
  type MunicipalDepartment,
  type QueueMetrics,
  type RepairVerificationRecord,
  type SeverityBand,
  type StoredTicket,
  type TicketFilters,
  type TicketWorkflowStatus,
} from '../shared/triageSchema';
import {
  POLICE_CASE_STATUSES,
  type PoliceCaseStatus,
  type StoredPoliceCase,
} from '../shared/policeSchema';
import { SafeImage } from './SafeImage';
import { RepairVerificationModal } from './RepairVerificationModal';

interface TicketQueueViewProps {
  tickets: StoredTicket[];
  metrics: QueueMetrics;
  filters: TicketFilters;
  selectedTicketId: string | null;
  policeCases: StoredPoliceCase[];
  onFiltersChange: (next: TicketFilters) => void;
  onSelectTicket: (id: string | null) => void;
  onUpdateStatus: (ticketId: string, status: TicketWorkflowStatus) => void;
  onVerifyRepairResolved: (
    ticketId: string,
    record: RepairVerificationRecord
  ) => void;
  onDeleteTicket: (ticketId: string) => void;
  onStartNewIntake: () => void;
  onUpdatePoliceCase: (
    caseId: string,
    updates: { status?: PoliceCaseStatus; disposalRemarks?: string }
  ) => void;
  onOpenPoliceDesk: () => void;
}

const STATUS_OPTIONS: Array<{ value: 'ALL' | TicketWorkflowStatus; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'Triaged', label: 'Triaged' },
  { value: 'Dispatched', label: 'Dispatched' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Rejected', label: 'Rejected' },
];

function getSeverityBadgeClass(band: SeverityBand): string {
  switch (band) {
    case 'Critical':
      return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
    case 'High':
      return 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
    case 'Medium':
      return 'bg-sky-50 text-sky-700 border-sky-200 font-semibold';
    case 'Low':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
    case 'Rejected':
      return 'bg-slate-100 text-slate-600 border-slate-200 font-medium';
  }
}

function getDepartmentBadgeClass(dept: MunicipalDepartment): string {
  switch (dept) {
    case 'Electrical & Streetlights (KSEB)':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Public Works & Roads (PWD)':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Water Supply & Drainage (KWA)':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Waste & Sanitation':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Public Safety & Encroachment':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function getStatusBadgeClass(status: TicketWorkflowStatus): string {
  switch (status) {
    case 'Resolved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Dispatched':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Triaged':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200';
  }
}

function getPolicePriorityBadgeClass(priority: StoredPoliceCase['triage']['priority_level']): string {
  switch (priority) {
    case 'Critical / Immediate':
      return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
    case 'High':
      return 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
    default:
      return 'bg-sky-50 text-sky-700 border-sky-200 font-semibold';
  }
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

export function TicketQueueView({
  tickets,
  filters,
  selectedTicketId,
  policeCases,
  onFiltersChange,
  onSelectTicket,
  onUpdateStatus,
  onVerifyRepairResolved,
  onDeleteTicket,
  onStartNewIntake,
  onUpdatePoliceCase,
  onOpenPoliceDesk,
}: TicketQueueViewProps) {
  const [deskMode, setDeskMode] = useState<'municipal' | 'police'>('municipal');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [verifyModalTicket, setVerifyModalTicket] = useState<StoredTicket | null>(null);

  // Police SHO Desk filters & remarks draft
  const [policeQuery, setPoliceQuery] = useState('');
  const [policeStatusFilter, setPoliceStatusFilter] = useState<'ALL' | PoliceCaseStatus>('ALL');
  const [selectedPoliceId, setSelectedPoliceId] = useState<string | null>(
    policeCases[0]?.id ?? null
  );
  const [remarksDraft, setRemarksDraft] = useState<string>('');
  const [remarksSavedId, setRemarksSavedId] = useState<string | null>(null);

  const analytics = useMemo(() => computeDashboardAnalytics(tickets), [tickets]);
  const openPoliceCases = useMemo(
    () => policeCases.filter((c) => c.status !== 'Disposed / Closed'),
    [policeCases]
  );
  const highPriorityPoliceCount = useMemo(
    () =>
      openPoliceCases.filter(
        (c) =>
          c.triage.priority_level === 'Critical / Immediate' ||
          c.triage.priority_level === 'High'
      ).length,
    [openPoliceCases]
  );

  const filtered = filterTickets(tickets, filters);
  const selectedTicket =
    tickets.find((item) => item.id === selectedTicketId) ?? null;

  const filteredPoliceCases = useMemo(() => {
    const q = policeQuery.trim().toLowerCase();
    return policeCases.filter((c) => {
      if (policeStatusFilter !== 'ALL' && c.status !== policeStatusFilter) {
        return false;
      }
      if (!q) return true;
      return [
        c.caseRefId,
        c.districtName,
        c.triage.case_category,
        c.triage.jurisdictional_station,
        c.triage.recommended_unit,
        c.triage.formal_petition_summary,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [policeCases, policeQuery, policeStatusFilter]);

  const selectedPoliceCase = useMemo(() => {
    if (selectedPoliceId) {
      const found = policeCases.find((c) => c.id === selectedPoliceId);
      if (found) return found;
    }
    return filteredPoliceCases[0] ?? null;
  }, [policeCases, filteredPoliceCases, selectedPoliceId]);

  const hasActiveFilters =
    filters.query.trim().length > 0 ||
    filters.department !== 'ALL' ||
    filters.status !== 'ALL';

  const handleCopyJson = async (ticket: StoredTicket) => {
    const raw = buildStrictJsonOutput(ticket.triage);
    try {
      await navigator.clipboard.writeText(raw);
    } catch {
      const el = document.createElement('textarea');
      el.value = raw;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedId(ticket.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  const activeHazardPct =
    analytics.totalValidTickets > 0
      ? Math.round((analytics.totalActiveHazards / analytics.totalValidTickets) * 100)
      : 0;
  const criticalSlaPct =
    analytics.totalActiveHazards > 0
      ? Math.round((analytics.criticalSlaAlerts / analytics.totalActiveHazards) * 100)
      : 0;
  const policePriorityPct =
    openPoliceCases.length > 0
      ? Math.round((highPriorityPoliceCount / openPoliceCases.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* 4-Card Municipal Analytics & KPI Summary Bar with Visual Progress Bars */}
      <section
        aria-label="Municipal and Police KPI Analytics"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {/* KPI 1: Total Active Hazards */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-sky-200/80 shadow-md shadow-sky-900/[0.04] space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-sky-800">Total Active Hazards</p>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              {analytics.totalValidTickets} valid
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {analytics.totalActiveHazards}
          </p>
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300"
                style={{ width: `${activeHazardPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {activeHazardPct}% of valid LSG tickets awaiting closure
            </p>
          </div>
        </div>

        {/* KPI 2: Critical SLA Alerts */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-rose-200/80 shadow-md shadow-rose-900/[0.04] space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-rose-800">Critical SLA Alerts</p>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Sev 7–10
            </span>
          </div>
          <p className="text-2xl font-extrabold text-rose-600 font-mono tabular-nums">
            {analytics.criticalSlaAlerts}
          </p>
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-600 transition-all duration-300"
                style={{ width: `${criticalSlaPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Immediate (0–4h) &amp; 24–48h corridor hazards
            </p>
          </div>
        </div>

        {/* KPI 3: Resolution Rate % */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-emerald-200/80 shadow-md shadow-emerald-900/[0.04] space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-800">Resolution Rate %</p>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {analytics.resolvedCount} closed
            </span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono tabular-nums">
            {analytics.resolutionRatePercent}%
          </p>
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${analytics.resolutionRatePercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Closed-loop Gemini Before/After verified fixes
            </p>
          </div>
        </div>

        {/* KPI 4: Active Police/Safety Petitions */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-indigo-200/80 shadow-md shadow-indigo-900/[0.04] space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-800">Active Police Petitions</p>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {highPriorityPoliceCount} high/crit
            </span>
          </div>
          <p className="text-2xl font-extrabold text-indigo-700 font-mono tabular-nums">
            {openPoliceCases.length}
          </p>
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 transition-all duration-300"
                style={{ width: `${policePriorityPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              SHO &amp; Beat Officer THUNA/GD queue
            </p>
          </div>
        </div>
      </section>

      {/* Queue Desk Switcher: Municipal LSG Queue vs Police Station (SHO) Case Desk */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Officer queue desk switch"
          className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/90 border border-slate-200/90 shadow-sm"
        >
          <button
            type="button"
            role="tab"
            aria-selected={deskMode === 'municipal'}
            onClick={() => setDeskMode('municipal')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              deskMode === 'municipal'
                ? 'bg-gradient-to-r from-sky-600 to-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Municipal LSG Queue</span>
            <span
              className={`px-1.5 py-0.5 rounded-full font-mono text-[10px] ${
                deskMode === 'municipal'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {tickets.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={deskMode === 'police'}
            onClick={() => setDeskMode('police')}
            data-testid="sho-police-desk-tab"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              deskMode === 'police'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Police Station (SHO) Case Desk</span>
            <span
              className={`px-1.5 py-0.5 rounded-full font-mono text-[10px] ${
                deskMode === 'police'
                  ? 'bg-white/25 text-white'
                  : 'bg-indigo-50 text-indigo-700'
              }`}
            >
              {policeCases.length}
            </span>
          </button>
        </div>

        {deskMode === 'police' && (
          <button
            type="button"
            onClick={onOpenPoliceDesk}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-800 hover:bg-indigo-100 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>File New Police Petition</span>
          </button>
        )}
      </div>

      {/* ==================================================================== */}
      {/* VIEW 1: MUNICIPAL LSG QUEUE                                          */}
      {/* ==================================================================== */}
      {deskMode === 'municipal' && (
        <>
          <section
            aria-label="Ticket queue filters and records"
            className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-lg shadow-sky-900/[0.04] rounded-2xl overflow-hidden divide-y divide-slate-200/75"
          >
            <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-gradient-to-r from-sky-50/70 via-white to-emerald-50/60">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <label htmlFor="queue-search" className="sr-only">
                    Search tickets by ID, summary, ward, or Malayalam text
                  </label>
                  <input
                    id="queue-search"
                    type="search"
                    value={filters.query}
                    onChange={(e) =>
                      onFiltersChange({ ...filters, query: e.target.value })
                    }
                    placeholder="Search ID, ward, summary, Malayalam..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                <div className="sm:w-64">
                  <label htmlFor="department-filter" className="sr-only">
                    Filter by municipal department
                  </label>
                  <select
                    id="department-filter"
                    value={filters.department}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        department: e.target.value as 'ALL' | MunicipalDepartment,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="ALL">All Departments</option>
                    {MUNICIPAL_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className="flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl overflow-x-auto"
                role="group"
                aria-label="Filter by workflow status"
              >
                {STATUS_OPTIONS.map((opt) => {
                  const active = filters.status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        onFiltersChange({ ...filters, status: opt.value })
                      }
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <p className="text-sm font-bold text-slate-900">
                  {tickets.length === 0
                    ? 'No municipal triage tickets recorded yet'
                    : 'No tickets match the active filters'}
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {tickets.length === 0
                    ? 'Upload a citizen photograph and description in the intake view to create your first structured K-SMART triage ticket.'
                    : 'Clear your search query or reset department and status filters to view all tickets in the queue.'}
                </p>
                <div className="pt-1">
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={() =>
                        onFiltersChange({ query: '', department: 'ALL', status: 'ALL' })
                      }
                      className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-sky-50 rounded-xl cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onStartNewIntake}
                      className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 rounded-xl cursor-pointer"
                    >
                      Create First Ticket
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-sky-50/50 text-xs font-bold text-slate-600">
                      <th scope="col" className="py-3 pl-4 pr-2 whitespace-nowrap">Ticket ID</th>
                      <th scope="col" className="py-3 px-2">Formal Issue Summary</th>
                      <th scope="col" className="py-3 px-2 whitespace-nowrap">Department</th>
                      <th scope="col" className="py-3 px-2 text-right whitespace-nowrap">Severity</th>
                      <th scope="col" className="py-3 px-2 whitespace-nowrap">Status &amp; Audit</th>
                      <th scope="col" className="py-3 pl-2 pr-4 text-right whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 text-sm">
                    {filtered.map((item) => {
                      const isSelected = selectedTicket?.id === item.id;
                      const isOpenValid =
                        item.triage.is_valid_civic_issue &&
                        item.workflowStatus !== 'Resolved' &&
                        item.workflowStatus !== 'Rejected';
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-sky-50/80' : 'hover:bg-emerald-50/40'
                          }`}
                        >
                          <td className="py-3 pl-4 pr-2 font-mono text-xs whitespace-nowrap tabular-nums">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectTicket(item.id);
                                setShowRawJson(false);
                              }}
                              className="text-left font-bold text-sky-700 hover:underline cursor-pointer"
                            >
                              {item.id}
                            </button>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {formatTimestamp(item.createdAt)}
                            </div>
                          </td>
                          <td className="py-3 px-2 min-w-[200px] max-w-[280px]">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectTicket(item.id);
                                setShowRawJson(false);
                              }}
                              className="text-left block w-full cursor-pointer group"
                            >
                              <p className="text-sm font-semibold text-slate-900 group-hover:text-sky-700 truncate">
                                {item.triage.ticket_title}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                <span className="truncate max-w-[190px]">
                                  {item.triage.location_clues || item.localBodyHint || 'Location unspecified'}
                                </span>
                                {(item.corroborationCount ?? 1) > 1 && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                                    <Users className="w-2.5 h-2.5" />
                                    Confirmed by {item.corroborationCount} citizens
                                  </span>
                                )}
                              </div>
                            </button>
                          </td>
                          <td className="py-3 px-2.5 text-xs whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md border font-semibold ${getDepartmentBadgeClass(
                                item.triage.department
                              )}`}
                            >
                              {item.triage.department}
                            </span>
                          </td>
                          <td className="py-3 px-2.5 text-right font-mono text-xs whitespace-nowrap tabular-nums">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md border ${getSeverityBadgeClass(
                                item.triage.severity_level
                              )}`}
                            >
                              {item.triage.severity_score}/10 · {item.triage.severity_level}
                            </span>
                          </td>
                          <td className="py-3 px-2.5 text-xs whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md border font-semibold ${getStatusBadgeClass(
                                  item.workflowStatus
                                )}`}
                              >
                                {item.workflowStatus}
                              </span>
                              {item.repairVerification?.isResolved && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                  <CheckCircle2 className="w-3 h-3" />
                                  AI Verified Fix
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pl-2 pr-4 text-right whitespace-nowrap">
                            {isOpenValid ? (
                              <button
                                type="button"
                                onClick={() => setVerifyModalTicket(item)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-[11px] font-bold text-emerald-800 transition-colors cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Verify Fix &amp; Resolve</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectTicket(item.id);
                                  setShowRawJson(false);
                                }}
                                className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
                              >
                                Inspect
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {selectedTicket && (
            <section
              aria-labelledby="inspector-heading"
              className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-lg rounded-2xl overflow-hidden divide-y divide-slate-200/75"
            >
              <div className="px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-sky-50/70 via-white to-emerald-50/70">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-slate-800 tabular-nums">
                      {selectedTicket.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md border font-semibold ${getDepartmentBadgeClass(
                        selectedTicket.triage.department
                      )}`}
                    >
                      {selectedTicket.triage.department}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md border font-mono tabular-nums ${getSeverityBadgeClass(
                        selectedTicket.triage.severity_level
                      )}`}
                    >
                      {selectedTicket.triage.severity_score}/10 ({selectedTicket.triage.severity_level})
                    </span>
                    {(selectedTicket.corroborationCount ?? 1) > 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold">
                        <Users className="w-3 h-3" />
                        Confirmed by {selectedTicket.corroborationCount} citizens
                      </span>
                    )}
                  </div>
                  <h2
                    id="inspector-heading"
                    className="mt-1.5 text-base font-bold text-slate-900"
                  >
                    {selectedTicket.triage.ticket_title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowRawJson((prev) => !prev)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-sky-50 rounded-xl whitespace-nowrap cursor-pointer"
                  >
                    {showRawJson ? 'Show Ticket Details' : 'Inspect Raw JSON'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyJson(selectedTicket)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-sky-50 rounded-xl whitespace-nowrap cursor-pointer"
                  >
                    {copiedId === selectedTicket.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTicket(null)}
                    aria-label={`Close inspector for ${selectedTicket.id}`}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {showRawJson ? (
                <div className="p-5 sm:p-6">
                  <pre className="p-4 rounded-xl bg-slate-900 text-emerald-200 font-mono text-xs leading-relaxed overflow-x-auto">
                    <code>{buildStrictJsonOutput(selectedTicket.triage)}</code>
                  </pre>
                </div>
              ) : (
                <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-5 space-y-3">
                    <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
                      <SafeImage
                        src={selectedTicket.imageUrl}
                        alt={`Field evidence for ${selectedTicket.id}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {selectedTicket.repairVerification?.isResolved && (
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 space-y-2">
                        <p className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Before/After AI Verified Repair Proof
                        </p>
                        <div className="aspect-[16/9] rounded-lg overflow-hidden border border-emerald-200">
                          <SafeImage
                            src={selectedTicket.repairVerification.afterImageUrl}
                            alt={`Verified repair photo for ${selectedTicket.id}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                          {selectedTicket.repairVerification.verificationNote}
                        </p>
                      </div>
                    )}
                    <div className="rounded-xl border border-sky-200/70 bg-sky-50/50 p-3.5">
                      <p className="text-xs font-bold text-sky-900">
                        Original Citizen Submission ({selectedTicket.triage.detected_language})
                      </p>
                      <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                        {selectedTicket.citizenDescription}
                      </p>
                      {selectedTicket.localBodyHint && (
                        <p className="mt-2 text-[11px] text-slate-500">
                          Reported Local Body: {selectedTicket.localBodyHint}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-7 space-y-4">
                    {!selectedTicket.triage.is_valid_civic_issue && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                        <p className="text-xs font-bold text-rose-800">
                          Spam Guardrail Rejection Reason
                        </p>
                        <p className="mt-1 text-sm text-slate-900 leading-relaxed">
                          {selectedTicket.triage.rejection_reason}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Visual Severity Reasoning
                      </p>
                      <p className="mt-1 text-sm text-slate-900 font-medium leading-relaxed">
                        {selectedTicket.triage.severity_reasoning}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Official K-SMART Summary
                      </p>
                      <p className="mt-1 text-sm text-slate-800 leading-relaxed">
                        {selectedTicket.triage.formal_summary}
                      </p>
                    </div>

                    <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-3.5">
                      <p className="text-xs font-bold text-emerald-900">
                        Multimodal Cross-Check Note
                      </p>
                      <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                        {selectedTicket.triage.visual_verification_note}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedTicket.triage.is_valid_civic_issue && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStatus(selectedTicket.id, 'Triaged')
                              }
                              disabled={selectedTicket.workflowStatus === 'Triaged'}
                              className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 rounded-xl cursor-pointer"
                            >
                              Set Triaged
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStatus(selectedTicket.id, 'Dispatched')
                              }
                              disabled={selectedTicket.workflowStatus === 'Dispatched'}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-600 rounded-xl cursor-pointer"
                            >
                              Mark Dispatched
                            </button>
                            {selectedTicket.workflowStatus !== 'Resolved' && (
                              <button
                                type="button"
                                onClick={() => setVerifyModalTicket(selectedTicket)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Verify Fix &amp; Resolve</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteTicket(selectedTicket.id)}
                        aria-label={`Delete ticket ${selectedTicket.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Delete Ticket</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* ==================================================================== */}
      {/* VIEW 2: POLICE STATION (SHO) CASE DESK                               */}
      {/* ==================================================================== */}
      {deskMode === 'police' && (
        <div className="space-y-5">
          <section className="bg-white/95 backdrop-blur-md border border-indigo-200/80 shadow-lg rounded-2xl overflow-hidden divide-y divide-slate-200/75">
            <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/70">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={policeQuery}
                  onChange={(e) => setPoliceQuery(e.target.value)}
                  placeholder="Search KL Ref ID, district, station, category..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl overflow-x-auto">
                {(['ALL', ...POLICE_CASE_STATUSES] as const).map((statusOpt) => {
                  const active = policeStatusFilter === statusOpt;
                  return (
                    <button
                      key={statusOpt}
                      type="button"
                      onClick={() => setPoliceStatusFilter(statusOpt)}
                      className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                        active
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {statusOpt === 'ALL' ? 'All Cases' : statusOpt}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredPoliceCases.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <p className="text-sm font-bold text-slate-900">
                  No Kerala Police petitions logged in this view yet
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  File a citizen e-Complaint in the Police &amp; Safety tab or click <strong>✨ Load Demo Data</strong> in the top bar to populate sample SHO cases.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-indigo-50/50 text-xs font-bold text-slate-600">
                      <th className="py-3 pl-4 pr-2 whitespace-nowrap">Case Ref ID</th>
                      <th className="py-3 px-2">Category &amp; Jurisdiction</th>
                      <th className="py-3 px-2 whitespace-nowrap">Assigned Unit</th>
                      <th className="py-3 px-2 whitespace-nowrap">Priority</th>
                      <th className="py-3 pl-2 pr-4 whitespace-nowrap">SHO Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 text-sm">
                    {filteredPoliceCases.map((pc) => {
                      const isSelected = selectedPoliceCase?.id === pc.id;
                      return (
                        <tr
                          key={pc.id}
                          onClick={() => {
                            setSelectedPoliceId(pc.id);
                            setRemarksDraft(pc.disposalRemarks);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/80' : 'hover:bg-sky-50/40'
                          }`}
                        >
                          <td className="py-3 pl-4 pr-2 font-mono text-xs font-bold text-indigo-800 whitespace-nowrap">
                            {pc.caseRefId}
                            <div className="text-[10px] font-normal text-slate-400">
                              {formatTimestamp(pc.createdAt)}
                            </div>
                          </td>
                          <td className="py-3 px-2 min-w-[200px]">
                            <p className="text-xs font-bold text-slate-900">
                              {pc.triage.case_category} · {pc.districtName}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate max-w-[280px]">
                              {pc.triage.jurisdictional_station}
                            </p>
                          </td>
                          <td className="py-3 px-2 text-xs text-slate-700 whitespace-nowrap">
                            {pc.triage.recommended_unit}
                          </td>
                          <td className="py-3 px-2 text-xs whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md border ${getPolicePriorityBadgeClass(
                                pc.triage.priority_level
                              )}`}
                            >
                              {pc.triage.priority_level}
                            </span>
                          </td>
                          <td className="py-3 pl-2 pr-4 text-xs whitespace-nowrap">
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 font-semibold">
                              {pc.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {selectedPoliceCase && (
            <section className="bg-white/95 backdrop-blur-md border border-indigo-200/80 shadow-lg rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="font-mono text-xs font-black text-indigo-700">
                    {selectedPoliceCase.caseRefId}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {selectedPoliceCase.triage.case_category} — {selectedPoliceCase.triage.jurisdictional_station}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Unit: {selectedPoliceCase.triage.recommended_unit} • District: {selectedPoliceCase.districtName}
                  </p>
                </div>

                {/* SHO Status Updater */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {POLICE_CASE_STATUSES.map((st) => {
                    const active = selectedPoliceCase.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() =>
                          onUpdatePoliceCase(selectedPoliceCase.id, { status: st })
                        }
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Formal Petition Summary
                  </p>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {selectedPoliceCase.triage.formal_petition_summary}
                  </p>
                  <p className="text-[11px] font-bold text-amber-800 pt-1">
                    Legal Guidance: {selectedPoliceCase.triage.actionable_legal_guidance}
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="sho-disposal-remarks"
                    className="block text-xs font-bold text-slate-800"
                  >
                    SHO / Beat Officer Official Disposal Remarks
                  </label>
                  <textarea
                    id="sho-disposal-remarks"
                    rows={3}
                    value={
                      selectedPoliceId === selectedPoliceCase.id
                        ? remarksDraft
                        : selectedPoliceCase.disposalRemarks
                    }
                    onFocus={() => {
                      if (selectedPoliceId !== selectedPoliceCase.id) {
                        setSelectedPoliceId(selectedPoliceCase.id);
                        setRemarksDraft(selectedPoliceCase.disposalRemarks);
                      }
                    }}
                    onChange={(e) => {
                      setSelectedPoliceId(selectedPoliceCase.id);
                      setRemarksDraft(e.target.value);
                    }}
                    placeholder="Record Beat Officer patrol confirmation, GD Register number, highway clearance status, or disposal order..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <div className="flex items-center justify-end gap-2">
                    {remarksSavedId === selectedPoliceCase.id && (
                      <span className="text-xs font-semibold text-emerald-700">
                        Disposal remarks saved ✓
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const valueToSave =
                          selectedPoliceId === selectedPoliceCase.id
                            ? remarksDraft
                            : selectedPoliceCase.disposalRemarks;
                        onUpdatePoliceCase(selectedPoliceCase.id, {
                          disposalRemarks: valueToSave,
                        });
                        setRemarksSavedId(selectedPoliceCase.id);
                        window.setTimeout(() => setRemarksSavedId(null), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Disposal Remarks</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Gemini Before/After Repair Verification Modal */}
      {verifyModalTicket && (
        <RepairVerificationModal
          ticket={verifyModalTicket}
          onClose={() => setVerifyModalTicket(null)}
          onVerifiedResolved={(ticketId, record) => {
            onVerifyRepairResolved(ticketId, record);
          }}
        />
      )}
    </div>
  );
}
