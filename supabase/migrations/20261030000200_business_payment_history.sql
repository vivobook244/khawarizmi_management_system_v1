-- Payment history for service and software projects.
-- Each recorded payment creates exactly one linked cash-income ledger row.
CREATE TABLE IF NOT EXISTS business_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('service','software_project')),
  source_id uuid NOT NULL,
  customer_name text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'Transfer',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_payments_source
  ON business_payments(source_type, source_id, payment_date DESC);

ALTER TABLE business_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "business_payments_select_auth" ON business_payments;
CREATE POLICY "business_payments_select_auth" ON business_payments
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "business_payments_insert_auth" ON business_payments;
CREATE POLICY "business_payments_insert_auth" ON business_payments
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "business_payments_delete_auth" ON business_payments;
CREATE POLICY "business_payments_delete_auth" ON business_payments
  FOR DELETE TO authenticated USING (true);

ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS payment_id uuid UNIQUE
  REFERENCES business_payments(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.sync_business_payment_to_cash_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO financial_transactions (
      transaction_type, category, description, amount, transaction_date,
      payment_method, reference_type, reference_id, payment_id
    ) VALUES (
      'income',
      CASE WHEN NEW.source_type = 'service' THEN 'Pendapatan Service' ELSE 'Pendapatan Software' END,
      'Pembayaran dari ' || NEW.customer_name || ' (' || NEW.source_type || ')',
      NEW.amount, NEW.payment_date, NEW.payment_method,
      NEW.source_type, NEW.source_id, NEW.id
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_payment_cash_ledger ON business_payments;
CREATE TRIGGER trg_business_payment_cash_ledger
  AFTER INSERT ON business_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_business_payment_to_cash_ledger();

CREATE OR REPLACE FUNCTION public.sync_business_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_type text;
  v_source_id uuid;
  v_total numeric(14,2);
  v_paid numeric(14,2);
  v_count integer;
  v_status text;
BEGIN
  v_source_type := CASE WHEN TG_OP = 'DELETE' THEN OLD.source_type ELSE NEW.source_type END;
  v_source_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.source_id ELSE NEW.source_id END;

  SELECT COALESCE(SUM(amount), 0), COUNT(*)
    INTO v_paid, v_count
    FROM business_payments
    WHERE source_type = v_source_type AND source_id = v_source_id;

  IF v_source_type = 'service' THEN
    SELECT COALESCE(estimated_total, 0) INTO v_total FROM services WHERE id = v_source_id;
    v_status := CASE WHEN v_paid <= 0 THEN 'Belum bayar'
                     WHEN v_total > 0 AND v_paid >= v_total THEN 'Lunas'
                     ELSE 'DP' END;
    UPDATE services SET payment_status = v_status WHERE id = v_source_id;
  ELSE
    SELECT COALESCE(estimated_total, 0) INTO v_total FROM software_projects WHERE id = v_source_id;
    v_status := CASE WHEN v_paid <= 0 THEN 'Belum bayar'
                     WHEN v_total > 0 AND v_paid >= v_total THEN 'Lunas'
                     WHEN v_count <= 1 THEN 'DP'
                     ELSE 'Cicilan' END;
    UPDATE software_projects SET payment_status = v_status WHERE id = v_source_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_payment_status ON business_payments;
CREATE TRIGGER trg_business_payment_status
  AFTER INSERT OR DELETE ON business_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_business_payment_status();


-- Recalculate the derived payment status whenever the agreed job value changes.
CREATE OR REPLACE FUNCTION public.recalculate_business_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid numeric(14,2);
  v_count integer;
  v_status text;
BEGIN
  SELECT COALESCE(SUM(amount), 0), COUNT(*)
    INTO v_paid, v_count
    FROM business_payments
    WHERE source_type = CASE WHEN TG_TABLE_NAME = 'services' THEN 'service' ELSE 'software_project' END
      AND source_id = NEW.id;

  -- Preserve legacy payment statuses until the user records the first real payment.
  IF v_count = 0 THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'services' THEN
    v_status := CASE WHEN v_paid <= 0 THEN 'Belum bayar'
                     WHEN NEW.estimated_total > 0 AND v_paid >= NEW.estimated_total THEN 'Lunas'
                     ELSE 'DP' END;
  ELSE
    v_status := CASE WHEN v_paid <= 0 THEN 'Belum bayar'
                     WHEN NEW.estimated_total > 0 AND v_paid >= NEW.estimated_total THEN 'Lunas'
                     WHEN v_count <= 1 THEN 'DP'
                     ELSE 'Cicilan' END;
  END IF;

  UPDATE public.services SET payment_status = v_status
    WHERE TG_TABLE_NAME = 'services' AND id = NEW.id;
  UPDATE public.software_projects SET payment_status = v_status
    WHERE TG_TABLE_NAME = 'software_projects' AND id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_payment_status_total ON services;
CREATE TRIGGER trg_service_payment_status_total
  AFTER UPDATE OF estimated_total ON services
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_business_payment_status();

DROP TRIGGER IF EXISTS trg_project_payment_status_total ON software_projects;
CREATE TRIGGER trg_project_payment_status_total
  AFTER UPDATE OF estimated_total ON software_projects
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_business_payment_status();

-- Remove linked payment and ledger rows when a service/project is deleted.
CREATE OR REPLACE FUNCTION public.delete_source_business_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM business_payments
    WHERE source_type = CASE WHEN TG_TABLE_NAME = 'services' THEN 'service' ELSE 'software_project' END
      AND source_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_delete_business_payments ON services;
CREATE TRIGGER trg_service_delete_business_payments
  BEFORE DELETE ON services
  FOR EACH ROW EXECUTE FUNCTION public.delete_source_business_payments();

DROP TRIGGER IF EXISTS trg_project_delete_business_payments ON software_projects;
CREATE TRIGGER trg_project_delete_business_payments
  BEFORE DELETE ON software_projects
  FOR EACH ROW EXECUTE FUNCTION public.delete_source_business_payments();
