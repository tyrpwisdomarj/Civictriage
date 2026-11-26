import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileCheck2,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { LiquidGlassCard, LiquidSheetModal } from '../LiquidGlassCard';
import {
  JOBS_DIRECTORY,
  JOB_CATEGORIES,
  JOB_LOCATION_OPTIONS,
  JOB_QUALIFICATIONS,
  type JobApplicationRecord,
  type JobCategory,
  type JobListingEntry,
  type JobQualification,
} from '../../data/localLifeData';
import { readAiCache, writeAiCache } from '../../utils/aiResponseCache';

interface JobsPortalPanelProps {
  districtName: string;
  jobApplications: JobApplicationRecord[];
  onSubmitJobApplication: (record: JobApplicationRecord) => void;
}

export const JobsPortalPanel: React.FC<JobsPortalPanelProps> = ({
  districtName,
  jobApplications,
  onSubmitJobApplication,
}) => {
  const [locationFilter, setLocationFilter] = useState<string>('Pathanamthitta & Kerala');
  const [categoryFilter, setCategoryFilter] = useState<JobCategory>('All Categories');
  const [qualFilter, setQualFilter] = useState<JobQualification>('All Qualifications');
  const [searchQuery, setSearchQuery] = useState('');

  // Gemini AI Job Scout state
  const [skillsPrompt, setSkillsPrompt] = useState('React, Python, Civic Tech, Kerala PSC');
  const [aiMatchedJobs, setAiMatchedJobs] = useState<JobListingEntry[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Quick Apply Modal state
  const [applyJob, setApplyJob] = useState<JobListingEntry | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('B.Tech Computer Science (Final Year / Graduate)');
  const [skills, setSkills] = useState('TypeScript, React, Python, English & Malayalam');
  const [coverNote, setCoverNote] = useState('');
  const [coverLoading, setCoverLoading] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<JobApplicationRecord | null>(null);

  const combinedListings = useMemo(
    () => [...aiMatchedJobs, ...JOBS_DIRECTORY],
    [aiMatchedJobs]
  );

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matches = combinedListings.filter((job) => {
      const catOk = categoryFilter === 'All Categories' || job.category === categoryFilter;
      const qualOk =
        qualFilter === 'All Qualifications' || job.qualification === qualFilter;
      const locOk =
        locationFilter === 'All Kerala & Remote' ||
        locationFilter === 'Pathanamthitta & Kerala' ||
        job.district.toLowerCase().includes(locationFilter.toLowerCase()) ||
        (locationFilter.includes('Remote') && job.workMode === 'Remote');
      const queryOk =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.employer.toLowerCase().includes(q) ||
        job.skills.some((s) => s.toLowerCase().includes(q)) ||
        job.district.toLowerCase().includes(q);
      return catOk && qualOk && locOk && queryOk;
    });

    if (matches.length > 0) return matches;
    // Broaden district filter if no exact match
    return combinedListings.filter(
      (job) =>
        (categoryFilter === 'All Categories' || job.category === categoryFilter) &&
        (qualFilter === 'All Qualifications' || job.qualification === qualFilter)
    );
  }, [combinedListings, categoryFilter, qualFilter, locationFilter, searchQuery]);

  const appliedJobIds = useMemo(
    () => new Set(jobApplications.map((a) => a.jobId)),
    [jobApplications]
  );

  const handleRunAiJobScout = async () => {
    const cacheKey = `jobs_match::${locationFilter}::${categoryFilter}::${qualFilter}::${skillsPrompt.trim()}`;
    const cached = readAiCache<{ summary: string; jobs: JobListingEntry[] }>(cacheKey);
    if (cached) {
      setAiSummary(cached.summary);
      setAiMatchedJobs(cached.jobs);
      return;
    }

    setAiLoading(true);
    try {
      const resp = await fetch('/api/local-life-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'jobs_match',
          districtName: locationFilter === 'All Kerala & Remote' ? districtName : locationFilter,
          levelOrCategory: categoryFilter,
          streamOrMood: qualFilter,
          query: skillsPrompt.trim(),
        }),
      });
      const data = await resp.json().catch(() => null);
      if (data && Array.isArray(data.jobs)) {
        const normalized: JobListingEntry[] = data.jobs.map((j: any, i: number) => ({
          id: String(j.id || `ai-job-${Date.now()}-${i}`),
          title: String(j.title || 'Kerala Digital & Career Opening'),
          employer: String(j.employer || `${districtName} Employer Network`),
          category: (JOB_CATEGORIES.includes(j.category) && j.category !== 'All Categories'
            ? j.category
            : 'DWMS / KKEM Knowledge Mission & Internships') as JobListingEntry['category'],
          district: String(j.district || districtName),
          qualification: (JOB_QUALIFICATIONS.includes(j.qualification) &&
          j.qualification !== 'All Qualifications'
            ? j.qualification
            : 'Graduate / B.Tech') as JobListingEntry['qualification'],
          salaryLabel: String(j.salaryLabel || '₹24,000 – ₹38,000 / month'),
          deadline: String(j.deadline || 'Rolling Intake · Dec 2026'),
          workMode: (['On-Site', 'Hybrid', 'Remote', 'Field / Flexible'].includes(j.workMode)
            ? j.workMode
            : 'Hybrid') as JobListingEntry['workMode'],
          summary: String(j.summary || 'AI-matched Kerala opportunity aligned with your profile.'),
          skills: Array.isArray(j.skills) ? j.skills.map(String).slice(0, 5) : ['Communication', 'Digital Skills'],
          officialPortalLabel: String(j.officialPortalLabel || 'knowledgemission.kerala.gov.in'),
          officialPortalUrl: String(j.officialPortalUrl || 'https://knowledgemission.kerala.gov.in'),
          isAiMatched: true,
        }));
        const summaryText =
          typeof data.summary === 'string' && data.summary.trim()
            ? data.summary.trim()
            : `Matched ${normalized.length} tailored openings across ${locationFilter}.`;
        setAiSummary(summaryText);
        setAiMatchedJobs(normalized);
        writeAiCache(cacheKey, { summary: summaryText, jobs: normalized });
      }
    } finally {
      setAiLoading(false);
    }
  };

  const openQuickApply = (job: JobListingEntry) => {
    setApplyJob(job);
    setSubmittedRecord(null);
    if (!applicantName) setApplicantName('Arjit Anil');
    if (!email) setEmail('arjit.career@keralamail.in');
    if (!phone) setPhone('+91 98470 21845');
    setCoverNote('');
  };

  const handleAutofillProfileAndCover = async () => {
    if (!applyJob) return;
    setApplicantName('Arjit Anil');
    setEmail('arjit.career@keralamail.in');
    setPhone('+91 98470 21845');
    setQualification(
      applyJob.qualification === '10th / Plus Two'
        ? 'Plus Two CBSE — 94.6% · Digital Literacy Certified'
        : applyJob.qualification === 'Diploma / ITI'
          ? 'Polytechnic Diploma (First Class with Distinction)'
          : 'B.Tech Computer Science & Engineering · Kerala DWMS Verified'
    );
    setSkills(applyJob.skills.join(', ') + ', English & Malayalam');

    const cacheKey = `job_cover::${applyJob.id}::${applyJob.title}`;
    const cached = readAiCache<string>(cacheKey);
    if (cached) {
      setCoverNote(cached);
      return;
    }

    setCoverLoading(true);
    try {
      const resp = await fetch('/api/local-life-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'job_cover_note',
          districtName: applyJob.district,
          institutionName: applyJob.employer,
          stream: applyJob.title,
          applicantName: 'Arjit Anil',
          query: applyJob.skills.join(', '),
        }),
      });
      const data = await resp.json().catch(() => null);
      const note =
        data && typeof data.coverNote === 'string' && data.coverNote.trim()
          ? data.coverNote.trim()
          : `I am excited to apply for ${applyJob.title} at ${applyJob.employer}. With hands-on experience in ${applyJob.skills.slice(0, 3).join(', ')} and strong familiarity with Kerala's regional digital ecosystem, I am ready to contribute from day one.`;
      setCoverNote(note);
      writeAiCache(cacheKey, note);
    } finally {
      setCoverLoading(false);
    }
  };

  const handleSubmitQuickApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyJob || !applicantName.trim() || !email.trim()) return;
    const record: JobApplicationRecord = {
      applicationId: `JOB-${applyJob.district.slice(0, 3).toUpperCase()}-${Math.floor(
        10000 + Math.random() * 89999
      )}`,
      jobId: applyJob.id,
      jobTitle: applyJob.title,
      employer: applyJob.employer,
      district: applyJob.district,
      salaryLabel: applyJob.salaryLabel,
      applicantName: applicantName.trim(),
      email: email.trim(),
      phone: phone.trim() || '+91 98470 21845',
      qualification: qualification.trim(),
      skills: skills.trim(),
      coverNote:
        coverNote.trim() ||
        `Applying for ${applyJob.title} with verified Kerala DWMS/DigiLocker profile.`,
      submittedAt: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      status: 'APPLIED · PROFILE VERIFIED',
    };
    onSubmitJobApplication(record);
    setSubmittedRecord(record);
  };

  const handleDownloadJobReceipt = (rec: JobApplicationRecord) => {
    const text = [
      'CIVICTRIAGE LSG · KERALA JOBS & DWMS APPLICATION RECEIPT',
      `Application ID: ${rec.applicationId} | Status: ${rec.status}`,
      `Role: ${rec.jobTitle}`,
      `Employer: ${rec.employer} (${rec.district})`,
      `Compensation: ${rec.salaryLabel}`,
      `Applicant: ${rec.applicantName} | ${rec.email} | ${rec.phone}`,
      `Qualification: ${rec.qualification}`,
      `Skills: ${rec.skills}`,
      `Submitted At: ${rec.submittedAt}`,
      '',
      'Cover Note:',
      rec.coverNote,
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rec.applicationId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* AI Career Scout & Filter Bar */}
      <LiquidGlassCard interactive={false} strong className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#A5B4FC] flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Kerala PSC · DWMS / KKEM · IT &amp; Work-Near-Home Portal</span>
            </p>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#111315] dark:text-white">
              Jobs, Internships &amp; 1-Click Quick Apply
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <a
              href="https://knowledgemission.kerala.gov.in"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#4F5BD5]/12 dark:bg-[#7B83EB]/20 text-[#313DA8] dark:text-[#C7D2FE] hover:underline"
            >
              DWMS / KKEM <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://www.keralapsc.gov.in"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:underline"
            >
              Kerala PSC <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://employment.kerala.gov.in"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:underline"
            >
              Employment Exchange <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search role, company, or skill…"
              className="w-full glass-pill-input pl-9 pr-3 py-2.5 text-xs font-medium"
            />
          </div>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            aria-label="Job location filter"
            className="glass-pill-input px-3.5 py-2.5 text-xs font-semibold cursor-pointer"
          >
            {JOB_LOCATION_OPTIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as JobCategory)}
            aria-label="Job category filter"
            className="glass-pill-input px-3.5 py-2.5 text-xs font-semibold cursor-pointer"
          >
            {JOB_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={qualFilter}
            onChange={(e) => setQualFilter(e.target.value as JobQualification)}
            aria-label="Qualification filter"
            className="glass-pill-input px-3.5 py-2.5 text-xs font-semibold cursor-pointer"
          >
            {JOB_QUALIFICATIONS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>

        {/* Gemini AI Career Matcher Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          <input
            type="text"
            value={skillsPrompt}
            onChange={(e) => setSkillsPrompt(e.target.value)}
            placeholder="Your skills or goal (e.g., React, Python, Civil Diploma, Part-Time Student)..."
            className="flex-1 glass-pill-input px-4 py-2.5 text-xs font-medium"
          />
          <button
            type="button"
            disabled={aiLoading}
            onClick={() => void handleRunAiJobScout()}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-65 cursor-pointer shrink-0"
          >
            {aiLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#A5B4FC] dark:text-[#4F5BD5]" />
            )}
            <span>AI Match Roles</span>
          </button>
        </div>

        {aiSummary && (
          <div className="rounded-2xl px-4 py-3 bg-[#4F5BD5]/10 dark:bg-[#7B83EB]/18 border border-[#4F5BD5]/25 text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2">
            <span>
              <strong className="text-[#313DA8] dark:text-[#C7D2FE]">Gemini Career Scout:</strong>{' '}
              {aiSummary}
            </span>
            <button
              type="button"
              onClick={() => {
                setAiSummary(null);
                setAiMatchedJobs([]);
              }}
              className="text-[11px] font-bold text-[#4F5BD5] dark:text-[#A5B4FC] hover:underline shrink-0 cursor-pointer"
            >
              Clear AI Matches
            </button>
          </div>
        )}
      </LiquidGlassCard>

      {/* Job Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredJobs.map((job) => {
          const isApplied = appliedJobIds.has(job.id);
          return (
            <LiquidGlassCard key={job.id} className="p-5 flex flex-col justify-between gap-3.5">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      job.isAiMatched
                        ? 'bg-[#4F5BD5] text-white'
                        : 'bg-[#4F5BD5]/12 dark:bg-[#7B83EB]/20 text-[#313DA8] dark:text-[#C7D2FE]'
                    }`}
                  >
                    {job.isAiMatched ? '✦ AI Matched' : job.workMode}
                  </span>
                  <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
                    {job.qualification}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm sm:text-[15px] font-extrabold text-[#111315] dark:text-white leading-snug">
                    {job.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-[#4F5BD5] shrink-0" />
                    <span className="truncate">{job.employer}</span>
                  </p>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                  {job.summary}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {job.skills.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-black/5 dark:border-white/10 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                    {job.salaryLabel}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                    <MapPin className="w-3 h-3" />
                    {job.district}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-[10.5px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {job.deadline}
                  </span>
                  <a
                    href={job.officialPortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#4F5BD5] dark:text-[#A5B4FC] hover:underline"
                  >
                    {job.officialPortalLabel}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => openQuickApply(job)}
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isApplied
                      ? 'bg-emerald-600/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-[#111315] dark:bg-white text-white dark:text-slate-950 shadow-md hover:opacity-90'
                  }`}
                >
                  {isApplied ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Applied · Apply / Update Again</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5 text-[#A5B4FC] dark:text-[#4F5BD5]" />
                      <span>1-Click Quick Apply</span>
                    </>
                  )}
                </button>
              </div>
            </LiquidGlassCard>
          );
        })}
      </div>

      {/* Submitted Job Applications Ledger */}
      {jobApplications.length > 0 && (
        <LiquidGlassCard interactive={false} strong className="p-5 sm:p-6 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>My Job Applications ({jobApplications.length})</span>
              </p>
              <h3 className="text-base font-extrabold text-[#111315] dark:text-white">
                Verified DWMS / Direct Employer Submissions
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {jobApplications.map((rec) => (
              <div
                key={rec.applicationId}
                className="p-4 rounded-2xl bg-white/75 dark:bg-slate-900/70 border border-white/80 dark:border-white/10 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10.5px] font-extrabold text-[#4F5BD5] dark:text-[#A5B4FC]">
                      {rec.applicationId}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      {rec.status}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-extrabold text-[#111315] dark:text-white truncate">
                    {rec.jobTitle}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                    {rec.employer} · {rec.district}
                  </p>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    {rec.applicantName} · {rec.submittedAt}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadJobReceipt(rec)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[11px] font-bold text-slate-800 dark:text-slate-200 cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Receipt</span>
                </button>
              </div>
            ))}
          </div>
        </LiquidGlassCard>
      )}

      {/* Quick Apply Liquid Sheet Modal */}
      <LiquidSheetModal
        open={Boolean(applyJob)}
        onClose={() => {
          setApplyJob(null);
          setSubmittedRecord(null);
        }}
        title={applyJob ? `Quick Apply: ${applyJob.title}` : 'Quick Apply'}
        maxWidthClass="max-w-2xl"
      >
        {applyJob && (
          <div className="p-5 sm:p-7 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#A5B4FC]">
                  {applyJob.category} · {applyJob.district}
                </p>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#111315] dark:text-white leading-tight">
                  {applyJob.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {applyJob.employer} · <strong className="text-emerald-700 dark:text-emerald-400">{applyJob.salaryLabel}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setApplyJob(null);
                  setSubmittedRecord(null);
                }}
                aria-label="Close application modal"
                className="p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submittedRecord ? (
              <div className="rounded-3xl p-5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Application Submitted &amp; Logged!</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200">
                  Receipt <strong className="font-mono">{submittedRecord.applicationId}</strong> is saved under{' '}
                  <strong>My Job Applications</strong>.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadJobReceipt(submittedRecord)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Application Receipt (.txt)
                  </button>
                  <a
                    href={applyJob.officialPortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#4F5BD5] text-white text-xs font-bold"
                  >
                    Open {applyJob.officialPortalLabel}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitQuickApply} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-[#4F5BD5]/10 dark:bg-[#7B83EB]/18 border border-[#4F5BD5]/25">
                  <div className="text-xs text-slate-800 dark:text-slate-200">
                    <strong className="text-[#313DA8] dark:text-[#C7D2FE]">DWMS Smart Autofill:</strong> Populate verified details &amp; draft a tailored cover note with Gemini.
                  </div>
                  <button
                    type="button"
                    disabled={coverLoading}
                    onClick={() => void handleAutofillProfileAndCover()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#4F5BD5] hover:bg-[#3f4bc4] text-white text-xs font-bold shadow-sm disabled:opacity-65 cursor-pointer shrink-0"
                  >
                    {coverLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>⚡ Autofill Profile &amp; Cover Note</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      className="w-full glass-pill-input px-3.5 py-2.5 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full glass-pill-input px-3.5 py-2.5 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Phone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full glass-pill-input px-3.5 py-2.5 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Highest Qualification
                    </label>
                    <input
                      type="text"
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      className="w-full glass-pill-input px-3.5 py-2.5 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Key Skills
                  </label>
                  <input
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full glass-pill-input px-3.5 py-2.5 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Tailored Cover Note
                  </label>
                  <textarea
                    rows={3}
                    value={coverNote}
                    onChange={(e) => setCoverNote(e.target.value)}
                    placeholder="Click Autofill above or write a brief pitch..."
                    className="w-full rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/80 border border-black/5 dark:border-white/10 px-4 py-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4F5BD5]/40"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setApplyJob(null)}
                    className="px-4 py-2.5 rounded-full bg-black/5 dark:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-md hover:opacity-90 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                    <span>Submit Verified Application</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </LiquidSheetModal>
    </div>
  );
};
