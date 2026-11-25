import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MapPin,
  PhoneCall,
  Printer,
  Send,
  Shield,
  ShieldAlert,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  generatePoliceCaseRefId,
  getPoliceDistrictById,
  KERALA_POLICE_DISTRICTS,
  KERALA_POLICE_PORTAL_LINKS,
  POLICE_CASE_STATUSES,
  type PoliceTriageResult,
  type StoredPoliceCase,
} from '../shared/policeSchema';
import type { EmailAlertStatus } from '../shared/triageSchema';
import { sendPoliceCaseAlertEmail } from '../utils/emailAlert';
import { EmergencyHelplineStrip } from './EmergencyHelplineStrip';
import { VoiceMicControl } from './VoiceMicControl';

export interface PoliceCasePrefill {
  districtId?: string;
  description: string;
  sourceTicketId?: string;
}

interface PoliceSafetyDeskViewProps {
  policeCases: StoredPoliceCase[];
  onAddPoliceCase: (newCase: StoredPoliceCase) => void;
  onUpdatePoliceCaseEmailStatus: (
    caseId: string,
    emailStatus: EmailAlertStatus
  ) => void;
  prefill?: PoliceCasePrefill | null;
  onClearPrefill?: () => void;
}

const SAMPLE_POLICE_SCENARIOS = [
  {
    id: 'lost-doc',
    label: 'Lost Passport / DL (GD)',
    districtId: 'pathanamthitta',
    description:
      'Ente Driving Licence and Passport pouch KSRTC bus-il Pathanamthitta to Thiruvalla yathrayil nashattapettu. Please issue General Diary (GD) acknowledgement for re-application.',
  },
  {
    id: 'cyber-scam',
    label: 'UPI Cyber Scam (1930)',
    districtId: 'ernakulam',
    description:
      'Received a fake KSEB disconnection SMS link today morning and ₹18,500 was debited via unauthorized UPI collect request from my bank account. Need urgent Cyber Cell freeze assistance.',
  },
  {
    id: 'highway-emergency',
    label: 'NH-766 Accident Block',
    districtId: 'wayanad',
    description:
      'Severe multi-vehicle collision and fallen timber lorry blocking both lanes of NH-766 Thamarassery Ghat Hairpin 6 with injured passengers trapped. Immediate 112 ERSS highway rescue required.',
  },
] as const;

/**
 * Deterministic crisp SVG QR pattern derived from Case Ref ID (no external requests).
 */
const VerificationQrSvg: React.FC<{ value: string }> = ({ value }) => {
  const cells = useMemo(() => {
    const size = 21;
    const grid: boolean[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => false)
    );

    const drawFinder = (ox: number, oy: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[oy + r][ox + c] = isOuter || isInner;
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(size - 7, 0);
    drawFinder(0, size - 7);

    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const inFinder =
          (r < 8 && c < 8) ||
          (r < 8 && c >= size - 8) ||
          (r >= size - 8 && c < 8);
        if (inFinder) continue;
        hash ^= (r * 31 + c * 17) & 0xff;
        hash = Math.imul(hash, 16777619);
        grid[r][c] = ((hash >>> 0) % 7) < 3;
      }
    }
    return grid;
  }, [value]);

  return (
    <svg
      viewBox="0 0 21 21"
      className="w-20 h-20 rounded-lg bg-white p-1.5 border border-slate-200 shadow-xs shrink-0"
      role="img"
      aria-label={`Verification QR for ${value}`}
    >
      {cells.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0f172a" />
          ) : null
        )
      )}
    </svg>
  );
};

