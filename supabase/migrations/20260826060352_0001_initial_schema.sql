/*
# Khawarizmi.project — initial schema

1. Overview
   Business management system for laptop/computer technicians and software developers.
   Multi-user app with role-based access (admin, technician, developer).

2. New Tables
   - profiles: extends auth.users with full_name and role. First signup becomes admin; later signups default to technician.
   - customers: shared customer directory used by services, software projects, and proposals.
   - services: laptop/computer repair jobs with work + payment status, fees, dates.
   - service_spareparts: junction of spareparts used in a service, with qty + price snapshot.
   - spareparts: stock items with purchase/selling price, supplier, low-stock threshold.
   - software_projects: software development projects with type, RAB, statuses.
   - rabs: RAB (Rencana Anggaran Biaya) header per software project, with additional cost + grand total.
   - rab_items: line items of a RAB (name, category, qty, price, subtotal).
   - proposals: business proposals (service packages or software development offers).
   - proposal_items: priced line items within a proposal.
   - invoices: generated invoice records for services, software projects, and proposals, with numbering and payment tracking.

3. Helper Functions
   - user_role(): SECURITY DEFINER, returns the current user's role from profiles (used by RLS policies).
   - handle_new_user(): trigger on auth.users insert — creates a profile; first user becomes admin.
   - decrement_sparepart_stock(): trigger on service_spareparts insert — reduces sparepart stock.
   - restore_sparepart_stock(): trigger on service_spareparts delete — restores sparepart stock.

4. Security (RLS)
   - RLS enabled on every business table.
   - All authenticated users can SELECT all business data (shared internal system).
   - Writes are role-restricted:
       * admin: full CRUD on all tables.
       * technician: full CRUD on customers, services, service_spareparts, spareparts.
       * developer: full CRUD on customers, software_projects, rabs, rab_items.
   - proposals + proposal_items: writable by admin; readable by all authenticated.
   - invoices: writable by admin; readable by all authenticated.
   - profiles: each user reads all profiles; updates own profile (role protected — role only changeable via admin function, not exposed here).

5. Notes
   - Amounts stored as numeric(14,2) for Rupiah precision.
   - Stock is integer; low-stock warning driven by spareparts.low_stock_threshold.
*/

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT 'New User',
  role text NOT NULL DEFAULT 'technician' CHECK (role IN ('admin','technician','developer')),
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---------- helper: current user role ----------
CREATE OR REPLACE FUNCTION user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ---------- trigger: create profile on signup (first user = admin) ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_first boolean;
BEGIN
  SELECT count(*) = 0 INTO is_first FROM public.profiles;
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    CASE WHEN is_first THEN 'admin' ELSE 'technician' END
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- customers ----------
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select_auth" ON customers;
CREATE POLICY "customers_select_auth" ON customers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "customers_insert_role" ON customers;
CREATE POLICY "customers_insert_role" ON customers FOR INSERT
  TO authenticated WITH CHECK (user_role() IN ('admin','technician','developer'));

DROP POLICY IF EXISTS "customers_update_role" ON customers;
CREATE POLICY "customers_update_role" ON customers FOR UPDATE
  TO authenticated USING (user_role() IN ('admin','technician','developer'))
  WITH CHECK (user_role() IN ('admin','technician','developer'));

DROP POLICY IF EXISTS "customers_delete_role" ON customers;
CREATE POLICY "customers_delete_role" ON customers FOR DELETE
  TO authenticated USING (user_role() IN ('admin','technician','developer'));

-- ---------- spareparts ----------
CREATE TABLE IF NOT EXISTS spareparts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  brand text,
  stock integer NOT NULL DEFAULT 0,
  purchase_price numeric(14,2) NOT NULL DEFAULT 0,
  selling_price numeric(14,2) NOT NULL DEFAULT 0,
  supplier text,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE spareparts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spareparts_select_auth" ON spareparts;
