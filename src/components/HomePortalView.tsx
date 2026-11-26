import {
  ArrowRight,
  Bus,
  Calendar,
  ClipboardCheck,
  Compass,
  FilePlus2,
  Globe2,
  GraduationCap,
  HeartPulse,
  Plane,
  ShieldAlert,
  Sparkles,
  Store,
  Ticket,
  Utensils,
} from 'lucide-react';
import type { WorkspaceTab } from './SidebarNav';
import type { LocalLifeSection } from '../data/localLifeData';
import type { QueueMetrics } from '../shared/triageSchema';
import { EmergencyHelplineStrip } from './EmergencyHelplineStrip';
import { LiquidGlassCard } from './LiquidGlassCard';

interface HomePortalViewProps {
  metrics: QueueMetrics;
  activePoliceCount: number;
  bookedTicketsCount: number;
  onNavigateTab: (tab: WorkspaceTab) => void;
  onNavigateLocalLife: (section: LocalLifeSection) => void;
  onOpenQuickDestination: (countryIso: string, stateId: string, cityId: string) => void;
  onLoadDemoData: () => void;
  demoLoaded: boolean;
}

export function HomePortalView({
  metrics,
  activePoliceCount,
  bookedTicketsCount,
  onNavigateTab,
  onNavigateLocalLife,
  onOpenQuickDestination,
  onLoadDemoData,
  demoLoaded,
}: HomePortalViewProps) {
  return (
    <div className="space-y-6 pb-8">
      {/* Sunlit iOS Liquid Glass Hero Card */}
      <LiquidGlassCard interactive={false} strong className="rounded-[32px] p-6 sm:p-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-20 w-80 h-80 rounded-full bg-[#7B83EB]/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-[#67E8F9]/25 blur-3xl"
        />

        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/85 dark:bg-slate-900/80 border border-black/5 dark:border-white/10 shadow-xs text-xs font-semibold text-[#111315] dark:text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Kerala &amp; Pan-India Smart Portal · Live</span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-[#4F5BD5] dark:text-[#A5B4FC] font-bold">
                195 Countries + 36 States 3D Relief
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-[#111315] dark:text-white leading-[1.1]">
              One spatial hub for civic care, 3D India &amp; world travel, and everyday life.
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              File multimodal K-SMART infrastructure reports or Kerala Police e-petitions, explore 3D Earth &amp; Pan-India topographic relief maps with multi-airline seat cabins, or run AI study plans, food discovery, and live expense budgets.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => onNavigateTab('travel')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#111315] dark:bg-white hover:opacity-90 text-white dark:text-slate-950 text-sm font-semibold shadow-md shadow-black/15 transition-all cursor-pointer"
              >
                <Globe2 className="w-4 h-4 text-[#A5B4FC] dark:text-[#4F5BD5]" />
                <span>Launch 3D Earth &amp; India Atlas</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('intake')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#EFECE8]/90 dark:bg-slate-800/85 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 text-[#111315] dark:text-white text-sm font-semibold transition-all cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4 text-[#4F5BD5] dark:text-[#A5B4FC]" />
                <span>Report Civic Hazard</span>
              </button>

              {!demoLoaded && (
                <button
                  type="button"
                  onClick={onLoadDemoData}
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full bg-white/80 dark:bg-slate-900/75 hover:bg-white dark:hover:bg-slate-800 border border-[#4F5BD5]/25 text-[#4F5BD5] dark:text-[#A5B4FC] text-xs font-bold transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load Full Demo Scenario</span>
                </button>
              )}
            </div>
          </div>

          {/* Live Session Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 shrink-0 lg:w-72">
            <div className="rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/75 border border-white/80 dark:border-white/10 px-4 py-3">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Civic Tickets
              </p>
              <p className="text-2xl font-extrabold text-[#111315] dark:text-white tabular-nums mt-0.5">
                {metrics.total}
              </p>
              <p className="text-[11px] font-medium text-[#4F5BD5] dark:text-[#A5B4FC]">
                {metrics.criticalAndHigh} critical / high
              </p>
            </div>
            <div className="rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/75 border border-white/80 dark:border-white/10 px-4 py-3">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Police GD Desk
              </p>
              <p className="text-2xl font-extrabold text-[#111315] dark:text-white tabular-nums mt-0.5">
                {activePoliceCount}
              </p>
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                THUNA &amp; SHO sync
              </p>
            </div>
            <div className="rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/75 border border-white/80 dark:border-white/10 px-4 py-3">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Booked PNRs
              </p>
              <p className="text-2xl font-extrabold text-[#111315] dark:text-white tabular-nums mt-0.5">
                {bookedTicketsCount}
              </p>
              <p className="text-[11px] font-medium text-[#4F5BD5] dark:text-[#A5B4FC]">
                QR E-Tickets ready
              </p>
            </div>
            <div className="rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/75 border border-white/80 dark:border-white/10 px-4 py-3">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                3D Atlas
              </p>
              <p className="text-2xl font-extrabold text-[#111315] dark:text-white tabular-nums mt-0.5">
                195+36
              </p>
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                World &amp; India Relief
              </p>
            </div>
          </div>
        </div>
      </LiquidGlassCard>

      {/* 3-Way Primary Navigation Hub — Spring-Loaded Liquid Glass Tiles */}
      <section
        aria-label="Three Primary Navigation Pathways"
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
      >
        {/* Pathway 1 — Report & Safety Desk */}
        <LiquidGlassCard delay={0.04} className="p-6">
          <div className="flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="w-12 h-12 rounded-2xl bg-[#EFECE8] dark:bg-slate-800 text-[#111315] dark:text-white flex items-center justify-center border border-black/5 dark:border-white/10">
                  <ShieldAlert className="w-6 h-6 text-[#4F5BD5] dark:text-[#A5B4FC]" />
                </span>
                <span className="px-3 py-1 rounded-full bg-[#4F5BD5]/12 text-[#4F5BD5] dark:text-[#A5B4FC] text-[11px] font-bold">
                  Pathway 01 · Civic &amp; Police
                </span>
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-[#111315] dark:text-white">
                  Report &amp; Safety Desk
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  AI photo triage for roads, KSEB wires &amp; drainage, duplicate citizen corroboration, Before/After repair checks, and Kerala Police THUNA e-petitions.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigateTab('intake')}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FilePlus2 className="w-3.5 h-3.5 text-[#4F5BD5]" />
                    Civic Infrastructure Triage
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('police')}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    Police e-Complaint / GD Logging
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('queue')}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Officer / SHO Command Queue ({metrics.total})
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-black/5 dark:border-white/10">
              <button
                type="button"
                onClick={() => onNavigateTab('intake')}
                data-testid="portal-explore-safety"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#111315] dark:bg-white hover:opacity-90 text-white dark:text-slate-950 text-sm font-semibold shadow-md transition-all cursor-pointer"
              >
                <span>Explore</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </LiquidGlassCard>

        {/* Pathway 2 — Global 3D Travel & Bookings */}
        <LiquidGlassCard delay={0.1} className="p-6">
          <div className="flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="w-12 h-12 rounded-2xl bg-[#EFECE8] dark:bg-slate-800 text-[#111315] dark:text-white flex items-center justify-center border border-black/5 dark:border-white/10">
                  <Globe2 className="w-6 h-6 text-[#4F5BD5] dark:text-[#A5B4FC]" />
                </span>
                <span className="px-3 py-1 rounded-full bg-[#4F5BD5]/12 text-[#4F5BD5] dark:text-[#A5B4FC] text-[11px] font-bold">
                  Pathway 02 · Global &amp; India 3D
                </span>
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-[#111315] dark:text-white">
                  Global 3D Travel &amp; Bookings
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  Explore a 3D Blue Marble Earth, Whole India Topographic Relief &amp; State Cutout Maps, compare Emirates, IndiGo &amp; IRCTC fares, and inspect live Wikimedia photos.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenQuickDestination('784', 'ae-du', 'dubai')}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Plane className="w-3.5 h-3.5 text-[#4F5BD5]" />
                    Pathanamthitta → Dubai (COK–DXB · Emirates)
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenQuickDestination('826', 'uk-eng', 'london')}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-sky-500" />
                    Pathanamthitta → London Heathrow (LHR)
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('travel')}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Ticket className="w-3.5 h-3.5 text-emerald-500" />
                    3D Seat Cabins &amp; Booked PNRs ({bookedTicketsCount})
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-black/5 dark:border-white/10">
              <button
                type="button"
                onClick={() => onNavigateTab('travel')}
                data-testid="portal-explore-travel"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#111315] dark:bg-white hover:opacity-90 text-white dark:text-slate-950 text-sm font-semibold shadow-md transition-all cursor-pointer"
              >
                <span>Explore</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </LiquidGlassCard>

        {/* Pathway 3 — Local Life Hub */}
        <LiquidGlassCard delay={0.16} className="p-6">
          <div className="flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="w-12 h-12 rounded-2xl bg-[#EFECE8] dark:bg-slate-800 text-[#111315] dark:text-white flex items-center justify-center border border-black/5 dark:border-white/10">
                  <Store className="w-6 h-6 text-[#4F5BD5] dark:text-[#A5B4FC]" />
                </span>
                <span className="px-3 py-1 rounded-full bg-[#4F5BD5]/12 text-[#4F5BD5] dark:text-[#A5B4FC] text-[11px] font-bold">
                  Pathway 03 · Local Life OS
                </span>
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-[#111315] dark:text-white">
                  Local Life Hub
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  Interactive Education Study Planner &amp; 1-Click Admission Autofill, Google Maps Food &amp; Heritage Explorer, AI Weekend Planner, Expense Tracker &amp; Feeder Buses.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigateLocalLife('healthcare')}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                    Hospitals, Doctors &amp; Instant QR OP Booking
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateLocalLife('education')}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-[#4F5BD5]" />
                    Education, Study Planner &amp; Admission Autofill
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateLocalLife('lifestyle')}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Utensils className="w-3.5 h-3.5 text-amber-500" />
                    Google Maps, Food Spots &amp; Heritage
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateLocalLife('weekend')}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#EFECE8]/85 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                    Weekend Planner, Expenses &amp; Local Feeders
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-black/5 dark:border-white/10">
              <button
                type="button"
                onClick={() => onNavigateLocalLife('education')}
                data-testid="portal-explore-local-life"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#111315] dark:bg-white hover:opacity-90 text-white dark:text-slate-950 text-sm font-semibold shadow-md transition-all cursor-pointer"
              >
                <span>Explore</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </LiquidGlassCard>
      </section>

      {/* Emergency Helplines Footer Strip */}
      <EmergencyHelplineStrip />
    </div>
  );
}
