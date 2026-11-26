import { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyTicketCorroboration,
  computeQueueMetrics,
  findDuplicateTicketMatch,
  generateTicketId,
  normalizeTriagePayload,
  type EmailAlertStatus,
  type MunicipalDepartment,
  type RepairVerificationRecord,
  type StoredTicket,
  type TicketFilters,
  type TicketWorkflowStatus,
} from './shared/triageSchema';
import {
  generatePoliceCaseRefId,
  getPoliceDistrictById,
  type PoliceCaseStatus,
  type StoredPoliceCase,
} from './shared/policeSchema';
import {
  detectDistrictsFromText,
  evaluateCorridorHazards,
} from './shared/corridorHazardMatcher';
import { buildDemoScenarioBundle } from './shared/demoScenarioData';
import { INITIAL_SEED_TICKETS, type SampleScenario } from './data/sampleScenarios';
import type { PreparedImagePayload } from './utils/imageEncoding';
import {
  initEmailJs,
  sendOfficerAlertEmail,
  sendRepairResolutionEmail,
} from './utils/emailAlert';
import { SidebarNav, type WorkspaceTab } from './components/SidebarNav';
import { TopBar, type GlobalSearchResult } from './components/TopBar';
import { AuthGateModal } from './components/AuthGateModal';
import { HomePortalView } from './components/HomePortalView';
import { LocalLifeHubView } from './components/LocalLifeHubView';
import { TriageIntakeForm } from './components/TriageIntakeForm';
import { TriageResultPanel } from './components/TriageResultPanel';
import { TicketQueueView } from './components/TicketQueueView';
import { RoutingPolicyView } from './components/RoutingPolicyView';
import { EmergencyHelplineStrip } from './components/EmergencyHelplineStrip';
import {
  PoliceSafetyDeskView,
  type PoliceCasePrefill,
} from './components/PoliceSafetyDeskView';
import {
  TravelDistrictGuideView,
  type WorldDestinationRequest,
} from './components/travel/TravelDistrictGuideView';
import type { ExplorerViewMode } from './components/travel/Kerala3DMapScene';
import { UpiPaymentModal } from './components/travel/UpiPaymentModal';
import { AssistantChatbotWidget } from './components/AssistantChatbotWidget';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  SpotPictureLibraryDrawer,
  type SpotGalleryRequest,
} from './components/SpotPictureLibraryDrawer';
import { useThemeMode } from './hooks/useThemeMode';
import { useUserVaultAuth } from './hooks/useUserVaultAuth';
import { DEFAULT_ORIGIN_ID, getRegionById } from './data/keralaMapData';
import type {
  AdmissionApplicationRecord,
  EventPlanData,
  ExpenseEntry,
  FoodDeliveryStage,
  JobApplicationRecord,
  LocalFeederRoute,
  LocalLifeSection,
  OnSpotFoodOrder,
  StudyPlanData,
  WeekendItineraryData,
} from './data/localLifeData';
import type { HospitalAppointmentRecord } from './data/healthcareData';
import {
  getTomorrowIsoDate,
  type BookedETicket,
  type BookingDraft,
} from './shared/bookingSchema';
import type {
  AssistantActionId,
  AssistantChatMessage,
  AssistantSessionContext,
} from './shared/assistantSchema';
import {
  loadUserVaultJson,
  saveUserVaultJson,
  type VaultSectionKey,
} from './shared/authSchema';

function loadUserTickets(userId: string): StoredTicket[] {
  const saved = loadUserVaultJson<StoredTicket[] | null>(userId, 'tickets', null);
  if (Array.isArray(saved)) return saved;
  return userId === 'guest_demo_citizen' ? INITIAL_SEED_TICKETS : [];
}