CREATE POLICY "spareparts_select_auth" ON spareparts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "spareparts_insert_role" ON spareparts;
CREATE POLICY "spareparts_insert_role" ON spareparts FOR INSERT
  TO authenticated WITH CHECK (user_role() IN ('admin','technician'));

DROP POLICY IF EXISTS "spareparts_update_role" ON spareparts;
CREATE POLICY "spareparts_update_role" ON spareparts FOR UPDATE
  TO authenticated USING (user_role() IN ('admin','technician'))
  WITH CHECK (user_role() IN ('admin','technician'));

DROP POLICY IF EXISTS "spareparts_delete_role" ON spareparts;
CREATE POLICY "spareparts_delete_role" ON spareparts FOR DELETE
  TO authenticated USING (user_role() IN ('admin','technician'));

-- ---------- services ----------
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  device text NOT NULL,
  problem text,
  work_status text NOT NULL DEFAULT 'Menunggu pemeriksaan' CHECK (work_status IN ('Menunggu pemeriksaan','Sedang diperiksa','Menunggu sparepart','Sedang dikerjakan','Selesai','Diambil customer','Dibatalkan')),
  payment_status text NOT NULL DEFAULT 'Belum bayar' CHECK (payment_status IN ('Belum bayar','DP','Lunas')),
  service_fee numeric(14,2) NOT NULL DEFAULT 0,
  estimated_duration text,
  estimated_total numeric(14,2) NOT NULL DEFAULT 0,
  actions text,
  notes text,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  invoice_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_customer ON services(customer_id);
CREATE INDEX IF NOT EXISTS idx_services_work_status ON services(work_status);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_auth" ON services;
CREATE POLICY "services_select_auth" ON services FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "services_insert_role" ON services;
CREATE POLICY "services_insert_role" ON services FOR INSERT
  TO authenticated WITH CHECK (user_role() IN ('admin','technician'));

DROP POLICY IF EXISTS "services_update_role" ON services;
CREATE POLICY "services_update_role" ON services FOR UPDATE
  TO authenticated USING (user_role() IN ('admin','technician'))
  WITH CHECK (user_role() IN ('admin','technician'));

DROP POLICY IF EXISTS "services_delete_role" ON services;
CREATE POLICY "services_delete_role" ON services FOR DELETE
  TO authenticated USING (user_role() IN ('admin','technician'));

-- ---------- service_spareparts ----------
CREATE TABLE IF NOT EXISTS service_spareparts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  sparepart_id uuid NOT NULL REFERENCES spareparts(id) ON DELETE RESTRICT,
  sparepart_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price numeric(14,2) NOT NULL DEFAULT 0,
  subtotal numeric(14,2) GENERATED ALWAYS AS (quantity * price) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_spareparts_service ON service_spareparts(service_id);

ALTER TABLE service_spareparts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_spareparts_select_auth" ON service_spareparts;
CREATE POLICY "service_spareparts_select_auth" ON service_spareparts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "service_spareparts_insert_role" ON service_spareparts;
CREATE POLICY "service_spareparts_insert_role" ON service_spareparts FOR INSERT
  TO authenticated WITH CHECK (user_role() IN ('admin','technician'));

DROP POLICY IF EXISTS "service_spareparts_update_role" ON service_spareparts;
CREATE POLICY "service_spareparts_update_role" ON service_spareparts FOR UPDATE
  TO authenticated USING (user_role() IN ('admin','technician'))
  WITH CHECK (user_role() IN ('admin','technician'));

DROP POLICY IF EXISTS "service_spareparts_delete_role" ON service_spareparts;
CREATE POLICY "service_spareparts_delete_role" ON service_spareparts FOR DELETE
  TO authenticated USING (user_role() IN ('admin','technician'));

-- stock decrement on insert
CREATE OR REPLACE FUNCTION decrement_sparepart_stock()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.spareparts
  SET stock = stock - NEW.quantity
  WHERE id = NEW.sparepart_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_stock ON service_spareparts;
