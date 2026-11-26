import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Bus,
  Calendar,
  Camera,
  ChevronDown,
  Download,
  FileCheck2,
  GraduationCap,
  MapPin,
  PartyPopper,
  QrCode,
  RotateCcw,
  Store,
  Tag,
  Ticket,
  Utensils,
  Wallet,
} from 'lucide-react';
import { KERALA_DISTRICTS } from '../data/keralaMapData';
import {
  EDUCATION_DIRECTORY,
  EDUCATION_LEVELS,
  EDUCATION_STREAMS,
  LIFESTYLE_CATEGORIES,
  LIFESTYLE_DIRECTORY,
  LOCAL_FEEDER_ROUTES,
  LOCAL_TRANSPORT_MODES,
  getEducationPortalMeta,
  type AdmissionApplicationRecord,
  type EducationEntry,
  type EducationLevel,
  type EducationStream,
  type EventPlanData,
  type ExpenseCategory,
  type ExpenseEntry,
  type FoodDeliveryStage,
  type JobApplicationRecord,
  type LifestyleCategory,
  type LocalFeederRoute,
  type LocalLifeSection,
  type LocalTransportMode,
  type OnSpotFoodOrder,
  type StudyPlanData,
  type WeekendItineraryData,
  type WeekendStopItem,
} from '../data/localLifeData';
import { LiquidGlassCard, LiquidSegmentedTabs } from './LiquidGlassCard';
import type { SpotGalleryRequest } from './SpotPictureLibraryDrawer';
import { EducationPortalModal } from './local-life/EducationPortalModal';
import { StudyPlanBuilder } from './local-life/StudyPlanBuilder';
import { LifestyleMapsAndFoodPanel } from './local-life/LifestyleMapsAndFoodPanel';
import { WeekendPlannerPanel } from './local-life/WeekendPlannerPanel';
import { ExpenseTrackerPanel } from './local-life/ExpenseTrackerPanel';
import { JobsPortalPanel } from './local-life/JobsPortalPanel';
import { EventManagementAIPanel } from './local-life/EventManagementAIPanel';

interface LocalLifeHubViewProps {
  section: LocalLifeSection;
  districtId: string;
  bookedCount: number;
  studyPlan: StudyPlanData | null;
  admissionApplications: AdmissionApplicationRecord[];
  jobApplications: JobApplicationRecord[];
  weekendItinerary: WeekendItineraryData | null;
  eventPlan: EventPlanData | null;
  foodOrders: OnSpotFoodOrder[];
  expenses: ExpenseEntry[];
  budgetGoalInr: number;
  onSectionChange: (section: LocalLifeSection) => void;
  onDistrictChange: (districtId: string) => void;
  onBookFeederPass: (route: LocalFeederRoute) => void;
  onOpenBookedTickets: () => void;
  onOpenSpotGallery: (spot: SpotGalleryRequest) => void;
  onStudyPlanChange: (next: StudyPlanData) => void;
  onSubmitAdmission: (record: AdmissionApplicationRecord) => void;
  onSubmitJobApplication: (record: JobApplicationRecord) => void;
  onWeekendItineraryChange: (next: WeekendItineraryData) => void;
  onEventPlanChange: (next: EventPlanData) => void;
  onPlaceFoodOrder: (order: OnSpotFoodOrder) => void;
  onAdvanceFoodOrderStage: (orderId: string, nextStage: FoodDeliveryStage) => void;
  onAddExpense: (entry: Omit<ExpenseEntry, 'id' | 'date'>) => void;
  onDeleteExpense: (id: string) => void;
  onBudgetGoalChange: (next: number) => void;
}

