import React, { useState, useEffect } from 'react';
import { TabType, CartItem, SalonService, Stylist, Order, SalonSettings, MembershipRecord, LoyaltyPass } from './types';
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
  resetCloudOrders,
  isSupabaseConfigured,
} from './services/supabase';
import { getNextOrderNumber, sortOrdersDescending, migrateOrdersToSequential } from './utils/orderUtils';
import { formatIndianDate } from './utils/dateUtils';
import {
  runOneTimePermanentWipeoutSync,
  purgeOnlyHistories,
  OFFICIAL_STAFF_MEMBERS,
} from './utils/purgeHistories';

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

  // Staff Performance Dashboard state (Directly initialized to 0 sales and empty staff history logs [])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => {
    try {
      const isClean = safeGetItem('enreach_delivery_clean_v2');
      if (!isClean) {
        safeSetItem('enreach_delivery_clean_v2', 'true');
        safeSetItem('backstage_staff_performance', JSON.stringify(INITIAL_STAFF_MEMBERS));
        return INITIAL_STAFF_MEMBERS;
      }
      const saved = safeGetItem('backstage_staff_performance');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((s) => s && s.name !== 'Aman');
        }
      }
    } catch {}
    return INITIAL_STAFF_MEMBERS;
  });

  // Selected staff for Billing / Cart (Defaults to official staff Kunal)
  const [selectedBillingStaff, setSelectedBillingStaff] = useState<string>('Kunal');

  // Memberships State (Preserves existing cleaned members and loyalty passes in LocalStorage)
  const [memberships, setMemberships] = useState<MembershipRecord[]>(() => {
    try {
      const saved = safeGetItem('backstage_memberships');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Loyalty Member Passes State (Preserves existing cleaned passes in LocalStorage)
  const [loyaltyPasses, setLoyaltyPasses] = useState<LoyaltyPass[]>(() => {
    try {
      const saved = safeGetItem('backstage_loyalty_passes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Services Catalog State (Synced with Firebase Realtime Database & Cached Offline)
  const [services, setServices] = useState<SalonService[]>(() => {
    try {
      const storedVersion = safeGetItem('backstage_services_version');
      if (storedVersion !== 'v3_updated_services_catalog') {
        safeSetItem('backstage_services_version', 'v3_updated_services_catalog');
        safeSetItem('backstage_services', JSON.stringify(SALON_SERVICES));
        if (typeof window !== 'undefined' && window.salonFirebase?.syncServicesList) {
          window.salonFirebase.syncServicesList(SALON_SERVICES);
        }
        return SALON_SERVICES;
      }
      if (typeof window !== 'undefined' && window.__salonLastFirebaseServices && window.__salonLastFirebaseServices.length > 0) {
        return window.__salonLastFirebaseServices;
      }
      const saved = safeGetItem('backstage_services');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return SALON_SERVICES;
  });

  // Dynamic Custom Categories (e.g. Products, Spa)
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.__salonLastFirebaseCategories && window.__salonLastFirebaseCategories.length > 0) {
        return window.__salonLastFirebaseCategories;
      }
      const saved = safeGetItem('backstage_service_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });

  // Service Manager CRUD Handlers with Instant Multi-Device Firebase RTDB Sync
  const handleAddService = (newService: SalonService) => {
    setServices((prev) => {
      const updated = [...prev, newService];
      safeSetItem('backstage_services', JSON.stringify(updated));
      return updated;
    });
    if (typeof window !== 'undefined' && window.salonFirebase) {
      window.salonFirebase.syncServiceItem?.(newService);
    }
  };

  const handleUpdateService = (updatedService: SalonService) => {
    setServices((prev) => {
      const updated = prev.map((s) => (s.id === updatedService.id ? updatedService : s));
      safeSetItem('backstage_services', JSON.stringify(updated));
      return updated;
    });
    if (typeof window !== 'undefined' && window.salonFirebase) {
      window.salonFirebase.syncServiceItem?.(updatedService);
    }
  };

  const handleDeleteService = (serviceId: string) => {
    setServices((prev) => {
      const updated = prev.filter((s) => s.id !== serviceId);
      safeSetItem('backstage_services', JSON.stringify(updated));
      return updated;
    });
    // Remove from cart if item is currently in cart
    setCartItems((prev) => prev.filter((item) => item.service.id !== serviceId));
    if (typeof window !== 'undefined' && window.salonFirebase) {
      window.salonFirebase.deleteServiceItem?.(serviceId);
    }
  };

  const handleAddCategory = (categoryName: string) => {
    setCustomCategories((prev) => {
      if (prev.includes(categoryName)) return prev;
      const updated = [...prev, categoryName];
      safeSetItem('backstage_service_categories', JSON.stringify(updated));
      if (typeof window !== 'undefined' && window.salonFirebase?.syncCategories) {
        window.salonFirebase.syncCategories(updated);
      }
      return updated;
    });
  };

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

  // Synchronize multi-year sales, memberships, and staff data across Firebase Realtime DB and cloud mirrors
  const loadCloudData = async () => {
    setIsCloudSyncing(true);
    try {
      // 1. Instantly pull from Firebase Realtime DB if available
      if (typeof window !== 'undefined' && window.salonFirebase) {
        const fbOrders = window.salonFirebase.getOrders();
        if (fbOrders.length > 0) {
          setOrders(sortOrdersDescending(migrateOrdersToSequential(fbOrders)));
        }
        const fbMembers = window.salonFirebase.getMemberships();
        if (fbMembers.length > 0) {
          setMemberships(fbMembers);
        }
        const fbPasses = window.salonFirebase.getLoyaltyPasses?.();
        if (fbPasses && fbPasses.length > 0) {
          setLoyaltyPasses(fbPasses);
        }
        const fbStaff = window.salonFirebase.getStaff();
        if (fbStaff.length > 0) {
          setStaffMembers(
            fbStaff
              .filter((s) => s && s.name !== 'Aman')
              .map((s) => ({
                ...s,
                history: Array.isArray(s.history)
                  ? s.history
                  : s.history
                  ? (Object.values(s.history) as StaffServiceRecord[])
                  : [],
              }))
          );
        }
        const fbServices = window.salonFirebase.getServices?.();
        if (fbServices && fbServices.length > 0) {
          setServices(fbServices);
        }
        const fbCats = window.salonFirebase.getCategories?.();
        if (fbCats && fbCats.length > 0) {
          setCustomCategories(fbCats);
        }
      }

      // 2. Fetch from cloud storage mirror ONLY if Supabase is configured
      if (isSupabaseConfigured()) {
        const [salesRes, memberRes] = await Promise.all([
          fetchSalesFromCloud(),
          fetchMembershipsFromCloud(),
        ]);

        if (salesRes.orders && salesRes.orders.length > 0) {
          setOrders((prev) => {
            const merged = [...prev];
            salesRes.orders.forEach((co) => {
              if (!merged.some((m) => m.id === co.id)) {
                merged.push(co);
              }
            });
            return sortOrdersDescending(migrateOrdersToSequential(merged));
          });
        }

        if (memberRes.memberships && memberRes.memberships.length > 0) {
          setMemberships((prev) => {
            const merged = [...prev];
            memberRes.memberships.forEach((cm) => {
              if (!merged.some((m) => m.id === cm.id || m.clientPhone === cm.clientPhone)) {
                merged.push(cm);
              }
            });
            return merged;
          });
        }
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
          logoUrl: parsed.logoUrl || savedLogo || '/salon-logo.jpg',
        };
      }
      return { ...DEFAULT_SETTINGS, taxRate: 0, logoUrl: savedLogo || '/salon-logo.jpg' };
    } catch {
      return { ...DEFAULT_SETTINGS, taxRate: 0, logoUrl: savedLogo || '/salon-logo.jpg' };
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

      const manifestTag = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
      if (manifestTag) {
        manifestTag.href = `/manifest.json?v=${Date.now()}`;
      }
    }

    // 4. Overwrite physical public/ files on server
    fetch('/api/upload-logo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: dataUrl }),
    }).then(() => {
      if ('caches' in window) {
        caches.open('enreach-salon-pos-v1').then((cache) => {
          fetch('/salon-logo.png?v=' + Date.now()).then((res) => {
            if (res.ok) cache.put('/salon-logo.png', res);
          }).catch(() => {});
        }).catch(() => {});
      }
    }).catch((err) => {
      console.warn('Logo file sync notice:', err);
    });
  };

  // 1. Sales History Ledger: Strictly initialized to an empty array [] (First live sale starts at #1)
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const isClean = safeGetItem('enreach_delivery_clean_v2');
      if (!isClean) {
        safeSetItem('enreach_delivery_clean_v2', 'true');
        safeRemoveItem('backstage_orders');
        safeRemoveItem('sales_history');
        safeRemoveItem('invoices');
        safeRemoveItem('backstage_cloud_orders');
        safeRemoveItem('backstage_cart');
        safeRemoveItem('backstage_number_history');
        safeRemoveItem('backstage_client_logs');
        return [];
      }
      const saved = safeGetItem('backstage_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  // Sales History alias
  const salesHistory = orders;
  const setSalesHistory = setOrders;

  // 2. Staff Performance History / Service Logs: Strictly initialized to an empty array []
  const [staffLogs, setStaffLogs] = useState<StaffServiceRecord[]>([]);

  // 3. Number History / Client Phone Logs: Strictly initialized to an empty array []
  const [numberHistory, setNumberHistory] = useState<{ phone: string; visits: number }[]>([]);

  // 4. Initial Invoice / Order Counter: Hard reset strictly to 0 so the very first order creates Bill #1
  const [lastOrderId, setLastOrderId] = useState<number>(0);
  const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState<number>(0);

  // Active Billing Cart: Directly initialized to 100% empty array []
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Selected Specialist for quick billing
  const [selectedStylistId, setSelectedStylistId] = useState<string>(STYLISTS[0].id);

  // Active Receipt Modal
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);

  // Edit Services Mode (Shared with Members & Loyalty section for deletion access)
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Multi-Device Real-time Firebase Synchronization Listeners
  useEffect(() => {
    // 1. Initial check if Firebase already loaded data
    if (typeof window !== 'undefined') {
      if (window.__salonLastFirebaseStaff && window.__salonLastFirebaseStaff.length > 0) {
        setStaffMembers(window.__salonLastFirebaseStaff);
      }
      if (window.__salonLastFirebaseServices && window.__salonLastFirebaseServices.length > 0) {
        setServices(window.__salonLastFirebaseServices);
      }
      if (window.__salonLastFirebaseCategories && window.__salonLastFirebaseCategories.length > 0) {
        setCustomCategories(window.__salonLastFirebaseCategories);
      }
    }

    // 2. Real-time Firebase listeners via custom events
    const handleFirebaseOrders = (e: CustomEvent<Order[]>) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setOrders(sortOrdersDescending(migrateOrdersToSequential(e.detail)));
      }
    };

    const handleFirebaseOrderAdded = (e: CustomEvent<Order>) => {
      const added = e.detail;
      if (added && added.id) {
        setOrders((prev) => {
          if (prev.some((o) => o.id === added.id)) {
            return prev;
          }
          return sortOrdersDescending(migrateOrdersToSequential([added, ...prev]));
        });
      }
    };

    const handleFirebaseMembers = (e: CustomEvent<MembershipRecord[]>) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setMemberships(e.detail);
      }
    };

    const handleFirebaseStaff = (e: CustomEvent<StaffMember[]>) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setStaffMembers(
          e.detail
            .filter((s) => s && s.name !== 'Aman')
            .map((s) => ({
              ...s,
              history: Array.isArray(s.history)
                ? s.history
                : s.history
                ? (Object.values(s.history) as StaffServiceRecord[])
                : [],
            }))
        );
      }
    };

    const handleFirebaseServices = (e: CustomEvent<SalonService[]>) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setServices(e.detail);
      }
    };

    const handleFirebaseCategories = (e: CustomEvent<string[]>) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setCustomCategories(e.detail);
      }
    };

    const handleFirebaseLoyaltyPasses = (e: CustomEvent<LoyaltyPass[]>) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setLoyaltyPasses(e.detail);
      }
    };

    window.addEventListener('salon:firebase-orders-updated', handleFirebaseOrders as EventListener);
    window.addEventListener('salon:firebase-order-added', handleFirebaseOrderAdded as EventListener);
    window.addEventListener('salon:firebase-memberships-updated', handleFirebaseMembers as EventListener);
    window.addEventListener('salon:firebase-loyalty-passes-updated', handleFirebaseLoyaltyPasses as EventListener);
    window.addEventListener('salon:firebase-staff-updated', handleFirebaseStaff as EventListener);
    window.addEventListener('salon:firebase-services-updated', handleFirebaseServices as EventListener);
    window.addEventListener('salon:firebase-categories-updated', handleFirebaseCategories as EventListener);

    return () => {
      window.removeEventListener('salon:firebase-orders-updated', handleFirebaseOrders as EventListener);
      window.removeEventListener('salon:firebase-order-added', handleFirebaseOrderAdded as EventListener);
      window.removeEventListener('salon:firebase-memberships-updated', handleFirebaseMembers as EventListener);
      window.removeEventListener('salon:firebase-loyalty-passes-updated', handleFirebaseLoyaltyPasses as EventListener);
      window.removeEventListener('salon:firebase-staff-updated', handleFirebaseStaff as EventListener);
      window.removeEventListener('salon:firebase-services-updated', handleFirebaseServices as EventListener);
      window.removeEventListener('salon:firebase-categories-updated', handleFirebaseCategories as EventListener);
    };
  }, []);

  // Persist settings
  useEffect(() => {
    try {
      safeSetItem('backstage_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [settings]);

  // Persist orders locally so local data safety is strictly guaranteed
  useEffect(() => {
    try {
      safeSetItem('backstage_orders', JSON.stringify(orders));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [orders]);

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

  // Persist loyalty passes
  useEffect(() => {
    try {
      safeSetItem('backstage_loyalty_passes', JSON.stringify(loyaltyPasses));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [loyaltyPasses]);

  // Persist services catalog locally for offline PWA fallback
  useEffect(() => {
    if (services.length > 0) {
      try {
        safeSetItem('backstage_services', JSON.stringify(services));
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }
    }
  }, [services]);

  // Persist custom categories locally
  useEffect(() => {
    try {
      safeSetItem('backstage_service_categories', JSON.stringify(customCategories));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [customCategories]);

  // Initial startup execution: One-time permanent wipeout of old test history (app_reset_v2)
  useEffect(() => {
    const wasWiped = runOneTimePermanentWipeoutSync();
    if (wasWiped) {
      setOrders([]);
      setCartItems([]);
      setStaffMembers(OFFICIAL_STAFF_MEMBERS);
      setStaffLogs([]);
      setNumberHistory([]);
      setLastOrderId(0);
      setCurrentInvoiceNumber(0);
    }
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
    const assignedStaff = selectedBillingStaff || stylist.name || 'Kunal';
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
          stylistId: `staff-${assignedStaff.toLowerCase().replace(/\s+/g, '-')}`,
          stylistName: assignedStaff,
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

  // Item-level staff assignment handler: updates stylist for a specific item in cart
  const handleUpdateCartItemStaff = (serviceId: string, staffName: string) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.service.id === serviceId
          ? {
              ...item,
              stylistName: staffName,
              stylistId: `staff-${staffName.toLowerCase().replace(/\s+/g, '-')}`,
            }
          : item
      )
    );
  };

  // Global staff selection handler: defaults all items in current cart to this staff
  const handleSelectBillingStaff = (staffName: string) => {
    setSelectedBillingStaff(staffName);
    setCartItems((prev) =>
      prev.map((item) => ({
        ...item,
        stylistName: staffName,
        stylistId: `staff-${staffName.toLowerCase().replace(/\s+/g, '-')}`,
      }))
    );
  };

  // Finalize order: updates Sales History, Staff performance, and activates/renews Membership if toggled
  const handleCompleteOrder = (newOrder: Order) => {
    const orderWithStaff: Order = {
      ...newOrder,
      staffName: newOrder.staffName || selectedBillingStaff || 'Kunal',
    };

    // 1. INSTANT PUSH ON FINALIZE BILL: Executes Firebase Realtime Database .set() immediately
    // BEFORE any UI state resets, modals close, or background tasks complete!
    if (typeof window !== 'undefined' && window.salonFirebase) {
      window.salonFirebase.syncOrder(orderWithStaff);
    }

    // a) Update the main "Sales History" list (sorted descending with newest invoice # at top)
    setOrders((prev) => sortOrdersDescending([orderWithStaff, ...prev]));
    setCartItems([]);
    playLuxuryChime();
    setActiveReceiptOrder(orderWithStaff);

    // b) Update Staff performance totals & history: credit each employee ONLY for the specific services they performed
    const totalOrderGross = orderWithStaff.items.reduce(
      (sum, it) => sum + it.service.price * it.quantity,
      0
    );

    const updatedStaff = staffMembers.map((staff) => {
      // Find items assigned to this specific staff member
      const staffItems = orderWithStaff.items.filter((it) => {
        if (it.stylistName) {
          return it.stylistName.trim().toLowerCase() === staff.name.trim().toLowerCase();
        }
        if (orderWithStaff.staffName) {
          const split = orderWithStaff.staffName.split(',').map((s) => s.trim().toLowerCase());
          return split.includes(staff.name.trim().toLowerCase());
        }
        return false;
      });

      if (staffItems.length === 0) {
        return staff;
      }

      const staffGross = staffItems.reduce((sum, it) => sum + it.service.price * it.quantity, 0);
      const staffProportionalTotal =
        totalOrderGross > 0 ? Math.round((staffGross / totalOrderGross) * orderWithStaff.total) : staffGross;

      const staffServiceNames = staffItems
        .map((i) => `${i.service.name}${i.quantity > 1 ? ` (x${i.quantity})` : ''}`)
        .join(', ');

      const newHistoryRecord: StaffServiceRecord = {
        id: `rec-${orderWithStaff.id}-${staff.name}-${Date.now()}`,
        date: formatIndianDate(new Date()),
        clientName: orderWithStaff.clientName || 'Walk-in Client',
        serviceName: staffServiceNames,
        amount: staffProportionalTotal,
      };

      if (typeof window !== 'undefined' && window.salonFirebase) {
        window.salonFirebase.syncStaffServiceRecord(staff.name, newHistoryRecord);
      }

      syncStaffServiceToCloud(staff.name, newHistoryRecord).catch(() => {});

      const currentHistory: StaffServiceRecord[] = Array.isArray(staff.history)
        ? staff.history
        : typeof staff.history === 'object' && staff.history !== null
        ? (Object.values(staff.history) as StaffServiceRecord[])
        : [];

      return {
        ...staff,
        totalSalesThisMonth: (staff.totalSalesThisMonth || 0) + staffProportionalTotal,
        history: [newHistoryRecord, ...currentHistory],
      };
    });

    setStaffMembers(updatedStaff);

    // c) Multi-Device Real-time Sync for Staff performance
    if (typeof window !== 'undefined' && window.salonFirebase) {
      window.salonFirebase.syncStaffMembers(updatedStaff);
    }

    // d) If client is an Enreach Member (button was ON during checkout), automatically activate/renew 1-Year (365 Days) membership
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
          if (typeof window !== 'undefined' && window.salonFirebase) {
            window.salonFirebase.syncMembership(updated[existingIdx]);
          }
          return updated;
        } else {
          syncMembershipToCloud(newMemberRecord).catch(() => {});
          if (typeof window !== 'undefined' && window.salonFirebase) {
            window.salonFirebase.syncMembership(newMemberRecord);
          }
          return [newMemberRecord, ...prev];
        }
      });
    }

    // e) Asynchronously persist to cloud mirror
    syncOrderToCloud(orderWithStaff, {
      name: orderWithStaff.clientName,
      phone: orderWithStaff.clientPhone,
      isMember: Boolean(orderWithStaff.isMember),
    }).catch((err) => {
      console.warn('Cloud sync notice:', err);
    });
  };

  // Dynamic Add Member handler with immediate Firebase Realtime DB multi-device sync
  const handleAddMember = (newMember: MembershipRecord) => {
    setMemberships((prev) => {
      const cleanPhone = newMember.clientPhone.replace(/\s+/g, '');
      const existingIdx = prev.findIndex(
        (m) => m.clientPhone.replace(/\s+/g, '') === cleanPhone || m.id === newMember.id
      );

      let updated: MembershipRecord[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...newMember };
      } else {
        updated = [newMember, ...prev];
      }
      safeSetItem('backstage_memberships', JSON.stringify(updated));
      return updated;
    });

    if (typeof window !== 'undefined' && window.salonFirebase) {
      window.salonFirebase.syncMembership(newMember);
    }
    syncMembershipToCloud(newMember).catch(() => {});
  };

  // Dynamic Add / Update Loyalty Member Pass handlers
  const handleAddLoyaltyPass = (newPass: LoyaltyPass) => {
    setLoyaltyPasses((prev) => {
      const updated = [newPass, ...prev.filter((p) => p.id !== newPass.id)];
      safeSetItem('backstage_loyalty_passes', JSON.stringify(updated));
      return updated;
    });
    if (typeof window !== 'undefined' && window.salonFirebase?.syncLoyaltyPass) {
      window.salonFirebase.syncLoyaltyPass(newPass);
    }
  };

  const handleUpdateLoyaltyPass = (updatedPass: LoyaltyPass) => {
    setLoyaltyPasses((prev) => {
      const updated = prev.map((p) => (p.id === updatedPass.id ? updatedPass : p));
      safeSetItem('backstage_loyalty_passes', JSON.stringify(updated));
      return updated;
    });
    if (typeof window !== 'undefined' && window.salonFirebase?.syncLoyaltyPass) {
      window.salonFirebase.syncLoyaltyPass(updatedPass);
    }
  };

  // Dynamic Delete Member handler (Permanently removes from state and LocalStorage)
  const handleDeleteMember = (memberId: string) => {
    setMemberships((prev) => {
      const updated = prev.filter((m) => m.id !== memberId);
      safeSetItem('backstage_memberships', JSON.stringify(updated));
      return updated;
    });
    if (typeof window !== 'undefined' && window.salonFirebase?.deleteMembership) {
      window.salonFirebase.deleteMembership(memberId);
    }
  };

  // Dynamic Delete Loyalty Pass handler (Permanently removes from state and LocalStorage)
  const handleDeleteLoyaltyPass = (passId: string) => {
    setLoyaltyPasses((prev) => {
      const updated = prev.filter((p) => p.id !== passId);
      safeSetItem('backstage_loyalty_passes', JSON.stringify(updated));
      return updated;
    });
    if (typeof window !== 'undefined' && window.salonFirebase?.deleteLoyaltyPass) {
      window.salonFirebase.deleteLoyaltyPass(passId);
    }
  };

  // Granular Delete Handlers for Edit Mode:
  // 1. Delete individual sale record (Permanently wipes from state, localStorage & Firebase RTDB)
  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => {
      const updated = prev.filter((o) => o.id !== orderId);
      safeSetItem('backstage_orders', JSON.stringify(updated));
      if (typeof window !== 'undefined' && window.salonFirebase?.deleteOrder) {
        window.salonFirebase.deleteOrder(orderId);
      }
      if (updated.length === 0) {
        setLastOrderId(0);
        setCurrentInvoiceNumber(0);
        safeSetItem('backstage_orders', '[]');
        safeRemoveItem('sales_history');
        safeRemoveItem('invoices');
        safeRemoveItem('backstage_cloud_orders');
      }
      return updated;
    });

    // Synchronize removal with any stored staff service history
    setStaffMembers((prev) => {
      let modified = false;
      const updated = prev.map((s) => {
        const newHist = (s.history || []).filter((h) => !h.id.includes(orderId));
        if (newHist.length !== (s.history || []).length) {
          modified = true;
          const newSales = newHist.reduce((sum, h) => sum + h.amount, 0);
          return { ...s, history: newHist, totalSalesThisMonth: newSales };
        }
        return s;
      });
      if (modified) {
        safeSetItem('backstage_staff_performance', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // 2. Delete all records for a client phone number
  const handleDeleteClientByPhone = (phone: string) => {
    const cleanP = phone.replace(/\D/g, '');
    const deletedOrderIds: string[] = [];
    setOrders((prev) => {
      const updated = prev.filter((o) => {
        const oClean = (o.clientPhone || '').replace(/\D/g, '');
        const isMatch =
          (cleanP && oClean && (cleanP === oClean || cleanP.endsWith(oClean) || oClean.endsWith(cleanP))) ||
          o.clientPhone?.replace(/\s+/g, '') === phone.replace(/\s+/g, '');
        if (isMatch) {
          deletedOrderIds.push(o.id);
          return false;
        }
        return true;
      });
      safeSetItem('backstage_orders', JSON.stringify(updated));
      if (typeof window !== 'undefined' && window.salonFirebase?.deleteOrder) {
        deletedOrderIds.forEach((id) => window.salonFirebase?.deleteOrder?.(id));
      }
      if (updated.length === 0) {
        setLastOrderId(0);
        setCurrentInvoiceNumber(0);
        safeSetItem('backstage_orders', '[]');
        safeRemoveItem('sales_history');
        safeRemoveItem('invoices');
        safeRemoveItem('backstage_cloud_orders');
      }
      return updated;
    });

    if (deletedOrderIds.length > 0) {
      setStaffMembers((prev) => {
        let modified = false;
        const updated = prev.map((s) => {
          const newHist = (s.history || []).filter(
            (h) => !deletedOrderIds.some((dId) => h.id.includes(dId))
          );
          if (newHist.length !== (s.history || []).length) {
            modified = true;
            const newSales = newHist.reduce((sum, h) => sum + h.amount, 0);
            return { ...s, history: newHist, totalSalesThisMonth: newSales };
          }
          return s;
        });
        if (modified) {
          safeSetItem('backstage_staff_performance', JSON.stringify(updated));
        }
        return updated;
      });
    }
  };

  // 3. Delete individual staff service log record (Removes log from ledger & staff profile without deleting the staff member)
  const handleDeleteStaffRecord = (staffId: string, recordId: string) => {
    // Check if recordId is derived from an order
    const orderMatch = recordId.match(/^ord-rec-([^-]+)-/);
    const orderId = orderMatch ? orderMatch[1] : null;

    if (orderId) {
      setOrders((prev) => {
        const updated = prev.filter((o) => o.id !== orderId);
        safeSetItem('backstage_orders', JSON.stringify(updated));
        if (typeof window !== 'undefined' && window.salonFirebase?.deleteOrder) {
          window.salonFirebase.deleteOrder(orderId);
        }
        if (updated.length === 0) {
          setLastOrderId(0);
          setCurrentInvoiceNumber(0);
          safeSetItem('backstage_orders', '[]');
          safeRemoveItem('sales_history');
          safeRemoveItem('invoices');
          safeRemoveItem('backstage_cloud_orders');
        }
        return updated;
      });
    }

    // Always update staff member history (Keeps all 6 staff profiles intact)
    setStaffMembers((prev) => {
      const updated = prev.map((s) => {
        if (s.id === staffId || s.name.toLowerCase() === staffId.toLowerCase()) {
          const newHistory = (s.history || []).filter(
            (h) => h.id !== recordId && (!orderId || !h.id.includes(orderId))
          );
          const newSales = newHistory.reduce((sum, h) => sum + h.amount, 0);
          return {
            ...s,
            history: newHistory,
            totalSalesThisMonth: newSales,
          };
        }
        return s;
      });
      safeSetItem('backstage_staff_performance', JSON.stringify(updated));
      return updated;
    });
  };

  // 4. Reset a specific staff member's sales and logs to 0 (Keeps staff member profile 100% intact)
  const handleResetStaffSales = (staffId: string) => {
    const targetStaff = staffMembers.find(
      (s) => s.id === staffId || s.name.toLowerCase() === staffId.toLowerCase()
    );
    const staffName = targetStaff ? targetStaff.name : null;

    if (staffName) {
      const removedOrderIds: string[] = [];
      setOrders((prev) => {
        const updated = prev.filter((o) => {
          const isMainStaff = o.staffName && o.staffName.toLowerCase() === staffName.toLowerCase();
          const hasStaffItem = (o.items || []).some(
            (i) => i.stylistName && i.stylistName.toLowerCase() === staffName.toLowerCase()
          );
          if (isMainStaff || hasStaffItem) {
            removedOrderIds.push(o.id);
            return false;
          }
          return true;
        });
        safeSetItem('backstage_orders', JSON.stringify(updated));
        if (typeof window !== 'undefined' && window.salonFirebase?.deleteOrder) {
          removedOrderIds.forEach((id) => window.salonFirebase?.deleteOrder?.(id));
        }
        if (updated.length === 0) {
          setLastOrderId(0);
          setCurrentInvoiceNumber(0);
          safeSetItem('backstage_orders', '[]');
          safeRemoveItem('sales_history');
          safeRemoveItem('invoices');
          safeRemoveItem('backstage_cloud_orders');
        }
        return updated;
      });
    }

    // Reset this staff member's history and sales to 0 (Preserves all 6 staff profiles)
    setStaffMembers((prev) => {
      const updated = prev.map((s) => {
        if (s.id === staffId || s.name.toLowerCase() === staffId.toLowerCase()) {
          return {
            ...s,
            history: [],
            totalSalesThisMonth: 0,
          };
        }
        return s;
      });
      safeSetItem('backstage_staff_performance', JSON.stringify(updated));
      return updated;
    });
  };

  // Temporary Manual Force-Purge Handlers for Delivery:
  // 1. Force-Purge All Sales Data
  const handlePurgeAllSales = () => {
    setOrders([]);
    setLastOrderId(0);
    setCurrentInvoiceNumber(0);
    safeRemoveItem('backstage_orders');
    safeRemoveItem('sales_history');
    safeRemoveItem('invoices');
    safeRemoveItem('backstage_cloud_orders');
    safeRemoveItem('backstage_cart');
    safeSetItem('backstage_orders', '[]');

    if (typeof window !== 'undefined' && window.salonFirebase?.resetOrders) {
      window.salonFirebase.resetOrders().catch(() => {});
    }
    resetCloudOrders().catch(() => {});
    window.dispatchEvent(new CustomEvent('salon:firebase-orders-updated', { detail: [] }));
  };

  // 2. Force-Purge All Staff Logs
  const handlePurgeStaffLogs = () => {
    setStaffMembers(INITIAL_STAFF_MEMBERS);
    setStaffLogs([]);
    safeSetItem('backstage_staff_performance', JSON.stringify(INITIAL_STAFF_MEMBERS));

    if (typeof window !== 'undefined' && window.salonFirebase?.syncStaffMembers) {
      window.salonFirebase.syncStaffMembers(INITIAL_STAFF_MEMBERS).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('salon:firebase-staff-updated', { detail: INITIAL_STAFF_MEMBERS }));
  };

  // 3. Force-Purge All Number Logs
  const handlePurgeNumberLogs = () => {
    setNumberHistory([]);
    setOrders([]);
    setLastOrderId(0);
    setCurrentInvoiceNumber(0);
    safeRemoveItem('backstage_number_history');
    safeRemoveItem('backstage_client_logs');
    safeRemoveItem('backstage_orders');
    safeRemoveItem('sales_history');
    safeRemoveItem('invoices');
    safeSetItem('backstage_orders', '[]');

    if (typeof window !== 'undefined' && window.salonFirebase?.resetOrders) {
      window.salonFirebase.resetOrders().catch(() => {});
    }
    resetCloudOrders().catch(() => {});
    window.dispatchEvent(new CustomEvent('salon:firebase-orders-updated', { detail: [] }));
  };

  // 3. SPECIFIC DATA WIPE (PURGE ONLY HISTORIES):
  // Clears Sales History, Membership History, Number History, and Staff History.
  // Order counter resets strictly back to #1, while keeping all 112+ services and salon settings 100% intact.
  const handleResetProductionData = async () => {
    // a. Execute specific history purge script
    await purgeOnlyHistories();

    // b. Reset React state
    setOrders([]);
    setMemberships([]);
    setLoyaltyPasses([]);
    setCartItems([]);
    setStaffMembers(INITIAL_STAFF_MEMBERS);
    setActiveReceiptOrder(null);
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
            services={services}
            stylists={STYLISTS}
            selectedStylistId={selectedStylistId}
            onSelectStylist={setSelectedStylistId}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            currencySymbol={settings.currencySymbol}
            onGoToCart={() => handleSelectTab('cart')}
            onAddService={handleAddService}
            onUpdateService={handleUpdateService}
            onDeleteService={handleDeleteService}
            customCategories={customCategories}
            onAddCategory={handleAddCategory}
            isEditMode={isEditMode}
            onToggleEditMode={setIsEditMode}
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
                  onChange={(e) => handleSelectBillingStaff(e.target.value)}
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
              onUpdateItemStaff={handleUpdateCartItemStaff}
              taxRate={0}
              currencySymbol={settings.currencySymbol}
              onExploreServices={() => handleSelectTab('services')}
              selectedStaff={selectedBillingStaff}
              onSelectStaff={handleSelectBillingStaff}
              staffList={OFFICIAL_STAFF_NAMES}
              existingOrders={orders}
              nextOrderNumber={getNextOrderNumber(orders)}
              memberships={memberships}
              loyaltyPasses={loyaltyPasses}
              onUpdateLoyaltyPass={handleUpdateLoyaltyPass}
            />
          </div>
        )}

        {/* Membership Tab */}
        {currentTab === 'membership' && (
          <MembershipTab
            memberships={memberships}
            orders={orders}
            services={services}
            loyaltyPasses={loyaltyPasses}
            currencySymbol={settings.currencySymbol}
            onAddMember={handleAddMember}
            onDeleteMember={handleDeleteMember}
            onAddLoyaltyPass={handleAddLoyaltyPass}
            onDeleteLoyaltyPass={handleDeleteLoyaltyPass}
            onAddAdvanceOrder={(advOrder) => {
              setOrders((prev) => sortOrdersDescending([advOrder, ...prev]));
            }}
            isEditMode={isEditMode}
          />
        )}

        {/* Number History Tab */}
        {currentTab === 'numbers' && (
          <NumberHistoryTab
            orders={orders}
            memberships={memberships}
            currencySymbol={settings.currencySymbol}
            onDeleteClientByPhone={handleDeleteClientByPhone}
            onDeleteOrder={handleDeleteOrder}
          />
        )}

        {/* Sales History Tab with Always-Visible Timeframe Breakdowns and Today's Sales */}
        {currentTab === 'history' && (
          <SalesHistoryTab
            orders={orders}
            currencySymbol={settings.currencySymbol}
            onViewReceipt={(order) => setActiveReceiptOrder(order)}
            onUpdateOrders={setOrders}
            onDeleteOrder={handleDeleteOrder}
            onResetProductionData={handleResetProductionData}
            onPurgeAllSales={handlePurgeAllSales}
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
            onDeleteStaffRecord={handleDeleteStaffRecord}
            onResetStaffSales={handleResetStaffSales}
            onUpdateStaff={setStaffMembers}
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
