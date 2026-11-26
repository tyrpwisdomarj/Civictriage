import { useEffect, useMemo, useState } from 'react';
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
import { TopBar } from './components/TopBar';
import { TriageIntakeForm } from './components/TriageIntakeForm';
import { TriageResultPanel } from './components/TriageResultPanel';
import { TicketQueueView } from './components/TicketQueueView';
import { RoutingPolicyView } from './components/RoutingPolicyView';
import { EmergencyHelplineStrip } from './components/EmergencyHelplineStrip';
import {
  PoliceSafetyDeskView,
  type PoliceCasePrefill,
} from './components/PoliceSafetyDeskView';
import { TravelDistrictGuideView } from './components/travel/TravelDistrictGuideView';
import { AssistantChatbotWidget } from './components/AssistantChatbotWidget';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DEFAULT_ORIGIN_ID, getRegionById } from './data/keralaMapData';
import type { BookedETicket } from './shared/bookingSchema';
import type {
  AssistantActionId,
  AssistantSessionContext,
} from './shared/assistantSchema';

const STORAGE_KEY = 'civictriage_lsg_tickets_v1';
const BOOKED_TICKETS_STORAGE_KEY = 'civictriage_booked_tickets_v1';
const POLICE_CASES_STORAGE_KEY = 'civictriage_police_cases_v1';

function loadSavedBookedTickets(): BookedETicket[] {
  try {
    const raw = window.localStorage.getItem(BOOKED_TICKETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BookedETicket[]) : [];
  } catch {
    return [];
  }
}

function loadSavedPoliceCases(): StoredPoliceCase[] {
  try {
    const raw = window.localStorage.getItem(POLICE_CASES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredPoliceCase[]) : [];
  } catch {
    return [];
  }
}

function loadInitialTickets(): StoredTicket[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_SEED_TICKETS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as StoredTicket[];
    }
  } catch {
    // Fall back to deterministic seed tickets
  }
  return INITIAL_SEED_TICKETS;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('intake');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [tickets, setTickets] = useState<StoredTicket[]>(loadInitialTickets);
  const [policeCases, setPoliceCases] = useState<StoredPoliceCase[]>(loadSavedPoliceCases);
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
  const [travelOriginId, setTravelOriginId] = useState<string>(DEFAULT_ORIGIN_ID);
  const [travelDestinationId, setTravelDestinationId] = useState<string | null>(null);
  const [bookedTickets, setBookedTickets] = useState<BookedETicket[]>(
    loadSavedBookedTickets
  );
  const [myTicketsOpen, setMyTicketsOpen] = useState<boolean>(false);

  useEffect(() => {
    initEmailJs();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    } catch {
      // Ignore storage quota errors on very large uploaded data URLs
    }
  }, [tickets]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        BOOKED_TICKETS_STORAGE_KEY,
        JSON.stringify(bookedTickets)
      );
    } catch {
      // Ignore quota errors
    }
  }, [bookedTickets]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        POLICE_CASES_STORAGE_KEY,
        JSON.stringify(policeCases)
      );
    } catch {
      // Ignore quota errors
    }
  }, [policeCases]);

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
      intake: 'Citizen Report',
      queue: 'Officer Dashboard',
      police: 'Police & Safety Desk',
      travel: 'Travel & 3D Explorer',
      policy: 'Routing Policy',
    };
    const originRegion = getRegionById(travelOriginId);
    const destRegion = travelDestinationId
      ? getRegionById(travelDestinationId)
      : null;

    return {
      activeTab: tabLabels[activeTab],
      travelOriginName: originRegion?.name ?? 'Pathanamthitta',
      travelDestinationName: destRegion?.name ?? null,
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
    };
  }, [
    activeTab,
    travelOriginId,
    travelDestinationId,
    tickets,
    policeCases,
    bookedTickets,
  ]);

  const handleAssistantNavigate = (action: AssistantActionId) => {
    switch (action) {
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
      case 'my_tickets':
        setActiveTab('travel');
        setMyTicketsOpen(true);
        break;
    }
  };

  const handleLoadDemoData = () => {
    const bundle = buildDemoScenarioBundle();
    setTickets(bundle.tickets);
    setPoliceCases(bundle.policeCases);
    setBookedTickets(bundle.bookedTickets);
    setTravelOriginId(bundle.travelOriginId);
    setTravelDestinationId(bundle.travelDestinationId);
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

  return (
    <div
      id="top"
      className="min-h-screen flex bg-gradient-to-br from-sky-50 via-white to-emerald-50/70 text-slate-900"
    >
      <SidebarNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onSelectDepartmentFilter={handleSelectDepartmentFromSidebar}
        metrics={metrics}
        activePoliceCount={activePoliceCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeTab={activeTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onPrimaryAction={handleTopBarPrimaryAction}
          primaryActionLabel={topBarActionLabel}
          onLoadDemoData={handleLoadDemoData}
          demoLoaded={demoLoaded}
        />

        {activeTab === 'travel' ? (
          <main className="flex-1 w-full min-w-0">
            <TravelDistrictGuideView
              originId={travelOriginId}
              destinationId={travelDestinationId}
              bookedTickets={bookedTickets}
              myTicketsOpen={myTicketsOpen}
              corridorHazardReport={corridorHazardReport}
              onOriginIdChange={setTravelOriginId}
              onDestinationIdChange={setTravelDestinationId}
              onTicketIssued={(ticket) =>
                setBookedTickets((prev) => [ticket, ...prev])
              }
              onDeleteBookedTicket={(id) =>
                setBookedTickets((prev) => prev.filter((item) => item.id !== id))
              }
              onMyTicketsOpenChange={setMyTicketsOpen}
              onCreateLockedHouseIntimation={handleCreateLockedHouseIntimation}
            />
          </main>
        ) : (
          <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {activeTab === 'intake' && (
              <div className="space-y-6">
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
            )}

            {activeTab === 'police' && (
              <PoliceSafetyDeskView
                policeCases={policeCases}
                onAddPoliceCase={handleAddPoliceCase}
                onUpdatePoliceCaseEmailStatus={handleUpdatePoliceCaseEmailStatus}
                prefill={policePrefill}
                onClearPrefill={() => setPolicePrefill(null)}
              />
            )}

            {activeTab === 'policy' && <RoutingPolicyView />}
          </main>
        )}
      </div>

      {/* Floating Context-Aware AI Customer Assistance Chatbot (Global) */}
      <AssistantChatbotWidget
        sessionContext={assistantSessionContext}
        onNavigateAction={handleAssistantNavigate}
      />

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />
    </div>
  );
}
