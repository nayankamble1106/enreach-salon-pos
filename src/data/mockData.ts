import { SalonService, Stylist, Order, SalonSettings, StaffMember } from '../types';

export const STYLISTS: Stylist[] = [
  { id: 'staff-1', name: 'Kunal', role: 'Senior Hair Stylist', rating: 4.9 },
  { id: 'staff-2', name: 'Mashuk', role: 'Color & Texture Specialist', rating: 4.8 },
  { id: 'staff-3', name: 'Vishal Thakur', role: 'Senior Stylist & Grooming Expert', rating: 5.0 },
  { id: 'staff-4', name: 'Sapna', role: 'Senior Aesthetician & Skin Expert', rating: 4.9 },
  { id: 'staff-5', name: 'Juhi', role: 'Beauty Specialist & Makeup Artist', rating: 4.8 },
  { id: 'staff-6', name: 'Vishal sir', role: 'Creative Director & Master Stylist', rating: 5.0 },
];

export const SALON_SERVICES: SalonService[] = [
  // 1. Common Services
  { id: "cs1", name: "Haircut Boy", category: "Common Services", price: 250 },
  { id: "cs2", name: "Beard", category: "Common Services", price: 150 },
  { id: "cs3", name: "Girls Haircut", category: "Common Services", price: 400 },
  { id: "cs4", name: "Hairstyling", category: "Common Services", price: 700 },
  { id: "cs5", name: "Blow Dry", category: "Common Services", price: 300 },
  { id: "cs6", name: "Head Massage", category: "Common Services", price: 700 },
  { id: "cs7", name: "Eye Brow", category: "Common Services", price: 50 },

  // 2. Hair Services
  { id: "hs1", name: "Creative Hair Cut (Female)", category: "Hair Services", price: 500 },
  { id: "hs2", name: "Creative Hair Cut (Male)", category: "Hair Services", price: 300 },
  { id: "hs3", name: "Hair Cut (Female)", category: "Hair Services", price: 400 },
  { id: "hs4", name: "Hair Cut (Male)", category: "Hair Services", price: 250 },
  { id: "hs5", name: "Beard Trimming (Male)", category: "Hair Services", price: 150 },
  { id: "hs6", name: "Moustache Styling (Male)", category: "Hair Services", price: 100 },
  { id: "hs7", name: "Hair Wash (Female)", category: "Hair Services", price: 250 },
  { id: "hs8", name: "Hair Wash (Male)", category: "Hair Services", price: 100 },
  { id: "hs9", name: "Keratin Wash (Female)", category: "Hair Services", price: 400 },
  { id: "hs10", name: "Keratin Wash (Male)", category: "Hair Services", price: 200 },
  { id: "hs11", name: "Blow Dry (Female)", category: "Hair Services", price: 250 },
  { id: "hs12", name: "Head Massage (Female)", category: "Hair Services", price: 600 },
  { id: "hs13", name: "Head Massage (Male)", category: "Hair Services", price: 500 },
  { id: "hs14", name: "Back Hair Trimming (Male)", category: "Hair Services", price: 200 },
  { id: "hs15", name: "Front Hair Trimming (Male)", category: "Hair Services", price: 200 },
  { id: "hs16", name: "Hair Styling (Female)", category: "Hair Services", price: 500 },

  // 3. Beauty Services
  { id: "bs1", name: "Eyebrow (Female)", category: "Beauty Services", price: 50 },
  { id: "bs2", name: "Eyebrow (Male)", category: "Beauty Services", price: 60 },
  { id: "bs3", name: "Jawline (Female)", category: "Beauty Services", price: 100 },
  { id: "bs4", name: "Face (Female)", category: "Beauty Services", price: 150 },
  { id: "bs5", name: "Face (Male)", category: "Beauty Services", price: 100 },
  { id: "bs6", name: "Chin / Forehead (Female)", category: "Beauty Services", price: 20 },
  { id: "bs7", name: "Chin / Forehead (Male)", category: "Beauty Services", price: 20 },
  { id: "bs8", name: "Lowerlips / Upper Lips (Female)", category: "Beauty Services", price: 20 },
  { id: "bs9", name: "Lowerlips / Upper Lips (Male)", category: "Beauty Services", price: 20 },

  // 4. Waxing / Bleach
  { id: "wb1", name: "Under Arms", category: "Waxing / Bleach", price: 300 },
  { id: "wb2", name: "Full Arms", category: "Waxing / Bleach", price: 400 },
  { id: "wb3", name: "Half Arms", category: "Waxing / Bleach", price: 300 },
  { id: "wb4", name: "Full Legs", category: "Waxing / Bleach", price: 600 },
  { id: "wb5", name: "Half Legs", category: "Waxing / Bleach", price: 500 },
  { id: "wb6", name: "Full Front", category: "Waxing / Bleach", price: 600 },
  { id: "wb7", name: "Full Back", category: "Waxing / Bleach", price: 600 },
  { id: "wb8", name: "Full Body", category: "Waxing / Bleach", price: 2500 },
  { id: "wb9", name: "Full Bikini", category: "Waxing / Bleach", price: 1200 },
  { id: "wb10", name: "Butts", category: "Waxing / Bleach", price: 400 },
  { id: "wb11", name: "Face Neck", category: "Waxing / Bleach", price: 400 },

  // 5. Hair Colouring
  { id: "hc1", name: "Touch up (Female)", category: "Hair Colouring", price: 1200 },
  { id: "hc2", name: "Touch up (Male)", category: "Hair Colouring", price: 1000 },
  { id: "hc3", name: "Touch up Ammonia Free (Female)", category: "Hair Colouring", price: 1300 },
  { id: "hc4", name: "Touch up Ammonia Free (Male)", category: "Hair Colouring", price: 1100 },
  { id: "hc5", name: "Beard Colouring (Male)", category: "Hair Colouring", price: 300 },

  // 6. Global Colouring
  { id: "gc1", name: "Upto Neck", category: "Global Colouring", price: 4000 },
  { id: "gc2", name: "Upto Shoulder", category: "Global Colouring", price: 5000 },
  { id: "gc3", name: "Upto Waist", category: "Global Colouring", price: 6000 },

  // 7. Highlighting
  { id: "hl1", name: "Hair Strip Colour (Per Strip)", category: "Highlighting", price: 400 },
  { id: "hl2", name: "Balayage Colour", category: "Highlighting", price: 5500 },
  { id: "hl3", name: "Weaving Colour", category: "Highlighting", price: 5000 },
  { id: "hl4", name: "Crazy Colour", category: "Highlighting", price: 4500 },

  // 8. Bridal Facial
  { id: "bf1", name: "O3 Bridal", category: "Bridal Facial", price: 3500 },
  { id: "bf2", name: "O2C2", category: "Bridal Facial", price: 3500 },
  { id: "bf3", name: "Snowy", category: "Bridal Facial", price: 3000 },
  { id: "bf4", name: "BB Glow", category: "Bridal Facial", price: 3500 },
  { id: "bf5", name: "Hydra Moist", category: "Bridal Facial", price: 3500 },

  // 9. Skin Polishing
  { id: "sp1", name: "Body Scrub", category: "Skin Polishing", price: 2000 },
  { id: "sp2", name: "Herbal Body Polishing", category: "Skin Polishing", price: 4000 },
  { id: "sp3", name: "Gold Body Polishing", category: "Skin Polishing", price: 5000 },
  { id: "sp4", name: "Luxury Body Polishing", category: "Skin Polishing", price: 6000 },

  // 10. Skin Services
  { id: "ss1", name: "Clean up", category: "Skin Services", price: 600 },
  { id: "ss2", name: "D-tan (Raaga + O3)", category: "Skin Services", price: 1000 },
  { id: "ss3", name: "Fruit", category: "Skin Services", price: 700 },
  { id: "ss4", name: "O3 + Whitening", category: "Skin Services", price: 1000 },

  // 11. Ironing / Tongs / Iron Curls
  { id: "it1", name: "Upto Shoulder", category: "Ironing / Tongs / Iron Curls", price: 600 },
  { id: "it2", name: "Below Shoulder", category: "Ironing / Tongs / Iron Curls", price: 700 },
  { id: "it3", name: "Upto Waist", category: "Ironing / Tongs / Iron Curls", price: 800 },
  { id: "it4", name: "Below Waist", category: "Ironing / Tongs / Iron Curls", price: 1000 },

  // 12. Texture Services
  { id: "ts1", name: "Below Neck (Smoothing)", category: "Texture Services", price: 4000 },
  { id: "ts2", name: "Below Neck (Straightening)", category: "Texture Services", price: 5000 },
  { id: "ts3", name: "Below Neck (Rebonding)", category: "Texture Services", price: 6000 },
  { id: "ts4", name: "Upto Shoulder (Smoothing)", category: "Texture Services", price: 5000 },
  { id: "ts5", name: "Upto Shoulder (Straightening)", category: "Texture Services", price: 5500 },
  { id: "ts6", name: "Upto Shoulder (Rebonding)", category: "Texture Services", price: 6000 },
  { id: "ts7", name: "Below Shoulder (Smoothing)", category: "Texture Services", price: 6000 },
  { id: "ts8", name: "Below Shoulder (Straightening)", category: "Texture Services", price: 6500 },
  { id: "ts9", name: "Below Shoulder (Rebonding)", category: "Texture Services", price: 7000 },
  { id: "ts10", name: "Upto Waist (Smoothing)", category: "Texture Services", price: 7000 },
  { id: "ts11", name: "Upto Waist (Straightening)", category: "Texture Services", price: 7500 },
  { id: "ts12", name: "Upto Waist (Rebonding)", category: "Texture Services", price: 8000 },

  // 13. Keratin Treatment
  { id: "kt1", name: "Below Neck (Keratin)", category: "Keratin Treatment", price: 4000 },
  { id: "kt2", name: "Below Neck (Botox)", category: "Keratin Treatment", price: 5000 },
  { id: "kt3", name: "Below Neck (Floraactive)", category: "Keratin Treatment", price: 5000 },
  { id: "kt4", name: "Upto Shoulder (Keratin)", category: "Keratin Treatment", price: 5000 },
  { id: "kt5", name: "Upto Shoulder (Botox)", category: "Keratin Treatment", price: 6000 },
  { id: "kt6", name: "Upto Shoulder (Floraactive)", category: "Keratin Treatment", price: 6000 },
  { id: "kt7", name: "Upto Waist (Keratin)", category: "Keratin Treatment", price: 6000 },
  { id: "kt8", name: "Upto Waist (Botox)", category: "Keratin Treatment", price: 8000 },
  { id: "kt9", name: "Upto Waist (Floraactive)", category: "Keratin Treatment", price: 9000 },

  // 14. Hair Treatment
  { id: "ht1", name: "Hair Spa Regular (Female)", category: "Hair Treatment", price: 1500 },
  { id: "ht2", name: "Hair Spa Regular (Male)", category: "Hair Treatment", price: 1000 },
  { id: "ht3", name: "Keratin Spa (Female)", category: "Hair Treatment", price: 2000 },
  { id: "ht4", name: "Keratin Spa (Male)", category: "Hair Treatment", price: 1200 },
  { id: "ht5", name: "Anti Dandruff (Female)", category: "Hair Treatment", price: 2500 },
  { id: "ht6", name: "Anti Dandruff (Male)", category: "Hair Treatment", price: 1500 },
  { id: "ht7", name: "Anti Hairfall (Female)", category: "Hair Treatment", price: 1800 },
  { id: "ht8", name: "Anti Hairfall (Male)", category: "Hair Treatment", price: 1500 },

  // 15. Hand & Foot Service
  { id: "hf1", name: "Regular Manicure", category: "Hand & Foot Service", price: 600 },
  { id: "hf2", name: "Regular Pedicure", category: "Hand & Foot Service", price: 700 },
  { id: "hf3", name: "Crystal Manicure", category: "Hand & Foot Service", price: 800 },
  { id: "hf4", name: "Crystal Pedicure", category: "Hand & Foot Service", price: 900 },
  { id: "hf5", name: "Luxury Manicure", category: "Hand & Foot Service", price: 1000 },
  { id: "hf6", name: "Luxury Pedicure", category: "Hand & Foot Service", price: 1200 },

  // 16. Makeup Services
  { id: "ms1", name: "Touch up", category: "Makeup Services", price: 1500 },
  { id: "ms2", name: "Saree Draping", category: "Makeup Services", price: 500 },
  { id: "ms3", name: "Party Makeup", category: "Makeup Services", price: 2000 },
  { id: "ms4", name: "Bridal Makeup", category: "Makeup Services", price: 6000 },
  { id: "ms5", name: "HD Makeup", category: "Makeup Services", price: 7000 }
];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Kunal',
    role: 'Senior Hair Stylist',
    totalSalesThisMonth: 0,
    history: [],
  },
  {
    id: 'staff-2',
    name: 'Mashuk',
    role: 'Color & Texture Specialist',
    totalSalesThisMonth: 0,
    history: [],
  },
  {
    id: 'staff-3',
    name: 'Vishal Thakur',
    role: 'Senior Stylist & Grooming Expert',
    totalSalesThisMonth: 0,
    history: [],
  },
  {
    id: 'staff-4',
    name: 'Sapna',
    role: 'Senior Aesthetician & Skin Expert',
    totalSalesThisMonth: 0,
    history: [],
  },
  {
    id: 'staff-5',
    name: 'Juhi',
    role: 'Beauty Specialist & Makeup Artist',
    totalSalesThisMonth: 0,
    history: [],
  },
  {
    id: 'staff-6',
    name: 'Vishal sir',
    role: 'Creative Director & Master Stylist',
    totalSalesThisMonth: 0,
    history: [],
  },
];


export const DEFAULT_SETTINGS: SalonSettings = {
  salonName: 'Enreach Unisex Salon',
  currencySymbol: '₹',
  taxRate: 0,
  phone: '+91 98200 12345',
  address: 'Shop 14, High Street Avenue, Mumbai',
  gstNumber: '27AAAAA0000A1Z5',
  logoUrl: '/salon-logo.png',
};
