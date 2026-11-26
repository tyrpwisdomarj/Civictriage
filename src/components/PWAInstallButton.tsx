import { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        data-testid="pwa-install-btn"
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-900 bg-sky-50/90 hover:bg-sky-100 border border-sky-200/90 hover:border-sky-300 rounded-xl transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
        title="Install CivicTriage LSG on your device for offline access"
      >
        <Download className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          data-testid="pwa-ios-install-btn"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-900 bg-sky-50/90 hover:bg-sky-100 border border-sky-200/90 hover:border-sky-300 rounded-xl transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          title="Install CivicTriage LSG on iPhone or iPad"
        >
          <Share className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-slate-900">
                  Install CivicTriage LSG on iOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close installation guide"
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-600 list-decimal list-inside">
                <li>
                  Tap the <strong className="text-slate-900">Share</strong> button in the Safari
                  toolbar.
                </li>
                <li>
                  Scroll down and tap{' '}
                  <strong className="text-slate-900">Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong className="text-slate-900">Add</strong> to launch CivicTriage LSG in
                  standalone app mode.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 py-2.5 text-xs font-semibold text-white shadow-sm transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