export default function App() {
  const { theme, toggleTheme } = useThemeMode();
  const {
    activeUser,
    effectiveUser,
    activeUserId,
    authGateOpen,
    authModalMode,
    authBusy,
    authError,
    savedAccounts,
    cloudSyncEnabled,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    continueAsGuest,
    updateProfile,
    signOutUser,
    openAuthModal,
    closeAuthModal,
    setAuthModalMode,
    loadCloudVaultForUser,
    syncVaultSectionToCloud,
  } = useUserVaultAuth();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTravelMode, setActiveTravelMode] = useState<ExplorerViewMode>('globe');
  const [externalTravelMode, setExternalTravelMode] = useState<{
    mode: ExplorerViewMode;
    token: number;
  } | null>(null);

  const hydratedUserIdRef = useRef<string>(activeUserId);

  const [tickets, setTickets] = useState<StoredTicket[]>(() => loadUserTickets(activeUserId));
  const [policeCases, setPoliceCases] = useState<StoredPoliceCase[]>(() =>
    loadUserVaultJson<StoredPoliceCase[]>(activeUserId, 'policeCases', [])
  );
  const [policePrefill, setPolicePrefill] = useState<PoliceCasePrefill | null>(null);
  const [demoLoaded, setDemoLoaded] = useState(false);

  const [queueFilters, setQueueFilters] = useState<TicketFilters>({
    query: '',
    department: 'ALL',
    status: 'ALL',
  });
  const [selectedQueueTicketId, setSelectedQueueTicketId] = useState<string | null>(null);

  // Intake workspace state
  const [image, setImage] = useState<PreparedImagePayload | null>(null);
  const [description, setDescription] = useState('');
  const [localBodyHint, setLocalBodyHint] = useState('');
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);
  const [latestTicketId, setLatestTicketId] = useState<string | null>(null);

  // Lifted Travel & Booked Tickets state so the global AI Assistant & Corridor Matcher stay live
  const [travelOriginId, setTravelOriginId] = useState<string>(
    effectiveUser.homeDistrictId || DEFAULT_ORIGIN_ID
  );
  const [travelDestinationId, setTravelDestinationId] = useState<string | null>(null);
  const [externalWorldDest, setExternalWorldDest] =
    useState<WorldDestinationRequest | null>(null);
  const [bookedTickets, setBookedTickets] = useState<BookedETicket[]>(() =>
    loadUserVaultJson<BookedETicket[]>(activeUserId, 'bookings', [])
  );
  const [myTicketsOpen, setMyTicketsOpen] = useState<boolean>(false);

  // Local Life Hub state + Feeder Pass UPI Modal state
  const [localLifeSection, setLocalLifeSection] = useState<LocalLifeSection>('education');
  const [localLifeDistrictId, setLocalLifeDistrictId] = useState<string>(
    effectiveUser.homeDistrictId || 'pathanamthitta'
  );
  const [feederPaymentDraft, setFeederPaymentDraft] = useState<BookingDraft | null>(null);
  const [feederPaymentFare, setFeederPaymentFare] = useState<number>(0);
  const [feederPaymentOpen, setFeederPaymentOpen] = useState<boolean>(false);

  // Per-user isolated Education, Jobs, Healthcare, Lifestyle, Weekend, Event AI, Expenses & Chat state
  const [studyPlan, setStudyPlan] = useState<StudyPlanData | null>(() =>
    loadUserVaultJson<StudyPlanData | null>(activeUserId, 'studyPlans', null)
  );
  const [admissionApplications, setAdmissionApplications] = useState<
    AdmissionApplicationRecord[]
  >(() => loadUserVaultJson<AdmissionApplicationRecord[]>(activeUserId, 'admissions', []));
  const [jobApplications, setJobApplications] = useState<JobApplicationRecord[]>(() =>
    loadUserVaultJson<JobApplicationRecord[]>(activeUserId, 'jobApps', [])
  );
  const [hospitalBookings, setHospitalBookings] = useState<HospitalAppointmentRecord[]>(() =>
    loadUserVaultJson<HospitalAppointmentRecord[]>(activeUserId, 'hospitalBookings', [])
  );
  const [weekendItinerary, setWeekendItinerary] =
    useState<WeekendItineraryData | null>(() =>
      loadUserVaultJson<WeekendItineraryData | null>(activeUserId, 'weekendPlans', null)
    );
  const [eventPlan, setEventPlan] = useState<EventPlanData | null>(() =>
    loadUserVaultJson<EventPlanData | null>(activeUserId, 'eventPlan', null)
  );
  const [foodOrders, setFoodOrders] = useState<OnSpotFoodOrder[]>(() =>
    loadUserVaultJson<OnSpotFoodOrder[]>(activeUserId, 'foodOrders', [])
  );
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(() =>
    loadUserVaultJson<ExpenseEntry[]>(activeUserId, 'expenses', [])
  );
  const [budgetGoalInr, setBudgetGoalInr] = useState<number>(() => {
    const saved = loadUserVaultJson<number>(activeUserId, 'budgetGoal', 12000);
    return typeof saved === 'number' && saved > 0 ? saved : 12000;
  });
  const [chatHistory, setChatHistory] = useState<AssistantChatMessage[]>(() =>
    loadUserVaultJson<AssistantChatMessage[]>(activeUserId, 'chatHistory', [])
  );
  const [activeSpotGallery, setActiveSpotGallery] =
    useState<SpotGalleryRequest | null>(null);

  useEffect(() => {
    initEmailJs();
  }, []);

  // Switch & isolate all user vault slices immediately whenever activeUserId changes
  useEffect(() => {
    let cancelled = false;
    hydratedUserIdRef.current = '__switching__';

    const localTickets = loadUserTickets(activeUserId);
    const localPolice = loadUserVaultJson<StoredPoliceCase[]>(activeUserId, 'policeCases', []);
    const localBookings = loadUserVaultJson<BookedETicket[]>(activeUserId, 'bookings', []);
    const localStudy = loadUserVaultJson<StudyPlanData | null>(activeUserId, 'studyPlans', null);
    const localAdmissions = loadUserVaultJson<AdmissionApplicationRecord[]>(
      activeUserId,
      'admissions',
      []
    );
    const localJobs = loadUserVaultJson<JobApplicationRecord[]>(activeUserId, 'jobApps', []);
    const localHospitals = loadUserVaultJson<HospitalAppointmentRecord[]>(
      activeUserId,
      'hospitalBookings',
      []
    );
    const localWeekend = loadUserVaultJson<WeekendItineraryData | null>(
      activeUserId,
      'weekendPlans',
      null
    );
    const localEvent = loadUserVaultJson<EventPlanData | null>(activeUserId, 'eventPlan', null);
    const localFood = loadUserVaultJson<OnSpotFoodOrder[]>(activeUserId, 'foodOrders', []);
    const localExpenses = loadUserVaultJson<ExpenseEntry[]>(activeUserId, 'expenses', []);
    const localBudget = loadUserVaultJson<number>(activeUserId, 'budgetGoal', 12000);
    const localChat = loadUserVaultJson<AssistantChatMessage[]>(activeUserId, 'chatHistory', []);

    setTickets(localTickets);
    setPoliceCases(localPolice);
    setBookedTickets(localBookings);
    setStudyPlan(localStudy);
    setAdmissionApplications(localAdmissions);
    setJobApplications(localJobs);
    setHospitalBookings(localHospitals);
    setWeekendItinerary(localWeekend);
    setEventPlan(localEvent);
    setFoodOrders(localFood);
    setExpenses(localExpenses);
    setBudgetGoalInr(typeof localBudget === 'number' && localBudget > 0 ? localBudget : 12000);
    setChatHistory(localChat);
    setLatestTicketId(localTickets[0]?.id ?? null);
    setSelectedQueueTicketId(null);

    if (effectiveUser.homeDistrictId) {
      setTravelOriginId(effectiveUser.homeDistrictId);
      setLocalLifeDistrictId(effectiveUser.homeDistrictId);
    }

    const hydrate = async () => {
      if (cloudSyncEnabled) {
        const cloud = await loadCloudVaultForUser(activeUserId);
        if (!cancelled && cloud) {
          if (Array.isArray(cloud.tickets)) setTickets(cloud.tickets as StoredTicket[]);
          if (Array.isArray(cloud.policeCases)) setPoliceCases(cloud.policeCases as StoredPoliceCase[]);
          if (Array.isArray(cloud.bookings)) setBookedTickets(cloud.bookings as BookedETicket[]);
          if (cloud.studyPlans !== undefined) setStudyPlan(cloud.studyPlans as StudyPlanData | null);
          if (Array.isArray(cloud.admissions))
            setAdmissionApplications(cloud.admissions as AdmissionApplicationRecord[]);
          if (Array.isArray(cloud.jobApps))
            setJobApplications(cloud.jobApps as JobApplicationRecord[]);
          if (Array.isArray(cloud.hospitalBookings))
            setHospitalBookings(cloud.hospitalBookings as HospitalAppointmentRecord[]);
          if (cloud.weekendPlans !== undefined)
            setWeekendItinerary(cloud.weekendPlans as WeekendItineraryData | null);
          if (cloud.eventPlan !== undefined) setEventPlan(cloud.eventPlan as EventPlanData | null);
          if (Array.isArray(cloud.foodOrders))
            setFoodOrders(cloud.foodOrders as OnSpotFoodOrder[]);
          if (Array.isArray(cloud.expenses)) setExpenses(cloud.expenses as ExpenseEntry[]);
          if (typeof cloud.budgetGoal === 'number' && cloud.budgetGoal > 0)
            setBudgetGoalInr(cloud.budgetGoal);
          if (Array.isArray(cloud.chatHistory))
            setChatHistory(cloud.chatHistory as AssistantChatMessage[]);
        }
      }
      if (!cancelled) {
        hydratedUserIdRef.current = activeUserId;
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [activeUserId, effectiveUser.homeDistrictId, cloudSyncEnabled, loadCloudVaultForUser]);

  const persistSlice = <T,>(section: VaultSectionKey, value: T) => {
    if (hydratedUserIdRef.current !== activeUserId) return;
    saveUserVaultJson(activeUserId, section, value);
    if (cloudSyncEnabled) {
      void syncVaultSectionToCloud(activeUserId, section, value);
    }
  };

  useEffect(() => {
    persistSlice('tickets', tickets);
  }, [tickets]);

  useEffect(() => {
    persistSlice('bookings', bookedTickets);
  }, [bookedTickets]);

  useEffect(() => {
    persistSlice('policeCases', policeCases);
  }, [policeCases]);

  useEffect(() => {
    persistSlice('studyPlans', studyPlan);
  }, [studyPlan]);

  useEffect(() => {
    persistSlice('admissions', admissionApplications);
  }, [admissionApplications]);

  useEffect(() => {
    persistSlice('weekendPlans', weekendItinerary);
  }, [weekendItinerary]);

  useEffect(() => {
    persistSlice('expenses', expenses);
  }, [expenses]);

  useEffect(() => {
    persistSlice('budgetGoal', budgetGoalInr);
  }, [budgetGoalInr]);

  useEffect(() => {
    persistSlice('jobApps', jobApplications);
  }, [jobApplications]);

  useEffect(() => {
    persistSlice('hospitalBookings', hospitalBookings);
  }, [hospitalBookings]);

  useEffect(() => {
    persistSlice('eventPlan', eventPlan);
  }, [eventPlan]);

  useEffect(() => {
    persistSlice('foodOrders', foodOrders);
  }, [foodOrders]);

  useEffect(() => {
    persistSlice('chatHistory', chatHistory);
  }, [chatHistory]);

  const metrics = useMemo(() => computeQueueMetrics(tickets), [tickets]);

  const activePoliceCount = useMemo(
    () => policeCases.filter((c) => c.status !== 'Disposed / Closed').length,
    [policeCases]
  );

  const latestTicket = useMemo(
    () => tickets.find((item) => item.id === latestTicketId) ?? null,
    [tickets, latestTicketId]
  );

  // Cross-reference active civic hazards (>=7) & high-priority police logs against 3D Travel Corridor
  const corridorHazardReport = useMemo(
    () =>
      evaluateCorridorHazards(
        tickets,
        policeCases,
        travelOriginId,
        travelDestinationId
      ),
    [tickets, policeCases, travelOriginId, travelDestinationId]
  );

  const assistantSessionContext = useMemo<AssistantSessionContext>(() => {
    const tabLabels: Record<WorkspaceTab, string> = {
      home: 'Welcome Portal Homepage',
      intake: 'Citizen Report',
      queue: 'Officer Dashboard',
      police: 'Police & Safety Desk',
      travel: 'Global 3D Travel & Bookings',
      local_life: 'Local Life Hub',
      policy: 'Routing Policy',
    };
    const originRegion = getRegionById(travelOriginId);
    const destRegion = travelDestinationId
      ? getRegionById(travelDestinationId)
      : null;
    const localLifeDistrictObj = getRegionById(localLifeDistrictId);

    return {
      activeTab: tabLabels[activeTab],
      userName: effectiveUser.fullName,
      userEmail: effectiveUser.email,
      userRole: effectiveUser.role,
      userHomeDistrict: effectiveUser.homeDistrictName,
      userAcademicStream: effectiveUser.academicStream,
      travelOriginName: originRegion?.name ?? 'Pathanamthitta',
      travelDestinationName: destRegion?.name ?? null,
      localLifeDistrict: localLifeDistrictObj?.name ?? 'All Kerala',
      localLifeSection,
      tickets: tickets.slice(0, 12).map((t) => ({
        id: t.id,
        title: t.triage.ticket_title,
        department: t.triage.department,
        severityScore: t.triage.severity_score,
        urgencyLevel: t.triage.severity_level,
        workflowStatus: t.workflowStatus,
        isValid: t.triage.is_valid_civic_issue,
      })),
      policeCases: policeCases.slice(0, 10).map((pc) => ({
        caseRefId: pc.caseRefId,
        districtName: pc.districtName,
        category: pc.triage.case_category,
        priority: pc.triage.priority_level,
        status: pc.status,
        station: pc.triage.jurisdictional_station,
        isEmergency: pc.triage.is_emergency_life_threat,
      })),
      bookedTickets: bookedTickets.slice(0, 10).map((b) => ({
        pnr: b.pnr,
        channel: b.channel,
        from: b.from,
        to: b.to,
        classOrTier: b.classOrTier,
        seatAssignment: b.seatAssignment,
        travelDate: b.travelDate,
        paidAmountInr: b.paidAmountInr,
        actualFareInr: b.actualFareInr,
        isDemoFare: b.isDemoFare,
      })),
      jobApplications: jobApplications.slice(0, 6).map((j) => ({
        applicationId: j.applicationId,
        jobTitle: j.jobTitle,
        employer: j.employer,
        district: j.district,
        status: j.status,
      })),
      weekendPlanHeadline: weekendItinerary?.headline ?? null,
      activeEventHeadline: eventPlan?.headline ?? null,
      foodOrders: foodOrders.slice(0, 5).map((o) => ({
        orderId: o.orderId,
        eventHeadline: o.eventHeadline,
        spotLocation: o.spotLocation,
        totalInr: o.totalInr,
        stage: o.stage,
      })),
    };
  }, [
    activeTab,
    effectiveUser,
    travelOriginId,
    travelDestinationId,
    localLifeDistrictId,
    localLifeSection,
    tickets,
    policeCases,
    bookedTickets,
    jobApplications,
    weekendItinerary,
    eventPlan,
    foodOrders,
  ]);

  const handleAssistantNavigate = (action: AssistantActionId) => {
    switch (action) {
      case 'home':
        setMyTicketsOpen(false);
        setActiveTab('home');
        break;
      case 'citizen_report':
        setMyTicketsOpen(false);
        setActiveTab('intake');
        break;
      case 'officer_dashboard':
        setMyTicketsOpen(false);
        setActiveTab('queue');
        break;
      case 'police_desk':
        setMyTicketsOpen(false);
        setActiveTab('police');
        break;
      case 'travel_explorer':
        setMyTicketsOpen(false);
        setActiveTab('travel');
        break;
      case 'local_life':
        setMyTicketsOpen(false);
        setActiveTab('local_life');
        break;
      case 'jobs_portal':
        setMyTicketsOpen(false);
        setLocalLifeSection('jobs');
        setActiveTab('local_life');
        break;
      case 'weekend_planner':
        setMyTicketsOpen(false);
        setLocalLifeSection('weekend');
        setActiveTab('local_life');
        break;
      case 'event_ai':
        setMyTicketsOpen(false);
        setLocalLifeSection('events');
        setActiveTab('local_life');
        break;
      case 'my_tickets':
        setActiveTab('travel');
        setMyTicketsOpen(true);
        break;
    }
  };

  const handleOpenQuickGlobalDest = (
    countryIso: string,
    stateId: string,
    cityId: string
  ) => {
    setExternalWorldDest({
      countryIso,
      stateId,
      cityId,
      token: Date.now(),
    });
    setActiveTab('travel');
  };

  const handleSelectGlobalSearchResult = (res: GlobalSearchResult) => {
    if (res.category === 'world') {
      const [countryIso, stateId, cityId] = res.payload.split('::');
      handleOpenQuickGlobalDest(countryIso, stateId, cityId);
      return;
    }
    if (res.category === 'civic') {
      setSelectedQueueTicketId(res.payload);
      setActiveTab('queue');
      return;
    }
    if (res.category === 'police') {
      setActiveTab('police');
      return;
    }
    if (
      res.category === 'education' ||
      res.category === 'lifestyle' ||
      res.category === 'transport' ||
      res.category === 'healthcare'
    ) {
      setLocalLifeSection(res.category);
      if (res.payload) setLocalLifeDistrictId(res.payload);
      setActiveTab('local_life');
    }
  };

  const handleBookFeederPass = (route: LocalFeederRoute) => {
    const draft: BookingDraft = {
      channel: 'ksrtc',
      from: route.fromStop,
      to: route.toStop,
      operatorOrLine: `${route.routeName} (${route.mode})`,
      railClass: '2S',
      busTier: 'Super Fast',
      seatPreference: 'Window',
      selectedSeats: ['Feeder Day Pass · Open Boarding'],
      travelDate: getTomorrowIsoDate(),
      passengerName: effectiveUser.fullName || 'Kerala Commuter',
      passengerAge: 26,
      passengerCount: 1,
      baseFareInr: route.fareInr,
    };
    setFeederPaymentDraft(draft);
    setFeederPaymentFare(route.fareInr);
    setFeederPaymentOpen(true);
  };

  const handleAddExpense = (entry: Omit<ExpenseEntry, 'id' | 'date'>) => {
    const record: ExpenseEntry = {
      ...entry,
      id: `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString().slice(0, 10),
    };
    setExpenses((prev) => [record, ...prev]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmitAdmission = (record: AdmissionApplicationRecord) => {
    setAdmissionApplications((prev) => [record, ...prev]);
  };

  const handleSubmitJobApplication = (record: JobApplicationRecord) => {
    setJobApplications((prev) => [record, ...prev]);
  };

  const handleBookHospitalAppointment = (record: HospitalAppointmentRecord) => {
    setHospitalBookings((prev) => [record, ...prev]);
    if (record.consultationFeeInr > 0) {
      handleAddExpense({
        title: `${record.doctorName ? `${record.doctorName} · ` : ''}${record.hospitalName} (${record.department})`,
        category: 'Healthcare & OP',
        amountInr: record.consultationFeeInr,
        source: 'Hospital Booking',
        note: `Pass ${record.tokenId} · ${record.appointmentDate} ${record.timeSlot} · UTR ${record.utrNumber || 'Auto'}`,
      });
    }
  };

  const handlePlaceFoodOrder = (order: OnSpotFoodOrder) => {
    setFoodOrders((prev) => [order, ...prev]);
    handleAddExpense({
      title: `On-Spot Event Food · ${order.spotLocation}`,
      category: 'Food & Cafes',
      amountInr: order.totalInr,
      source: 'Event Order',
      note: `Order ${order.orderId} · ${order.items.length} item(s) · UTR ${order.utrNumber || 'Auto'}`,
    });
  };

  const handleAdvanceFoodOrderStage = (orderId: string, nextStage: FoodDeliveryStage) => {
    setFoodOrders((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, stage: nextStage } : o))
    );
  };

  const handleIssueTicketWithAutoExpense = (ticket: BookedETicket) => {
    setBookedTickets((prev) => [ticket, ...prev]);
    const isFeeder =
      ticket.channel === 'ksrtc' &&
      ticket.operatorOrLine.toLowerCase().includes('feeder');
    handleAddExpense({
      title: `${ticket.operatorOrLine} (${ticket.from} → ${ticket.to})`,
      category: isFeeder ? 'Local Transport & Fuel' : 'Travel Tickets',
      amountInr: ticket.actualFareInr > 0 ? ticket.actualFareInr : ticket.paidAmountInr,
      source: 'Auto-Booked',
      note: `Auto-logged via PNR ${ticket.pnr} · ${ticket.seatAssignment}`,
    });
  };

  const handleLoadDemoData = () => {
    const bundle = buildDemoScenarioBundle();
    setTickets(bundle.tickets);
    setPoliceCases(bundle.policeCases);
    setBookedTickets(bundle.bookedTickets);
    setTravelOriginId(bundle.travelOriginId);
    setTravelDestinationId(bundle.travelDestinationId);
    setStudyPlan(bundle.demoStudyPlan);
    setAdmissionApplications(bundle.demoAdmissionApplications);
    setJobApplications(bundle.demoJobApplications);
    setHospitalBookings(bundle.demoHospitalBookings);
    setWeekendItinerary(bundle.demoWeekendItinerary);
    setEventPlan(bundle.demoEventPlan);
    setFoodOrders(bundle.demoFoodOrders);
    setExpenses(bundle.demoExpenses);
    setLatestTicketId(bundle.tickets[0]?.id ?? null);
    setSelectedQueueTicketId(bundle.tickets[0]?.id ?? null);
    setDemoLoaded(true);
    window.setTimeout(() => setDemoLoaded(false), 3000);
  };

  const handleSelectSample = (
    scenario: SampleScenario,
    payload: PreparedImagePayload
  ) => {
    setImage(payload);
    setDescription(scenario.description);
    setLocalBodyHint(scenario.localBodyHint);
    setActiveSampleId(scenario.id);
    setTriageError(null);
  };

  const handleImageChange = (payload: PreparedImagePayload | null) => {
    setImage(payload);
    setActiveSampleId(null);
    setTriageError(null);
  };

  const handleRunTriage = async () => {
    if (!image || !description.trim()) return;
    setIsSubmitting(true);
    setTriageError(null);

    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: image.base64,
          mimeType: image.mimeType,
          description: description.trim(),
          locationHint: localBodyHint.trim(),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          (payload && typeof payload.error === 'string' && payload.error) ||
          `Triage request failed with status ${response.status}.`;
        throw new Error(message);
      }

      const normalized = normalizeTriagePayload(payload);

      // Duplicate Report Clustering & Citizen Corroboration check
      const existingMatch = findDuplicateTicketMatch(
        tickets,
        normalized,
        localBodyHint.trim(),
        description.trim()
      );

      if (existingMatch && normalized.is_valid_civic_issue) {
        const boosted = applyTicketCorroboration(existingMatch);
        boosted.emailAlertStatus = 'sending';

        setTickets((prev) =>
          prev.map((item) => (item.id === existingMatch.id ? boosted : item))
        );
        setLatestTicketId(existingMatch.id);

        void sendOfficerAlertEmail(boosted.triage).then((emailStatus) => {
          setTickets((prev) =>
            prev.map((item) =>
              item.id === existingMatch.id
                ? { ...item, emailAlertStatus: emailStatus }
                : item
            )
          );
        });
        return;
      }

      const ticketId = generateTicketId();
      const newTicket: StoredTicket = {
        id: ticketId,
        createdAt: new Date().toISOString(),
        workflowStatus: normalized.is_valid_civic_issue ? 'Triaged' : 'Rejected',
        emailAlertStatus: normalized.is_valid_civic_issue
          ? 'sending'
          : 'not_applicable',
        imageUrl: image.previewUrl,
        imageName: image.fileName,
        citizenDescription: description.trim(),
        localBodyHint: localBodyHint.trim(),
        corroborationCount: 1,
        triage: normalized,
      };

      setTickets((prev) => [newTicket, ...prev]);
      setLatestTicketId(ticketId);

      // Immediately dispatch EmailJS officer alert only for validated civic issues.
      if (normalized.is_valid_civic_issue === true) {
        void sendOfficerAlertEmail(normalized).then((emailStatus) => {
          setTickets((prev) =>
            prev.map((item) =>
              item.id === ticketId
                ? { ...item, emailAlertStatus: emailStatus }
                : item
            )
          );
        });
      }
    } catch (err) {
      setTriageError(
        err instanceof Error
          ? err.message
          : 'Unable to reach the municipal triage engine.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetIntake = () => {
    setImage(null);
    setDescription('');
    setLocalBodyHint('');
    setActiveSampleId(null);
    setTriageError(null);
    setLatestTicketId(null);
  };

  const handleUpdateStatus = (ticketId: string, status: TicketWorkflowStatus) => {
    setTickets((prev) =>
      prev.map((item) =>
        item.id === ticketId ? { ...item, workflowStatus: status } : item
      )
    );
  };

  const handleVerifyRepairResolved = (
    ticketId: string,
    record: RepairVerificationRecord
  ) => {
    const target = tickets.find((t) => t.id === ticketId);
    setTickets((prev) =>
      prev.map((item) =>
        item.id === ticketId
          ? {
              ...item,
              workflowStatus: 'Resolved',
              repairVerification: record,
            }
          : item
      )
    );

    if (target) {
      void sendRepairResolutionEmail(target, record.verificationNote).then(
        (emailStatus) => {
          setTickets((prev) =>
            prev.map((item) =>
              item.id === ticketId && item.repairVerification
                ? {
                    ...item,
                    repairVerification: {
                      ...item.repairVerification,
                      emailStatus,
                    },
                  }
                : item
            )
          );
        }
      );
    }
  };

  const handleDeleteTicket = (ticketId: string) => {
    setTickets((prev) => prev.filter((item) => item.id !== ticketId));
    if (selectedQueueTicketId === ticketId) {
      setSelectedQueueTicketId(null);
    }
    if (latestTicketId === ticketId) {
      setLatestTicketId(null);
    }
  };

  const handleAddPoliceCase = (newCase: StoredPoliceCase) => {
    setPoliceCases((prev) => [newCase, ...prev]);
  };

  const handleUpdatePoliceCaseEmailStatus = (
    caseId: string,
    emailStatus: EmailAlertStatus
  ) => {
    setPoliceCases((prev) =>
      prev.map((pc) =>
        pc.id === caseId ? { ...pc, emailAlertStatus: emailStatus } : pc
      )
    );
  };

  const handleUpdatePoliceCase = (
    caseId: string,
    updates: { status?: PoliceCaseStatus; disposalRemarks?: string }
  ) => {
    setPoliceCases((prev) =>
      prev.map((pc) =>
        pc.id === caseId
          ? {
              ...pc,
              ...(updates.status ? { status: updates.status } : {}),
              ...(typeof updates.disposalRemarks === 'string'
                ? { disposalRemarks: updates.disposalRemarks }
                : {}),
            }
          : pc
      )
    );
  };

  const handleEscalateTicketToPolice = (ticket: StoredTicket) => {
    const matchedDistricts = detectDistrictsFromText(
      [
        ticket.localBodyHint,
        ticket.triage.location_clues ?? '',
        ticket.triage.ticket_title,
        ticket.triage.formal_summary,
      ].join(' ')
    );
    setPolicePrefill({
      districtId: matchedDistricts[0]?.id ?? 'pathanamthitta',
      sourceTicketId: ticket.id,
      description: `Escalated from LSG Civic Ticket ${ticket.id} (${ticket.triage.department}, Severity ${ticket.triage.severity_score}/10): ${ticket.triage.formal_summary} Location: ${ticket.localBodyHint || ticket.triage.location_clues || 'Unspecified'}.`,
    });
    setActiveTab('police');
  };

  const handleCreateLockedHouseIntimation = (details: {
    districtId: string;
    houseAddress: string;
    travelDates: string;
  }): string => {
    const district = getPoliceDistrictById(details.districtId);
    const refId = generatePoliceCaseRefId(district.id);
    const intimationCase: StoredPoliceCase = {
      id: refId,
      caseRefId: refId,
      createdAt: new Date().toISOString(),
      districtId: district.id,
      districtName: district.name,
      incidentDateTime: new Date().toISOString(),
      description: `Locked House Travel Intimation for ${details.houseAddress} (${district.name}) during travel window: ${details.travelDates}. Requesting Janamaithri Beat Officer night patrol.`,
      status: 'Assigned to SHO / Beat Officer',
      disposalRemarks: 'Auto-routed to Janamaithri Beat Patrol roster.',
      emailAlertStatus: 'not_applicable',
      isLockedHouseIntimation: true,
      travelDates: details.travelDates,
      triage: {
        is_emergency_life_threat: false,
        case_category: 'Tourist Assistance',
        recommended_unit: 'Janamaithri Beat Patrol & Local Station',
        jurisdictional_station: district.defaultStation,
        priority_level: 'Standard',
        formal_petition_summary: `Citizen has submitted a Locked House Travel Intimation via CivicTriage Mobility Explorer for residence at ${details.houseAddress} (${district.name}) covering ${details.travelDates}. Beat patrol surveillance requested during absence.`,
        required_documents_checklist: [
          'Resident contact number and local emergency neighbor contact',
          'Exact travel return date confirmation on Pol-App / THUNA',
        ],
        actionable_legal_guidance:
          'Your locked house beat intimation is logged with the jurisdictional station. You may also sync this reference on Kerala Police Pol-App.',
      },
    };
    setPoliceCases((prev) => [intimationCase, ...prev]);
    return refId;
  };

  const handleSelectDepartmentFromSidebar = (department: MunicipalDepartment) => {
    setQueueFilters({ query: '', department, status: 'ALL' });
    setSelectedQueueTicketId(null);
    setActiveTab('queue');
  };

  const handleTopBarPrimaryAction = () => {
    if (activeTab === 'intake') {
      handleResetIntake();
    } else {
      setActiveTab('intake');
    }
  };

  const topBarActionLabel =
    activeTab === 'intake' ? 'Reset Intake' : 'New Issue Intake';

  const handleSelectTravelModeFromDrawer = (mode: ExplorerViewMode) => {
    setActiveTravelMode(mode);
    setExternalTravelMode({ mode, token: Date.now() });
    setActiveTab('travel');
  };

  const handleSelectLocalLifeFromDrawer = (sec: LocalLifeSection) => {
    setLocalLifeSection(sec);
    setActiveTab('local_life');
  };

  return (
    <div
      id="top"
      className="relative min-h-screen w-full flex flex-col text-[#111315] dark:text-slate-100 transition-colors duration-300"
    >
      {/* Floating Ambient Liquid Glass Background Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="ambient-orb-1 absolute -top-24 -left-20 w-[460px] h-[460px] rounded-full bg-[#7B83EB]/25 dark:bg-[#4F5BD5]/25 blur-[110px]" />
        <div className="ambient-orb-2 absolute top-[22%] right-[-8%] w-[500px] h-[500px] rounded-full bg-[#FFF8EE]/80 dark:bg-indigo-900/25 blur-[120px]" />
        <div className="ambient-orb-3 absolute bottom-[-12%] left-[28%] w-[440px] h-[440px] rounded-full bg-[#67E8F9]/25 dark:bg-cyan-500/15 blur-[115px]" />
      </div>

      {/* Hidden-by-Default Slide-Out iOS Liquid Glass Side Drawer */}
      <SidebarNav
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        activeTravelMode={activeTravelMode}
        activeLocalLifeSection={localLifeSection}
        activeUser={effectiveUser}
        metrics={metrics}
        activePoliceCount={activePoliceCount}
        bookedTicketsCount={bookedTickets.length}
        themeMode={theme}
        demoLoaded={demoLoaded}
        onSelectTab={setActiveTab}
        onSelectTravelMode={handleSelectTravelModeFromDrawer}
        onSelectLocalLifeSection={handleSelectLocalLifeFromDrawer}
        onSelectDepartmentFilter={handleSelectDepartmentFromSidebar}
        onToggleTheme={toggleTheme}
        onLoadDemoData={handleLoadDemoData}
        onOpenAccountModal={openAuthModal}
        onSignOut={() => void signOutUser()}
      />

      {/* Full-Width Main Workspace (100% Viewport Width) */}
      <div className="flex-1 w-full min-w-0 flex flex-col">
        <TopBar
          activeTab={activeTab}
          activeUser={effectiveUser}
          onOpenDrawer={() => setDrawerOpen(true)}
          onGoHome={() => setActiveTab('home')}
          onPrimaryAction={handleTopBarPrimaryAction}
          primaryActionLabel={topBarActionLabel}
          onLoadDemoData={handleLoadDemoData}
          demoLoaded={demoLoaded}
          tickets={tickets}
          policeCases={policeCases}
          onSelectSearchResult={handleSelectGlobalSearchResult}
          themeMode={theme}
          onToggleTheme={toggleTheme}
          onOpenProfileModal={() => openAuthModal('profile')}
          onOpenSwitchAccountModal={() => openAuthModal('signin')}
          onSignOut={() => void signOutUser()}
        />

        {activeTab === 'travel' ? (
          <main className="flex-1 w-full min-w-0">
            <TravelDistrictGuideView
              originId={travelOriginId}
              destinationId={travelDestinationId}
              bookedTickets={bookedTickets}
              myTicketsOpen={myTicketsOpen}
              corridorHazardReport={corridorHazardReport}
              externalWorldDest={externalWorldDest}
              externalViewMode={externalTravelMode}
              onViewModeChange={setActiveTravelMode}
              onOriginIdChange={setTravelOriginId}
              onDestinationIdChange={setTravelDestinationId}
              onTicketIssued={handleIssueTicketWithAutoExpense}
              onDeleteBookedTicket={(id) =>
                setBookedTickets((prev) => prev.filter((item) => item.id !== id))
              }
              onMyTicketsOpenChange={setMyTicketsOpen}
              onOpenSpotGallery={setActiveSpotGallery}
              onCreateLockedHouseIntimation={handleCreateLockedHouseIntimation}
            />
          </main>
        ) : (
          <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {activeTab === 'home' && (
              <HomePortalView
                metrics={metrics}
                activePoliceCount={activePoliceCount}
                bookedTicketsCount={bookedTickets.length}
                onNavigateTab={setActiveTab}
                onNavigateLocalLife={(sec) => {
                  setLocalLifeSection(sec);
                  setActiveTab('local_life');
                }}
                onOpenQuickDestination={handleOpenQuickGlobalDest}
                onLoadDemoData={handleLoadDemoData}
                demoLoaded={demoLoaded}
              />
            )}

            {activeTab === 'intake' && (
              <div className="space-y-6 dark-adaptive-view">
                <EmergencyHelplineStrip />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-5">
                    <TriageIntakeForm
                      image={image}
                      description={description}
                      localBodyHint={localBodyHint}
                      activeSampleId={activeSampleId}
                      isSubmitting={isSubmitting}
                      onImageChange={handleImageChange}
                      onDescriptionChange={(val) => {
                        setDescription(val);
                        if (activeSampleId) setActiveSampleId(null);
                      }}
                      onLocalBodyHintChange={setLocalBodyHint}
                      onSelectSample={handleSelectSample}
                      onSubmit={handleRunTriage}
                    />
                  </div>

                  <div className="lg:col-span-7 lg:sticky lg:top-20">
                    <TriageResultPanel
                      ticket={latestTicket}
                      recentTickets={tickets}
                      isLoading={isSubmitting}
                      error={triageError}
                      onRetry={handleRunTriage}
                      onSelectRecentTicket={(id) => setLatestTicketId(id)}
                      onUpdateStatus={handleUpdateStatus}
                      onEscalateToPolice={handleEscalateTicketToPolice}
                      onOpenQueue={() => {
                        if (latestTicket) {
                          setSelectedQueueTicketId(latestTicket.id);
                        }
                        setActiveTab('queue');
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'queue' && (
              <div className="dark-adaptive-view">
                <TicketQueueView
                  tickets={tickets}
                  metrics={metrics}
                  filters={queueFilters}
                  selectedTicketId={selectedQueueTicketId}
                  policeCases={policeCases}
                  onFiltersChange={setQueueFilters}
                  onSelectTicket={setSelectedQueueTicketId}
                  onUpdateStatus={handleUpdateStatus}
                  onVerifyRepairResolved={handleVerifyRepairResolved}
                  onDeleteTicket={handleDeleteTicket}
                  onStartNewIntake={() => setActiveTab('intake')}
                  onUpdatePoliceCase={handleUpdatePoliceCase}
                  onOpenPoliceDesk={() => setActiveTab('police')}
                />
              </div>
            )}

            {activeTab === 'police' && (
              <div className="dark-adaptive-view">
                <PoliceSafetyDeskView
                  policeCases={policeCases}
                  onAddPoliceCase={handleAddPoliceCase}
                  onUpdatePoliceCaseEmailStatus={handleUpdatePoliceCaseEmailStatus}
                  prefill={policePrefill}
                  onClearPrefill={() => setPolicePrefill(null)}
                  activeUser={effectiveUser}
                />
              </div>
            )}

            {activeTab === 'local_life' && (
              <LocalLifeHubView
                activeUser={effectiveUser}
                section={localLifeSection}
                districtId={localLifeDistrictId}
                bookedCount={bookedTickets.length}
                studyPlan={studyPlan}
                admissionApplications={admissionApplications}
                jobApplications={jobApplications}
                hospitalBookings={hospitalBookings}
                weekendItinerary={weekendItinerary}
                eventPlan={eventPlan}
                foodOrders={foodOrders}
                expenses={expenses}
                budgetGoalInr={budgetGoalInr}
                onSectionChange={setLocalLifeSection}
                onDistrictChange={setLocalLifeDistrictId}
                onBookFeederPass={handleBookFeederPass}
                onOpenBookedTickets={() => {
                  setActiveTab('travel');
                  setMyTicketsOpen(true);
                }}
                onOpenSpotGallery={setActiveSpotGallery}
                onStudyPlanChange={setStudyPlan}
                onSubmitAdmission={handleSubmitAdmission}
                onSubmitJobApplication={handleSubmitJobApplication}
                onBookHospitalAppointment={handleBookHospitalAppointment}
                onWeekendItineraryChange={setWeekendItinerary}
                onEventPlanChange={setEventPlan}
                onPlaceFoodOrder={handlePlaceFoodOrder}
                onAdvanceFoodOrderStage={handleAdvanceFoodOrderStage}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
                onBudgetGoalChange={setBudgetGoalInr}
              />
            )}

            {activeTab === 'policy' && (
              <div className="dark-adaptive-view">
                <RoutingPolicyView />
              </div>
            )}
          </main>
        )}
      </div>

      {/* iOS Liquid Glass Auth Gate & Profile / Switch Account Modal */}
      <AuthGateModal
        open={authGateOpen}
        mode={authModalMode}
        activeUser={activeUser}
        savedAccounts={savedAccounts}
        busy={authBusy}
        error={authError}
        cloudSyncEnabled={cloudSyncEnabled}
        onModeChange={setAuthModalMode}
        onClose={closeAuthModal}
        onSignInGoogle={signInWithGoogle}
        onSignInEmail={signInWithEmail}
        onSignUpEmail={signUpWithEmail}
        onContinueAsGuest={continueAsGuest}
        onUpdateProfile={updateProfile}
        onSignOut={signOutUser}
      />

      {/* Local Feeder Pass UPI Modal (shared 7012692128@fam gateway + Auto-Verify) */}
      <UpiPaymentModal
        open={feederPaymentOpen}
        draft={feederPaymentDraft}
        actualFareInr={feederPaymentFare}
        onClose={() => setFeederPaymentOpen(false)}
        onTicketIssued={handleIssueTicketWithAutoExpense}
        onOpenMyTickets={() => {
          setFeederPaymentOpen(false);
          setActiveTab('travel');
          setMyTicketsOpen(true);
        }}
      />

      {/* Global Real-World Wikimedia / Wikipedia Picture Library Drawer */}
      <SpotPictureLibraryDrawer
        spot={activeSpotGallery}
        onClose={() => setActiveSpotGallery(null)}
        onFlyTo3DMap={() => {
          setActiveSpotGallery(null);
          setActiveTab('travel');
        }}
        onBookLocalTicket={() => {
          setActiveSpotGallery(null);
          setLocalLifeSection('transport');
          setActiveTab('local_life');
        }}
      />

      {/* Floating Context-Aware AI Customer Assistance Chatbot (Global, Per-User Isolated) */}
      <AssistantChatbotWidget
        key={activeUserId}
        sessionContext={assistantSessionContext}
        onNavigateAction={handleAssistantNavigate}
        persistedMessages={chatHistory}
        onMessagesChange={setChatHistory}
      />

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />
    </div>
  );
}
