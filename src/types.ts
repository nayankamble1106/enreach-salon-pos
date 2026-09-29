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
  paymentMethod: 'cash' | 'card' | 'upi';
  date: string;
  staffName?: string;
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
  getOrders: () => Order[];
  getMemberships: () => MembershipRecord[];
  getStaff: () => StaffMember[];
  resetOrders?: () => Promise<unknown>;
}

declare global {
  interface Window {
    salonFirebase?: SalonFirebaseBridge;
    __salonLastFirebaseOrders?: Order[];
    __salonLastFirebaseMembers?: MembershipRecord[];
    __salonLastFirebaseStaff?: StaffMember[];
  }
}
