export type TabType = 'services' | 'cart' | 'history' | 'staff' | 'membership' | 'numbers';

export interface MembershipRecord {
  id: string;
  clientName: string;
  clientPhone: string;
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  isActive: boolean;
}

export interface SalonService {
  id: string;
  name: string;
  price: number;
  duration?: number; // in minutes
  category: string;
  description?: string;
}

export interface Stylist {
  id: string;
  name: string;
  role?: string;
  rating?: number;
}

export interface CartItem {
  service: SalonService;
  quantity: number;
  stylistId: string;
  stylistName: string;
}

export interface Order {
  id: string;
  clientName: string;
  clientPhone: string;
  isMember?: boolean;
  discountPercentage?: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'Loyalty Member Pass' | string;
  notes?: string;
  isLoyaltyPassApplied?: boolean;
  loyaltyPassId?: string;
  date: string;
  staffName?: string;
}

export interface LoyaltyPassService {
  id: string;
  name: string;
  price: number;
}

export interface LoyaltyPassUsageLog {
  date: string;
  serviceName: string;
  staffName?: string;
  visitNumber: number;
}

export interface LoyaltyPass {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceId: string; // primary service id or comma-separated
  serviceName: string; // primary service name or comma-separated
  eligibleServices?: LoyaltyPassService[];
  advancePaidAmount?: number;
  paidVisits: number;
  bonusVisits: number;
  totalVisits: number;
  remainingVisits: number;
  status: 'Active' | 'Completed';
  createdAt: string;
  updatedAt?: string;
  usageHistory?: LoyaltyPassUsageLog[];
}

export interface SalonSettings {
  salonName: string;
  currencySymbol: string;
  taxRate: number;
  phone?: string;
  address?: string;
  gstNumber?: string;
  logoUrl?: string;
}

export interface StaffServiceRecord {
  id: string;
  date: string;
  clientName: string;
  serviceName: string;
  amount: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  totalSalesThisMonth: number;
  history: StaffServiceRecord[];
}

export interface SalonFirebaseBridge {
  app?: unknown;
  db?: any;
  isInitialized: boolean;
  toFirebaseKey: (key: string) => string;
  syncOrder: (order: Order) => Promise<unknown>;
  syncMembership: (member: MembershipRecord) => Promise<unknown>;
  syncStaffMembers: (staffList: StaffMember[]) => Promise<unknown>;
  syncStaffServiceRecord: (staffName: string, record: StaffServiceRecord) => Promise<unknown>;
  syncServices?: (servicesList: SalonService[]) => Promise<unknown>;
  syncServicesList?: (servicesList: SalonService[]) => Promise<unknown>;
  syncServiceItem?: (service: SalonService) => Promise<unknown>;
  deleteServiceItem?: (serviceId: string) => Promise<unknown>;
  syncCategories?: (categoriesList: string[]) => Promise<unknown>;
  syncLoyaltyPass?: (pass: LoyaltyPass) => Promise<unknown>;
  deleteMembership?: (memberId: string) => Promise<unknown>;
  deleteLoyaltyPass?: (passId: string) => Promise<unknown>;
  getLoyaltyPasses?: () => LoyaltyPass[];
  getOrders: () => Order[];
  getMemberships: () => MembershipRecord[];
  getStaff: () => StaffMember[];
  getServices?: () => SalonService[];
  getCategories?: () => string[];
  resetOrders?: () => Promise<unknown>;
  resetMemberships?: () => Promise<unknown>;
  resetLoyaltyPasses?: () => Promise<unknown>;
}

declare global {
  interface Window {
    salonFirebase?: SalonFirebaseBridge;
    __salonLastFirebaseOrders?: Order[];
    __salonLastFirebaseMembers?: MembershipRecord[];
    __salonLastFirebaseLoyaltyPasses?: LoyaltyPass[];
    __salonLastFirebaseStaff?: StaffMember[];
    __salonLastFirebaseServices?: SalonService[];
    __salonLastFirebaseCategories?: string[];
  }
}
