import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { formatRupiah } from '../lib/format';
import { LoadingState, ErrorState } from '../components/States';
import {
  Wrench, Code2, Cpu, Clock, CheckCircle2, AlertCircle,
  DollarSign, Package, TrendingUp, ArrowRight, FileText, Wallet,
  ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';

const surface = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [services, projects, spareparts, invoices, finance] = await Promise.all([
        supabase.from('services').select('id, work_status, payment_status, estimated_total, service_fee'),
        supabase.from('software_projects').select('id, work_status, payment_status, estimated_total'),
        supabase.from('spareparts').select('id, stock, low_stock_threshold, selling_price'),
        supabase.from('invoices').select('total_amount, amount_paid, payment_status'),
        supabase.from('financial_transactions').select('transaction_type, amount'),
      ]);
      for (const result of [services, projects, spareparts, invoices, finance]) {
        if (result.error) throw result.error;
      }

      const serviceRows = services.data || [];
      const projectRows = projects.data || [];
      const partRows = spareparts.data || [];
      const invoiceRows = invoices.data || [];
      const financeRows = finance.data || [];
      const activeService = ['Menunggu pemeriksaan', 'Sedang diperiksa', 'Menunggu sparepart', 'Sedang dikerjakan'];
      const activeProject = ['Proposal', 'Menunggu persetujuan', 'Planning', 'Development', 'Testing', 'Revisi'];
      const totalContractValue =
        serviceRows.reduce((a, s) => a + (Number(s.estimated_total) || 0), 0) +
        projectRows.reduce((a, p) => a + (Number(p.estimated_total) || 0), 0);
      const cashIncome = financeRows.filter((t) => t.transaction_type === 'income').reduce((a, t) => a + Number(t.amount || 0), 0);
      const cashExpense = financeRows.filter((t) => t.transaction_type === 'expense').reduce((a, t) => a + Number(t.amount || 0), 0);
      const unpaidInvoices = invoiceRows.filter((i) => i.payment_status !== 'Lunas');
      const unpaidAmount = unpaidInvoices.reduce((a, i) => a + (Number(i.total_amount) - Number(i.amount_paid || 0)), 0);
      const lowStock = partRows.filter((s) => s.stock <= s.low_stock_threshold);

      setStats({
        totalService: serviceRows.length,
        serviceActive: serviceRows.filter((s) => activeService.includes(s.work_status)).length,
        serviceDone: serviceRows.filter((s) => ['Selesai', 'Diambil customer'].includes(s.work_status)).length,
        totalProject: projectRows.length,
        projectActive: projectRows.filter((p) => activeProject.includes(p.work_status)).length,
        unpaidCount: unpaidInvoices.length,
        unpaidAmount,
        totalContractValue,
        cashIncome,
        cashExpense,
        netCash: cashIncome - cashExpense,
        sparepartCount: partRows.length,
        lowStockCount: lowStock.length,
      });
    } catch (err) {
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const operations = [
    { label: 'Total Service', value: stats.totalService, icon: Wrench, tone: 'blue', to: '/service' },
    { label: 'Service Berjalan', value: stats.serviceActive, icon: Clock, tone: 'amber', to: '/service' },
    { label: 'Service Selesai', value: stats.serviceDone, icon: CheckCircle2, tone: 'emerald', to: '/service' },
    { label: 'Total Project', value: stats.totalProject, icon: Code2, tone: 'violet', to: '/software' },
    { label: 'Project Berjalan', value: stats.projectActive, icon: TrendingUp, tone: 'indigo', to: '/software' },
    { label: 'Sparepart Tersedia', value: stats.sparepartCount, sub: stats.lowStockCount > 0 ? stats.lowStockCount + ' stok rendah' : 'Stok aman', icon: Package, tone: 'teal', to: '/sparepart' },
  ];
  const finance = [
    { label: 'Kas Masuk Aktual', value: formatRupiah(stats.cashIncome), icon: ArrowDownLeft, tone: 'emerald' },
    { label: 'Kas Keluar Aktual', value: formatRupiah(stats.cashExpense), icon: ArrowUpRight, tone: 'rose' },
    { label: 'Arus Kas Bersih', value: formatRupiah(stats.netCash), icon: Wallet, tone: 'blue' },
  ];
  const toneStyles = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
    teal: 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">Ringkasan bisnis</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pantau pekerjaan, stok, dan arus kas bisnis dalam satu tempat.</p>
        </div>
        <button onClick={load} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
          <TrendingUp size={16} /> Perbarui data
        </button>
      </div>

      {stats.lowStockCount > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"><AlertCircle size={18} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Perlu perhatian pada stok</p>
            <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-300">Ada {stats.lowStockCount} sparepart dengan stok rendah. Periksa persediaan sebelum pekerjaan berikutnya.</p>
          </div>
          <Link to="/sparepart" className="shrink-0 text-xs font-semibold text-amber-800 hover:underline dark:text-amber-200">Lihat stok</Link>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div><h2 className="text-base font-bold text-slate-900 dark:text-white">Aktivitas operasional</h2><p className="mt-0.5 text-xs text-slate-500">Ringkasan pekerjaan dan persediaan</p></div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">Operasional</span>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {operations.map((item) => <MetricCard key={item.label} item={item} toneStyles={toneStyles} />)}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div><h2 className="text-base font-bold text-slate-900 dark:text-white">Ringkasan keuangan</h2><p className="mt-0.5 text-xs text-slate-500">Berdasarkan transaksi kas yang sudah dicatat</p></div>
          <Link to="/finance" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">Buka keuangan <ArrowRight size={14} /></Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {finance.map((item) => <MetricCard key={item.label} item={item} toneStyles={toneStyles} financial />)}
        </div>
        <div className={surface + ' mt-3 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><DollarSign size={19} /></div>
            <div><p className="text-xs text-slate-500">Nilai estimasi pekerjaan</p><p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">{formatRupiah(stats.totalContractValue)}</p></div>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-slate-500">Nilai service dan project yang tercatat. Angka ini bukan kas masuk dan tidak sama dengan keuntungan.</p>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className={surface + ' p-4 sm:p-5'}>
          <div className="mb-4"><h2 className="text-base font-bold text-slate-900 dark:text-white">Akses cepat</h2><p className="mt-0.5 text-xs text-slate-500">Langsung menuju pekerjaan yang ingin dikelola</p></div>
          <div className="grid grid-cols-2 gap-2.5">
            <QuickAction to="/service" icon={Wrench} label="Service baru" />
            <QuickAction to="/software" icon={Code2} label="Project baru" />
            <QuickAction to="/sparepart" icon={Cpu} label="Kelola sparepart" />
            <QuickAction to="/proposal" icon={FileText} label="Buat proposal" />
          </div>
        </div>
        <div className={surface + ' flex items-center gap-4 p-4 sm:p-5'}>
          <div className="rounded-xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"><AlertCircle size={21} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Invoice belum lunas</p>
            <p className="mt-0.5 text-xs text-slate-500">{stats.unpaidCount} invoice tercatat belum lunas</p>
            <p className="mt-2 text-lg font-bold text-rose-600">{formatRupiah(stats.unpaidAmount)}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ item, toneStyles, financial = false }) {
  const Icon = item.icon;
  const content = (
    <div className={`h-full rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 sm:p-5 ${item.to ? 'hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md dark:hover:border-slate-700' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneStyles[item.tone]}`}><Icon size={19} /></div>
        {item.to && <ArrowRight size={15} className="mt-1 text-slate-300 dark:text-slate-600" />}
      </div>
      <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
      <p className={`mt-1 break-words font-bold tracking-tight text-slate-900 dark:text-white ${financial ? 'text-lg sm:text-xl' : 'text-2xl'}`}>{item.value}</p>
      {item.sub && <p className="mt-1 text-[11px] text-slate-500">{item.sub}</p>}
    </div>
  );
  return item.to ? <Link to={item.to} className="block">{content}</Link> : content;
}

function QuickAction({ to, icon: Icon, label }) {
  return <Link to={to} className="group flex min-h-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-brand-300">
    <Icon size={17} className="shrink-0 text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-300" />
    <span>{label}</span>
    <ArrowRight size={14} className="ml-auto shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
  </Link>;
}
