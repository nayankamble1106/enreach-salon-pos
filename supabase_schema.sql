-- ==============================================================================
-- Enreach Unisex Salon POS - Supabase Database Schema
-- Run this script in your Supabase SQL Editor (https://app.supabase.com)
-- ==============================================================================

-- 1. ORDERS TABLE (Stores bills, payments, items, dates, and staff assignments)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number INTEGER DEFAULT 1,
  client_name TEXT NOT NULL DEFAULT 'Walk-in Client',
  client_phone TEXT DEFAULT '',
  is_member BOOLEAN DEFAULT false,
  discount_percentage NUMERIC DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  staff_name TEXT NOT NULL DEFAULT 'Kunal',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for speedy timeline lookups across multi-year histories
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_client_phone ON public.orders (client_phone);
CREATE INDEX IF NOT EXISTS idx_orders_staff_name ON public.orders (staff_name);

-- 2. MEMBERSHIPS TABLE (Stores 1-Year VIP/Enreach member status & dates)
CREATE TABLE IF NOT EXISTS public.memberships (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  start_date TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memberships_phone ON public.memberships (client_phone);

-- 3. STAFF SERVICES TABLE (Stores individual service credits for staff performance)
CREATE TABLE IF NOT EXISTS public.staff_services (
  id TEXT PRIMARY KEY,
  staff_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_staff_services_staff ON public.staff_services (staff_name);
CREATE INDEX IF NOT EXISTS idx_staff_services_created_at ON public.staff_services (created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enables anonymous read/write access for fast daily POS billing with anon key
-- ==============================================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;

-- Allow anonymous operations through Supabase anon key
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Public POS read write'
  ) THEN
    CREATE POLICY "Public POS read write" ON public.orders FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'memberships' AND policyname = 'Public Membership read write'
  ) THEN
    CREATE POLICY "Public Membership read write" ON public.memberships FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staff_services' AND policyname = 'Public Staff services read write'
  ) THEN
    CREATE POLICY "Public Staff services read write" ON public.staff_services FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==============================================================================
-- ONE-TIME DUMMY TEST ROWS PURGE (Optional manual command for Supabase SQL Editor):
-- Clears test sales, number histories & staff services. Next order starts at #1.
-- Memberships table and client loyalty are 100% PRESERVED.
-- ==============================================================================
-- TRUNCATE TABLE public.orders;
-- TRUNCATE TABLE public.staff_services;
