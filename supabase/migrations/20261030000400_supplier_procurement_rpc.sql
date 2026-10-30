-- Transaction-safe supplier procurement, supplier balances, and stock movement foundation.
-- Fixes the first draft trigger and adds RPCs for atomic writes.

CREATE OR REPLACE FUNCTION public.apply_supplier_purchase_item_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM supplier_purchases WHERE id = NEW.purchase_id FOR UPDATE;
  IF v_status <> 'posted' THEN
    RAISE EXCEPTION 'Purchase is not posted';
  END IF;

  UPDATE spareparts
    SET stock = stock + NEW.quantity,
        purchase_price = NEW.unit_cost
    WHERE id = NEW.sparepart_id;

  UPDATE supplier_purchases
    SET total_amount = (
      SELECT COALESCE(SUM(subtotal), 0)
      FROM supplier_purchase_items WHERE purchase_id = NEW.purchase_id
    ), updated_at = now()
    WHERE id = NEW.purchase_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_supplier_purchase(
  p_supplier_name text,
  p_purchase_date date,
  p_payment_terms text,
  p_notes text,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase_id uuid;
  v_item jsonb;
  v_sparepart_id uuid;
  v_name text;
  v_quantity integer;
  v_unit_cost numeric(14,2);
BEGIN
  IF NULLIF(trim(p_supplier_name), '') IS NULL THEN
    RAISE EXCEPTION 'Supplier wajib diisi';
  END IF;
  IF p_payment_terms NOT IN ('cash','credit') THEN
    RAISE EXCEPTION 'Metode pengadaan tidak valid';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Minimal satu item pengadaan wajib diisi';
  END IF;

  INSERT INTO supplier_purchases(supplier_name,purchase_date,payment_terms,notes)
  VALUES(trim(p_supplier_name),COALESCE(p_purchase_date,CURRENT_DATE),p_payment_terms,p_notes)
  RETURNING id INTO v_purchase_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_sparepart_id := (v_item->>'sparepart_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_unit_cost := (v_item->>'unit_cost')::numeric(14,2);
    SELECT name INTO v_name FROM spareparts WHERE id = v_sparepart_id FOR UPDATE;
    IF v_name IS NULL THEN RAISE EXCEPTION 'Sparepart tidak ditemukan'; END IF;
    IF v_quantity <= 0 OR v_unit_cost < 0 THEN RAISE EXCEPTION 'Qty/harga tidak valid'; END IF;

    INSERT INTO supplier_purchase_items(purchase_id,sparepart_id,sparepart_name,quantity,unit_cost)
    VALUES(v_purchase_id,v_sparepart_id,v_name,v_quantity,v_unit_cost);
  END LOOP;

  RETURN v_purchase_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_supplier_payment(
  p_purchase_id uuid,
  p_amount numeric(14,2),
  p_payment_date date,
  p_payment_method text,
  p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric(14,2);
  v_paid numeric(14,2);
  v_payment_id uuid;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Jumlah pembayaran harus lebih dari nol'; END IF;

  SELECT total_amount INTO v_total
    FROM supplier_purchases WHERE id = p_purchase_id AND status = 'posted' FOR UPDATE;
  IF v_total IS NULL THEN RAISE EXCEPTION 'Pengadaan tidak ditemukan atau tidak aktif'; END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_paid
    FROM supplier_payments WHERE purchase_id = p_purchase_id;

  IF v_paid + p_amount > v_total THEN
    RAISE EXCEPTION 'Pembayaran melebihi sisa hutang';
  END IF;

  INSERT INTO supplier_payments(purchase_id,amount,payment_date,payment_method,notes)
  VALUES(p_purchase_id,p_amount,COALESCE(p_payment_date,CURRENT_DATE),COALESCE(p_payment_method,'Transfer'),p_notes)
  RETURNING id INTO v_payment_id;
  RETURN v_payment_id;
END;
$$;

CREATE OR REPLACE VIEW public.supplier_purchase_balances AS
SELECT p.id, p.supplier_name, p.purchase_date, p.payment_terms, p.total_amount,
       COALESCE(SUM(pay.amount),0)::numeric(14,2) AS paid_amount,
       (p.total_amount - COALESCE(SUM(pay.amount),0))::numeric(14,2) AS outstanding_amount,
       p.status
FROM supplier_purchases p
LEFT JOIN supplier_payments pay ON pay.purchase_id = p.id
GROUP BY p.id;
