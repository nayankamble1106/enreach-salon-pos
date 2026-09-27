import React from 'react';
import { ShoppingBag, Download } from 'lucide-react';
import { TabType } from '../types';

interface HeaderProps {
  cartItemCount: number;
  cartSubtotal: number;
  onOpenCart: () => void;
  currentTab?: TabType;
  currencySymbol: string;
  logoUrl?: string;
  isInstallable?: boolean;
  onInstall?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartItemCount,
  cartSubtotal,
  onOpenCart,
  currentTab,
  currencySymbol,
  isInstallable,
  onInstall,
}) => {
  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand identity with official salon emblem logo */}
        <div className="flex items-center gap-3">
          {/* Salon Logo */}
          <div className="relative select-none flex-shrink-0">
            <img
              src="/salon-logo.png"
              alt="Salon Logo"
              className="w-10 h-10 object-contain rounded-full shadow-xs"
              referrerPolicy="no-referrer"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg sm:text-xl tracking-tight text-slate-900 leading-none">
                Enreach Unisex Salon
              </h1>
              <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                POS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5 hidden xs:block">
              Luxury Studio &amp; Billing Terminal
            </p>
          </div>
        </div>

        {/* Right side: Install App action + Cart / Total Collection Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isInstallable && onInstall && (
            <button
              type="button"
              onClick={onInstall}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors shadow-2xs cursor-pointer"
              title="Add Enreach Salon to Home Screen"
            >
              <Download className="w-3.5 h-3.5 text-amber-700" />
              <span>Install App</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCart}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all shadow-xs cursor-pointer ${
              currentTab === 'cart'
                ? 'border-amber-600 bg-amber-50 text-amber-900 ring-1 ring-amber-500/20'
                : 'border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <div className="relative">
              <ShoppingBag className="w-4 h-4 text-slate-700" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-amber-700 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </div>
            <span className="font-bold text-slate-900">
              {cartSubtotal > 0 ? `${currencySymbol}${cartSubtotal.toLocaleString('en-IN')}` : 'Cart'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
