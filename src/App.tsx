import React, { useState, useEffect } from 'react';
import { TabType, CartItem, SalonService, Stylist, Order, SalonSettings, MembershipRecord } from './types';
import { SALON_SERVICES, STYLISTS, DEFAULT_SETTINGS } from './data/mockData';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ServicesTab } from './components/ServicesTab';
import { OrderSummaryTab } from './components/OrderSummaryTab';
import { SalesHistoryTab } from './components/SalesHistoryTab';
import { MembershipTab } from './components/MembershipTab';
import { NumberHistoryTab } from './components/NumberHistoryTab';
import { StaffTab, StaffMember, StaffServiceRecord } from './components/StaffTab';
import { ReceiptModal } from './components/ReceiptModal';
import { PinLockModal } from './components/PinLockModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { usePWA } from './hooks/usePWA';
import { WifiOff, Users } from 'lucide-react';
import {
  syncOrderToCloud,
  fetchSalesFromCloud,
  syncMembershipToCloud,
  fetchMembershipsFromCloud,
  syncStaffServiceToCloud,
} from './services/supabase';
import { getNextOrderNumber, sortOrdersDescending, migrateOrdersToSequential } from './utils/orderUtils';
import { formatIndianDate } from './utils/dateUtils';

// SSR-Safe Storage Helpers for robust Vercel / Next / Vite deployment
const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage fallback
  }
};

const safeRemoveItem = (key: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage fallback
  }
};

const OFFICIAL_STAFF_NAMES = [
  'Kunal',
  'Mashuk',
  'Vishal Thakur',
  'Sapna',
  'Juhi',
  'Vishal sir',
];

const INITIAL_STAFF_MEMBERS: StaffMember[] = [
  { id: 'staff-1', name: 'Kunal', role: 'Senior Hair Stylist', totalSalesThisMonth: 0, history: [] },
  { id: 'staff-2', name: 'Mashuk', role: 'Color & Texture Specialist', totalSalesThisMonth: 0, history: [] },
  { id: 'staff-3', name: 'Vishal Thakur', role: 'Senior Stylist & Grooming Expert', totalSalesThisMonth: 0, history: [] },
  { id: 'staff-4', name: 'Sapna', role: 'Senior Aesthetician & Skin Expert', totalSalesThisMonth: 0, history: [] },
  { id: 'staff-5', name: 'Juhi', role: 'Beauty Specialist & Makeup Artist', totalSalesThisMonth: 0, history: [] },
  { id: 'staff-6', name: 'Vishal sir', role: 'Creative Director & Master Stylist', totalSalesThisMonth: 0, history: [] },
];

const INITIAL_MEMBERSHIPS: MembershipRecord[] = [];

// Clean Slate Purge Routine (Clears local sales storage to guarantee 0% phone memory)
const PURGE_FLAG_KEY = 'enreach_clean_slate_production_v3';
function runDataPurgeIfRequired() {
  if (typeof window === 'undefined') return;
  try {
    // 0% Phone Memory: Wipe all past local sales caches
    safeRemoveItem('backstage_orders');
    safeRemoveItem('backstage_cloud_orders');
    safeRemoveItem('invoices');
    safeRemoveItem('sales_history');
    safeRemoveItem('enreach_orders_seq_reset_v5');
    safeSetItem(PURGE_FLAG_KEY, 'true');
  } catch (e) {
    console.warn('Storage purge notice:', e);
  }
}

// Run purge immediately before state initializers
runDataPurgeIfRequired();