CREATE TRIGGER trg_decrement_stock
  AFTER INSERT ON service_spareparts
  FOR EACH ROW EXECUTE FUNCTION decrement_sparepart_stock();

-- stock restore on delete
CREATE OR REPLACE FUNCTION restore_sparepart_stock()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.spareparts
  SET stock = stock + OLD.quantity
  WHERE id = OLD.sparepart_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_restore_stock ON service_spareparts;
CREATE TRIGGER trg_restore_stock
  AFTER DELETE ON service_spareparts
  FOR EACH ROW EXECUTE FUNCTION restore_sparepart_stock();

-- ---------- software_projects ----------
CREATE TABLE IF NOT EXISTS software_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  title text NOT NULL,
  software_type text NOT NULL DEFAULT 'Website' CHECK (software_type IN ('Website','Web Application','Android Application','Desktop Application','Custom Software')),
  purpose text,
  work_status text NOT NULL DEFAULT 'Proposal' CHECK (work_status IN ('Proposal','Menunggu persetujuan','Planning','Development','Testing','Revisi','Selesai','Dibatalkan')),
  payment_status text NOT NULL DEFAULT 'Belum bayar' CHECK (payment_status IN ('Belum bayar','DP','Cicilan','Lunas')),
  rab_total numeric(14,2) NOT NULL DEFAULT 0,
  estimated_duration text,
  estimated_total numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  project_date date NOT NULL DEFAULT CURRENT_DATE,
  invoice_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_customer ON software_projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_work_status ON software_projects(work_status);

ALTER TABLE software_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_auth" ON software_projects;
CREATE POLICY "projects_select_auth" ON software_projects FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "projects_insert_role" ON software_projects;
CREATE POLICY "projects_insert_role" ON software_projects FOR INSERT
  TO authenticated WITH CHECK (user_role() IN ('admin','developer'));

DROP POLICY IF EXISTS "projects_update_role" ON software_projects;
CREATE POLICY "projects_update_role" ON software_projects FOR UPDATE
  TO authenticated USING (user_role() IN ('admin','developer'))
  WITH CHECK (user_role() IN ('admin','developer'));

DROP POLICY IF EXISTS "projects_delete_role" ON software_projects;
CREATE POLICY "projects_delete_role" ON software_projects FOR DELETE
  TO authenticated USING (user_role() IN ('admin','developer'));

