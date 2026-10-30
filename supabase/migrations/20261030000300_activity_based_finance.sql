-- Activity-driven inventory procurement and supplier payable foundation.
-- Apply after the existing financial/payment migrations.
-- Procurement is recorded once; cash moves only when a supplier payment is recorded.

CREATE TABLE IF NOT EXISTS supplier_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_terms text NOT NULL DEFAULT 'cash'
    CHECK (payment_terms IN ('cash','credit')),
  total_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes text,
  status text NOT NULL DEFAULT 'posted'
    CHECK (status IN ('posted','void')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES supplier_purchases(id) ON DELETE CASCADE,
  sparepart_id uuid NOT NULL REFERENCES spareparts(id),
  sparepart_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric(14,2) NOT NULL CHECK (unit_cost >= 0),
  subtotal numeric(14,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_purchases_date
  ON supplier_purchases(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_purchase_items_purchase
  ON supplier_purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_supplier_purchase_items_sparepart
  ON supplier_purchase_items(sparepart_id);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES supplier_purchases(id),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'Transfer',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_purchase_date
  ON supplier_payments(purchase_id, payment_date DESC);

ALTER TABLE supplier_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_purchases_auth_all" ON supplier_purchases;
CREATE POLICY "supplier_purchases_auth_all" ON supplier_purchases
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "supplier_purchase_items_auth_all" ON supplier_purchase_items;
CREATE POLICY "supplier_purchase_items_auth_all" ON supplier_purchase_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "supplier_payments_auth_all" ON supplier_payments;
CREATE POLICY "supplier_payments_auth_all" ON supplier_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Every supplier payment creates one cash-out entry; credit procurement itself
-- does not create cash-out until payment is actually made.
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS supplier_payment_id uuid UNIQUE
  REFERENCES supplier_payments(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.sync_supplier_payment_to_finance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier text;
BEGIN
  SELECT supplier_name INTO v_supplier
    FROM supplier_purchases WHERE id = NEW.purchase_id;

  INSERT INTO financial_transactions (
    transaction_type, category, description, amount, transaction_date,
    payment_method, reference_type, reference_id, supplier_payment_id
  ) VALUES (
    'expense', 'Pembayaran Pengadaan Sparepart',
    'Pembayaran pengadaan kepada ' || COALESCE(v_supplier, 'Supplier'),
    NEW.amount, NEW.payment_date, NEW.payment_method,
    'sparepart', NEW.purchase_id, NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_supplier_payment_finance ON supplier_payments;
CREATE TRIGGER trg_supplier_payment_finance
  AFTER INSERT ON supplier_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_supplier_payment_to_finance();

-- Inventory is increased once when a purchase is posted. The current app's
-- spareparts.stock column remains the operational stock source.
CREATE OR REPLACE FUNCTION public.apply_supplier_purchase_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'posted' THEN
    UPDATE spareparts sp
      SET stock = sp.stock + item.quantity,
          purchase_price = item.unit_cost
      FROM supplier_purchase_items item
      WHERE item.purchase_id = NEW.id AND sp.id = item.sparepart_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_supplier_purchase_stock ON supplier_purchases;
CREATE TRIGGER trg_supplier_purchase_stock
  AFTER INSERT ON supplier_purchases
  FOR EACH ROW EXECUTE FUNCTION public.apply_supplier_purchase_stock();

-- Note: create the purchase header and its items in one transaction/RPC in the
-- application integration phase. This trigger is intentionally not a substitute
-- for atomic multi-step procurement writes.
