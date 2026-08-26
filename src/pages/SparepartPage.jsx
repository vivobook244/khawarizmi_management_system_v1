import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import { LoadingState, EmptyState, ErrorState } from '../components/States';
import { Field, TextInput, TextArea, Select } from '../components/FormFields';
import { formatRupiah, toRupiahInput, parseRupiahInput } from '../lib/format';
import {
  Plus, Eye, Pencil, Trash2, Cpu, AlertTriangle, Package, ArrowDownUp,
} from 'lucide-react';

const PAGE_SIZE = 8;

export default function SparepartPage() {
  const { isTechnician, isAdmin } = useAuth();
  const toast = useToast();
  const canEdit = isAdmin || isTechnician;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('spareparts').select('*').order('name');
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean));
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    let r = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((i) =>
        i.name?.toLowerCase().includes(q) ||
        i.brand?.toLowerCase().includes(q) ||
        i.supplier?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) r = r.filter((i) => i.category === categoryFilter);
    return r;
  }, [items, search, categoryFilter]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const lowStockCount = items.filter((i) => i.stock <= i.low_stock_threshold).length;

  const handleDelete = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('spareparts').delete().eq('id', deleting.id);
      if (error) throw error;
      toast.success('Sparepart berhasil dihapus');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error('Gagal menghapus: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Sparepart</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Kelola stok sparepart teknisi</p>
        </div>
        {canEdit && (
          <button onClick={() => { setEditing(null); setFormOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
            <Plus size={16} /> Tambah
          </button>
        )}
      </div>

      {lowStockCount > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-3">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Ada <strong>{lowStockCount} sparepart</strong> dengan stok rendah. Segera lakukan pembelian.
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari nama, merk, supplier..." />
          </div>
          <Select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="!w-auto">
            <option value="">Semua Kategori</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : paged.length === 0 ? (
          <EmptyState icon={Cpu} title="Belum ada sparepart" message={search || categoryFilter ? "Tidak ada hasil." : "Klik Tambah untuk menambah sparepart."} />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Nama</th>
                    <th className="text-left px-4 py-3 font-medium">Kategori</th>
                    <th className="text-left px-4 py-3 font-medium">Merk</th>
                    <th className="text-center px-4 py-3 font-medium">Stok</th>
                    <th className="text-right px-4 py-3 font-medium">Harga Beli</th>
                    <th className="text-right px-4 py-3 font-medium">Harga Jual</th>
                    <th className="text-center px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paged.map((i) => {
                    const low = i.stock <= i.low_stock_threshold;
                    return (
                      <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{i.name}</td>
                        <td className="px-4 py-3 text-slate-500">{i.category || '-'}</td>
                        <td className="px-4 py-3 text-slate-500">{i.brand || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            low ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}>
                            {low && <AlertTriangle size={12} />}
                            {i.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{formatRupiah(i.purchase_price)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">{formatRupiah(i.selling_price)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <IconBtn title="Lihat" onClick={() => setViewing(i)}><Eye size={16} /></IconBtn>
                            {canEdit && <IconBtn title="Stok" onClick={() => setAdjusting(i)}><ArrowDownUp size={16} /></IconBtn>}
                            {canEdit && <IconBtn title="Edit" onClick={() => { setEditing(i); setFormOpen(true); }}><Pencil size={16} /></IconBtn>}
                            {canEdit && <IconBtn title="Hapus" onClick={() => setDeleting(i)} danger><Trash2 size={16} /></IconBtn>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {paged.map((i) => {
                const low = i.stock <= i.low_stock_threshold;
                return (
                  <div key={i.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{i.name}</p>
                        <p className="text-xs text-slate-500">{i.brand || '-'} · {i.category || '-'}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        low ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        {low && <AlertTriangle size={12} />} Stok: {i.stock}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">{formatRupiah(i.selling_price)}</p>
                    <div className="flex gap-1">
                      <IconBtn title="Lihat" onClick={() => setViewing(i)}><Eye size={16} /></IconBtn>
                      {canEdit && <IconBtn title="Stok" onClick={() => setAdjusting(i)}><ArrowDownUp size={16} /></IconBtn>}
                      {canEdit && <IconBtn title="Edit" onClick={() => { setEditing(i); setFormOpen(true); }}><Pencil size={16} /></IconBtn>}
                      {canEdit && <IconBtn title="Hapus" onClick={() => setDeleting(i)} danger><Trash2 size={16} /></IconBtn>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 mb-2">Menampilkan {paged.length} dari {filtered.length} sparepart</p>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {formOpen && (
        <SparepartForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} onSaved={() => { setFormOpen(false); load(); }} />
      )}

      {viewing && (
        <SparepartView item={viewing} onClose={() => setViewing(null)} />
      )}

      {adjusting && (
        <StockAdjustModal item={adjusting} onClose={() => setAdjusting(null)} onSaved={() => { setAdjusting(null); load(); }} />
      )}

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} loading={saving}
        message={`Hapus sparepart "${deleting?.name}"?`} />
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }) {
  return (
    <button onClick={onClick} title={title}
      className={`p-1.5 rounded-lg transition ${danger ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
      {children}
    </button>
  );
}

function SparepartForm({ open, onClose, editing, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: '', category: '', brand: '', stock: 0, purchase_price: 0,
    selling_price: 0, supplier: '', low_stock_threshold: 5, notes: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || '', category: editing.category || '', brand: editing.brand || '',
        stock: editing.stock || 0, purchase_price: Number(editing.purchase_price) || 0,
        selling_price: Number(editing.selling_price) || 0, supplier: editing.supplier || '',
        low_stock_threshold: editing.low_stock_threshold || 5, notes: editing.notes || '',
      });
    } else {
      setForm({ name: '', category: '', brand: '', stock: 0, purchase_price: 0, selling_price: 0, supplier: '', low_stock_threshold: 5, notes: '' });
    }
    setErrors({});
  }, [editing, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Nama wajib diisi';
    if (form.stock < 0) e.stock = 'Stok tidak boleh negatif';
    if (form.selling_price < 0) e.selling_price = 'Harga tidak valid';
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
        stock: Number(form.stock) || 0,
        purchase_price: Number(form.purchase_price) || 0,
        selling_price: Number(form.selling_price) || 0,
        low_stock_threshold: Number(form.low_stock_threshold) || 0,
      };
      if (editing) {
        const { error } = await supabase.from('spareparts').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('spareparts').insert(payload);
        if (error) throw error;
      }
      toast.success(editing ? 'Sparepart diperbarui' : 'Sparepart ditambahkan');
      onSaved();
    } catch (err) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Sparepart' : 'Tambah Sparepart'} size="lg"
      footer={
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">Batal</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      }>
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Nama Sparepart" required error={errors.name}>
            <TextInput value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
          </Field>
          <Field label="Kategori">
            <TextInput value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Contoh: RAM, SSD" />
          </Field>
          <Field label="Merk">
            <TextInput value={form.brand} onChange={(e) => set('brand', e.target.value)} />
          </Field>
          <Field label="Supplier">
            <TextInput value={form.supplier} onChange={(e) => set('supplier', e.target.value)} />
          </Field>
          <Field label="Stok" error={errors.stock}>
            <TextInput type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} error={errors.stock} />
          </Field>
          <Field label="Batas Stok Rendah" hint="Peringatan muncul jika stok <= batas ini">
            <TextInput type="number" min="0" value={form.low_stock_threshold} onChange={(e) => set('low_stock_threshold', e.target.value)} />
          </Field>
          <Field label="Harga Beli">
            <TextInput value={toRupiahInput(form.purchase_price)} onChange={(e) => set('purchase_price', parseRupiahInput(e.target.value))} inputMode="numeric" />
          </Field>
          <Field label="Harga Jual" error={errors.selling_price}>
            <TextInput value={toRupiahInput(form.selling_price)} onChange={(e) => set('selling_price', parseRupiahInput(e.target.value))} inputMode="numeric" error={errors.selling_price} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Catatan">
              <TextArea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function SparepartView({ item, onClose }) {
  const Row = ({ label, value }) => (
    <div className="flex gap-2 py-1.5 text-sm">
      <span className="w-32 shrink-0 text-slate-500">{label}</span>
      <span className="text-slate-800 dark:text-slate-200 font-medium">: {value || '-'}</span>
    </div>
  );
  return (
    <Modal open onClose={onClose} title="Detail Sparepart" size="md">
      <Row label="Nama" value={item.name} />
      <Row label="Kategori" value={item.category} />
      <Row label="Merk" value={item.brand} />
      <Row label="Stok" value={item.stock} />
      <Row label="Batas Stok Rendah" value={item.low_stock_threshold} />
      <Row label="Harga Beli" value={formatRupiah(item.purchase_price)} />
      <Row label="Harga Jual" value={formatRupiah(item.selling_price)} />
      <Row label="Supplier" value={item.supplier} />
      <Row label="Catatan" value={item.notes} />
    </Modal>
  );
}

function StockAdjustModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const [type, setType] = useState('add');
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) { toast.error('Jumlah harus lebih dari 0'); return; }
    setSaving(true);
    try {
      const newStock = type === 'add' ? item.stock + amt : item.stock - amt;
      if (newStock < 0) { toast.error('Stok tidak boleh negatif'); setSaving(false); return; }
      const { error } = await supabase.from('spareparts').update({ stock: newStock }).eq('id', item.id);
      if (error) throw error;
      toast.success('Stok berhasil disesuaikan');
      onSaved();
    } catch (err) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Sesuaikan Stok" size="sm"
      footer={
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">Batal</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60">
            {saving ? 'Memproses...' : 'Simpan'}
          </button>
        </div>
      }>
      <div className="mb-4">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Sparepart: <strong className="text-slate-900 dark:text-slate-100">{item.name}</strong></p>
        <p className="text-sm text-slate-500">Stok saat ini: <strong>{item.stock}</strong></p>
      </div>
      <Field label="Tipe Penyesuaian">
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="add">Tambah Stok</option>
          <option value="reduce">Kurangi Stok</option>
        </Select>
      </Field>
      <Field label="Jumlah" required>
        <TextInput type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="Alasan (opsional)">
        <TextArea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: pembelian baru, rusak, hilang" />
      </Field>
    </Modal>
  );
}
