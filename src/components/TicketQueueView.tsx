import { useState } from 'react';
import { Check, Copy, Search, Trash2, X } from 'lucide-react';
import {
  buildStrictJsonOutput,
  filterTickets,
  MUNICIPAL_DEPARTMENTS,
  type MunicipalDepartment,
  type QueueMetrics,
  type SeverityBand,
  type StoredTicket,
  type TicketFilters,
  type TicketWorkflowStatus,
} from '../shared/triageSchema';
import { SafeImage } from './SafeImage';

interface TicketQueueViewProps {
  tickets: StoredTicket[];
  metrics: QueueMetrics;
  filters: TicketFilters;
  selectedTicketId: string | null;
  onFiltersChange: (next: TicketFilters) => void;
  onSelectTicket: (id: string | null) => void;
  onUpdateStatus: (ticketId: string, status: TicketWorkflowStatus) => void;
  onDeleteTicket: (ticketId: string) => void;
  onStartNewIntake: () => void;
}

const STATUS_OPTIONS: Array<{ value: 'ALL' | TicketWorkflowStatus; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'Triaged', label: 'Triaged' },
  { value: 'Dispatched', label: 'Dispatched' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Rejected', label: 'Rejected' },
];

function getSeverityColorClass(band: SeverityBand): string {
  switch (band) {
    case 'Critical':
      return 'text-red-700 font-semibold';
    case 'High':
      return 'text-amber-700 font-semibold';
    case 'Medium':
      return 'text-blue-700 font-medium';
    case 'Low':
      return 'text-emerald-700 font-medium';
    case 'Rejected':
      return 'text-slate-500';
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
  metrics,
  filters,
  selectedTicketId,
  onFiltersChange,
  onSelectTicket,
  onUpdateStatus,
  onDeleteTicket,
  onStartNewIntake,
}: TicketQueueViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const filtered = filterTickets(tickets, filters);
  const selectedTicket =
    tickets.find((item) => item.id === selectedTicketId) ?? null;

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

  return (
    <div className="space-y-6">
      <section
        aria-label="Queue summary metrics"
        className="bg-white border border-slate-200 rounded-lg grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-slate-200"
      >
        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500">Total Triaged</p>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {metrics.total}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">All recorded submissions</p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500">Critical &amp; High (7–10)</p>
          <p className="mt-1.5 text-2xl font-semibold text-red-700 font-mono tabular-nums">
            {metrics.criticalAndHigh}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Immediate / 24–48h SLA</p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500">Pending Dispatch</p>
          <p className="mt-1.5 text-2xl font-semibold text-[#0F5257] font-mono tabular-nums">
            {metrics.pendingDispatch}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Awaiting department action</p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-slate-500">Spam Filtered</p>
          <p className="mt-1.5 text-2xl font-semibold text-slate-700 font-mono tabular-nums">
            {metrics.spamRejected}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Rejected by visual guardrail</p>
        </div>
      </section>

      <section
        aria-label="Ticket queue filters and records"
        className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200"
      >
        <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
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
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#0F5257] focus:outline-none focus:ring-2 focus:ring-[#0F5257]/15"
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
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-800 focus:border-[#0F5257] focus:outline-none focus:ring-2 focus:ring-[#0F5257]/15"
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
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto"
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
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
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
            <p className="text-sm font-semibold text-slate-900">
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
                  className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
                >
                  Reset Filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartNewIntake}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F5257] hover:bg-[#0B3F43] rounded-md cursor-pointer"
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
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th scope="col" className="py-3 pl-4 pr-2.5 whitespace-nowrap">Ticket ID</th>
                  <th scope="col" className="py-3 px-2.5">Formal Issue Summary</th>
                  <th scope="col" className="py-3 px-2.5 whitespace-nowrap">Department</th>
                  <th scope="col" className="py-3 px-2.5 text-right whitespace-nowrap">Severity</th>
                  <th scope="col" className="py-3 px-2.5 whitespace-nowrap">Status</th>
                  <th scope="col" className="py-3 pl-2.5 pr-4 text-right whitespace-nowrap">Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filtered.map((item) => {
                  const isSelected = selectedTicket?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-[#0F5257]/6' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 pl-4 pr-2.5 font-mono text-xs text-slate-700 whitespace-nowrap tabular-nums">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTicket(item.id);
                            setShowRawJson(false);
                          }}
                          className="text-left font-medium text-[#0F5257] hover:underline cursor-pointer"
                        >
                          {item.id}
                        </button>
                      </td>
                      <td className="py-3 px-2.5 min-w-[200px] max-w-[320px]">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTicket(item.id);
                            setShowRawJson(false);
                          }}
                          className="text-left block w-full cursor-pointer group"
                        >
                          <p className="text-sm font-medium text-slate-900 group-hover:text-[#0F5257] truncate">
                            {item.triage.ticket_title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 truncate">
                            {item.triage.location_clues || item.localBodyHint || 'Location unspecified'}
                            <span aria-hidden="true"> · </span>
                            {item.triage.detected_language}
                            {item.triage.exaggeration_or_mismatch && (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span className="text-amber-700 font-medium">Mismatch flagged</span>
                              </>
                            )}
                          </p>
                        </button>
                      </td>
                      <td className="py-3 px-2.5 text-xs text-slate-700 whitespace-nowrap">
                        {item.triage.department}
                      </td>
                      <td
                        className={`py-3 px-2.5 text-right font-mono text-xs whitespace-nowrap tabular-nums ${getSeverityColorClass(
                          item.triage.severity_level
                        )}`}
                      >
                        {item.triage.severity_score}/10 · {item.triage.severity_level}
                      </td>
                      <td className="py-3 px-2.5 text-xs text-slate-700 whitespace-nowrap">
                        {item.workflowStatus}
                      </td>
                      <td className="py-3 pl-2.5 pr-4 text-right font-mono text-xs text-slate-500 whitespace-nowrap tabular-nums">
                        {formatTimestamp(item.createdAt)}
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
          className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200"
        >
          <div className="px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-semibold text-slate-800 tabular-nums">
                  {selectedTicket.id}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-[#0F5257]">
                  {selectedTicket.triage.department}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {selectedTicket.triage.severity_score}/10 ({selectedTicket.triage.severity_level})
                </span>
              </div>
              <h2
                id="inspector-heading"
                className="mt-1 text-base font-semibold text-slate-900"
              >
                {selectedTicket.triage.ticket_title}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowRawJson((prev) => !prev)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
              >
                {showRawJson ? 'Show Ticket Details' : 'Inspect Raw JSON'}
              </button>
              <button
                type="button"
                onClick={() => handleCopyJson(selectedTicket)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap cursor-pointer"
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
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {showRawJson ? (
            <div className="p-5 sm:p-6">
              <pre className="p-4 rounded-md bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto">
                <code>{buildStrictJsonOutput(selectedTicket.triage)}</code>
              </pre>
            </div>
          ) : (
            <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 space-y-3">
                <div className="aspect-[4/3] rounded-md overflow-hidden border border-slate-200 bg-slate-100">
                  <SafeImage
                    src={selectedTicket.imageUrl}
                    alt={`Field evidence for ${selectedTicket.id}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3.5">
                  <p className="text-xs font-semibold text-slate-700">
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
                  <div className="rounded-md border border-red-200 bg-red-50/60 p-4">
                    <p className="text-xs font-semibold text-red-800">
                      Spam Guardrail Rejection Reason
                    </p>
                    <p className="mt-1 text-sm text-slate-900 leading-relaxed">
                      {selectedTicket.triage.rejection_reason}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Visual Severity Reasoning
                  </p>
                  <p className="mt-1 text-sm text-slate-900 font-medium leading-relaxed">
                    {selectedTicket.triage.severity_reasoning}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Official K-SMART Summary
                  </p>
                  <p className="mt-1 text-sm text-slate-800 leading-relaxed">
                    {selectedTicket.triage.formal_summary}
                  </p>
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3.5">
                  <p className="text-xs font-semibold text-slate-700">
                    Multimodal Cross-Check Note
                  </p>
                  <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                    {selectedTicket.triage.visual_verification_note}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedTicket.triage.is_valid_civic_issue && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateStatus(selectedTicket.id, 'Triaged')
                          }
                          disabled={selectedTicket.workflowStatus === 'Triaged'}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md cursor-pointer"
                        >
                          Set Triaged
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateStatus(selectedTicket.id, 'Dispatched')
                          }
                          disabled={selectedTicket.workflowStatus === 'Dispatched'}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F5257] hover:bg-[#0B3F43] disabled:bg-slate-300 disabled:text-slate-600 rounded-md cursor-pointer"
                        >
                          Mark Dispatched
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateStatus(selectedTicket.id, 'Resolved')
                          }
                          disabled={selectedTicket.workflowStatus === 'Resolved'}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteTicket(selectedTicket.id)}
                    aria-label={`Delete ticket ${selectedTicket.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
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
    </div>
  );
}