function formatLocalDateTimeInput(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const PoliceSafetyDeskView: React.FC<PoliceSafetyDeskViewProps> = ({
  policeCases,
  onAddPoliceCase,
  onUpdatePoliceCaseEmailStatus,
  prefill,
  onClearPrefill,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [districtId, setDistrictId] = useState<string>('pathanamthitta');
  const [incidentDateTime, setIncidentDateTime] = useState<string>(() =>
    formatLocalDateTimeInput()
  );
  const [description, setDescription] = useState<string>('');
  const [evidenceBase64, setEvidenceBase64] = useState<string>('');
  const [evidenceMimeType, setEvidenceMimeType] = useState<string>('');
  const [evidenceFileName, setEvidenceFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(
    policeCases[0]?.id ?? null
  );

  useEffect(() => {
    if (prefill) {
      if (prefill.districtId) setDistrictId(prefill.districtId);
      setDescription(prefill.description);
      onClearPrefill?.();
    }
  }, [prefill, onClearPrefill]);

  const activeCase = useMemo(() => {
    if (selectedCaseId) {
      const found = policeCases.find((c) => c.id === selectedCaseId);
      if (found) return found;
    }
    return policeCases[0] ?? null;
  }, [policeCases, selectedCaseId]);

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      setError('Please upload a JPEG/PNG/WebP photo or a PDF supporting document.');
      return;
    }
    setError(null);
    setEvidenceFileName(file.name);
    setEvidenceMimeType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEvidenceBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 8) {
      setError(
        'Please describe the incident clearly (at least 8 characters) in English, Malayalam, or Manglish.'
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/police-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          districtId,
          incidentDateTime,
          description: description.trim(),
          evidenceBase64: evidenceBase64 || undefined,
          evidenceMimeType: evidenceMimeType || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to process Police e-Complaint.');
      }

      const triage = payload.triage as PoliceTriageResult;
      const district = getPoliceDistrictById(districtId);
      const caseRefId = generatePoliceCaseRefId(districtId);
      const shouldEmail =
        triage.priority_level === 'Critical / Immediate' ||
        triage.priority_level === 'High' ||
        triage.is_emergency_life_threat;

      const newCase: StoredPoliceCase = {
        id: caseRefId,
        caseRefId,
        createdAt: new Date().toISOString(),
        districtId: district.id,
        districtName: district.name,
        incidentDateTime,
        description: description.trim(),
        evidenceImageUrl: evidenceMimeType.startsWith('image/')
          ? evidenceBase64
          : undefined,
        evidenceFileName: evidenceFileName || undefined,
        status: 'Submitted',
        disposalRemarks: '',
        emailAlertStatus: shouldEmail ? 'sending' : 'not_applicable',
        triage,
      };

      onAddPoliceCase(newCase);
      setSelectedCaseId(newCase.id);
      setDescription('');
      setEvidenceBase64('');
      setEvidenceMimeType('');
      setEvidenceFileName('');

      if (shouldEmail) {
        void sendPoliceCaseAlertEmail(newCase).then((status) => {
          onUpdatePoliceCaseEmailStatus(newCase.id, status);
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to submit Police e-Complaint.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadSlip = (caseItem: StoredPoliceCase) => {
    const lines = [
      '====================================================================',
      '  KERALA POLICE — DIGITAL e-PETITION & GENERAL DIARY ACKNOWLEDGEMENT',
      '  Modeled on Kerala Police THUNA & Pol-App Citizen Services',
      '====================================================================',
      `Case Reference ID     : ${caseItem.caseRefId}`,
      `Logged At             : ${new Date(caseItem.createdAt).toLocaleString()}`,
      `District              : ${caseItem.districtName}`,
      `Jurisdictional Station: ${caseItem.triage.jurisdictional_station}`,
      `Assigned Unit         : ${caseItem.triage.recommended_unit}`,
      `Category              : ${caseItem.triage.case_category}`,
      `Priority Level        : ${caseItem.triage.priority_level}`,
      `Current SHO Status    : ${caseItem.status}`,
      '',
      'FORMAL PETITION SUMMARY:',
      caseItem.triage.formal_petition_summary,
      '',
      'REQUIRED DOCUMENTS CHECKLIST:',
      ...caseItem.triage.required_documents_checklist.map((d, i) => `  ${i + 1}. ${d}`),
      '',
      'ACTIONABLE LEGAL & PROCEDURAL GUIDANCE:',
      caseItem.triage.actionable_legal_guidance,
      '',
      caseItem.disposalRemarks
        ? `SHO DISPOSAL REMARKS:\n${caseItem.disposalRemarks}\n`
        : '',
      `Official Portals: THUNA (${KERALA_POLICE_PORTAL_LINKS.thuna}) | Pol-App (${KERALA_POLICE_PORTAL_LINKS.polApp})`,
      'Emergency ERSS Helpline: 112 | Cyber Fraud: 1930',
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${caseItem.caseRefId}-KeralaPolice-Slip.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const activeStepIndex = activeCase
    ? Math.max(0, POLICE_CASE_STATUSES.indexOf(activeCase.status))
    : 0;

  return (
    <div className="space-y-5">
      {/* Top Hero Banner with Official THUNA & Pol-App Links */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-blue-900 to-sky-800 text-white p-5 shadow-lg border border-indigo-700/60">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 shadow-inner">
              <Shield className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight">
                  Kerala Police &amp; Citizen Safety Desk
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-bold uppercase tracking-wider">
                  THUNA &amp; Pol-App Integrated Flow
                </span>
              </div>
              <p className="text-xs text-sky-100 mt-1 max-w-2xl leading-relaxed">
                File multilingual e-Complaints &amp; General Diary (GD) logs with AI jurisdictional routing, instant QR Acknowledgement Slips, live SHO status tracking, and 112 ERSS escalation.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href={KERALA_POLICE_PORTAL_LINKS.thuna}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-indigo-950 text-xs font-bold shadow-sm hover:bg-sky-50 transition-colors"
            >
              <span>Kerala Police THUNA</span>
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
            </a>
            <a
              href={KERALA_POLICE_PORTAL_LINKS.polApp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 border border-white/25 text-white text-xs font-bold hover:bg-white/25 transition-colors"
            >
              <span>Pol-App Portal</span>
              <ExternalLink className="w-3.5 h-3.5 text-sky-200" />
            </a>
          </div>
        </div>
      </div>

      {/* Emergency Helpline Strip */}
      <EmergencyHelplineStrip />

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: e-Complaint & GD Intake Form */}
        <section className="xl:col-span-5 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                File Police e-Complaint / GD Log
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Supports English, Malayalam (മലയാളം), and Manglish via text or voice.
              </p>
            </div>
          </div>

          {/* Sample Scenarios */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Quick Demo Scenarios
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_POLICE_SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    setDistrictId(sc.districtId);
                    setDescription(sc.description);
                    setError(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 text-[11px] font-semibold text-indigo-900 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">
                  Kerala District (14 Jurisdictions)
                </span>
                <select
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                >
                  {KERALA_POLICE_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.refCode})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-700">
                  Incident Date &amp; Time
                </span>
                <input
                  type="datetime-local"
                  value={incidentDateTime}
                  onChange={(e) => setIncidentDateTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                />
              </label>
            </div>

            {/* Multilingual Description + Voice Mic */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="police-description"
                  className="text-xs font-bold text-slate-700"
                >
                  Incident Statement / Petition Details
                </label>
                <VoiceMicControl
                  onTranscript={(spoken) =>
                    setDescription((prev) =>
                      prev.trim() ? `${prev.trim()} ${spoken}` : spoken
                    )
                  }
                  disabled={isSubmitting}
                />
              </div>
              <textarea
                id="police-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened, exact landmark/road, or lost item details in English, Malayalam, or Manglish..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-y"
              />
            </div>

            {/* Optional Photo / Document Evidence */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">
                Supporting Photo or Document (Optional)
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-indigo-50/60 hover:border-indigo-300 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    {evidenceFileName ? 'Replace Attachment' : 'Attach Photo / PDF'}
                  </span>
                </button>
                {evidenceFileName && (
                  <span className="text-[11px] font-medium text-emerald-700 truncate max-w-[200px]">
                    {evidenceFileName}
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleEvidenceUpload}
                className="hidden"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 text-white text-xs font-extrabold shadow-md shadow-indigo-600/25 hover:from-indigo-700 hover:to-sky-700 disabled:opacity-60 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Jurisdiction &amp; Generating GD Slip…</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Police e-Complaint &amp; Issue QR Slip</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Right: Digital Police Petition Acknowledgement Slip + Case Selector */}
        <section className="xl:col-span-7 space-y-4">
          {activeCase ? (
            <>
              {/* Immediate 112 ERSS Life-Threat Banner */}
              {activeCase.triage.is_emergency_life_threat && (
                <div className="rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 text-white p-4 shadow-lg border-2 border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertOctagon className="w-6 h-6 text-amber-200 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-amber-200">
                        Emergency Life-Safety Threat Detected
                      </p>
                      <p className="text-sm font-extrabold mt-0.5">
                        Call 112 ERSS Immediately for Live Police &amp; Ambulance Dispatch!
                      </p>
                      <p className="text-xs text-rose-100 mt-0.5">
                        Your petition ({activeCase.caseRefId}) has also been logged with Critical priority for {activeCase.triage.jurisdictional_station}.
                      </p>
                    </div>
                  </div>
                  <a
                    href="tel:112"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-rose-700 text-xs font-black shadow-md hover:bg-rose-50 shrink-0"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>DIAL 112 NOW</span>
                  </a>
                </div>
              )}

              {/* Digital Police Petition Acknowledgement Slip */}
              <article className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                      Digital Police Petition Acknowledgement Slip
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-base sm:text-lg font-black font-mono tracking-tight">
                        {activeCase.caseRefId}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          activeCase.triage.priority_level === 'Critical / Immediate'
                            ? 'bg-rose-500 text-white'
                            : activeCase.triage.priority_level === 'High'
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-sky-500/30 text-sky-100 border border-sky-400/40'
                        }`}
                      >
                        {activeCase.triage.priority_level}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadSlip(activeCase)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Slip</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintSlip}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  {/* Top Station & QR Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold">
                          {activeCase.triage.case_category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-sky-600" />
                          {activeCase.districtName}
                        </span>
                        {activeCase.isLockedHouseIntimation && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                            Locked House Beat Intimation
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-extrabold text-slate-900">
                        {activeCase.triage.jurisdictional_station}
                      </p>
                      <p className="text-xs font-semibold text-indigo-700">
                        Unit: {activeCase.triage.recommended_unit}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Logged: {new Date(activeCase.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <VerificationQrSvg value={activeCase.caseRefId} />
                      <div className="text-[10px] text-slate-500 space-y-1">
                        <p className="font-bold text-slate-700 uppercase">
                          QR Verify
                        </p>
                        <p className="font-mono">{activeCase.caseRefId}</p>
                        {activeCase.emailAlertStatus &&
                          activeCase.emailAlertStatus !== 'not_applicable' && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
                                activeCase.emailAlertStatus === 'sent'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : activeCase.emailAlertStatus === 'sending'
                                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              <Mail className="w-2.5 h-2.5" />
                              {activeCase.emailAlertStatus === 'sent'
                                ? 'SHO Email Alert Sent'
                                : activeCase.emailAlertStatus === 'sending'
                                  ? 'Notifying SHO…'
                                  : 'Logged Locally'}
                            </span>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* 4-Step Live Status Tracker */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Live Petition &amp; SHO Disposal Tracker
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {POLICE_CASE_STATUSES.map((step, idx) => {
                        const completed = idx <= activeStepIndex;
                        const isCurrent = idx === activeStepIndex;
                        return (
                          <div
                            key={step}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isCurrent
                                ? 'bg-indigo-50 border-indigo-400 shadow-xs'
                                : completed
                                  ? 'bg-emerald-50/70 border-emerald-200'
                                  : 'bg-slate-50 border-slate-200/80 opacity-65'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
                                  completed
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {isCurrent ? 'Current' : completed ? 'Done' : 'Pending'}
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-800 leading-tight">
                              {step}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Formal Petition Summary */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Formal English e-Petition / GD Summary
                    </p>
                    <p className="text-xs text-slate-800 leading-relaxed">
                      {activeCase.triage.formal_petition_summary}
                    </p>
                  </div>

                  {/* Checklist & Legal Guidance */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/80 space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        Required Documents Checklist
                      </p>
                      <ul className="space-y-1.5">
                        {activeCase.triage.required_documents_checklist.map(
                          (item, index) => (
                            <li
                              key={`${index}-${item.slice(0, 12)}`}
                              className="text-xs text-slate-700 flex items-start gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        Actionable Legal Guidance
                      </p>
                      <p className="text-xs text-slate-800 leading-relaxed">
                        {activeCase.triage.actionable_legal_guidance}
                      </p>
                    </div>
                  </div>

                  {activeCase.disposalRemarks && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        SHO / Beat Officer Remarks
                      </p>
                      <p className="text-xs text-emerald-950">
                        {activeCase.disposalRemarks}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            </>
          ) : (
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-8 text-center shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">
                No Police Petitions Filed Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Submit an e-Complaint or General Diary (GD) log on the left — or click <strong>✨ Load Demo Data</strong> in the top bar — to inspect a live Digital Police Petition Acknowledgement Slip with QR verification.
              </p>
            </div>
          )}

          {/* Filed Petitions List */}
          {policeCases.length > 0 && (
            <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Your Logged Petitions &amp; GD Entries ({policeCases.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {policeCases.map((item) => {
                  const isSelected = activeCase?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedCaseId(item.id)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/90 border-indigo-400 shadow-xs'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black font-mono text-indigo-900">
                          {item.caseRefId}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                        {item.triage.case_category} • {item.districtName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.triage.jurisdictional_station}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
