import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  buildStrictJsonOutput,
  type MunicipalDepartment,
  type SeverityBand,
  type StoredTicket,
  type TicketWorkflowStatus,
} from '../shared/triageSchema';

interface TriageResultPanelProps {
  ticket: StoredTicket | null;
  recentTickets: StoredTicket[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectRecentTicket: (ticketId: string) => void;
  onUpdateStatus: (ticketId: string, status: TicketWorkflowStatus) => void;
  onOpenQueue: () => void;
  onEscalateToPolice?: (ticket: StoredTicket) => void;
}

function getSeverityTextColor(band: SeverityBand): string {
  switch (band) {
    case 'Critical':
      return 'text-rose-700';
    case 'High':
      return 'text-amber-700';
    case 'Medium':
      return 'text-sky-700';
    case 'Low':
      return 'text-emerald-700';
    case 'Rejected':
      return 'text-slate-600';
  }
}

function getSeverityBadgeClass(band: SeverityBand): string {
  switch (band) {
    case 'Critical':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'High':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Medium':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Low':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Rejected':
      return 'bg-slate-100 text-slate-600 border-slate-200';
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

function getSeverityBarFill(band: SeverityBand): string {
  switch (band) {
    case 'Critical':
      return 'bg-rose-500';
    case 'High':
      return 'bg-amber-500';
    case 'Medium':
      return 'bg-sky-500';
    case 'Low':
      return 'bg-emerald-500';
    case 'Rejected':
      return 'bg-slate-300';
  }
}

export function TriageResultPanel({
  ticket,
  recentTickets,
  isLoading,
  error,
  onRetry,
  onSelectRecentTicket,
  onUpdateStatus,
  onOpenQueue,
  onEscalateToPolice,
}: TriageResultPanelProps) {
  const [viewMode, setViewMode] = useState<'formatted' | 'json'>('formatted');
  const [copied, setCopied] = useState(false);

  const handleCopyJson = async () => {
    if (!ticket) return;
    const raw = buildStrictJsonOutput(ticket.triage);
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const el = document.createElement('textarea');
      el.value = raw;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleDownloadJson = () => {
    if (!ticket) return;
    const raw = buildStrictJsonOutput(ticket.triage);
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ticket.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <section
        aria-label="Analyzing citizen report"
        aria-busy="true"
        className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-lg rounded-2xl divide-y divide-slate-200/80"
      >
        <div className="p-6 space-y-3">
          <div className="h-4 w-36 bg-sky-100 rounded animate-pulse" />
          <div className="h-6 w-3/4 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-emerald-100 rounded animate-pulse" />
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="h-14 bg-sky-50 rounded-xl animate-pulse" />
            <div className="h-14 bg-emerald-50 rounded-xl animate-pulse" />
            <div className="h-14 bg-amber-50 rounded-xl animate-pulse" />
          </div>
          <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        role="alert"
        className="bg-white/95 backdrop-blur-md border border-rose-200 shadow-lg rounded-2xl p-6 space-y-4"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">
              Multimodal Triage Failed
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">{error}</p>
          </div>
        </div>
        <div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry Analysis</span>
          </button>
        </div>
      </section>
    );
  }

  if (!ticket) {
    return (
      <section
        aria-labelledby="empty-result-heading"
        className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-lg shadow-sky-900/[0.04] rounded-2xl overflow-hidden divide-y divide-slate-200/75"
      >
        <div className="p-6 bg-gradient-to-r from-sky-50/80 via-white to-emerald-50/70">
          <h2
            id="empty-result-heading"
            className="text-lg font-bold text-slate-900 tracking-tight"
          >
            Structured Municipal Triage Output
          </h2>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
            Submit a citizen photograph and report on the left to inspect automated visual verification, department routing, severity score, and K-SMART JSON output.
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/70">
            <p className="text-xs font-bold text-rose-800">01. Visual Spam Guardrail</p>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Automatically rejects non-civic uploads such as selfies, memes, indoor objects, or unrecognizable dark images with severity 0.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70">
            <p className="text-xs font-bold text-amber-800">02. Multimodal Cross-Check</p>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Prioritizes visual photo evidence over exaggerated or vague citizen claims while preserving valid road and ward location clues.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200/70">
            <p className="text-xs font-bold text-sky-800">03. Six-Department Routing</p>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Routes strictly to PWD, KSEB, Waste &amp; Sanitation, KWA, Public Safety &amp; Encroachment, or Invalid / Other.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
            <p className="text-xs font-bold text-emerald-800">04. K-SMART Formal Drafting</p>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Translates Malayalam, Manglish, and local slang into a neutral third-person English summary and strict JSON payload.
            </p>
          </div>
        </div>

        {recentTickets.length > 0 && (
          <div className="p-6 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Recent Triaged Tickets
              </h3>
              <button
                type="button"
                onClick={onOpenQueue}
                className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
              >
                Open full queue
              </button>
            </div>
            <div className="divide-y divide-slate-200/70 border-t border-slate-200/70">
              {recentTickets.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectRecentTicket(item.id)}
                  className="w-full py-3 px-2 -mx-2 rounded-lg flex items-start justify-between gap-4 text-left hover:bg-sky-50/60 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {item.triage.ticket_title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 truncate">
                      <span className="font-mono tabular-nums text-sky-700 font-medium">{item.id}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{item.triage.department}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{item.triage.detected_language}</span>
                    </p>
                  </div>
                  <span
                    className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md border tabular-nums whitespace-nowrap shrink-0 mt-0.5 ${getSeverityBadgeClass(
                      item.triage.severity_level
                    )}`}
                  >
                    {item.triage.severity_score}/10 · {item.triage.severity_level}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  const { triage } = ticket;
  const rawJson = buildStrictJsonOutput(triage);

  return (
    <section
      aria-labelledby="triage-result-heading"
      className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-lg shadow-sky-900/[0.04] rounded-2xl overflow-hidden divide-y divide-slate-200/75"
    >
      <div className="px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-sky-50/70 via-white to-emerald-50/70">
        <div
          className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80"
          role="tablist"
          aria-label="Ticket view format"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'formatted'}
            onClick={() => setViewMode('formatted')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              viewMode === 'formatted'
                ? 'bg-gradient-to-r from-emerald-500 to-sky-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            K-SMART Ticket
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'json'}
            onClick={() => setViewMode('json')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              viewMode === 'json'
                ? 'bg-gradient-to-r from-emerald-500 to-sky-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Raw JSON
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-sky-50 hover:border-sky-300 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Copied JSON</span>
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
            onClick={handleDownloadJson}
            aria-label={`Download ${ticket.id} JSON file`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-sky-50 hover:border-sky-300 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {viewMode === 'json' ? (
        <div className="p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h2
              id="triage-result-heading"
              className="text-sm font-bold text-slate-900"
            >
              Strict JSON Output Schema
            </h2>
            <span className="font-mono text-xs text-sky-700 font-semibold tabular-nums">
              {ticket.id}
            </span>
          </div>
          <pre
            data-testid="raw-json-output"
            className="p-4 rounded-xl bg-slate-900 text-emerald-200 font-mono text-xs leading-relaxed overflow-x-auto shadow-inner"
          >
            <code>{rawJson}</code>
          </pre>
        </div>
      ) : (
        <>
          {!triage.is_valid_civic_issue ? (
            <div className="p-5 sm:p-6 bg-rose-50/70 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-rose-700 font-bold">
                    <span>Spam Guardrail Triggered</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">Severity 0/10</span>
                    <span aria-hidden="true">·</span>
                    <span>{triage.department}</span>
                  </div>
                  <h2
                    id="triage-result-heading"
                    className="text-lg font-bold text-slate-900"
                  >
                    {triage.ticket_title}
                  </h2>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {triage.rejection_reason}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-slate-800 tabular-nums">
                    {ticket.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md border font-semibold ${getDepartmentBadgeClass(
                      triage.department
                    )}`}
                  >
                    {triage.department}
                  </span>
                  <span className="text-slate-500 font-medium">{triage.issue_category}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {ticket.emailAlertStatus === 'sending' && (
                    <span
                      role="status"
                      data-testid="email-alert-status"
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap"
                    >
                      <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      <span>Sending alert email...</span>
                    </span>
                  )}
                  {ticket.emailAlertStatus === 'sent' && (
                    <span
                      role="status"
                      data-testid="email-alert-status"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap"
                    >
                      📧 Alert email flashed to officer
                    </span>
                  )}
                  {ticket.emailAlertStatus === 'skipped' && (
                    <span
                      role="status"
                      data-testid="email-alert-status"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap"
                    >
                      ⚠️ Email skipped
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-md font-semibold border ${
                      ticket.workflowStatus === 'Resolved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : ticket.workflowStatus === 'Dispatched'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    Status: {ticket.workflowStatus}
                  </span>
                </div>
              </div>

              {(ticket.wasCorroborationBoosted || (ticket.corroborationCount ?? 1) > 1) && (
                <div
                  data-testid="corroboration-boost-banner"
                  className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/80 to-rose-50/70 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900">
                    <Users className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Linked to Active Ward Ticket — Priority Boosted!</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white text-[11px] font-bold">
                    Confirmed by {ticket.corroborationCount ?? 2} citizens
                  </span>
                </div>
              )}

              {ticket.repairVerification?.isResolved && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-950">
                    <p className="font-extrabold">
                      AI Verified Resolved (Before/After Repair Audit Passed)
                    </p>
                    <p className="mt-0.5 text-emerald-800 leading-relaxed">
                      {ticket.repairVerification.verificationNote}
                    </p>
                  </div>
                </div>
              )}

              <h2
                id="triage-result-heading"
                className="text-xl font-bold text-slate-900 tracking-tight leading-snug"
              >
                {triage.ticket_title}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
                  <p className="text-xs font-medium text-slate-500">Severity Rating</p>
                  <p className={`mt-1 text-base font-bold font-mono tabular-nums ${getSeverityTextColor(triage.severity_level)}`}>
                    {triage.severity_score}/10 · {triage.severity_level}
                  </p>
                  <div
                    className="mt-2 grid grid-cols-10 gap-1"
                    aria-label={`Severity ${triage.severity_score} out of 10`}
                  >
                    {Array.from({ length: 10 }, (_, idx) => (
                      <div
                        key={idx}
                        className={`h-1.5 rounded-full ${
                          idx < triage.severity_score
                            ? getSeverityBarFill(triage.severity_level)
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-200/60">
                  <p className="text-xs font-medium text-sky-800/80">Target Response SLA</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {triage.recommended_sla}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Based on visual hazard tier
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60">
                  <p className="text-xs font-medium text-emerald-800/80">Input Language</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {triage.detected_language}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 truncate">
                    {triage.location_clues ?? 'No location clue extracted'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Visual Severity Reasoning
              </h3>
              <p className="mt-1.5 text-sm text-slate-900 leading-relaxed font-medium">
                {triage.severity_reasoning}
              </p>
            </div>

            <div
              className={`rounded-xl border p-4 ${
                triage.exaggeration_or_mismatch
                  ? 'border-amber-200 bg-amber-50/70'
                  : 'border-emerald-200/80 bg-emerald-50/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-800">
                  Multimodal Cross-Check
                </h3>
                <span
                  className={`text-xs font-bold ${
                    triage.exaggeration_or_mismatch
                      ? 'text-amber-800'
                      : 'text-emerald-700'
                  }`}
                >
                  {triage.exaggeration_or_mismatch
                    ? 'Discrepancy / Exaggeration Flagged'
                    : 'Visual Evidence Aligned'}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
                {triage.visual_verification_note}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Official K-SMART Formal Summary (Third-Person English)
              </h3>
              <p className="mt-1.5 text-sm text-slate-800 leading-relaxed">
                {triage.formal_summary}
              </p>
            </div>

            {triage.is_valid_civic_issue && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-3.5 rounded-xl bg-sky-50/40 border border-sky-200/60">
                  <h3 className="text-xs font-bold text-sky-900">
                    Recommended Action
                  </h3>
                  <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                    {triage.recommended_action}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/60">
                  <h3 className="text-xs font-bold text-amber-900">
                    Extracted Landmarks
                  </h3>
                  <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                    {triage.extracted_landmarks && triage.extracted_landmarks.length > 0
                      ? triage.extracted_landmarks.join(', ')
                      : 'Not specified'}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {triage.is_valid_civic_issue && (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(ticket.id, 'Dispatched')}
                      disabled={ticket.workflowStatus === 'Dispatched'}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-600 rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer"
                    >
                      {ticket.workflowStatus === 'Dispatched'
                        ? 'Dispatched to Department'
                        : 'Mark Dispatched'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(ticket.id, 'Resolved')}
                      disabled={ticket.workflowStatus === 'Resolved'}
                      className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {ticket.workflowStatus === 'Resolved' ? 'Resolved' : 'Mark Resolved'}
                    </button>
                    {onEscalateToPolice &&
                      (triage.requires_police_escalation ||
                        triage.department === 'Public Safety & Encroachment' ||
                        triage.severity_score >= 8) && (
                        <button
                          type="button"
                          onClick={() => onEscalateToPolice(ticket)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Escalate to Police Desk</span>
                        </button>
                      )}
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={onOpenQueue}
                className="text-xs font-semibold text-sky-700 hover:underline whitespace-nowrap cursor-pointer"
              >
                View in Ticket Queue
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
