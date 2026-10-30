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
- See cumulative income, expenses and net cash movement.
- Edit/delete manually recorded entries.
- Optional reference type is metadata only in this MVP; it does not automatically create transactions or validate the referenced record.

## Important accounting distinctions
- Proposal value and project/service contract value are not cash received.
- Invoice total and payment status are not proof of a payment transaction.
- Stock value is inventory/asset value; purchasing stock affects cash, while cost of goods sold should be recognized when stock is sold/used. The current MVP records purchase cash outflow but does not calculate COGS or inventory valuation.
- Net cash movement (income minus expenses) is not the same as accounting profit.
- Do not automatically copy payment_status into the ledger. Record each actual payment (including DP and installments) separately to avoid overstating revenue.

## Recommended next phases
1. Add payment allocations to services/projects/invoices so each DP/installment/payment can be tied to its source and duplicate entries prevented.
2. Add purchase records and stock movement history (purchase, service usage, adjustment, damaged/lost).
3. Calculate COGS from sparepart purchase cost snapshots and service usage; distinguish gross profit from cash flow.
4. Add monthly period filters, opening cash balance, cash/bank accounts and cash reconciliation.
5. Add simple monthly income statement: revenue, direct costs, operating expenses, gross profit and net operating result.
6. Add receivables/payables and overdue aging after the payment workflow is reliable.

## Migration
Apply supabase/migrations/20261030000100_financial_transactions.sql to the Supabase project before using the Keuangan page.