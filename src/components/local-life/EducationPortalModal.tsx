import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Camera,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  Loader2,
  MapPin,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { LiquidSheetModal } from '../LiquidGlassCard';
import {
  getEducationPortalMeta,
  type AdmissionApplicationRecord,
  type EducationEntry,
} from '../../data/localLifeData';
import { fetchSpotGallery, type SpotPhotoItem } from '../../utils/spotGallery';
import { readAiCache, writeAiCache } from '../../utils/aiResponseCache';
import type { UserProfile } from '../../shared/authSchema';

interface EducationPortalModalProps {
  institution: EducationEntry | null;
  onClose: () => void;
  onSubmitApplication: (record: AdmissionApplicationRecord) => void;
  onOpenPictureLibrary?: (item: EducationEntry) => void;
  activeUser?: UserProfile;
}

const DEFAULT_STUDENT_PROFILE = {
  applicantName: 'Arjit Anil',
  email: 'arjit.student@keralaedu.in',
  phone: '+91 98470 21845',
  stream: 'Science & CS (PCM + Computer Science)',
  districtState: 'Pathanamthitta, Kerala',
  qualification: 'Class 12 CBSE — 94.6% Aggregate · KEAM & JEE Qualified',
};

export const EducationPortalModal: React.FC<EducationPortalModalProps> = ({
  institution,
  onClose,
  onSubmitApplication,
  onOpenPictureLibrary,
  activeUser,
}) => {
  const [photos, setPhotos] = useState<SpotPhotoItem[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<AdmissionApplicationRecord | null>(null);

  const [applicantName, setApplicantName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stream, setStream] = useState('');
  const [districtState, setDistrictState] = useState('');
  const [qualification, setQualification] = useState('');
  const [sopText, setSopText] = useState('');
  const [documentsChecklist, setDocumentsChecklist] = useState<string[]>([
    'Class 10 / Plus Two Marksheet & Transfer Certificate (DigiLocker)',
    'KEAM / JEE / CUET Entrance Score Card',
    'Aadhaar & Kerala Nativity / e-Grantz Income Certificate',
  ]);

  const meta = institution ? getEducationPortalMeta(institution) : null;

  useEffect(() => {
    if (!institution) return;
    let cancelled = false;
    setShowApplyForm(false);
    setSubmittedRecord(null);
    setApplicantName(activeUser?.fullName || '');
    setEmail(activeUser?.email || '');
    setPhone('');
    setStream(activeUser?.academicStream || institution.stream);
    setDistrictState(activeUser?.homeDistrictName || `${institution.districtName}, Kerala`);
    setQualification('');
    setSopText('');
    setLoadingPhotos(true);

    const m = getEducationPortalMeta(institution);
    void fetchSpotGallery(m.wikiQuery, `${institution.districtName}, Kerala`).then((items) => {
      if (!cancelled) {
        setPhotos(items);
        setLoadingPhotos(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [institution, activeUser]);

  const handleAutofillProfileAndSop = async () => {
    if (!institution) return;
    const resolvedName = activeUser?.fullName || DEFAULT_STUDENT_PROFILE.applicantName;
    const resolvedEmail = activeUser?.email || DEFAULT_STUDENT_PROFILE.email;
    const resolvedDistrict =
      activeUser?.homeDistrictName || DEFAULT_STUDENT_PROFILE.districtState;
    const resolvedStream =
      institution.stream === 'Skill Dev'
        ? 'Full-Stack Web & Applied AI Track'
        : activeUser?.academicStream || DEFAULT_STUDENT_PROFILE.stream;

    setShowApplyForm(true);
    setApplicantName(resolvedName);
    setEmail(resolvedEmail);
    setPhone(DEFAULT_STUDENT_PROFILE.phone);
    setStream(resolvedStream);
    setDistrictState(resolvedDistrict);
    setQualification(DEFAULT_STUDENT_PROFILE.qualification);

    const cacheKey = `sop::${institution.id}::${resolvedName}`;
    const cached = readAiCache<{ sopText: string; documentsChecklist: string[] }>(cacheKey);
    if (cached) {
      setSopText(cached.sopText);
      if (cached.documentsChecklist?.length) setDocumentsChecklist(cached.documentsChecklist);
      return;
    }

    setAutofilling(true);
    try {
      const resp = await fetch('/api/local-life-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'sop',
          districtName: institution.districtName,
          institutionName: institution.name,
          applicantName: resolvedName,
          stream: resolvedStream,
        }),
      });
      const data = (await resp.json().catch(() => null)) as {
        sopText?: string;
        documentsChecklist?: string[];
      } | null;

      if (data?.sopText) {
        setSopText(data.sopText);
        if (Array.isArray(data.documentsChecklist) && data.documentsChecklist.length > 0) {
          setDocumentsChecklist(data.documentsChecklist);
        }
        writeAiCache(cacheKey, {
          sopText: data.sopText,
          documentsChecklist: data.documentsChecklist ?? documentsChecklist,
        });
      } else {
        setSopText(
          `I am eager to pursue the ${institution.stream} programme at ${institution.name} (${institution.districtName}, Kerala). My strong foundation in analytical coursework, software prototyping, and community problem-solving prepares me to contribute actively to campus labs and research initiatives.`
        );
      }
    } catch {
      setSopText(
        `I am eager to pursue the ${institution.stream} programme at ${institution.name} (${institution.districtName}, Kerala). My strong foundation in analytical coursework, software prototyping, and community problem-solving prepares me to contribute actively to campus labs and research initiatives.`
      );
    } finally {
      setAutofilling(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution) return;
    const record: AdmissionApplicationRecord = {
      receiptId: `ADM-${institution.districtName.slice(0, 3).toUpperCase()}-${Date.now()
        .toString()
        .slice(-5)}`,
      institutionId: institution.id,
      institutionName: institution.name,
      districtName: institution.districtName,
      level: institution.level,
      applicantName: applicantName.trim() || DEFAULT_STUDENT_PROFILE.applicantName,
      email: email.trim() || DEFAULT_STUDENT_PROFILE.email,
      phone: phone.trim() || DEFAULT_STUDENT_PROFILE.phone,
      stream: stream.trim() || institution.stream,
      districtState: districtState.trim() || `${institution.districtName}, Kerala`,
      qualification: qualification.trim() || DEFAULT_STUDENT_PROFILE.qualification,
      documentsChecklist,
      sopText:
        sopText.trim() ||
        `Statement of Purpose for ${institution.name} (${institution.stream} track).`,
      submittedAt: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      status: 'SUBMITTED · AUTO-VERIFIED',
    };
    setSubmittedRecord(record);
    onSubmitApplication(record);
  };

  const handleDownloadReceipt = (rec: AdmissionApplicationRecord) => {
    const content = [
      '============================================================',
      '   CIVICTRIAGE LSG · KERALA EDUCATION ADMISSION RECEIPT',
      '============================================================',
      `Receipt ID       : ${rec.receiptId}`,
      `Status           : ${rec.status}`,
      `Submitted At     : ${rec.submittedAt}`,
      '------------------------------------------------------------',
      `Institution      : ${rec.institutionName}`,
      `District / Level : ${rec.districtName} · ${rec.level}`,
      `Applicant Name   : ${rec.applicantName}`,
      `Email / Phone    : ${rec.email} | ${rec.phone}`,
      `Stream / Track   : ${rec.stream}`,
      `Home District    : ${rec.districtState}`,
      `Qualification    : ${rec.qualification}`,
      '------------------------------------------------------------',
      'DOCUMENT CHECKLIST (READY FOR VERIFICATION):',
      ...rec.documentsChecklist.map((d, i) => `  ${i + 1}. [✓] ${d}`),
      '------------------------------------------------------------',
      'STATEMENT OF PURPOSE (SOP):',
      rec.sopText,
      '============================================================',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rec.receiptId}-${rec.applicantName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <LiquidSheetModal
      open={Boolean(institution)}
      onClose={onClose}
      title={institution ? `${institution.name} Campus Portal` : 'Campus Portal'}
      maxWidthClass="max-w-3xl"
    >
      {institution && meta && (
        <div className="p-5 sm:p-7 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#A5B4FC]">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{institution.level}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#111315] dark:text-white leading-tight">
                {institution.name}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#4F5BD5] shrink-0" />
                <span>
                  {institution.location} · {institution.affiliation}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close campus portal"
              className="p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Campus Wikimedia Photo Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {loadingPhotos ? (
              <div className="sm:col-span-3 h-36 rounded-2xl bg-slate-900/10 dark:bg-white/5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin text-[#4F5BD5]" />
                Loading Wikimedia campus gallery…
              </div>
            ) : (
              photos.slice(0, 3).map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onOpenPictureLibrary?.(institution)}
                  className={`relative rounded-2xl overflow-hidden border border-white/60 dark:border-white/15 group cursor-pointer ${
                    idx === 0 ? 'sm:col-span-2 h-40' : 'h-40'
                  }`}
                >
                  <img
                    src={p.thumbUrl}
                    alt={p.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-semibold backdrop-blur-md flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    {idx === 0 ? 'View Full Picture Library' : 'Wikimedia'}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Fee Structure, Entrance Exams, Eligibility */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/75 border border-black/5 dark:border-white/10 space-y-1">
              <p className="text-[10px] font-mono font-bold uppercase text-[#4F5BD5] dark:text-[#A5B4FC]">
                Fee Structure / Grant
              </p>
              <p className="text-xs font-bold text-[#111315] dark:text-white leading-snug">
                {meta.feesSummary}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/75 border border-black/5 dark:border-white/10 space-y-1">
              <p className="text-[10px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400">
                Entrance &amp; Intake
              </p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                {meta.entranceExams.join(' · ')}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/75 border border-black/5 dark:border-white/10 space-y-1">
              <p className="text-[10px] font-mono font-bold uppercase text-amber-700 dark:text-amber-400">
                Eligibility
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                {meta.eligibility}
              </p>
            </div>
          </div>

          {/* Submitted Admission Receipt */}
          {submittedRecord ? (
            <div className="p-5 rounded-[24px] bg-emerald-50/90 dark:bg-emerald-950/45 border border-emerald-300/70 dark:border-emerald-700/60 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-300">
                      {submittedRecord.status} · {submittedRecord.receiptId}
                    </p>
                    <h3 className="text-base font-extrabold text-[#111315] dark:text-white">
                      Admission Application Saved to &ldquo;My Applications&rdquo;
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {submittedRecord.applicantName} · {submittedRecord.stream} · Submitted{' '}
                      {submittedRecord.submittedAt}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadReceipt(submittedRecord)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-md cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Receipt (.txt)
                </button>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-emerald-200/70 dark:border-emerald-800/50 leading-relaxed">
                <strong>Drafted SOP:</strong> {submittedRecord.sopText}
              </p>
            </div>
          ) : !showApplyForm ? (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black/5 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowApplyForm(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-md hover:opacity-90 cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4 text-[#A5B4FC] dark:text-[#4F5BD5]" />
                  Apply Now (Autofill Admission)
                </button>
                <button
                  type="button"
                  onClick={() => void handleAutofillProfileAndSop()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#4F5BD5] hover:bg-[#3f4bc4] text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  1-Click Autofill Profile &amp; SOP
                </button>
              </div>
              <a
                href={meta.officialPortal}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black/5 dark:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Official Portal
              </a>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="p-4 sm:p-5 rounded-[24px] bg-white/75 dark:bg-slate-900/75 border border-[#4F5BD5]/25 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-[#111315] dark:text-white flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#4F5BD5]" />
                  Admission &amp; Scholarship Application Form
                </h3>
                <button
                  type="button"
                  disabled={autofilling}
                  onClick={() => void handleAutofillProfileAndSop()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#4F5BD5] hover:bg-[#3f4bc4] disabled:opacity-70 text-white text-[11px] font-bold shadow-sm cursor-pointer"
                >
                  {autofilling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>⚡ Autofill Student Profile &amp; SOP</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Applicant Full Name"
                  className="glass-pill-input px-3.5 py-2.5 text-xs font-medium"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Student Email Address"
                  className="glass-pill-input px-3.5 py-2.5 text-xs font-medium"
                />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile Number (+91)"
                  className="glass-pill-input px-3.5 py-2.5 text-xs font-medium"
                />
                <input
                  type="text"
                  required
                  value={stream}
                  onChange={(e) => setStream(e.target.value)}
                  placeholder="Preferred Stream / Program"
                  className="glass-pill-input px-3.5 py-2.5 text-xs font-medium"
                />
                <input
                  type="text"
                  required
                  value={districtState}
                  onChange={(e) => setDistrictState(e.target.value)}
                  placeholder="District & State"
                  className="glass-pill-input px-3.5 py-2.5 text-xs font-medium"
                />
                <input
                  type="text"
                  required
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="Academic Qualification / Score"
                  className="glass-pill-input px-3.5 py-2.5 text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#4F5BD5]" />
                  Gemini-Drafted Statement of Purpose (SOP)
                </label>
                <textarea
                  rows={3}
                  value={sopText}
                  onChange={(e) => setSopText(e.target.value)}
                  placeholder="Click '⚡ Autofill Student Profile & SOP' to auto-generate a tailored Statement of Purpose…"
                  className="w-full glass-pill-input px-3.5 py-2.5 text-xs leading-relaxed resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Auto-Attached Verification Document Checklist
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {documentsChecklist.map((doc) => (
                    <li
                      key={doc}
                      className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 bg-[#EFECE8]/75 dark:bg-slate-800/70 px-2.5 py-1.5 rounded-xl"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyForm(false)}
                  className="px-4 py-2 rounded-full bg-black/5 dark:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-md cursor-pointer"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-[#A5B4FC] dark:text-[#4F5BD5]" />
                  Submit &amp; Generate Receipt
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </LiquidSheetModal>
  );
};
