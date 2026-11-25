import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Compass,
  FilePlus2,
  LayoutDashboard,
  MessageCircle,
  RotateCcw,
  Send,
  Shield,
  Sparkles,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import {
  ASSISTANT_ACTION_META,
  ASSISTANT_QUICK_PROMPTS,
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
}

function formatClockTime(date: Date = new Date()): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createWelcomeMessage(): AssistantChatMessage {
  return {
    id: `welcome-${Date.now()}`,
    role: 'model',
    text: 'Namaskaram! I am your CivicTriage LSG & Mobility assistant. Ask me in English, Malayalam, or Manglish about reporting civic issues, checking your active tickets or booked PNRs, Kerala routes, or UPI QR payments.',
    timestamp: formatClockTime(),
    actions: ['citizen_report', 'travel_explorer'],
  };
}

function ActionIcon({ action }: { action: AssistantActionId }) {
  switch (action) {
    case 'citizen_report':
      return <FilePlus2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'officer_dashboard':
      return <LayoutDashboard className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'police_desk':
      return <Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'travel_explorer':
      return <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
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
                className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
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
}: AssistantChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>(() => [
    createWelcomeMessage(),
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

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
    setMessages((prev) => [...prev.filter((m) => !m.isError), userMsg]);
    setInputValue('');
    setIsLoading(true);
    setLastFailedPrompt(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Send conversational turns (skip synthetic initial welcome greeting so history starts with user)
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
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      const errText =
        err instanceof Error
          ? err.message
          : 'Unable to reach CivicTriage Assistant right now.';
      setLastFailedPrompt(text);
      setMessages((prev) => [
        ...prev,
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
    setMessages([createWelcomeMessage()]);
  };

  const handleActionClick = (action: AssistantActionId) => {
    onNavigateAction(action);
    // Keep the chat compact on small viewports after navigating
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

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Daylight Glassmorphism Chat Drawer */}
      {isOpen && (
        <section
          aria-label="CivicTriage Assistant chat window"
          className="mb-3 w-[calc(100vw-2rem)] sm:w-96 max-h-[min(670px,86vh)] flex flex-col rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl shadow-sky-950/15 overflow-hidden"
        >
          {/* Vibrant Daylight Header */}
          <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-600 text-white flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-white" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-200 ring-2 ring-emerald-200/40 animate-pulse shrink-0"
                    aria-hidden="true"
                  />
                  <h2 className="text-[12.5px] font-bold tracking-tight whitespace-nowrap">
                    CivicTriage Assistant • Online
                  </h2>
                </div>
                <p className="text-[10.5px] text-sky-50/95 truncate">
                  {activeTicketCount} civic · {activePoliceCount} police · {bookedPnrCount} PNRs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleClearChat}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-[10.5px] font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
                title="Clear conversation"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
                Clear Chat
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close AI Help & Support"
                className="p-1 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Compact Kerala Emergency Helpline Strip */}
          <EmergencyHelplineStrip compact />

          {/* Scrollable Message History */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 bg-gradient-to-b from-sky-50/60 via-white to-emerald-50/40 min-h-[260px]"
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
                        ? 'bg-gradient-to-r from-emerald-500 to-sky-600 text-white rounded-br-sm'
                        : msg.isError
                          ? 'bg-rose-50 border border-rose-200 text-rose-800 rounded-bl-sm'
                          : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-sm'
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
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {msg.actions.map((actionId) => {
                          const meta = ASSISTANT_ACTION_META[actionId];
                          return (
                            <button
                              key={actionId}
                              type="button"
                              onClick={() => handleActionClick(actionId)}
                              title={meta.description}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-50 to-sky-50 hover:from-emerald-100 hover:to-sky-100 border border-emerald-200/90 text-[11px] font-bold text-emerald-800 transition-colors cursor-pointer"
                            >
                              <ActionIcon action={actionId} />
                              <span>{meta.label}</span>
                              <ArrowRight className="w-3 h-3 text-sky-600" aria-hidden="true" />
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-rose-100 border border-rose-200 text-[11px] font-bold text-rose-700 cursor-pointer"
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
                <div className="rounded-2xl rounded-bl-sm bg-white border border-sky-200/80 px-3.5 py-2.5 shadow-sm inline-flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.24s]" />
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.12s]" />
                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-bounce" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    Checking live session &amp; drafting reply…
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* 4 One-Click Quick-Action Prompt Chips above the Input Bar */}
          <div className="px-3 pt-2 pb-2 bg-slate-50/90 border-t border-slate-200/80 shrink-0">
            <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Quick Questions
            </div>
            <div className="grid grid-cols-1 gap-1">
              {ASSISTANT_QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isLoading}
                  onClick={() => void sendMessage(prompt)}
                  className="text-left px-2.5 py-1 rounded-lg bg-white hover:bg-sky-50 hover:border-sky-300 border border-slate-200/90 text-[11px] font-semibold text-slate-700 leading-snug shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="px-3 py-2.5 bg-white border-t border-slate-200/90 flex items-center gap-1.5 shrink-0"
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
              placeholder="Ask in EN, Malayalam, or Manglish..."
              maxLength={1400}
              disabled={isLoading}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400"
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
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-600 hover:from-emerald-600 hover:to-sky-700 disabled:opacity-45 text-white shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </section>
      )}

      {/* Sleek Floating Launcher Button with Emerald-and-Blue Gradient Badge & Pulse Indicator */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Minimize AI Help & Support' : 'Open AI Help & Support'}
        className="group relative inline-flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-600 hover:from-emerald-600 hover:via-teal-600 hover:to-sky-700 text-white shadow-xl shadow-sky-900/25 border border-white/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-90" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-100 ring-2 ring-white/60" />
        </span>
        {isOpen ? (
          <X className="w-4 h-4 shrink-0" aria-hidden="true" />
        ) : (
          <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
        )}
        <span className="text-xs font-bold tracking-tight whitespace-nowrap">
          AI Help &amp; Support
        </span>
      </button>
    </div>
  );
}
