import React from 'react';
import { Scissors, ShoppingBag, History, Users, Award, PhoneCall } from 'lucide-react';
import { TabType } from '../types';

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  cartCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  cartCount,
}) => {
  const tabs = [
    {
      id: 'services' as TabType,
      label: 'Services Menu',
      icon: Scissors,
    },
    {
      id: 'cart' as TabType,
      label: 'Order & Cart',
      icon: ShoppingBag,
      badge: cartCount > 0 ? cartCount : undefined,
    },
    {
      id: 'membership' as TabType,
      label: 'Membership',
      icon: Award,
    },
    {
      id: 'numbers' as TabType,
      label: 'Number History',
      icon: PhoneCall,
    },
    {
      id: 'history' as TabType,
      label: 'Sales History',
      icon: History,
    },
    {
      id: 'staff' as TabType,
      label: 'Staff',
      icon: Users,
    },
  ];

  return (
    <>
      {/* Desktop Tab Navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto no-scrollbar scroll-smooth" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  type="button"
                  className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'border-amber-700 text-amber-900 bg-amber-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-700' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-700 text-white leading-none">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Floating Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-1.5 relative min-w-[50px] cursor-pointer ${
                isActive ? 'text-amber-700 font-bold' : 'text-slate-500 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-amber-700 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] mt-0.5 whitespace-nowrap">
                {tab.id === 'membership' ? 'Members' : tab.id === 'numbers' ? 'Numbers' : tab.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};
