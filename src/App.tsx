import { useEffect, useMemo, useState } from 'react';
import {
  computeQueueMetrics,
  generateTicketId,
  normalizeTriagePayload,
  type MunicipalDepartment,
  type StoredTicket,
  type TicketFilters,
  type TicketWorkflowStatus,
} from './shared/triageSchema';
import { INITIAL_SEED_TICKETS, type SampleScenario } from './data/sampleScenarios';
import type { PreparedImagePayload } from './utils/imageEncoding';
import { initEmailJs, sendOfficerAlertEmail } from './utils/emailAlert';
import { SidebarNav, type WorkspaceTab } from './components/SidebarNav';
import { TopBar } from './components/TopBar';
import { TriageIntakeForm } from './components/TriageIntakeForm';
import { TriageResultPanel } from './components/TriageResultPanel';
import { TicketQueueView } from './components/TicketQueueView';
import { RoutingPolicyView } from './components/RoutingPolicyView';

const STORAGE_KEY = 'civictriage_lsg_tickets_v1';

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

  const metrics = useMemo(() => computeQueueMetrics(tickets), [tickets]);

  const latestTicket = useMemo(
    () => tickets.find((item) => item.id === latestTicketId) ?? null,
    [tickets, latestTicketId]
  );

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
        triage: normalized,
      };

      setTickets((prev) => [newTicket, ...prev]);
      setLatestTicketId(ticketId);

      // Immediately dispatch EmailJS officer alert only for validated civic issues.
      // Wrapped in try/catch inside sendOfficerAlertEmail so email errors never block ticket saving.
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

  const handleDeleteTicket = (ticketId: string) => {
    setTickets((prev) => prev.filter((item) => item.id !== ticketId));
    if (selectedQueueTicketId === ticketId) {
      setSelectedQueueTicketId(null);
    }
    if (latestTicketId === ticketId) {
      setLatestTicketId(null);
    }
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
    <div id="top" className="min-h-screen flex bg-[#F8FAFC] text-slate-900">
      <SidebarNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onSelectDepartmentFilter={handleSelectDepartmentFromSidebar}
        metrics={metrics}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeTab={activeTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onPrimaryAction={handleTopBarPrimaryAction}
          primaryActionLabel={topBarActionLabel}
        />

        <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'intake' && (
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
                  onOpenQueue={() => {
                    if (latestTicket) {
                      setSelectedQueueTicketId(latestTicket.id);
                    }
                    setActiveTab('queue');
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'queue' && (
            <TicketQueueView
              tickets={tickets}
              metrics={metrics}
              filters={queueFilters}
              selectedTicketId={selectedQueueTicketId}
              onFiltersChange={setQueueFilters}
              onSelectTicket={setSelectedQueueTicketId}
              onUpdateStatus={handleUpdateStatus}
              onDeleteTicket={handleDeleteTicket}
              onStartNewIntake={() => setActiveTab('intake')}
            />
          )}

          {activeTab === 'policy' && <RoutingPolicyView />}
        </main>
      </div>
    </div>
  );
}