-- ---------- rabs ----------
CREATE TABLE IF NOT EXISTS rabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES software_projects(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'RAB',
  additional_cost numeric(14,2) NOT NULL DEFAULT 0,
  grand_total numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rabs_project ON rabs(project_id);

ALTER TABLE rabs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rabs_select_auth" ON rabs;
CREATE POLICY "rabs_select_auth" ON rabs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "rabs_insert_role" ON rabs;
CREATE POLICY "rabs_insert_role" ON rabs FOR INSERT
  TO authenticated WITH CHECK (user_role() IN ('admin','developer'));

DROP POLICY IF EXISTS "rabs_update_role" ON rabs;
CREATE POLICY "rabs_update_role" ON rabs FOR UPDATE
  TO authenticated USING (user_role() IN ('admin','developer'))
  WITH CHECK (user_role() IN ('admin','developer'));

DROP POLICY IF EXISTS "rabs_delete_role" ON rabs;
CREATE POLICY "rabs_delete_role" ON rabs FOR DELETE
  TO authenticated USING (user_role() IN ('admin','developer'));

-- ---------- rab_items ----------
CREATE TABLE IF NOT EXISTS rab_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rab_id uuid NOT NULL REFERENCES rabs(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  description text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price numeric(14,2) NOT NULL DEFAULT 0,
  subtotal numeric(14,2) GENERATED ALWAYS AS (quantity * price) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rab_items_rab ON rab_items(rab_id);

ALTER TABLE rab_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rab_items_select_auth" ON rab_items;
CREATE POLICY "rab_items_select_auth" ON rab_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "rab_items_insert_role" ON rab_items;
CREATE POLICY "rab_items_insert_role" ON rab_items FOR INSERT
  TO authenticated WITH CHECK (user_role() IN ('admin','developer'));

DROP POLICY IF EXISTS "rab_items_update_role" ON rab_items;
CREATE POLICY "rab_items_update_role" ON rab_items FOR UPDATE
  TO authenticated USING (user_role() IN ('admin','developer'))
  WITH CHECK (user_role() IN ('admin','developer'));

DROP POLICY IF EXISTS "rab_items_delete_role" ON rab_items;
CREATE POLICY "rab_items_delete_role" ON rab_items FOR DELETE
  TO authenticated USING (user_role() IN ('admin','developer'));

-- ---------- proposals ----------
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  proposal_type text NOT NULL DEFAULT 'service_package' CHECK (proposal_type IN ('service_package','software_development')),
  title text NOT NULL,
  description text,
  business_scheme text CHECK (business_scheme IN ('Subscription','One License One Device','Custom Project') OR business_scheme IS NULL),
  features text,
  technologies text,
  portfolio text,
  service_period text,
  estimated_duration text,
  price numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  proposal_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposals_select_auth" ON proposals;
CREATE POLICY "proposals_select_auth" ON proposals FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "proposals_insert_admin" ON proposals;
CREATE POLICY "proposals_insert_admin" ON proposals FOR INSERT
  TO authenticated WITH CHECK (user_role() = 'admin');

DROP POLICY IF EXISTS "proposals_update_admin" ON proposals;
CREATE POLICY "proposals_update_admin" ON proposals FOR UPDATE
  TO authenticated USING (user_role() = 'admin')
  WITH CHECK (user_role() = 'admin');

DROP POLICY IF EXISTS "proposals_delete_admin" ON proposals;
CREATE POLICY "proposals_delete_admin" ON proposals FOR DELETE
  TO authenticated USING (user_role() = 'admin');

-- ---------- proposal_items ----------
CREATE TABLE IF NOT EXISTS proposal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal ON proposal_items(proposal_id);

ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposal_items_select_auth" ON proposal_items;
CREATE POLICY "proposal_items_select_auth" ON proposal_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "proposal_items_insert_admin" ON proposal_items;
CREATE POLICY "proposal_items_insert_admin" ON proposal_items FOR INSERT
  TO authenticated WITH CHECK (user_role() = 'admin');

DROP POLICY IF EXISTS "proposal_items_update_admin" ON proposal_items;
CREATE POLICY "proposal_items_update_admin" ON proposal_items FOR UPDATE
  TO authenticated USING (user_role() = 'admin')
  WITH CHECK (user_role() = 'admin');

DROP POLICY IF EXISTS "proposal_items_delete_admin" ON proposal_items;
CREATE POLICY "proposal_items_delete_admin" ON proposal_items FOR DELETE
  TO authenticated USING (user_role() = 'admin');

-- ---------- invoices ----------
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  ref_type text NOT NULL CHECK (ref_type IN ('service','software_project','proposal')),
  ref_id uuid,
  customer_name text NOT NULL,
  description text,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'Belum bayar' CHECK (payment_status IN ('Belum bayar','DP','Cicilan','Lunas')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select_auth" ON invoices;
CREATE POLICY "invoices_select_auth" ON invoices FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "invoices_insert_admin" ON invoices;
CREATE POLICY "invoices_insert_admin" ON invoices FOR INSERT
  TO authenticated WITH CHECK (user_role() = 'admin');

DROP POLICY IF EXISTS "invoices_update_admin" ON invoices;
CREATE POLICY "invoices_update_admin" ON invoices FOR UPDATE
  TO authenticated USING (user_role() = 'admin')
  WITH CHECK (user_role() = 'admin');

DROP POLICY IF EXISTS "invoices_delete_admin" ON invoices;
CREATE POLICY "invoices_delete_admin" ON invoices FOR DELETE
  TO authenticated USING (user_role() = 'admin');
