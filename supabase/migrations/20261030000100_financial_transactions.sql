-- Cash-basis business ledger. Only record money actually received or paid.
CREATE TABLE IF NOT EXISTS financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL CHECK (transaction_type IN ('income','expense')),
  category text NOT NULL,
  description text,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'Transfer',
  reference_type text NOT NULL DEFAULT 'manual'
    CHECK (reference_type IN ('manual','service','software_project','sparepart','other')),
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_date
  ON financial_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type_date
  ON financial_transactions(transaction_type, transaction_date DESC);

ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_transactions_select_auth" ON financial_transactions;
CREATE POLICY "financial_transactions_select_auth" ON financial_transactions
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "financial_transactions_insert_auth" ON financial_transactions;
CREATE POLICY "financial_transactions_insert_auth" ON financial_transactions
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "financial_transactions_update_auth" ON financial_transactions;
CREATE POLICY "financial_transactions_update_auth" ON financial_transactions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "financial_transactions_delete_auth" ON financial_transactions;
CREATE POLICY "financial_transactions_delete_auth" ON financial_transactions
  FOR DELETE TO authenticated USING (true);
