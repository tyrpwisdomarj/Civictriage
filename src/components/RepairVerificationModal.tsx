import React, { useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  AlertTriangle,
} from 'lucide-react';
import type {
  RepairVerificationRecord,
  StoredTicket,
} from '../shared/triageSchema';

interface RepairVerificationModalProps {
  ticket: StoredTicket;
  onClose: () => void;
  onVerifiedResolved: (
    ticketId: string,
    record: RepairVerificationRecord
  ) => void;
}

/**
 * Generates a realistic clean asphalt/repaired road JPEG data URL on a canvas
 * so presenters can demonstrate Gemini Before/After closed-loop verification in one click.
 */
function createSampleRepairedRoadDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Daylight sky
  const sky = ctx.createLinearGradient(0, 0, 0, 150);
  sky.addColorStop(0, '#38bdf8');
  sky.addColorStop(1, '#bae6fd');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 640, 150);

  // Tropical Kerala roadside greenery
  ctx.fillStyle = '#15803d';
  ctx.fillRect(0, 130, 640, 70);
  ctx.fillStyle = '#16a34a';
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.arc(35 + i * 48, 145 + (i % 3) * 8, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  // Freshly resurfaced dark-slate asphalt roadway
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(0, 220);
  ctx.lineTo(640, 220);
  ctx.lineTo(640, 420);
  ctx.lineTo(0, 420);
  ctx.closePath();
  ctx.fill();

  // Subtle asphalt grain + newly patched smooth tarmac section
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(90, 250, 460, 130);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 6;
  ctx.setLineDash([36, 26]);
  ctx.beginPath();
  ctx.moveTo(320, 225);
  ctx.lineTo(320, 415);
  ctx.stroke();
  ctx.setLineDash([]);

  // Clean yellow curb edges & clean drainage side
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 214, 640, 10);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 200, 640, 14);

  // Small PWD inspection stamp overlay
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.fillRect(16, 16, 285, 42);
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('PWD / LSG FIELD REPAIR COMPLETE', 28, 36);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '11px monospace';
  ctx.fillText('RESURFACED CARRIAGEWAY • CLEAR DRAINAGE', 28, 51);

  return canvas.toDataURL('image/jpeg', 0.9);
}

export const RepairVerificationModal: React.FC<RepairVerificationModalProps> = ({
  ticket,
  onClose,
  onVerifiedResolved,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [afterImageUrl, setAfterImageUrl] = useState<string>('');
  const [afterMimeType, setAfterMimeType] = useState<string>('image/jpeg');
  const [afterFileName, setAfterFileName] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    is_resolved: boolean;
    verification_note: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid JPEG, PNG, or WebP photograph.');
      return;
    }
    setError(null);
    setResult(null);
    setAfterFileName(file.name);
    setAfterMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAfterImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSamplePhoto = () => {
    const sampleUrl = createSampleRepairedRoadDataUrl();
    if (!sampleUrl) return;
    setAfterImageUrl(sampleUrl);
    setAfterMimeType('image/jpeg');
    setAfterFileName('pwd_resurfaced_after_repair.jpg');
    setError(null);
    setResult(null);
  };

  const handleVerify = async () => {
    if (!afterImageUrl) {
      setError('Upload an "After Repair" photograph first.');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/verify-repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          afterImageBase64: afterImageUrl,
          mimeType: afterMimeType,
          originalTitle: ticket.triage.ticket_title,
          originalSummary: ticket.triage.formal_summary,
          originalDepartment: ticket.triage.department,
          originalLocation:
            ticket.triage.extracted_landmarks.join(', ') || ticket.localBodyHint,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Repair verification failed.');
      }

      const isResolved = Boolean(payload.is_resolved);
      const note =
        typeof payload.verification_note === 'string'
          ? payload.verification_note
          : 'Gemini completed the visual audit.';

      setResult({ is_resolved: isResolved, verification_note: note });

      if (isResolved) {
        onVerifiedResolved(ticket.id, {
          verifiedAt: new Date().toISOString(),
          afterImageUrl,
          isResolved: true,
          verificationNote: note,
          emailStatus: 'sending',
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to contact Gemini Repair Verification service.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="repair-modal-title"
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="repair-modal-title"
                className="text-sm sm:text-base font-extrabold truncate"
              >
                Gemini Before/After Repair Verification
              </h2>
              <p className="text-[11px] text-emerald-100 truncate">
                Closed-Loop Resolution Audit • Ticket {ticket.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close repair verification modal"
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Ticket Summary Strip */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-md border border-sky-200 bg-sky-50 text-sky-800 text-[11px] font-bold">
                {ticket.triage.department}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md border font-mono text-[11px] font-bold ${
                  ticket.triage.severity_score >= 9
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : ticket.triage.severity_score >= 7
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}
              >
                {ticket.triage.severity_score}/10 · {ticket.triage.severity_level}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900">
              {ticket.triage.ticket_title}
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {ticket.triage.formal_summary}
            </p>
          </div>

          {/* Side-by-side Before & After Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Before Photo */}
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Before (Reported Hazard)
              </span>
              <div className="h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={ticket.imageUrl}
                  alt={ticket.triage.ticket_title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* After Repair Upload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  After Repair Photo
                </span>
                <button
                  type="button"
                  onClick={handleLoadSamplePhoto}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Load Sample Repaired Photo
                </button>
              </div>

              {afterImageUrl ? (
                <div className="relative h-44 rounded-2xl overflow-hidden border-2 border-emerald-300 bg-slate-100">
                  <img
                    src={afterImageUrl}
                    alt="After repair preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-[11px] font-semibold hover:bg-slate-900 cursor-pointer"
                  >
                    Replace Photo
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-44 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 flex flex-col items-center justify-center gap-2 text-center p-4 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Upload After Repair Photo
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      JPEG, PNG, or WebP from field crew
                    </p>
                  </div>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              {afterFileName && (
                <p className="text-[11px] text-slate-500 truncate">
                  Attached: {afterFileName}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div
              className={`p-4 rounded-2xl border ${
                result.is_resolved
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {result.is_resolved ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="text-xs font-extrabold uppercase tracking-wider">
                    {result.is_resolved
                      ? 'AI Verified: Repair Confirmed — Ticket Marked Resolved!'
                      : 'AI Audit: Repair Not Confirmed Yet'}
                  </p>
                  <p className="text-xs leading-relaxed">
                    {result.verification_note}
                  </p>
                  {result.is_resolved && (
                    <p className="text-[11px] font-semibold text-emerald-700 pt-1">
                      Before/After proof saved to Officer Dashboard and EmailJS resolution alert dispatched.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            {result?.is_resolved ? 'Done' : 'Cancel'}
          </button>

          {!result?.is_resolved && (
            <button
              type="button"
              onClick={handleVerify}
              disabled={!afterImageUrl || isVerifying}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Auditing Repair with Gemini…</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Verify Fix &amp; Resolve Ticket</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
