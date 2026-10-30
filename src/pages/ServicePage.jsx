import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import PaymentHistory from '../components/PaymentHistory';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import StatusBadge, { workStatusColor, paymentStatusColor } from '../components/StatusBadge';
import { LoadingState, EmptyState, ErrorState } from '../components/States';
import { Field, TextInput, TextArea, Select } from '../components/FormFields';
import {
  WORK_STATUS_SERVICE, PAYMENT_STATUS_SERVICE, generateInvoiceNumber,
} from '../lib/constants';
import { formatRupiah, formatDateShort, toRupiahInput, parseRupiahInput } from '../lib/format';
import { exportServicesExcel, downloadServiceInvoice, exportInvoiceService } from '../lib/exporters';
import {
  Plus, Eye, Pencil, Trash2, FileText, Download, Wrench, Filter, X, Printer,
} from 'lucide-react';

const PAGE_SIZE = 8;

export default function ServicePage() {
  const { isTechnician, isAdmin } = useAuth();
  const toast = useToast();
  const canEdit = isAdmin || isTechnician;

  const [services, setServices] = useState([]);
  const [spareparts, setSpareparts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [payFilter, setPayFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('service_date');
  const [sortDir, setSortDir] = useState('desc');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [viewSpareparts, setViewSpareparts] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order(sortBy, { ascending: sortDir === 'asc' });
      if (error) throw error;
      setServices(data || []);
      const { data: sp } = await supabase.from('spareparts').select('id, name, stock, selling_price').order('name');
      setSpareparts(sp || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [sortBy, sortDir]);

  const filtered = useMemo(() => {
    let r = services;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((s) =>
        s.customer_name?.toLowerCase().includes(q) ||
        s.device?.toLowerCase().includes(q) ||
        s.invoice_number?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) r = r.filter((s) => s.work_status === statusFilter);
    if (payFilter) r = r.filter((s) => s.payment_status === payFilter);
    return r;
  }, [services, search, statusFilter, payFilter]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (s) => { setEditing(s); setFormOpen(true); };

  const openView = async (s) => {
    const { data, error } = await supabase
      .from('service_spareparts')
      .select('*')
      .eq('service_id', s.id);
    if (error) {
      toast.error('Gagal memuat detail sparepart: ' + error.message);
      return;
    }
    setViewSpareparts(data || []);
    setViewing(s);
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const { error: eSsp } = await supabase.from('service_spareparts').delete().eq('service_id', deleting.id);
      if (eSsp) throw eSsp;
      const { error } = await supabase.from('services').delete().eq('id', deleting.id);
      if (error) throw error;
      toast.success('Data service berhasil dihapus');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error('Gagal menghapus: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInvoice = async (s) => {
    try {
      const { data } = await supabase.from('service_spareparts').select('*').eq('service_id', s.id);
      downloadServiceInvoice(s, data || []);
      toast.success('Invoice PDF diunduh');
    } catch (err) {
      toast.error('Gagal membuat invoice');
    }
  };

  const printInvoice = async (s) => {
    try {
      const { data } = await supabase.from('service_spareparts').select('*').eq('service_id', s.id);
      const doc = exportInvoiceService(s, data || []);
      doc.autoPrint();
      const url = doc.output('bloburl');
      window.open(url, '_blank');
    } catch (err) {
      toast.error('Gagal mencetak invoice');
    }
  };

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">Service</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Kelola pekerjaan service laptop/komputer</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportServicesExcel(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Download size={16} /> Export Excel
          </button>
          {canEdit && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
            >
              <Plus size={16} /> Tambah
            </button>
          )}
        </div>
      </div>

      <div className="app-panel">
        <div className="px-4 py-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari customer, perangkat, no invoice..." />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="!w-auto">
              <option value="">Semua Status</option>
              {WORK_STATUS_SERVICE.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select value={payFilter} onChange={(e) => { setPayFilter(e.target.value); setPage(1); }} className="!w-auto">
              <option value="">Semua Bayar</option>
              {PAYMENT_STATUS_SERVICE.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : paged.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="Belum ada data service"
            message={search || statusFilter || payFilter ? "Tidak ada hasil untuk filter ini." : "Klik Tambah untuk membuat service pertama."}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort('invoice_number')}>Invoice</th>
                    <th className="text-left px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort('customer_name')}>Customer</th>
                    <th className="text-left px-4 py-3 font-medium">Perangkat</th>
                    <th className="text-left px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort('work_status')}>Status</th>
                    <th className="text-left px-4 py-3 font-medium">Pembayaran</th>
                    <th className="text-right px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort('estimated_total')}>Total</th>
                    <th className="text-left px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort('service_date')}>Tanggal</th>
                    <th className="text-center px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paged.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-xs text-slate-500">{s.invoice_number || '-'}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{s.customer_name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.device}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.work_status} color={workStatusColor(s.work_status)} /></td>
                      <td className="px-4 py-3"><StatusBadge status={s.payment_status} color={paymentStatusColor(s.payment_status)} /></td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">{formatRupiah(s.estimated_total)}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDateShort(s.service_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <IconBtn title="Lihat" onClick={() => openView(s)}><Eye size={16} /></IconBtn>
                          <IconBtn title="Invoice" onClick={() => handleInvoice(s)}><FileText size={16} /></IconBtn>
                          {canEdit && <IconBtn title="Edit" onClick={() => openEdit(s)}><Pencil size={16} /></IconBtn>}
                          {canEdit && <IconBtn title="Hapus" onClick={() => setDeleting(s)} danger><Trash2 size={16} /></IconBtn>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {paged.map((s) => (
                <div key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{s.customer_name}</p>
                      <p className="text-xs text-slate-500">{s.device}</p>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm shrink-0">{formatRupiah(s.estimated_total)}</p>
                  </div>
                  <div className="flex gap-1.5 mb-3">
                    <StatusBadge status={s.work_status} color={workStatusColor(s.work_status)} />
                    <StatusBadge status={s.payment_status} color={paymentStatusColor(s.payment_status)} />
                  </div>
                  <div className="flex gap-1">
                    <IconBtn title="Lihat" onClick={() => openView(s)}><Eye size={16} /></IconBtn>
                    <IconBtn title="Invoice" onClick={() => handleInvoice(s)}><FileText size={16} /></IconBtn>
                    <IconBtn title="Cetak" onClick={() => printInvoice(s)}><Printer size={16} /></IconBtn>
                    {canEdit && <IconBtn title="Edit" onClick={() => openEdit(s)}><Pencil size={16} /></IconBtn>}
                    {canEdit && <IconBtn title="Hapus" onClick={() => setDeleting(s)} danger><Trash2 size={16} /></IconBtn>}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 mb-2">Menampilkan {paged.length} dari {filtered.length} data</p>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {formOpen && (
        <ServiceForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          editing={editing}
          spareparts={spareparts}
          onSaved={() => { setFormOpen(false); load(); }}
        />
      )}

      {viewing && (
        <ServiceViewModal
          service={viewing}
          spareparts={viewSpareparts}
          onClose={() => setViewing(null)}
          onPrint={() => printInvoice(viewing)}
          onDownload={() => handleInvoice(viewing)}
          canEdit={canEdit}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={saving}
        message={`Hapus service "${deleting?.customer_name} - ${deleting?.device}"? Stok sparepart yang dipakai akan dikembalikan.`}
      />
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition ${
        danger
          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

// ---------- Service Form ----------
function ServiceForm({ open, onClose, editing, spareparts, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    customer_name: '', device: '', problem: '', work_status: 'Menunggu pemeriksaan',
    service_fee: 0, estimated_duration: '',
    estimated_total: 0, actions: '', notes: '', service_date: new Date().toISOString().slice(0, 10),
  });
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        customer_name: editing.customer_name || '',
        device: editing.device || '',
        problem: editing.problem || '',
        work_status: editing.work_status || 'Menunggu pemeriksaan',
        service_fee: Number(editing.service_fee) || 0,
        estimated_duration: editing.estimated_duration || '',
        estimated_total: Number(editing.estimated_total) || 0,
        actions: editing.actions || '',
        notes: editing.notes || '',
        service_date: editing.service_date || new Date().toISOString().slice(0, 10),
      });
      (async () => {
        const { data } = await supabase.from('service_spareparts').select('*').eq('service_id', editing.id);
        setItems(data || []);
      })();
    } else {
      setForm({
        customer_name: '', device: '', problem: '', work_status: 'Menunggu pemeriksaan',
        service_fee: 0, estimated_duration: '',
        estimated_total: 0, actions: '', notes: '', service_date: new Date().toISOString().slice(0, 10),
      });
      setItems([]);
    }
    setErrors({});
  }, [editing, open]);

  const sparepartsTotal = items.reduce((a, it) => a + (Number(it.subtotal) || Number(it.quantity) * Number(it.price)), 0);
  const grandTotal = (Number(form.service_fee) || 0) + sparepartsTotal;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.customer_name.trim()) e.customer_name = 'Nama customer wajib diisi';
    if (!form.device.trim()) e.device = 'Perangkat wajib diisi';
    if (!form.service_date) e.service_date = 'Tanggal wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        service_fee: Number(form.service_fee) || 0,
        estimated_total: grandTotal,
      };

      let serviceId = editing?.id;
      if (editing) {
        const { error } = await supabase.from('services').update(payload).eq('id', editing.id);
        if (error) throw error;
        // delete old sparepart links (restores stock via trigger)
        const { error: eDel } = await supabase.from('service_spareparts').delete().eq('service_id', editing.id);
        if (eDel) throw eDel;
      } else {
        const invNum = generateInvoiceNumber('SRV');
        const { data, error } = await supabase.from('services').insert({ ...payload, invoice_number: invNum }).select().single();
        if (error) throw error;
        serviceId = data.id;
      }

      // re-insert sparepart links (decrements stock via trigger)
      if (items.length) {
        const rows = items.map((it) => ({
          service_id: serviceId,
          sparepart_id: it.sparepart_id,
          sparepart_name: it.sparepart_name,
          quantity: Number(it.quantity),
          price: Number(it.price),
        }));
        const { error: eIns } = await supabase.from('service_spareparts').insert(rows);
        if (eIns) throw eIns;
      }

      toast.success(editing ? 'Data service berhasil diperbarui' : 'Data service berhasil disimpan');
      onSaved();
    } catch (err) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addSparepartRow = () => {
    setItems((arr) => [...arr, { sparepart_id: '', sparepart_name: '', quantity: 1, price: 0 }]);
  };

  const updateSparepartRow = (idx, field, value) => {
    setItems((arr) => {
      const next = [...arr];
      if (field === 'sparepart_id') {
        const sp = spareparts.find((s) => s.id === value);
        next[idx] = {
          ...next[idx],
          sparepart_id: value,
          sparepart_name: sp?.name || '',
          price: sp?.selling_price || 0,
        };
      } else {
        next[idx] = { ...next[idx], [field]: value };
      }
      return next;
    });
  };

  const removeSparepartRow = (idx) => {
    setItems((arr) => arr.filter((_, i) => i !== idx));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Service' : 'Tambah Service'}
      size="xl"
      footer={
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">Batal</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Nama Customer" required error={errors.customer_name}>
            <TextInput value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} error={errors.customer_name} placeholder="Nama customer" />
          </Field>
          <Field label="Perangkat" required error={errors.device}>
            <TextInput value={form.device} onChange={(e) => set('device', e.target.value)} error={errors.device} placeholder="Contoh: Laptop Asus X441" />
          </Field>
          <Field label="Permasalahan">
            <TextArea value={form.problem} onChange={(e) => set('problem', e.target.value)} placeholder="Keluhan / permasalahan" />
          </Field>
          <Field label="Tindakan / Service">
            <TextArea value={form.actions} onChange={(e) => set('actions', e.target.value)} placeholder="Tindakan yang dilakukan" />
          </Field>
          <Field label="Status Pengerjaan">
            <Select value={form.work_status} onChange={(e) => set('work_status', e.target.value)}>
              {WORK_STATUS_SERVICE.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Estimasi Durasi">
            <TextInput value={form.estimated_duration} onChange={(e) => set('estimated_duration', e.target.value)} placeholder="Contoh: 2-3 hari" />
          </Field>
          <Field label="Tanggal Service" required error={errors.service_date}>
            <TextInput type="date" value={form.service_date} onChange={(e) => set('service_date', e.target.value)} error={errors.service_date} />
          </Field>
          <Field label="Biaya Jasa Service">
            <TextInput
              value={toRupiahInput(form.service_fee)}
              onChange={(e) => set('service_fee', parseRupiahInput(e.target.value))}
              inputMode="numeric"
              placeholder="0"
            />
          </Field>
          <Field label="Catatan Tambahan">
            <TextArea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Catatan" />
          </Field>
        </div>

        {/* Sparepart usage */}
        <div className="mt-5 border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Sparepart Digunakan</h4>
            <button type="button" onClick={addSparepartRow} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
              <Plus size={14} /> Tambah Item
            </button>
          </div>
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">Belum ada sparepart dipilih. Stok akan otomatis berkurang saat service disimpan.</p>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-12 sm:col-span-5">
                    <Select value={it.sparepart_id} onChange={(e) => updateSparepartRow(idx, 'sparepart_id', e.target.value)}>
                      <option value="">Pilih sparepart</option>
                      {spareparts.map((sp) => (
                        <option key={sp.id} value={sp.id} disabled={sp.stock <= 0}>
                          {sp.name} (Stok: {sp.stock})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <TextInput type="number" min="1" value={it.quantity} onChange={(e) => updateSparepartRow(idx, 'quantity', e.target.value)} placeholder="Qty" />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <TextInput value={toRupiahInput(it.price)} onChange={(e) => updateSparepartRow(idx, 'price', parseRupiahInput(e.target.value))} inputMode="numeric" placeholder="Harga" />
                  </div>
                  <div className="col-span-2 sm:col-span-1 text-right text-sm font-medium pt-2 text-slate-700 dark:text-slate-300">
                    {formatRupiah((Number(it.quantity) || 0) * (Number(it.price) || 0))}
                  </div>
                  <div className="col-span-12 sm:col-span-1 flex justify-end">
                    <button type="button" onClick={() => removeSparepartRow(idx)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <div className="text-right">
            <p className="text-xs text-slate-500">Total Sparepart: {formatRupiah(sparepartsTotal)}</p>
            <p className="text-xs text-slate-500">Biaya Jasa: {formatRupiah(form.service_fee)}</p>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-1">Total: {formatRupiah(grandTotal)}</p>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Service View ----------
function ServiceViewModal({ service, spareparts, onClose, onPrint, onDownload, canEdit }) {
  const sparepartsTotal = spareparts.reduce((a, s) => a + (Number(s.subtotal) || 0), 0);
  const total = Number(service.estimated_total) || (Number(service.service_fee) || 0) + sparepartsTotal;

  const Row = ({ label, value }) => (
    <div className="flex gap-2 py-1.5 text-sm">
      <span className="w-32 shrink-0 text-slate-500">{label}</span>
      <span className="text-slate-800 dark:text-slate-200 font-medium">: {value || '-'}</span>
    </div>
  );

  return (
    <Modal open onClose={onClose} title="Detail Service" size="lg"
      footer={
        <div className="flex gap-2 justify-end">
          <button onClick={onPrint} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">
            <Printer size={16} /> Cetak
          </button>
          <button onClick={onDownload} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
            <Download size={16} /> Download PDF
          </button>
        </div>
      }
    >
      <div className="grid sm:grid-cols-2 gap-x-6">
        <Row label="No Invoice" value={service.invoice_number} />
        <Row label="Tanggal" value={formatDateShort(service.service_date)} />
        <Row label="Customer" value={service.customer_name} />
        <Row label="Perangkat" value={service.device} />
        <Row label="Permasalahan" value={service.problem} />
        <Row label="Tindakan" value={service.actions} />
        <Row label="Estimasi Durasi" value={service.estimated_duration} />
        <Row label="Catatan" value={service.notes} />
      </div>

      <div className="flex gap-2 mt-3">
        <StatusBadge status={service.work_status} color={workStatusColor(service.work_status)} />
        <StatusBadge status={service.payment_status} color={paymentStatusColor(service.payment_status)} />
      </div>

      <div className="mt-5 border-t border-slate-200 dark:border-slate-800 pt-4">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Sparepart Digunakan</h4>
        {spareparts.length === 0 ? (
          <p className="text-xs text-slate-400">Tidak ada sparepart.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr><th className="text-left py-1">Nama</th><th className="text-center">Qty</th><th className="text-right">Harga</th><th className="text-right">Subtotal</th></tr>
            </thead>
            <tbody>
              {spareparts.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 text-slate-700 dark:text-slate-300">{s.sparepart_name}</td>
                  <td className="text-center">{s.quantity}</td>
                  <td className="text-right">{formatRupiah(s.price)}</td>
                  <td className="text-right font-medium">{formatRupiah(s.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-3 space-y-1">
        <div className="flex justify-between text-sm"><span className="text-slate-500">Total Sparepart</span><span className="font-medium">{formatRupiah(sparepartsTotal)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-slate-500">Biaya Jasa</span><span className="font-medium">{formatRupiah(service.service_fee)}</span></div>
        <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-1"><span>Total</span><span>{formatRupiah(total)}</span></div>
      </div>
      <PaymentHistory sourceType="service" sourceId={service.id} customerName={service.customer_name} totalAmount={total} canEdit={canEdit} />
    </Modal>
  );
}
