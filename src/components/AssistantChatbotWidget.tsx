import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Compass,
  FilePlus2,
  Home,
  LayoutDashboard,
  MessageCircle,
  PartyPopper,
  RotateCcw,
  Send,
  Shield,
  Sparkles,
  Store,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import {
  ASSISTANT_ACTION_META,
  ASSISTANT_MENTIONS,
  ASSISTANT_QUICK_PROMPTS,
  ASSISTANT_SLASH_COMMANDS,
  normalizeAssistantResponse,
  type AssistantActionId,
  type AssistantChatMessage,
  type AssistantSessionContext,
} from '../shared/assistantSchema';
import { EmergencyHelplineStrip } from './EmergencyHelplineStrip';
import { VoiceMicControl } from './VoiceMicControl';

interface AssistantChatbotWidgetProps {
  sessionContext: AssistantSessionContext;
  onNavigateAction: (action: AssistantActionId) => void;
  persistedMessages?: AssistantChatMessage[] | null;
  onMessagesChange?: (messages: AssistantChatMessage[]) => void;
}

function formatClockTime(date: Date = new Date()): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createWelcomeMessage(userName?: string): AssistantChatMessage {
  const firstName = userName ? userName.split(/\s+/)[0] : '';
  const greeting = firstName && firstName !== 'Demo' ? `Namaskaram ${firstName}!` : 'Namaskaram!';
  return {
    id: `welcome-${Date.now()}`,
    role: 'model',
    text: `${greeting} I am your CivicTriage LSG & Local Life AI. Type /jobs, /weekend, /event, or /ksmart — or ask in English, Malayalam, or Manglish about Kerala jobs, weekend plans, event food delivery, civic reports, or 3D travel bookings.`,
    timestamp: formatClockTime(),
    actions: ['jobs_portal', 'weekend_planner', 'event_ai'],
  };
}

function ActionIcon({ action }: { action: AssistantActionId }) {
  switch (action) {
    case 'home':
      return <Home className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'citizen_report':
      return <FilePlus2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'officer_dashboard':
      return <LayoutDashboard className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'police_desk':
      return <Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'travel_explorer':
      return <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'local_life':
      return <Store className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'jobs_portal':
      return <Briefcase className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'weekend_planner':
      return <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'event_ai':
      return <PartyPopper className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'my_tickets':
      return <Ticket className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  }
}

function FormattedReplyText({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        const bulletMatch = trimmed.match(/^(?:[-•*]|\d+\.)\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={index} className="flex items-start gap-2">
              <span
                className="mt-2 w-1.5 h-1.5 rounded-full bg-[#4F5BD5] dark:bg-[#A5B4FC] shrink-0"
                aria-hidden="true"
              />
              <span>{bulletMatch[1]}</span>
            </div>
          );
        }
        return <p key={index}>{trimmed}</p>;
      })}
    </div>
  );
}

