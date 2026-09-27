import React, { useState } from 'react';
import { Download, X, Share, PlusSquare, Sparkles } from 'lucide-react';

interface PWAInstallPromptProps {
  isInstalled: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  showIOSModal: boolean;
  onCloseIOSModal: () => void;
  onInstall: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  isInstalled,
  isInstallable,
  isIOS,
  showIOSModal,
  onCloseIOSModal,
  onInstall,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // If already running standalone or user closed banner, hide banner
  const showBanner = !isInstalled && isInstallable && !isDismissed;

  return (
    <>
      {/* Floating Bottom Install Banner (Mobile & Desktop) */}
      {showBanner && (
        <div className="fixed bottom-18 md:bottom-5 left-4 right-4 md:left-auto md:right-5 md:max-w-md z-40 bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-amber-500/40 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/salon-logo.png"
                alt="Enreach Salon"
                className="w-10 h-10 rounded-xl object-contain bg-white shadow-xs border border-amber-400/30 flex-shrink-0"
              />
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Install Enreach Unisex Salon App
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Add to Home Screen for fast standalone offline billing
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onInstall}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Add to Home Screen</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}

      {/* Guided iOS Safari Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-xs">
                  iOS
                </div>
                <h3 className="font-bold text-slate-900 text-base">Add to Home Screen</h3>
              </div>
              <button
                type="button"
                onClick={onCloseIOSModal}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-slate-600">
              <p className="text-slate-700 font-medium">
                To install <strong>Enreach Salon</strong> on your iPhone or iPad:
              </p>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Step 1</span>
                  <span>Tap the <strong>Share</strong> icon in the Safari navigation bar.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Step 2</span>
                  <span>Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onCloseIOSModal}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
