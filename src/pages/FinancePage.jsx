import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import { LoadingState, EmptyState, ErrorState } from '../components/States';
import { Field, TextInput, TextArea, Select } from '../components/FormFields';
import { formatRupiah, formatDateShort, toRupiahInput, parseRupiahInput } from '../lib/format';
import { Plus, ArrowDownLeft, ArrowUpRight, Wallet, Trash2, Pencil, Receipt } from 'lucide-react';

const PAGE_SIZE = 10;
const CATEGORIES = {
  income: ['Pendapatan Service', 'Penjualan Sparepart', 'Project Software', 'Pembayaran Piutang', 'Pendapatan Lainnya'],
  expense: ['Pembelian Sparepart', 'Operasional', 'Transportasi', 'Peralatan', 'Internet & Utilitas', 'Pemasaran', 'Biaya Lainnya'],
};
const EMPTY_FORM = {
  transaction_type: 'income', category: 'Pendapatan Service', description: '',
  amount: 0, transaction_date: new Date().toISOString().slice(0, 10),
  payment_method: 'Transfer', reference_type: 'manual', reference_id: '',
};

export default function FinancePage() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`);
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async () => {
    setLoading(true); setError('');
    const { data, error: queryError } = await supabase
      .from('financial_transactions').select('*')
      .order('transaction_date', { ascending: false }).order('created_at', { ascending: false });
    if (queryError) setError(queryError.message);
    else setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const periodRows = useMemo(() => rows.filter((row) =>
    (!dateFrom || row.transaction_date >= dateFrom) && (!dateTo || row.transaction_date <= dateTo)
  ), [rows, dateFrom, dateTo]);
  const filtered = useMemo(() => periodRows.filter((row) => {
    const q = search.trim().toLowerCase();
    return (!q || [row.category, row.description, row.payment_method].some((v) => v?.toLowerCase().includes(q)))
      && (!typeFilter || row.transaction_type === typeFilter);
  }), [periodRows, search, typeFilter]);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const income = periodRows.filter((r) => r.transaction_type === 'income').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const expense = periodRows.filter((r) => r.transaction_type === 'expense').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (row) => {
    if (row.payment_id) { toast.error('Pembayaran dari Service/Project harus dikelola melalui riwayat pembayaran sumbernya.'); return; }
    setEditing(row); setForm({ ...EMPTY_FORM, ...row, reference_id: row.reference_id || '' }); setFormOpen(true);
  };
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    if (!form.category || Number(form.amount) <= 0 || !form.transaction_date) {
      toast.error('Kategori, jumlah lebih dari 0, dan tanggal wajib diisi.'); return;
    }
    setSaving(true);
    const payload = {
      transaction_type: form.transaction_type, category: form.category,
      description: form.description.trim() || null, amount: Number(form.amount),
      transaction_date: form.transaction_date, payment_method: form.payment_method,
      reference_type: form.reference_type || 'manual', reference_id: form.reference_id || null,
    };
    const result = editing
      ? await supabase.from('financial_transactions').update(payload).eq('id', editing.id)
      : await supabase.from('financial_transactions').insert(payload);
    setSaving(false);
    if (result.error) { toast.error('Gagal menyimpan: ' + result.error.message); return; }
    toast.success(editing ? 'Transaksi diperbarui' : 'Transaksi dicatat');
    setFormOpen(false); load();
  };

  const remove = async () => {
    if (deleting?.payment_id) {
      toast.error('Hapus pembayaran melalui riwayat pembayaran pada Service/Project terkait.');
      setDeleting(null);
      return;
    }
    setSaving(true);
    const { error: removeError } = await supabase.from('financial_transactions').delete().eq('id', deleting.id);
    setSaving(false);
    if (removeError) { toast.error('Gagal menghapus: ' + removeError.message); return; }
    toast.success('Transaksi dihapus'); setDeleting(null); load();
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div><h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">Keuangan</h1>
          <p className="text-sm text-slate-500 mt-1">Catat uang yang benar-benar diterima dan dikeluarkan bisnis.</p></div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"><Plus size={16}/> Catat Transaksi</button>
      </div>

      <div className="app-panel p-4 sm:p-5 mb-4">
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <Field label="Dari tanggal"><TextInput type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} /></Field>
          <Field label="Sampai tanggal"><TextInput type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} /></Field>
          <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }} className="px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800">Semua Periode</button>
        </div>
        <p className="text-xs text-slate-500 mt-1">Ringkasan dihitung dari transaksi pada periode ini, bukan nilai proposal atau nilai kontrak.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <SummaryCard label="Total Pemasukan" amount={income} icon={ArrowDownLeft} />
        <SummaryCard label="Total Pengeluaran" amount={expense} icon={ArrowUpRight} />
        <SummaryCard label="Arus Kas Bersih" amount={income - expense} icon={Wallet} />
      </div>

      <div className="app-panel">
        <div className="px-4 py-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <div className="flex-1"><SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari kategori, keterangan, metode..." /></div>
          <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="!w-auto">
            <option value="">Semua Jenis Transaksi</option><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option>
          </Select>
        </div>
        {loading ? <LoadingState/> : error ? <ErrorState message={error} onRetry={load}/> : paged.length === 0
          ? <EmptyState icon={Receipt} title="Belum ada transaksi" message="Catat pemasukan atau pengeluaran pertama bisnis."/>
          : <>
            <div className="hidden md:block overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400"><tr>
                <th className="text-left px-4 py-3">Tanggal</th><th className="text-left px-4 py-3">Jenis</th><th className="text-left px-4 py-3">Kategori / Keterangan</th><th className="text-left px-4 py-3">Metode</th><th className="text-right px-4 py-3">Jumlah</th><th className="text-center px-4 py-3">Aksi</th>
              </tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{paged.map((row) => <tr key={row.id}>
                <td className="px-4 py-3 text-slate-500">{formatDateShort(row.transaction_date)}</td>
                <td className="px-4 py-3"><span className={row.transaction_type === 'income' ? 'text-emerald-600' : 'text-rose-600'}>{row.transaction_type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span></td>
                <td className="px-4 py-3"><div className="font-medium text-slate-800 dark:text-slate-200">{row.category}</div><div className="text-xs text-slate-500">{row.description || '-'}</div></td>
                <td className="px-4 py-3 text-slate-500">{row.payment_method}{row.payment_id && <span className="block text-[10px] text-emerald-600">Otomatis dari pembayaran</span>}</td>
                <td className={'px-4 py-3 text-right font-semibold '+(row.transaction_type === 'income' ? 'text-emerald-600' : 'text-rose-600')}>{row.transaction_type === 'income' ? '+' : '-'}{formatRupiah(row.amount)}</td>
                <td className="px-4 py-3"><div className="flex justify-center gap-1">{row.payment_id ? <span className="text-[11px] text-slate-400">Dikelola dari sumber</span> : <><IconButton title="Edit" onClick={() => openEdit(row)}><Pencil size={15}/></IconButton><IconButton title="Hapus" onClick={() => setDeleting(row)}><Trash2 size={15}/></IconButton></>}</div></td>
              </tr>)}</tbody></table></div>
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">{paged.map((row) => <div key={row.id} className="p-4 flex justify-between gap-3">
              <div><p className="font-medium text-slate-800 dark:text-slate-200">{row.category}</p><p className="text-xs text-slate-500">{formatDateShort(row.transaction_date)} · {row.payment_method}</p><p className="text-xs text-slate-500 mt-1">{row.description || '-'}</p></div>
              <div className="text-right shrink-0"><p className={'font-semibold '+(row.transaction_type === 'income' ? 'text-emerald-600' : 'text-rose-600')}>{row.transaction_type === 'income' ? '+' : '-'}{formatRupiah(row.amount)}</p><div className="flex justify-end mt-2">{row.payment_id ? <span className="text-[10px] text-slate-400">Otomatis</span> : <><IconButton title="Edit" onClick={() => openEdit(row)}><Pencil size={15}/></IconButton><IconButton title="Hapus" onClick={() => setDeleting(row)}><Trash2 size={15}/></IconButton></>}</div></div>
            </div>)}</div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800"><p className="text-xs text-slate-500 mb-2">Menampilkan {paged.length} dari {filtered.length} transaksi</p><Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} onChange={setPage}/></div>
          </>}
      </div>

      {formOpen && <Modal open onClose={() => setFormOpen(false)} title={editing ? 'Edit Transaksi' : 'Catat Transaksi'} size="lg"
        footer={<div className="flex justify-end gap-2"><button onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg text-sm bg-slate-100 dark:bg-slate-800">Batal</button><button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-white bg-brand-600 disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan'}</button></div>}>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Jenis Transaksi" required><Select value={form.transaction_type} onChange={(e) => { const type = e.target.value; setForm((f) => ({ ...f, transaction_type: type, category: CATEGORIES[type][0] })); }}><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option></Select></Field>
          <Field label="Kategori" required><Select value={form.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES[form.transaction_type].map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
          <Field label="Jumlah (Rp)" required><TextInput value={toRupiahInput(form.amount)} onChange={(e) => set('amount', parseRupiahInput(e.target.value))} inputMode="numeric" placeholder="0"/></Field>
          <Field label="Tanggal" required><TextInput type="date" value={form.transaction_date} onChange={(e) => set('transaction_date', e.target.value)}/></Field>
          <Field label="Metode Pembayaran"><Select value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)}><option>Transfer</option><option>Tunai</option><option>QRIS</option><option>E-Wallet</option><option>Lainnya</option></Select></Field>
          <Field label="Sumber Transaksi"><Select value={form.reference_type} onChange={(e) => set('reference_type', e.target.value)}><option value="manual">Manual</option><option value="service">Service</option><option value="software_project">Project Software</option><option value="sparepart">Sparepart</option><option value="other">Lainnya</option></Select></Field>
          <div className="sm:col-span-2"><Field label="Keterangan"><TextArea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Contoh: pembayaran DP service laptop customer"/></Field></div>
        </form>
      </Modal>}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={saving} message={`Hapus transaksi "${deleting?.category}" sebesar ${formatRupiah(deleting?.amount)}?`}/>
    </div>
  );
}

function SummaryCard({ label, amount, icon: Icon }) {
  return <div className="app-panel p-4 sm:p-5"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><Icon size={18} className="text-slate-400"/></div><p className="text-xl font-bold text-slate-900 dark:text-white mt-2">{formatRupiah(amount)}</p></div>;
}
function IconButton({ children, onClick, title }) {
  return <button type="button" title={title} onClick={onClick} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">{children}</button>;
}
