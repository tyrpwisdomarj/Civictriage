import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const raw = error instanceof Error ? error.message : 'An unexpected error occurred.';
    let friendly = raw;
    try {
      const parsed = JSON.parse(raw) as { error?: string; operationType?: string };
      if (parsed && typeof parsed.error === 'string') {
        friendly = parsed.error.includes('Missing or insufficient permissions')
          ? 'Your session does not have permission for this cloud vault action. Please sign in again or switch accounts.'
          : parsed.error;
      }
    } catch {
      // Keep raw message if not structured JSON
    }
    return { hasError: true, errorMessage: friendly };
  }

  componentDidCatch(error: unknown) {
    console.error('CivicTriage ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#EAE8E4] dark:bg-[#0A0D14] text-[#111315] dark:text-slate-100">
          <div className="max-w-md w-full rounded-[28px] bg-white/75 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/80 dark:border-white/15 p-7 shadow-[0_24px_60px_rgba(17,19,21,0.14)] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">
                Something interrupted the workspace
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {this.state.errorMessage || 'A runtime error occurred while rendering this view.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reload CivicTriage LSG
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