export default function App() {
  const {
    isOnline,
    isInstallable,
    isInstalled,
    isIOS,
    showIOSModal,
    setShowIOSModal,
    install,
  } = usePWA();

  // Tab Navigation State
  const [currentTab, setCurrentTab] = useState<TabType>('services');
  const [isHistoryUnlocked, setIsHistoryUnlocked] = useState(false);
  const [isStaffUnlocked, setIsStaffUnlocked] = useState(false);
  const [pinModalConfig, setPinModalConfig] = useState<{
    isOpen: boolean;
    targetTab: 'history' | 'staff' | null;
    requiredPin: string;
    title: string;
    description: string;
  }>({
    isOpen: false,
    targetTab: null,
    requiredPin: '442401',
    title: 'Sales History Security Access',
    description: 'Enter confidential authorization PIN to access transactions & revenue ledgers.',
  });

  // Staff Performance Dashboard state (Initialized with 0 sales and empty history)
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => {
    try {
      const saved = safeGetItem('backstage_staff_performance');
      if (saved) {
        const parsed: StaffMember[] = JSON.parse(saved);
        const hasLegacyNames = parsed.some((s) => ['Aman', 'Rahul', 'Priya', 'Vikram', 'Sneha', 'Pooja'].includes(s.name));
        if (!hasLegacyNames && parsed.length === OFFICIAL_STAFF_NAMES.length) {
          return parsed;
        }
      }
      return INITIAL_STAFF_MEMBERS;
    } catch {
      return INITIAL_STAFF_MEMBERS;
    }
  });

  // Selected staff for Billing / Cart (Defaults to official staff Kunal)
  const [selectedBillingStaff, setSelectedBillingStaff] = useState<string>('Kunal');

  // Memberships State (persisted locally, clean initial state)
  const [memberships, setMemberships] = useState<MembershipRecord[]>(() => {
    try {
      const saved = safeGetItem('backstage_memberships');
      if (saved) {
        return JSON.parse(saved);
      }
      return INITIAL_MEMBERSHIPS;
    } catch {
      return INITIAL_MEMBERSHIPS;
    }
  });

  // Automatically revoke PIN authentication when user navigates away from sensitive tabs
  useEffect(() => {
    if (currentTab !== 'history') {
      setIsHistoryUnlocked(false);
    }
  }, [currentTab]);

  useEffect(() => {
    if (currentTab !== 'staff') {
      setIsStaffUnlocked(false);
    }
  }, [currentTab]);

  const handleSelectTab = (tab: TabType) => {
    if (tab === 'history') {
      if (isHistoryUnlocked) {
        setCurrentTab('history');
      } else {
        setPinModalConfig({
          isOpen: true,
          targetTab: 'history',
          requiredPin: '442401',
          title: 'Sales History Security Access',
          description: 'Enter confidential manager PIN to access financial records and receipts.',
        });
      }
    } else if (tab === 'staff') {
      if (isStaffUnlocked) {
        setCurrentTab('staff');
      } else {
        setPinModalConfig({
          isOpen: true,
          targetTab: 'staff',
          requiredPin: '442402',
          title: 'Staff Dashboard Security Access',
          description: 'Enter confidential manager PIN to access staff performance records and commissions.',
        });
      }
    } else {
      setCurrentTab(tab);
    }
  };

  // Cloud Synchronization state
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Synchronize all multi-year sales and membership data directly from Supabase Cloud (0% Phone Memory)
  const loadCloudData = async () => {
    setIsCloudSyncing(true);
    try {
      const [salesRes, memberRes] = await Promise.all([
        fetchSalesFromCloud(),
        fetchMembershipsFromCloud(),
      ]);

      if (salesRes.orders) {
        const cleansed = salesRes.orders.filter((o) => !['#9166', '#9169', '#9170', 'ORD-7793'].includes(o.id));
        setOrders(sortOrdersDescending(migrateOrdersToSequential(cleansed)));
      }

      if (memberRes.memberships && memberRes.memberships.length > 0) {
        setMemberships(memberRes.memberships);
      }
    } catch (err) {
      console.log('Cloud sync status:', err);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handlePinSuccess = () => {
    if (pinModalConfig.targetTab === 'history') {
      setIsHistoryUnlocked(true);
      setCurrentTab('history');
      // Automatically fetch & sync multi-year historical sales data from Supabase upon PIN entry
      loadCloudData();
    } else if (pinModalConfig.targetTab === 'staff') {
      setIsStaffUnlocked(true);
      setCurrentTab('staff');
      // Automatically fetch & sync multi-year historical sales data from Supabase upon PIN entry
      loadCloudData();
    }
    setPinModalConfig((prev) => ({ ...prev, isOpen: false, targetTab: null }));
  };

  // Salon Settings (persisted locally with official salon logo default, INR, and 0% tax)
  const [settings, setSettings] = useState<SalonSettings>(() => {
    const savedLogo = safeGetItem('enreach_salon_logo') || '';
    try {
      const saved = safeGetItem('backstage_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          salonName: 'Enreach Unisex Salon',
          currencySymbol: '₹',
          taxRate: 0,
          logoUrl: parsed.logoUrl || savedLogo || '/salon-logo.png',
        };
      }
      return { ...DEFAULT_SETTINGS, taxRate: 0, logoUrl: savedLogo || '/salon-logo.png' };
    } catch {
      return { ...DEFAULT_SETTINGS, taxRate: 0, logoUrl: savedLogo || '/salon-logo.png' };
    }
  });

  // Handler for uploading new official salon logo from device
  const handleLogoUploaded = (dataUrl: string) => {
    // 1. Immediately update React state so Header & Receipts render new logo
    setSettings((prev) => ({ ...prev, logoUrl: dataUrl }));

    // 2. Persist in localStorage
    safeSetItem('enreach_salon_logo', dataUrl);
    try {
      const saved = safeGetItem('backstage_settings');
      const parsed = saved ? JSON.parse(saved) : {};
      safeSetItem('backstage_settings', JSON.stringify({ ...parsed, logoUrl: dataUrl }));
    } catch {
      // fallback
    }

    // 3. Dynamically update document favicons and apple-touch-icon in the DOM
    if (typeof document !== 'undefined') {
      const iconSelectors = [
        "link[rel*='icon']",
        "link[rel='shortcut icon']",
        "link[rel='apple-touch-icon']",
      ];
      iconSelectors.forEach((sel) => {
        document.querySelectorAll<HTMLLinkElement>(sel).forEach((el) => {
          el.href = dataUrl;
        });
      });
    }

    // 4. Overwrite physical public/ files on server
    fetch('/api/upload-logo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: dataUrl }),
    }).catch((err) => {
      console.warn('Logo file sync notice:', err);
    });
  };

  // Orders Ledger (0% Phone Memory: strictly held in volatile memory and synced to Supabase Cloud)
  const [orders, setOrders] = useState<Order[]>([]);

  // Active Billing Cart
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = safeGetItem('backstage_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Selected Specialist for quick billing
  const [selectedStylistId, setSelectedStylistId] = useState<string>(STYLISTS[0].id);

  // Active Receipt Modal
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);

  // Clear legacy keys on mount
  useEffect(() => {
    runDataPurgeIfRequired();
  }, []);

  // Persist settings
  useEffect(() => {
    try {
      safeSetItem('backstage_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [settings]);

  // NOTE: orders are NOT saved to phone LocalStorage to guarantee 0% Phone Memory usage!

  // Persist cart
  useEffect(() => {
    try {
      safeSetItem('backstage_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [cartItems]);

  // Persist staff performance data
  useEffect(() => {
    try {
      safeSetItem('backstage_staff_performance', JSON.stringify(staffMembers));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [staffMembers]);

  // Persist memberships
  useEffect(() => {
    try {
      safeSetItem('backstage_memberships', JSON.stringify(memberships));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [memberships]);

  // Initial cloud synchronization check on app launch
  useEffect(() => {
    loadCloudData();
  }, []);

  // Audio chime for luxury payment completion
  const playLuxuryChime = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const now = ctx.currentTime;
      // High chord: E5 (659.25Hz), G#5 (830.61Hz), B5 (987.77Hz)
      const freqs = [659.25, 830.61, 987.77];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 1.3);
      });
    } catch {
      // AudioContext unavailable
    }
  };

  // Cart operations
  const handleAddToCart = (service: SalonService, stylist: Stylist) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.service.id === service.id);
      if (existing) {
        return prev.map((item) =>
          item.service.id === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          service,
          quantity: 1,
          stylistId: stylist.id,
          stylistName: stylist.name,
        },
      ];
    });
  };

  const handleUpdateCartQuantity = (serviceId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.service.id === serviceId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveCartItem = (serviceId: string) => {
    setCartItems((prev) => prev.filter((item) => item.service.id !== serviceId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Finalize order: updates Sales History, Staff performance, and activates/renews Membership if toggled
  const handleCompleteOrder = (newOrder: Order) => {
    const assignedStaff = newOrder.staffName || selectedBillingStaff || 'Kunal';
    const orderWithStaff: Order = {
      ...newOrder,
      staffName: assignedStaff,
    };

    // a) Update the main "Sales History" list (sorted descending with newest invoice # at top)
    setOrders((prev) => sortOrdersDescending([orderWithStaff, ...prev]));
    setCartItems([]);
    playLuxuryChime();
    setActiveReceiptOrder(orderWithStaff);

    // b) Update the selected Staff's personal sales total and history table in the Staff Dashboard
    const serviceNames = orderWithStaff.items.length > 0
      ? orderWithStaff.items.map((i) => `${i.service.name}${i.quantity > 1 ? ` (x${i.quantity})` : ''}`).join(', ')
      : 'Salon Service';

    const newHistoryRecord: StaffServiceRecord = {
      id: `rec-${Date.now()}`,
      date: formatIndianDate(new Date()),
      clientName: orderWithStaff.clientName || 'Walk-in Client',
      serviceName: serviceNames,
      amount: orderWithStaff.total,
    };

    setStaffMembers((prev) =>
      prev.map((staff) => {
        if (staff.name === assignedStaff) {
          return {
            ...staff,
            totalSalesThisMonth: staff.totalSalesThisMonth + orderWithStaff.total,
            history: [newHistoryRecord, ...staff.history],
          };
        }
        return staff;
      })
    );

    // c) If client is an Enreach Member (button was ON during checkout), automatically activate/renew 1-Year (365 Days) membership
    if (orderWithStaff.isMember) {
      const today = new Date();
      const expiry = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
      const startDateStr = formatIndianDate(today);
      const expiryDateStr = formatIndianDate(expiry);

      const newMemberRecord: MembershipRecord = {
        id: `MEM-${Math.floor(1000 + Math.random() * 9000)}`,
        clientName: orderWithStaff.clientName || 'Valued Member',
        clientPhone: orderWithStaff.clientPhone || '+91 98000 00000',
        startDate: startDateStr,
        expiryDate: expiryDateStr,
        isActive: true,
      };

      setMemberships((prev) => {
        const normPhone = (orderWithStaff.clientPhone || '').replace(/\s+/g, '');
        const existingIdx = prev.findIndex(
          (m) => m.clientPhone.replace(/\s+/g, '') === normPhone
        );

        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            clientName: orderWithStaff.clientName || updated[existingIdx].clientName,
            startDate: startDateStr,
            expiryDate: expiryDateStr,
            isActive: true,
          };
          syncMembershipToCloud(updated[existingIdx]).catch(() => {});
          return updated;
        } else {
          syncMembershipToCloud(newMemberRecord).catch(() => {});
          return [newMemberRecord, ...prev];
        }
      });
    }

    // d) Asynchronously persist directly to Supabase Cloud Database (0% Phone LocalStorage Usage)
    syncOrderToCloud(orderWithStaff, {
      name: orderWithStaff.clientName,
      phone: orderWithStaff.clientPhone,
      isMember: Boolean(orderWithStaff.isMember),
    }).catch((err) => {
      console.warn('Supabase sync notice:', err);
    });

    syncStaffServiceToCloud(assignedStaff, newHistoryRecord).catch((err) => {
      console.warn('Supabase staff sync notice:', err);
    });
  };

  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + item.service.price * item.quantity,
    0
  );
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col selection:bg-amber-100 selection:text-amber-950">
      {/* Offline Toast Banner */}
      {!isOnline && (
        <div className="bg-[#B45309] text-white text-xs px-4 py-1.5 flex items-center justify-center gap-2 font-medium z-50 sticky top-0 shadow-md">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Terminal Active — All orders and services remain cached locally.</span>
        </div>
      )}

      {/* Header (Static Prominent Logo & Cart & In-App Install Button) */}
      <Header
        cartItemCount={cartItemCount}
        cartSubtotal={cartSubtotal}
        onOpenCart={() => handleSelectTab('cart')}
        currentTab={currentTab}
        currencySymbol={settings.currencySymbol}
        logoUrl={settings.logoUrl}
        isInstallable={isInstallable && !isInstalled}
        onInstall={install}
      />

      {/* Navigation (Desktop Tabs & Mobile Bottom Bar) */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        cartCount={cartItemCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-24 md:pb-10 safe-pl safe-pr">
        {currentTab === 'services' && (
          <ServicesTab
            services={SALON_SERVICES}
            stylists={STYLISTS}
            selectedStylistId={selectedStylistId}
            onSelectStylist={setSelectedStylistId}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            currencySymbol={settings.currencySymbol}
            onGoToCart={() => handleSelectTab('cart')}
          />
        )}

        {currentTab === 'cart' && (
          <div className="space-y-4">
            {/* Served By / Select Staff Dropdown Menu in Order & Cart / Billing Section */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <label htmlFor="staff-select-header" className="block text-sm font-bold text-slate-900">
                    Served By / Select Staff
                  </label>
                  <p className="text-xs text-slate-500">
                    Assign this invoice to a stylist to update their performance &amp; sales
                  </p>
                </div>
              </div>

              <div className="min-w-[220px]">
                <select
                  id="staff-select-header"
                  value={selectedBillingStaff}
                  onChange={(e) => setSelectedBillingStaff(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer transition-colors"
                >
                  {OFFICIAL_STAFF_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <OrderSummaryTab
              cartItems={cartItems}
              onUpdateQuantity={handleUpdateCartQuantity}
              onRemoveItem={handleRemoveCartItem}
              onClearCart={handleClearCart}
              onCompleteOrder={handleCompleteOrder}
              taxRate={0}
              currencySymbol={settings.currencySymbol}
              onExploreServices={() => handleSelectTab('services')}
              selectedStaff={selectedBillingStaff}
              onSelectStaff={setSelectedBillingStaff}
              staffList={OFFICIAL_STAFF_NAMES}
              existingOrders={orders}
              nextOrderNumber={getNextOrderNumber(orders)}
              memberships={memberships}
            />
          </div>
        )}

        {/* Membership Tab */}
        {currentTab === 'membership' && (
          <MembershipTab
            memberships={memberships}
            orders={orders}
            currencySymbol={settings.currencySymbol}
          />
        )}

        {/* Number History Tab */}
        {currentTab === 'numbers' && (
          <NumberHistoryTab
            orders={orders}
            memberships={memberships}
            currencySymbol={settings.currencySymbol}
          />
        )}

        {/* Sales History Tab with Always-Visible Timeframe Breakdowns and Today's Sales */}
        {currentTab === 'history' && (
          <SalesHistoryTab
            orders={orders}
            currencySymbol={settings.currencySymbol}
            onViewReceipt={(order) => setActiveReceiptOrder(order)}
            onUpdateOrders={setOrders}
            onRefreshCloud={loadCloudData}
            isCloudSyncing={isCloudSyncing}
            onLockLedger={() => {
              setIsHistoryUnlocked(false);
              setCurrentTab('services');
            }}
          />
        )}

        {/* Staff Dashboard View with 4 Timeframe Filters (Today's, Weekly, Monthly, Yearly) without commission label */}
        {currentTab === 'staff' && (
          <StaffTab
            staffMembers={staffMembers}
            orders={orders}
            currencySymbol={settings.currencySymbol}
            onLockStaff={() => {
              setIsStaffUnlocked(false);
              setCurrentTab('services');
            }}
          />
        )}
      </main>

      {/* Floating In-App Install Prompt Banner & iOS Modal Guide */}
      <PWAInstallPrompt
        isInstalled={isInstalled}
        isInstallable={isInstallable}
        isIOS={isIOS}
        showIOSModal={showIOSModal}
        onCloseIOSModal={() => setShowIOSModal(false)}
        onInstall={install}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        order={activeReceiptOrder}
        onClose={() => setActiveReceiptOrder(null)}
        settings={settings}
      />

      {/* PIN Lock Modal for Protected Tabs (Sales History: 442401 & Staff: 442402) */}
      <PinLockModal
        isOpen={pinModalConfig.isOpen}
        onClose={() => setPinModalConfig((prev) => ({ ...prev, isOpen: false, targetTab: null }))}
        onSuccess={handlePinSuccess}
        requiredPin={pinModalConfig.requiredPin}
        title={pinModalConfig.title}
        description={pinModalConfig.description}
      />
    </div>
  );
}
