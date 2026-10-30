import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { formatRupiah } from '../lib/format';
import { LoadingState, ErrorState } from '../components/States';
import {
  Wrench, Code2, Cpu, Clock, CheckCircle2, AlertCircle,
  DollarSign, Package, TrendingUp, ArrowRight, FileText,
} from 'lucide-react';

const card = 'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm';

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

      if (services.error) throw services.error;
      if (projects.error) throw projects.error;
      if (spareparts.error) throw spareparts.error;
      if (invoices.error) throw invoices.error;
      if (finance.error) throw finance.error;

      const activeService = ['Menunggu pemeriksaan', 'Sedang diperiksa', 'Menunggu sparepart', 'Sedang dikerjakan'];
      const activeProject = ['Proposal', 'Menunggu persetujuan', 'Planning', 'Development', 'Testing', 'Revisi'];

      const totalContractValue =
        (services.data || []).reduce((a, s) => a + (Number(s.estimated_total) || 0), 0) +
        (projects.data || []).reduce((a, p) => a + (Number(p.estimated_total) || 0), 0);
      const cashIncome = (finance.data || []).filter((t) => t.transaction_type === 'income').reduce((a, t) => a + Number(t.amount || 0), 0);
      const cashExpense = (finance.data || []).filter((t) => t.transaction_type === 'expense').reduce((a, t) => a + Number(t.amount || 0), 0);

      const unpaidInvoices = (invoices.data || []).filter((i) => i.payment_status !== 'Lunas');
      const unpaidAmount = unpaidInvoices.reduce((a, i) => a + (Number(i.total_amount) - Number(i.amount_paid || 0)), 0);

      const lowStock = (spareparts.data || []).filter((s) => s.stock <= s.low_stock_threshold);

      setStats({
        totalService: services.data.length,
        serviceActive: services.data.filter((s) => activeService.includes(s.work_status)).length,
        serviceDone: services.data.filter((s) => ['Selesai', 'Diambil customer'].includes(s.work_status)).length,
        totalProject: projects.data.length,
        projectActive: projects.data.filter((p) => activeProject.includes(p.work_status)).length,
        unpaidCount: unpaidInvoices.length,
        unpaidAmount,
        totalContractValue,
        cashIncome,
        cashExpense,
        netCash: cashIncome - cashExpense,
        sparepartCount: spareparts.data.length,
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

  const cards = [
    { label: 'Total Service', value: stats.totalService, icon: Wrench, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400', to: '/service' },
    { label: 'Service Dikerjakan', value: stats.serviceActive, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400', to: '/service' },
    { label: 'Service Selesai', value: stats.serviceDone, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400', to: '/service' },
    { label: 'Total Project Software', value: stats.totalProject, icon: Code2, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-400', to: '/software' },
    { label: 'Project Berjalan', value: stats.projectActive, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400', to: '/software' },
    { label: 'Invoice Belum Lunas', value: stats.unpaidCount, sub: formatRupiah(stats.unpaidAmount), icon: AlertCircle, color: 'text-red-600 bg-red-50 dark:bg-red-950/60 dark:text-red-400', to: '/service' },
    { label: 'Nilai Estimasi Pekerjaan', value: formatRupiah(stats.totalTransactions), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400' },
    { label: 'Sparepart Tersedia', value: stats.sparepartCount, sub: stats.lowStockCount > 0 ? `${stats.lowStockCount} stok rendah` : 'Stok aman', icon: Package, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-400', to: '/sparepart' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Ringkasan aktivitas bisnis Anda</p>
      </div>

      {stats.lowStockCount > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-3">
          <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Ada <strong>{stats.lowStockCount} sparepart</strong> dengan stok rendah. Segera lakukan pembelian.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          const content = (
            <div className={card + ' hover:shadow-md transition h-full flex flex-col'}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color}`}>
                  <Icon size={20} />
                </div>
                {c.to && <ArrowRight size={16} className="text-slate-300 dark:text-slate-600" />}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{c.label}</p>
              <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">{c.value}</p>
              {c.sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.sub}</p>}
            </div>
          );
          return c.to ? (
            <Link key={i} to={c.to} className="block">{content}</Link>
          ) : (
            <div key={i}>{content}</div>
          );
        })}
      </div>

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        <div className={card}>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Akses Cepat</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/service" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              <Wrench size={16} /> Service Baru
            </Link>
            <Link to="/software" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              <Code2 size={16} /> Project Baru
            </Link>
            <Link to="/sparepart" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              <Cpu size={16} /> Stok Sparepart
            </Link>
            <Link to="/proposal" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              <FileText size={16} /> Proposal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