export function AssistantChatbotWidget({
  sessionContext,
  onNavigateAction,
  persistedMessages = null,
  onMessagesChange,
}: AssistantChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalMessages, setInternalMessages] = useState<AssistantChatMessage[]>(() =>
    persistedMessages && persistedMessages.length > 0
      ? persistedMessages
      : [createWelcomeMessage(sessionContext.userName)]
  );
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

  const messages =
    persistedMessages && persistedMessages.length > 0
      ? persistedMessages
      : internalMessages;

  const updateMessages = (
    updater:
      | AssistantChatMessage[]
      | ((prev: AssistantChatMessage[]) => AssistantChatMessage[])
  ) => {
    const next = typeof updater === 'function' ? updater(messages) : updater;
    setInternalMessages(next);
    onMessagesChange?.(next);
  };

  useEffect(() => {
    if (persistedMessages && persistedMessages.length > 0) {
      setInternalMessages(persistedMessages);
    } else if (persistedMessages && persistedMessages.length === 0) {
      setInternalMessages([createWelcomeMessage(sessionContext.userName)]);
    }
  }, [persistedMessages, sessionContext.userName]);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const slashSuggestions = useMemo(() => {
    const trimmed = inputValue.trimStart();
    if (!trimmed.startsWith('/')) return [];
    const token = trimmed.split(/\s+/)[0].toLowerCase();
    return ASSISTANT_SLASH_COMMANDS.filter((c) => c.command.startsWith(token));
  }, [inputValue]);

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isLoading) return;

    const userMsg: AssistantChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      text,
      timestamp: formatClockTime(),
    };

    const nextHistory = [...messages.filter((m) => !m.isError), userMsg];
    updateMessages(nextHistory);
    setInputValue('');
    setIsLoading(true);
    setLastFailedPrompt(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const apiMessages = nextHistory
        .filter((m) => !m.id.startsWith('welcome-'))
        .slice(-16)
        .map((m) => ({ role: m.role, text: m.text }));

      const response = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          sessionContext,
        }),
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const errMsg =
          (payload && typeof payload.error === 'string' && payload.error) ||
          `Assistant request failed (${response.status}).`;
        throw new Error(errMsg);
      }

      const normalized = normalizeAssistantResponse(payload);
      const assistantMsg: AssistantChatMessage = {
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'model',
        text: normalized.reply,
        timestamp: formatClockTime(),
        actions: normalized.actions,
      };
      updateMessages([...nextHistory, assistantMsg]);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      const errText =
        err instanceof Error
          ? err.message
          : 'Unable to reach CivicTriage Assistant right now.';
      setLastFailedPrompt(text);
      updateMessages([
        ...nextHistory,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: errText,
          timestamp: formatClockTime(),
          isError: true,
        },
      ]);
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
      }
    }
  };

  const handleClearChat = () => {
    abortRef.current?.abort();
    setIsLoading(false);
    setLastFailedPrompt(null);
    updateMessages([createWelcomeMessage(sessionContext.userName)]);
  };

  const handleActionClick = (action: AssistantActionId) => {
    onNavigateAction(action);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(inputValue);
  };

  const activeTicketCount = sessionContext.tickets.filter((t) => t.isValid).length;
  const activePoliceCount = (sessionContext.policeCases ?? []).filter(
    (c) => c.status !== 'Disposed / Closed'
  ).length;
  const bookedPnrCount = sessionContext.bookedTickets.length;
  const jobAppCount = sessionContext.jobApplications?.length ?? 0;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* iOS Liquid Glass Chat Drawer */}
      {isOpen && (
        <section
          aria-label="CivicTriage Assistant chat window"
          className="mb-3 w-[calc(100vw-2rem)] sm:w-[410px] max-h-[min(690px,86vh)] flex flex-col rounded-[28px] bg-white/85 dark:bg-slate-950/90 backdrop-blur-2xl backdrop-saturate-[180%] border border-white/80 dark:border-white/15 shadow-[0_24px_65px_rgba(17,19,21,0.24)] overflow-hidden"
        >
          {/* Obsidian & Periwinkle Glass Header */}
          <div className="px-4 py-3 bg-[#111315] dark:bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0 border-b border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-2xl bg-[#4F5BD5]/30 border border-[#A5B4FC]/40 flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-4 h-4 text-[#A5B4FC]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/35 animate-pulse shrink-0"
                    aria-hidden="true"
                  />
                  <h2 className="text-[12.5px] font-bold tracking-tight whitespace-nowrap">
                    CivicTriage AI • Slash &amp; Live Context
                  </h2>
                </div>
                <p className="text-[10.5px] text-slate-300 truncate">
                  {activeTicketCount} civic · {activePoliceCount} police · {bookedPnrCount} PNRs ·{' '}
                  {jobAppCount} jobs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleClearChat}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10.5px] font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
                title="Clear conversation"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close AI Help & Support"
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Compact Kerala Emergency Helpline Strip */}
          <EmergencyHelplineStrip compact />

          {/* @Mention Quick Routing Bar */}
          <div className="px-3 py-1.5 bg-white/50 dark:bg-slate-900/60 border-b border-black/5 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto shrink-0">
            {ASSISTANT_MENTIONS.map((m) => (
              <button
                key={m.handle}
                type="button"
                onClick={() => {
                  setInputValue(`${m.handle} `);
                  inputRef.current?.focus();
                }}
                className="px-2.5 py-1 rounded-full bg-[#4F5BD5]/12 dark:bg-[#7B83EB]/20 hover:bg-[#4F5BD5]/22 text-[10.5px] font-bold text-[#313DA8] dark:text-[#C7D2FE] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                title={`Mention ${m.label}`}
              >
                {m.handle}
              </button>
            ))}
          </div>

          {/* Scrollable Message History */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 bg-gradient-to-b from-slate-50/70 via-white/60 to-indigo-50/40 dark:from-slate-950/60 dark:via-slate-900/50 dark:to-indigo-950/30 min-h-[240px]"
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                      isUser
                        ? 'bg-[#111315] dark:bg-[#4F5BD5] text-white rounded-br-sm'
                        : msg.isError
                          ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-bl-sm'
                          : 'bg-white/90 dark:bg-slate-900/90 border border-black/8 dark:border-white/12 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    {isUser ? (
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    ) : (
                      <FormattedReplyText text={msg.text} />
                    )}

                    {/* Clickable Navigation Action Buttons inside AI messages */}
                    {!isUser && msg.actions && msg.actions.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-black/6 dark:border-white/10 flex flex-wrap gap-1.5">
                        {msg.actions.map((actionId) => {
                          const meta = ASSISTANT_ACTION_META[actionId];
                          if (!meta) return null;
                          return (
                            <button
                              key={actionId}
                              type="button"
                              onClick={() => handleActionClick(actionId)}
                              title={meta.description}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#4F5BD5]/12 dark:bg-[#7B83EB]/25 hover:bg-[#4F5BD5]/22 border border-[#4F5BD5]/30 text-[11px] font-bold text-[#313DA8] dark:text-[#E0E7FF] transition-colors cursor-pointer"
                            >
                              <ActionIcon action={actionId} />
                              <span>{meta.label}</span>
                              <ArrowRight className="w-3 h-3" aria-hidden="true" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Retry button on error bubble */}
                    {msg.isError && lastFailedPrompt && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => void sendMessage(lastFailedPrompt)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 text-[11px] font-bold text-rose-700 dark:text-rose-300 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" />
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="mt-1 px-1 text-[10px] font-mono text-slate-400">
                    {isUser ? 'You' : 'CivicTriage AI'} · {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {/* Animated Typing Indicator */}
            {isLoading && (
              <div className="flex flex-col items-start" aria-live="polite">
                <div className="rounded-2xl rounded-bl-sm bg-white/90 dark:bg-slate-900/90 border border-[#4F5BD5]/25 px-3.5 py-2.5 shadow-sm inline-flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#4F5BD5] animate-bounce [animation-delay:-0.24s]" />
                    <span className="w-2 h-2 rounded-full bg-[#7B83EB] animate-bounce [animation-delay:-0.12s]" />
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-300">
                    Checking live session &amp; drafting reply…
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Slash Command Popup when user types "/" */}
          {slashSuggestions.length > 0 && (
            <div className="px-3 py-2 bg-white/95 dark:bg-slate-900/95 border-t border-[#4F5BD5]/25 space-y-1 shrink-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#A5B4FC]">
                Slash Commands · Tap to run
              </p>
              {slashSuggestions.map((cmd) => (
                <button
                  key={cmd.command}
                  type="button"
                  onClick={() => void sendMessage(cmd.template)}
                  className="w-full text-left px-3 py-1.5 rounded-xl bg-[#4F5BD5]/10 dark:bg-[#7B83EB]/20 hover:bg-[#4F5BD5]/20 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="text-xs font-mono font-extrabold text-[#313DA8] dark:text-[#C7D2FE]">
                    {cmd.usage}
                  </span>
                  <span className="text-[10.5px] text-slate-600 dark:text-slate-300 truncate">
                    {cmd.description}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Quick-Action Prompt Chips */}
          <div className="px-3 pt-2 pb-2 bg-white/60 dark:bg-slate-900/65 border-t border-black/5 dark:border-white/10 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                Quick Prompts · Try /jobs /weekend /event
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {ASSISTANT_QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isLoading}
                  onClick={() => void sendMessage(prompt)}
                  className="text-left px-3 py-1.5 rounded-xl bg-white/85 dark:bg-slate-800/80 hover:bg-[#4F5BD5]/10 dark:hover:bg-[#7B83EB]/20 border border-black/5 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-snug transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="px-3 py-2.5 bg-white/85 dark:bg-slate-950/90 border-t border-black/5 dark:border-white/10 flex items-center gap-1.5 shrink-0"
          >
            <label htmlFor="civic-assistant-input" className="sr-only">
              Ask CivicTriage Assistant
            </label>
            <input
              id="civic-assistant-input"
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type /jobs, /weekend, /event or ask in EN/ML..."
              maxLength={1400}
              disabled={isLoading}
              className="flex-1 min-w-0 px-3.5 py-2 rounded-full bg-[#EFECE8]/90 dark:bg-slate-800/90 border border-black/5 dark:border-white/10 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F5BD5]/40"
            />
            <VoiceMicControl
              variant="compact"
              disabled={isLoading}
              onTranscript={(spoken) =>
                setInputValue((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken))
              }
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              aria-label="Send message"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#111315] dark:bg-white hover:opacity-90 disabled:opacity-45 text-white dark:text-slate-950 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </section>
      )}

      {/* Sleek Liquid Glass Obsidian Launcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Minimize AI Help & Support' : 'Open AI Help & Support'}
        className="group relative inline-flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 shadow-xl shadow-black/25 border border-white/25 transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7B83EB] opacity-90" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#A5B4FC] dark:bg-[#4F5BD5] ring-2 ring-white/50" />
        </span>
        {isOpen ? (
          <X className="w-4 h-4 shrink-0" aria-hidden="true" />
        ) : (
          <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
        )}
        <span className="text-xs font-bold tracking-tight whitespace-nowrap">
          AI Help &amp; Slash Commands
        </span>
      </button>
    </div>
  );
}
