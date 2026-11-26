import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Sparkles,
  Target,
} from 'lucide-react';
import { LiquidGlassCard } from '../LiquidGlassCard';
import {
  STUDY_TARGET_EXAMS,
  type StudyPlanData,
  type StudyTargetExam,
} from '../../data/localLifeData';
import { readAiCache, writeAiCache } from '../../utils/aiResponseCache';

interface StudyPlanBuilderProps {
  districtName: string;
  studyPlan: StudyPlanData | null;
  onStudyPlanChange: (next: StudyPlanData) => void;
}

export const StudyPlanBuilder: React.FC<StudyPlanBuilderProps> = ({
  districtName,
  studyPlan,
  onStudyPlanChange,
}) => {
  const [targetExam, setTargetExam] = useState<StudyTargetExam>(
    studyPlan?.targetExam ?? 'KEAM / JEE Engineering'
  );
  const [dailyHours, setDailyHours] = useState<number>(studyPlan?.dailyHours ?? 4);
  const [targetDate, setTargetDate] = useState<string>(studyPlan?.targetDate ?? '2027-04-20');
  const [loading, setLoading] = useState(false);

  const progress = useMemo(() => {
    if (!studyPlan) return { done: 0, total: 0, pct: 0 };
    let done = 0;
    let total = 0;
    for (const day of studyPlan.days) {
      for (const t of day.tasks) {
        total++;
        if (t.done) done++;
      }
    }
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [studyPlan]);

  const handleGeneratePlan = async () => {
    const cacheKey = `study_plan::${targetExam}::${dailyHours}::${targetDate}::${districtName}`;
    const cached = readAiCache<StudyPlanData>(cacheKey);
    if (cached) {
      onStudyPlanChange(cached);
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/local-life-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'study_plan',
          districtName,
          targetExam,
          dailyHours,
          targetDate,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (data && Array.isArray(data.days)) {
        const plan: StudyPlanData = {
          id: `sp-${Date.now()}`,
          targetExam,
          dailyHours,
          targetDate,
          milestoneSummary:
            typeof data.milestoneSummary === 'string'
              ? data.milestoneSummary
              : `Structured 7-day plan for ${targetExam}`,
          subjectWeights: Array.isArray(data.subjectWeights)
            ? data.subjectWeights
            : [
                { subject: 'Core Theory', percent: 40, color: '#4F5BD5' },
                { subject: 'Timed Practice', percent: 35, color: '#0ea5e9' },
                { subject: 'Revision & Mocks', percent: 25, color: '#10b981' },
              ],
          days: data.days.map((d: any, idx: number) => ({
            day: String(d.day || `Day ${idx + 1}`),
            focusTheme: String(d.focusTheme || 'Focused Mastery'),
            tasks: Array.isArray(d.tasks)
              ? d.tasks.map((t: any, tIdx: number) => ({
                  id: String(t.id || `d${idx}-t${tIdx}`),
                  title: String(t.title || 'Focused study block'),
                  durationMins: Number(t.durationMins) || 45,
                  subject: String(t.subject || 'Core'),
                  done: Boolean(t.done),
                }))
              : [],
          })),
          createdAt: new Date().toISOString(),
        };
        writeAiCache(cacheKey, plan);
        onStudyPlanChange(plan);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (dayIdx: number, taskId: string) => {
    if (!studyPlan) return;
    const nextDays = studyPlan.days.map((d, i) =>
      i !== dayIdx
        ? d
        : {
            ...d,
            tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
          }
    );
    onStudyPlanChange({ ...studyPlan, days: nextDays });
  };

  return (
    <LiquidGlassCard interactive={false} strong className="p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#A5B4FC]">
            <Target className="w-3.5 h-3.5" />
            <span>Live AI Study Plan Generator</span>
          </p>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#111315] dark:text-white">
            7-Day Checkable Exam &amp; Skill Roadmap
          </h2>
        </div>

        {studyPlan && (
          <div className="px-3.5 py-2 rounded-2xl bg-[#EFECE8]/90 dark:bg-slate-800/80 border border-black/5 dark:border-white/10 text-right">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
              Completion
            </span>
            <span className="text-sm font-extrabold font-mono text-[#4F5BD5] dark:text-[#A5B4FC] tabular-nums">
              {progress.done}/{progress.total} tasks ({progress.pct}%)
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        <div className="sm:col-span-5 space-y-1">
          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
            Target Exam / Stream
          </label>
          <select
            value={targetExam}
            onChange={(e) => setTargetExam(e.target.value as StudyTargetExam)}
            className="w-full glass-pill-input px-3.5 py-2.5 text-xs font-semibold cursor-pointer"
          >
            {STUDY_TARGET_EXAMS.map((exam) => (
              <option key={exam} value={exam}>
                {exam}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
            Daily Hours
          </label>
          <input
            type="number"
            min={1}
            max={12}
            value={dailyHours}
            onChange={(e) => setDailyHours(Math.max(1, Math.min(12, Number(e.target.value) || 3)))}
            className="w-full glass-pill-input px-3 py-2.5 text-xs font-mono font-bold tabular-nums"
          />
        </div>

        <div className="sm:col-span-3 space-y-1">
          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
            Target Date
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full glass-pill-input px-3 py-2.5 text-xs font-mono font-semibold"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleGeneratePlan()}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#A5B4FC] dark:text-[#4F5BD5]" />
            )}
            <span>Build</span>
          </button>
        </div>
      </div>

      {/* Active Study Plan */}
      {studyPlan && (
        <div className="space-y-4 pt-2 border-t border-black/5 dark:border-white/10">
          {/* Progress Bar + Summary */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                {studyPlan.milestoneSummary}
              </p>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-[#4F5BD5]" />
                Target: {studyPlan.targetDate}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-black/8 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4F5BD5] via-[#7B83EB] to-emerald-500 transition-all duration-500"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>

          {/* Subject Weightage Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {studyPlan.subjectWeights.map((sw) => (
              <div
                key={sw.subject}
                className="p-3 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/75 border border-black/5 dark:border-white/10 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-[#111315] dark:text-white truncate">{sw.subject}</span>
                  <span className="font-mono text-[#4F5BD5] dark:text-[#A5B4FC] tabular-nums">
                    {sw.percent}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-black/8 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${sw.percent}%`, backgroundColor: sw.color || '#4F5BD5' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 7-Day Interactive Task Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {studyPlan.days.map((dayPlan, dayIdx) => (
              <div
                key={dayPlan.day}
                className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-white/80 dark:border-white/10 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-[#111315] dark:text-white">
                    {dayPlan.day}
                  </span>
                  <span className="text-[10px] font-semibold text-[#4F5BD5] dark:text-[#A5B4FC] truncate">
                    {dayPlan.focusTheme}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {dayPlan.tasks.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => toggleTask(dayIdx, task.id)}
                        className={`w-full text-left flex items-start gap-2 p-2 rounded-xl transition-colors cursor-pointer ${
                          task.done
                            ? 'bg-emerald-50/85 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 line-through opacity-80'
                            : 'bg-[#EFECE8]/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {task.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11.5px] font-semibold leading-snug">{task.title}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{task.durationMins} mins</span>
                            <span>·</span>
                            <span>{task.subject}</span>
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </LiquidGlassCard>
  );
};
