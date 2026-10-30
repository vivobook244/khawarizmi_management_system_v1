# Finance module — operating model

## Purpose
Khawarizmi is an internal operational and cash-flow tracker for a small service and software business. The finance module starts with a simple cash-basis ledger, not full double-entry accounting.

## Existing operational data
- Service: work order, service fee, sparepart usage, estimated total, work/payment status.
- Sparepart: stock quantity, purchase cost and selling price, supplier.
- Software Development: project value, RAB and work/payment status.
- Proposal: quotation only. A proposal is not revenue until the customer actually pays.
- Invoices: currently a separate table and not consistently generated/linked by the operational screens.

## Finance MVP in this branch
- Record actual cash received (income) and actual cash paid (expense).
- Categorize transactions and record date, payment method and optional source type.
- See income, expenses and net cash movement for a selected date range (defaults to the current month).
- Dashboard distinguishes estimated work/contract value from actual cash received and paid.
- Edit/delete manually recorded entries. Payment-linked ledger rows are read-only here and must be managed from their source record.
- Service and software project detail screens show payment history (DP, installments, settlement), paid total and remaining balance.
- Each `business_payments` row automatically creates one `financial_transactions` income row through a database trigger; deleting the payment also removes its linked ledger row.
- Payment status is recalculated from recorded payment totals. Service uses `Belum bayar` / `DP` / `Lunas`; software projects use `Belum bayar` / `DP` / `Cicilan` / `Lunas`.
- Payment rows are source-linked using `source_type` and `source_id`; the ledger's `payment_id` unique key prevents more than one ledger entry per payment.

## Important accounting distinctions
- Proposal value and project/service contract value are not cash received.
- Invoice total and payment status are not proof of a payment transaction.
- Stock value is inventory/asset value; purchasing stock affects cash, while cost of goods sold should be recognized when stock is sold/used. The current MVP records purchase cash outflow but does not calculate COGS or inventory valuation.
- Net cash movement (income minus expenses) is not the same as accounting profit.
- Do not treat a manually selected payment status as cash. Only records in `business_payments` generate cash income. Do not also enter the same payment manually in Keuangan.

## Recommended next phases
1. Add payment allocations to invoices and reconcile existing legacy invoice balances with the new payment history.
2. Add purchase records and stock movement history (purchase, service usage, adjustment, damaged/lost).
3. Calculate COGS from sparepart purchase cost snapshots and service usage; distinguish gross profit from cash flow.
4. Add opening cash balance, cash/bank accounts and cash reconciliation. Date-range filtering is included in the current development branch.
5. Add simple monthly income statement: revenue, direct costs, operating expenses, gross profit and net operating result.
6. Add receivables/payables and overdue aging after the payment workflow is reliable.

## Migration
Apply migrations in order: `20261030000100_financial_transactions.sql`, then `20261030000200_business_payment_history.sql`. The second migration requires the first.

## Audit notes for the current development branch
- The current finance screen is a cash ledger: entries must represent money actually received or paid.
- The dashboard's contract/work estimate must never be presented as cash income.
- Current finance summaries are calculated from the selected date range; transaction search and type filters only affect the list, not the period summary.
- Manually entered transactions can still be duplicated if the same real-world payment is also entered by hand. Use Service/Project payment history for those sources; use manual entries for unrelated income/expenses.
- Existing `invoices` remain separate and are not yet allocated to individual payment records; the current workflow uses service/project values as the payment ceiling.
- This module does not yet calculate accounting profit, COGS, inventory value, tax, or receivables aging.