export function LocalLifeHubView({
  section,
  districtId,
  bookedCount,
  studyPlan,
  admissionApplications,
  jobApplications,
  weekendItinerary,
  eventPlan,
  foodOrders,
  expenses,
  budgetGoalInr,
  onSectionChange,
  onDistrictChange,
  onBookFeederPass,
  onOpenBookedTickets,
  onOpenSpotGallery,
  onStudyPlanChange,
  onSubmitAdmission,
  onSubmitJobApplication,
  onWeekendItineraryChange,
  onEventPlanChange,
  onPlaceFoodOrder,
  onAdvanceFoodOrderStage,
  onAddExpense,
  onDeleteExpense,
  onBudgetGoalChange,
}: LocalLifeHubViewProps) {
  const [eduLevel, setEduLevel] = useState<EducationLevel>('All Levels');
  const [eduStream, setEduStream] = useState<EducationStream>('All Streams');
  const [lifestyleCategory, setLifestyleCategory] = useState<LifestyleCategory>('All Categories');
  const [transportMode, setTransportMode] = useState<LocalTransportMode>('All Modes');

  const [selectedInstitution, setSelectedInstitution] = useState<EducationEntry | null>(null);
  const [activeMapTarget, setActiveMapTarget] = useState<{ name: string; district: string }>({
    name: 'Aranmula Heritage Village',
    district: 'Pathanamthitta',
  });

  const selectedDistrictObj = useMemo(
    () => KERALA_DISTRICTS.find((d) => d.id === districtId) ?? null,
    [districtId]
  );
  const districtLabel = selectedDistrictObj?.name ?? 'All Kerala Districts';
  const activeDistrictName = selectedDistrictObj?.name ?? 'Pathanamthitta';

  const filteredEducation = useMemo(() => {
    const exact = EDUCATION_DIRECTORY.filter((item) => {
      const districtOk = districtId === 'all' || item.districtId === districtId;
      const levelOk = eduLevel === 'All Levels' || item.level === eduLevel;
      const streamOk = eduStream === 'All Streams' || item.stream === eduStream;
      return districtOk && levelOk && streamOk;
    });
    if (exact.length > 0) return exact;
    return EDUCATION_DIRECTORY.filter(
      (item) =>
        (eduLevel === 'All Levels' || item.level === eduLevel) &&
        (eduStream === 'All Streams' || item.stream === eduStream)
    );
  }, [districtId, eduLevel, eduStream]);

  const filteredLifestyle = useMemo(() => {
    const exact = LIFESTYLE_DIRECTORY.filter((item) => {
      const districtOk = districtId === 'all' || item.districtId === districtId;
      const catOk =
        lifestyleCategory === 'All Categories' || item.category === lifestyleCategory;
      return districtOk && catOk;
    });
    if (exact.length > 0) return exact;
    return LIFESTYLE_DIRECTORY.filter(
      (item) => lifestyleCategory === 'All Categories' || item.category === lifestyleCategory
    );
  }, [districtId, lifestyleCategory]);

  const filteredRoutes = useMemo(() => {
    const exact = LOCAL_FEEDER_ROUTES.filter((item) => {
      const districtOk = districtId === 'all' || item.districtId === districtId;
      const modeOk = transportMode === 'All Modes' || item.mode === transportMode;
      return districtOk && modeOk;
    });
    if (exact.length > 0) return exact;
    return LOCAL_FEEDER_ROUTES.filter(
      (item) => transportMode === 'All Modes' || item.mode === transportMode
    );
  }, [districtId, transportMode]);

  const handleResetFilters = () => {
    onDistrictChange('pathanamthitta');
    setEduLevel('All Levels');
    setEduStream('All Streams');
    setLifestyleCategory('All Categories');
    setTransportMode('All Modes');
    setActiveMapTarget({ name: 'Aranmula Heritage Village', district: 'Pathanamthitta' });
  };

  const handleAddSpotToWeekend = (item: {
    title: string;
    location: string;
    estimatedCostInr: number;
    category: ExpenseCategory;
  }) => {
    const newStop: WeekendStopItem = {
      id: `wk-spot-${Date.now()}`,
      time: '04:00 PM',
      title: item.title,
      location: item.location,
      estimatedCostInr: item.estimatedCostInr,
      category: item.category,
      tip: 'Added directly from Kerala Food & Lifestyle Explorer.',
      done: false,
    };

    if (weekendItinerary) {
      onWeekendItineraryChange({
        ...weekendItinerary,
        saturday: [...weekendItinerary.saturday, newStop],
      });
    } else {
      onWeekendItineraryChange({
        id: `wk-${Date.now()}`,
        districtName: activeDistrictName,
        duration: 'Full Weekend (Sat–Sun)',
        vibe: 'Chill Cafes & Scenic Drives',
        groupSize: 2,
        budgetInr: 3000,
        headline: `${activeDistrictName} Custom Culinary & Lifestyle Weekend`,
        saturday: [newStop],
        sunday: [],
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleImportWeekendCosts = (items: WeekendStopItem[], distName: string) => {
    for (const stop of items) {
      if (stop.estimatedCostInr > 0) {
        onAddExpense({
          title: `${stop.title} (${distName})`,
          category: stop.category,
          amountInr: stop.estimatedCostInr,
          source: 'Weekend Plan',
          note: `${stop.time} · ${stop.location}`,
        });
      }
    }
  };

  const handleDownloadAdmissionReceipt = (rec: AdmissionApplicationRecord) => {
    const content = [
      'CIVICTRIAGE LSG · KERALA ADMISSION APPLICATION RECEIPT',
      `Receipt ID: ${rec.receiptId} | Status: ${rec.status}`,
      `Institution: ${rec.institutionName} (${rec.districtName})`,
      `Applicant: ${rec.applicantName} | ${rec.email} | ${rec.phone}`,
      `Stream: ${rec.stream} | Qualification: ${rec.qualification}`,
      `Submitted: ${rec.submittedAt}`,
      '',
      'Statement of Purpose:',
      rec.sopText,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rec.receiptId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10" data-testid="local-life-hub-view">
      {/* Top Liquid Glass Header */}
      <LiquidGlassCard interactive={false} strong className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#A5B4FC]">
              <Store className="w-3.5 h-3.5" />
              <span>Regional Community &amp; Lifestyle OS · Kerala</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111315] dark:text-white">
              Local Life Hub — {districtLabel}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              AI Study Planner &amp; 1-Click Admission Autofill, Google Maps Food &amp; Heritage Explorer, Interactive Weekend Planner, Live Expense Tracker, and CNGR/TRVL last-mile feeders.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenBookedTickets}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#EFECE8]/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 border border-black/5 dark:border-white/10 text-xs font-bold text-[#111315] dark:text-white transition-all cursor-pointer shrink-0"
          >
            <Ticket className="w-4 h-4 text-[#4F5BD5] dark:text-[#A5B4FC]" />
            <span>My Feeder &amp; Travel Passes</span>
            <span className="px-2 py-0.5 rounded-full bg-[#4F5BD5] text-white font-mono text-[10px]">
              {bookedCount}
            </span>
          </button>
        </div>

        {/* iOS Segmented 7-Way Module Tabs with periwinkle glass spring pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <LiquidSegmentedTabs<LocalLifeSection>
            layoutId="local-life-nav-pill"
            ariaLabel="Local Life Hub sections"
            value={section}
            onChange={onSectionChange}
            options={[
              {
                id: 'education',
                label: 'Education',
                icon: <GraduationCap className="w-3.5 h-3.5" />,
                badge: admissionApplications.length || undefined,
              },
              {
                id: 'jobs',
                label: 'Jobs & Careers',
                icon: <Briefcase className="w-3.5 h-3.5" />,
                badge: jobApplications.length || undefined,
              },
              {
                id: 'lifestyle',
                label: 'Lifestyle & Food',
                icon: <Utensils className="w-3.5 h-3.5" />,
              },
              {
                id: 'weekend',
                label: 'Weekend AI',
                icon: <Calendar className="w-3.5 h-3.5" />,
              },
              {
                id: 'events',
                label: 'Event AI & Food',
                icon: <PartyPopper className="w-3.5 h-3.5" />,
                badge: foodOrders.length || undefined,
              },
              {
                id: 'expenses',
                label: 'Expenses',
                icon: <Wallet className="w-3.5 h-3.5" />,
                badge: expenses.length || undefined,
              },
              {
                id: 'transport',
                label: 'Local Transport',
                icon: <Bus className="w-3.5 h-3.5" />,
              },
            ]}
          />

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                aria-label="Filter Local Life Hub by Kerala District"
                value={districtId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  onDistrictChange(nextId);
                  const d = KERALA_DISTRICTS.find((x) => x.id === nextId);
                  if (d) {
                    setActiveMapTarget({ name: `${d.name} Town Center`, district: d.name });
                  }
                }}
                className="appearance-none glass-pill-input rounded-full pl-3.5 pr-9 py-2 text-xs font-bold cursor-pointer"
              >
                <option value="all">All 14 Kerala Districts</option>
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset Filters"
              className="p-2 rounded-full bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-white/80 dark:border-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </LiquidGlassCard>

      {/* SECTION 1: INTERACTIVE EDUCATION HUB */}
      {section === 'education' && (
        <div className="space-y-6">
          {/* Live AI Study Plan Generator */}
          <StudyPlanBuilder
            districtName={activeDistrictName}
            studyPlan={studyPlan}
            onStudyPlanChange={onStudyPlanChange}
          />

          {/* My Submitted Admission Applications */}
          {admissionApplications.length > 0 && (
            <LiquidGlassCard interactive={false} className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-[#111315] dark:text-white flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  My Applications &amp; Autofilled Receipts ({admissionApplications.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {admissionApplications.map((app) => (
                  <div
                    key={app.receiptId}
                    className="p-3.5 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/75 border border-black/5 dark:border-white/10 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {app.receiptId} · {app.status}
                      </span>
                      <h3 className="text-xs font-extrabold text-[#111315] dark:text-white truncate">
                        {app.institutionName}
                      </h3>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                        {app.applicantName} · {app.stream}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Submitted {app.submittedAt}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadAdmissionReceipt(app)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-[10.5px] font-bold shrink-0 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      Receipt
                    </button>
                  </div>
                ))}
              </div>
            </LiquidGlassCard>
          )}

          {/* Filter Strip for Colleges, Schools & Bootcamps */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-[#111315] dark:text-white">
              Click Any Campus or Scholarship to Open Admission Portal &amp; Photos
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter academic level"
                value={eduLevel}
                onChange={(e) => setEduLevel(e.target.value as EducationLevel)}
                className="glass-pill-input rounded-full px-3.5 py-2 text-xs font-semibold cursor-pointer"
              >
                {EDUCATION_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter academic stream"
                value={eduStream}
                onChange={(e) => setEduStream(e.target.value as EducationStream)}
                className="glass-pill-input rounded-full px-3.5 py-2 text-xs font-semibold cursor-pointer"
              >
                {EDUCATION_STREAMS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clickable Spring-Loaded Education Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEducation.map((item, idx) => (
              <LiquidGlassCard
                key={item.id}
                delay={idx * 0.04}
                onClick={() => setSelectedInstitution(item)}
                className="p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#4F5BD5]/12 text-[#4F5BD5] dark:text-[#A5B4FC] text-[10px] font-bold">
                      {item.level}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                      {item.districtName}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-[#111315] dark:text-white">
                      {item.name}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.location} · {item.affiliation}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.highlights}
                  </p>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-black/5 dark:border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFECE8] dark:bg-slate-800 text-[10.5px] font-semibold text-slate-700 dark:text-slate-200">
                      <Tag className="w-2.5 h-2.5 text-[#4F5BD5]" />
                      {item.stream}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const meta = getEducationPortalMeta(item);
                        onOpenSpotGallery({
                          name: meta.wikiQuery,
                          region: `${item.districtName}, Kerala`,
                          subtitle: `${item.name} · ${item.location}`,
                          description: item.highlights,
                          badge: item.level,
                          googleMapsQuery: `${item.name}, ${item.districtName}, Kerala`,
                          lat: meta.lat,
                          lon: meta.lon,
                        });
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4F5BD5] dark:text-[#A5B4FC] hover:underline cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Photos
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                      {item.deadlineOrIntake}
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-[11px] font-bold shrink-0">
                      Apply / Details
                    </span>
                  </div>
                </div>
              </LiquidGlassCard>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: JOBS & CAREER OPPORTUNITIES PORTAL */}
      {section === 'jobs' && (
        <JobsPortalPanel
          districtName={activeDistrictName}
          jobApplications={jobApplications}
          onSubmitJobApplication={onSubmitJobApplication}
        />
      )}

      {/* SECTION 3: LIFESTYLE, GOOGLE MAPS & FOOD SPOTS */}
      {section === 'lifestyle' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#4F5BD5]" />
              Tap any Food or Heritage card to pin it live on the embedded Google Map
            </span>
            <select
              aria-label="Filter lifestyle category"
              value={lifestyleCategory}
              onChange={(e) => setLifestyleCategory(e.target.value as LifestyleCategory)}
              className="glass-pill-input rounded-full px-3.5 py-2 text-xs font-semibold cursor-pointer"
            >
              {LIFESTYLE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <LifestyleMapsAndFoodPanel
            districtId={districtId}
            districtName={activeDistrictName}
            lifestyleSpots={filteredLifestyle}
            activeMapTarget={activeMapTarget}
            onSelectMapTarget={setActiveMapTarget}
            onOpenSpotGallery={onOpenSpotGallery}
            onAddToWeekendPlan={handleAddSpotToWeekend}
            onLogExpense={(item) =>
              onAddExpense({
                title: item.title,
                category: item.category,
                amountInr: item.amountInr,
                source: 'Manual',
                note: item.note,
              })
            }
          />
        </div>
      )}

      {/* SECTION 4: INTERACTIVE AI WEEKEND PLANNER */}
      {section === 'weekend' && (
        <WeekendPlannerPanel
          districtName={activeDistrictName}
          itinerary={weekendItinerary}
          onItineraryChange={onWeekendItineraryChange}
          onPinStopOnMap={setActiveMapTarget}
          onOpenSpotGallery={onOpenSpotGallery}
          onImportCostsToExpenses={handleImportWeekendCosts}
        />
      )}

      {/* SECTION 5: EVENT MANAGEMENT AI & ON-SPOT FOOD DELIVERY */}
      {section === 'events' && (
        <EventManagementAIPanel
          districtName={activeDistrictName}
          eventPlan={eventPlan}
          foodOrders={foodOrders}
          onEventPlanChange={onEventPlanChange}
          onPlaceFoodOrder={onPlaceFoodOrder}
          onAdvanceFoodOrderStage={onAdvanceFoodOrderStage}
        />
      )}

      {/* SECTION 4: EXPENSE PLANNER & LIVE BUDGET TRACKER */}
      {section === 'expenses' && (
        <ExpenseTrackerPanel
          expenses={expenses}
          budgetGoalInr={budgetGoalInr}
          onBudgetGoalChange={onBudgetGoalChange}
          onAddExpense={onAddExpense}
          onDeleteExpense={onDeleteExpense}
        />
      )}

      {/* SECTION 5: LOCAL TRANSPORT & LAST-MILE FEEDERS */}
      {section === 'transport' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-[#111315] dark:text-white">
              KSRTC, Stage Carriage, CNGR/TRVL Rail Feeders &amp; EV Auto Stands
            </h2>
            <select
              aria-label="Filter transport mode"
              value={transportMode}
              onChange={(e) => setTransportMode(e.target.value as LocalTransportMode)}
              className="glass-pill-input rounded-full px-3.5 py-2 text-xs font-semibold cursor-pointer"
            >
              {LOCAL_TRANSPORT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {filteredRoutes.map((route, idx) => (
              <LiquidGlassCard key={route.id} delay={idx * 0.04} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#4F5BD5]/12 text-[#4F5BD5] dark:text-[#A5B4FC] text-[10.5px] font-bold">
                        {route.mode}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                        {route.districtName}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                        {route.operator}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-[#111315] dark:text-white">
                      {route.routeName}
                    </h3>

                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                      <span>{route.fromStop}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span>{route.toStop}</span>
                    </p>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      <strong className="text-slate-800 dark:text-white">Frequency:</strong>{' '}
                      {route.frequency} ·{' '}
                      <strong className="text-slate-800 dark:text-white">Hours:</strong>{' '}
                      {route.firstLastService}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {route.note}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/10">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
                        Feeder Fare
                      </span>
                      <span className="text-xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
                        ₹{route.fareInr}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onBookFeederPass(route)}
                      data-testid={`book-feeder-pass-${route.id}`}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#111315] dark:bg-white hover:opacity-90 text-white dark:text-slate-950 text-xs font-bold shadow-md transition-all cursor-pointer whitespace-nowrap"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#A5B4FC] dark:text-[#4F5BD5]" />
                      <span>Book Feeder Pass (UPI)</span>
                    </button>
                  </div>
                </div>
              </LiquidGlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Campus & Admission Autofill Portal Modal */}
      <EducationPortalModal
        institution={selectedInstitution}
        onClose={() => setSelectedInstitution(null)}
        onSubmitApplication={onSubmitAdmission}
        onOpenPictureLibrary={(inst) => {
          const meta = getEducationPortalMeta(inst);
          onOpenSpotGallery({
            name: meta.wikiQuery,
            region: `${inst.districtName}, Kerala`,
            subtitle: `${inst.name} · ${inst.location}`,
            description: inst.highlights,
            badge: inst.level,
            googleMapsQuery: `${inst.name}, ${inst.districtName}, Kerala`,
            lat: meta.lat,
            lon: meta.lon,
          });
        }}
      />
    </div>
  );
}
