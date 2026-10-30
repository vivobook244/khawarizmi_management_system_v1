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
import { PROPOSAL_TYPES, BUSINESS_SCHEMES } from '../lib/constants';
import { formatRupiah, formatDateShort, toRupiahInput, parseRupiahInput } from '../lib/format';
import { exportProposalsExcel, downloadProposalPdf } from '../lib/exporters';
import {
  Plus, Eye, Pencil, Trash2, FileText, Download, X,
} from 'lucide-react';

const PAGE_SIZE = 8;

export default function ProposalPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const canEdit = isAdmin;

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [viewItems, setViewItems] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('proposals').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProposals(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let r = proposals;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((p) =>
        p.customer_name?.toLowerCase().includes(q) ||
        p.title?.toLowerCase().includes(q)
      );
    }
    if (typeFilter) r = r.filter((p) => p.proposal_type === typeFilter);
    return r;
  }, [proposals, search, typeFilter]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const openView = async (p) => {
    setViewing(p);
    const { data } = await supabase.from('proposal_items').select('*').eq('proposal_id', p.id).order('created_at');
    setViewItems(data || []);
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('proposals').delete().eq('id', deleting.id);
      if (error) throw error;
      toast.success('Proposal berhasil dihapus');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error('Gagal menghapus: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePdf = async (p) => {
    try {
      const { data } = await supabase.from('proposal_items').select('*').eq('proposal_id', p.id);
      downloadProposalPdf(p, data || []);
      toast.success('Proposal PDF diunduh');
    } catch (err) {
      toast.error('Gagal export PDF');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Proposal Penawaran</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Buat penawaran untuk customer atau instansi</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportProposalsExcel(filtered)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
            <Download size={16} /> Export Excel
          </button>
          {canEdit && (
            <button onClick={() => { setEditing(null); setFormOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
              <Plus size={16} /> Tambah
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari customer, judul..." />
          </div>
          <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="!w-auto">
            <option value="">Semua Jenis</option>
            {PROPOSAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : paged.length === 0 ? (
          <EmptyState icon={FileText} title="Belum ada proposal" message={search || typeFilter ? "Tidak ada hasil." : "Klik Tambah untuk membuat proposal pertama."} />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 font-medium">Judul</th>
                    <th className="text-left px-4 py-3 font-medium">Jenis</th>
                    <th className="text-left px-4 py-3 font-medium">Skema</th>
                    <th className="text-right px-4 py-3 font-medium">Harga</th>
                    <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                    <th className="text-center px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paged.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{p.customer_name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.title}</td>
                      <td className="px-4 py-3 text-slate-500">{p.proposal_type === 'service_package' ? 'Paket Service' : 'Software Dev'}</td>
                      <td className="px-4 py-3 text-slate-500">{p.business_scheme || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">{formatRupiah(p.price)}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDateShort(p.proposal_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <IconBtn title="Lihat" onClick={() => openView(p)}><Eye size={16} /></IconBtn>
                          <IconBtn title="PDF" onClick={() => handlePdf(p)}><FileText size={16} /></IconBtn>
                          {canEdit && <IconBtn title="Edit" onClick={() => { setEditing(p); setFormOpen(true); }}><Pencil size={16} /></IconBtn>}
                          {canEdit && <IconBtn title="Hapus" onClick={() => setDeleting(p)} danger><Trash2 size={16} /></IconBtn>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {paged.map((p) => (
                <div key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{p.title}</p>
                      <p className="text-xs text-slate-500">{p.customer_name} · {p.proposal_type === 'service_package' ? 'Paket Service' : 'Software Dev'}</p>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm shrink-0">{formatRupiah(p.price)}</p>
                  </div>
                  <div className="flex gap-1">
                    <IconBtn title="Lihat" onClick={() => openView(p)}><Eye size={16} /></IconBtn>
                    <IconBtn title="PDF" onClick={() => handlePdf(p)}><FileText size={16} /></IconBtn>
                    {canEdit && <IconBtn title="Edit" onClick={() => { setEditing(p); setFormOpen(true); }}><Pencil size={16} /></IconBtn>}
                    {canEdit && <IconBtn title="Hapus" onClick={() => setDeleting(p)} danger><Trash2 size={16} /></IconBtn>}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 mb-2">Menampilkan {paged.length} dari {filtered.length} proposal</p>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {formOpen && (
        <ProposalForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} onSaved={() => { setFormOpen(false); load(); }} />
      )}

      {viewing && (
        <ProposalView proposal={viewing} items={viewItems} onClose={() => setViewing(null)} onPdf={() => handlePdf(viewing)} />
      )}

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} loading={saving}
        message={`Hapus proposal "${deleting?.title}"?`} />
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

function ProposalForm({ open, onClose, editing, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    customer_name: '', proposal_type: 'service_package', title: '', description: '',
    business_scheme: '', features: '', technologies: '', portfolio: '',
    service_period: '', estimated_duration: '', price: 0, notes: '',
    proposal_date: new Date().toISOString().slice(0, 10),
  });
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        customer_name: editing.customer_name || '', proposal_type: editing.proposal_type || 'service_package',
        title: editing.title || '', description: editing.description || '',
        business_scheme: editing.business_scheme || '', features: editing.features || '',
        technologies: editing.technologies || '', portfolio: editing.portfolio || '',
        service_period: editing.service_period || '', estimated_duration: editing.estimated_duration || '',
        price: Number(editing.price) || 0, notes: editing.notes || '',
        proposal_date: editing.proposal_date || new Date().toISOString().slice(0, 10),
      });
      (async () => {
        const { data } = await supabase.from('proposal_items').select('*').eq('proposal_id', editing.id).order('created_at');
        setItems(data || []);
      })();
    } else {
      setForm({
        customer_name: '', proposal_type: 'service_package', title: '', description: '',
        business_scheme: '', features: '', technologies: '', portfolio: '',
        service_period: '', estimated_duration: '', price: 0, notes: '',
        proposal_date: new Date().toISOString().slice(0, 10),
      });
      setItems([]);
    }
    setErrors({});
  }, [editing, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.customer_name.trim()) e.customer_name = 'Nama customer wajib diisi';
    if (!form.title.trim()) e.title = 'Judul wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const validItems = items.filter((it) => it.name && it.name.trim());
      const itemsTotal = validItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
      const payload = {
        ...form,
        business_scheme: form.proposal_type === 'software_development' && form.business_scheme
          ? form.business_scheme : null,
        price: validItems.length ? itemsTotal : Number(form.price) || 0,
      };
      let proposalId = editing?.id;
      if (editing) {
        const { error } = await supabase.from('proposals').update(payload).eq('id', editing.id);
        if (error) throw error;
        const { error: eDel } = await supabase.from('proposal_items').delete().eq('proposal_id', editing.id);
        if (eDel) throw eDel;
      } else {
        const { data, error } = await supabase.from('proposals').insert(payload).select().single();
        if (error) throw error;
        proposalId = data.id;
      }
      if (validItems.length) {
        const rows = validItems.map((it) => ({
          proposal_id: proposalId, name: it.name, description: it.description || null, price: Number(it.price) || 0,
        }));
        const { error: eIns } = await supabase.from('proposal_items').insert(rows);
        if (eIns) throw eIns;
      }
      toast.success(editing ? 'Proposal diperbarui' : 'Proposal disimpan');
      onSaved();
    } catch (err) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => setItems((a) => [...a, { name: '', description: '', price: 0 }]);
  const updateItem = (idx, field, value) => setItems((a) => a.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  const removeItem = (idx) => setItems((a) => a.filter((_, i) => i !== idx));

  const isSoftware = form.proposal_type === 'software_development';

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Proposal' : 'Tambah Proposal'} size="xl"
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
          <Field label="Nama Customer" required error={errors.customer_name}>
            <TextInput value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} error={errors.customer_name} />
          </Field>
          <Field label="Judul Proposal" required error={errors.title}>
            <TextInput value={form.title} onChange={(e) => set('title', e.target.value)} error={errors.title} />
          </Field>
          <Field label="Jenis Proposal">
            <Select value={form.proposal_type} onChange={(e) => set('proposal_type', e.target.value)}>
              {PROPOSAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          {isSoftware && (
            <Field label="Skema Bisnis">
              <Select value={form.business_scheme} onChange={(e) => set('business_scheme', e.target.value)}>
                <option value="">- Pilih -</option>
                {BUSINESS_SCHEMES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
          )}
          {!isSoftware && (
            <Field label="Periode Layanan">
              <TextInput value={form.service_period} onChange={(e) => set('service_period', e.target.value)} placeholder="Contoh: Bulanan, Tahunan" />
            </Field>
          )}
          <Field label="Estimasi Durasi">
            <TextInput value={form.estimated_duration} onChange={(e) => set('estimated_duration', e.target.value)} placeholder="Contoh: 30 hari" />
          </Field>
          <Field label="Harga Penawaran">
            <TextInput value={toRupiahInput(form.price)} onChange={(e) => set('price', parseRupiahInput(e.target.value))} inputMode="numeric" placeholder="0" />
          </Field>
          <Field label="Tanggal Proposal">
            <TextInput type="date" value={form.proposal_date} onChange={(e) => set('proposal_date', e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Deskripsi">
              <TextArea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Deskripsi penawaran" />
            </Field>
          </div>
          <Field label="Fitur Layanan">
            <TextArea value={form.features} onChange={(e) => set('features', e.target.value)} placeholder="Pisahkan dengan koma atau baris" />
          </Field>
          {isSoftware && (
            <>
              <Field label="Teknologi Digunakan">
                <TextArea value={form.technologies} onChange={(e) => set('technologies', e.target.value)} placeholder="Contoh: React, Node.js, PostgreSQL" />
              </Field>
              <Field label="Portfolio">
                <TextArea value={form.portfolio} onChange={(e) => set('portfolio', e.target.value)} placeholder="Project relevan sebelumnya" />
              </Field>
            </>
          )}
          <div className="sm:col-span-2">
            <Field label="Catatan">
              <TextArea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Item Penawaran</h4>
            <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
              <Plus size={14} /> Tambah Item
            </button>
          </div>
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">Belum ada item. Harga penawaran di atas akan digunakan jika tidak ada item.</p>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-12 sm:col-span-4">
                    <TextInput value={it.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} placeholder="Nama item" />
                  </div>
                  <div className="col-span-12 sm:col-span-5">
                    <TextInput value={it.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Deskripsi" />
                  </div>
                  <div className="col-span-8 sm:col-span-2">
                    <TextInput value={toRupiahInput(it.price)} onChange={(e) => updateItem(idx, 'price', parseRupiahInput(e.target.value))} inputMode="numeric" placeholder="Harga" />
                  </div>
                  <div className="col-span-4 sm:col-span-1 flex justify-end">
                    <button type="button" onClick={() => removeItem(idx)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

function ProposalView({ proposal, items, onClose, onPdf }) {
  const Row = ({ label, value }) => (
    <div className="flex gap-2 py-1.5 text-sm">
      <span className="w-32 shrink-0 text-slate-500">{label}</span>
      <span className="text-slate-800 dark:text-slate-200 font-medium">: {value || '-'}</span>
    </div>
  );
  const total = items.length ? items.reduce((a, it) => a + (Number(it.price) || 0), 0) : Number(proposal.price || 0);
  return (
    <Modal open onClose={onClose} title="Detail Proposal" size="lg"
      footer={
        <div className="flex gap-2 justify-end">
          <button onClick={onPdf} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
            <Download size={16} /> Download PDF
          </button>
        </div>
      }>
      <div className="grid sm:grid-cols-2 gap-x-6">
        <Row label="Customer" value={proposal.customer_name} />
        <Row label="Judul" value={proposal.title} />
        <Row label="Jenis" value={proposal.proposal_type === 'service_package' ? 'Paket Service' : 'Software Development'} />
        <Row label="Skema Bisnis" value={proposal.business_scheme} />
        <Row label="Periode" value={proposal.service_period} />
        <Row label="Estimasi Durasi" value={proposal.estimated_duration} />
        <Row label="Tanggal" value={formatDateShort(proposal.proposal_date)} />
      </div>
      <div className="mt-3 space-y-2">
        {proposal.description && <div><p className="text-xs text-slate-500">Deskripsi</p><p className="text-sm text-slate-800 dark:text-slate-200">{proposal.description}</p></div>}
        {proposal.features && <div><p className="text-xs text-slate-500">Fitur</p><p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line">{proposal.features}</p></div>}
        {proposal.technologies && <div><p className="text-xs text-slate-500">Teknologi</p><p className="text-sm text-slate-800 dark:text-slate-200">{proposal.technologies}</p></div>}
        {proposal.portfolio && <div><p className="text-xs text-slate-500">Portfolio</p><p className="text-sm text-slate-800 dark:text-slate-200">{proposal.portfolio}</p></div>}
      </div>
      {items.length > 0 && (
        <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-3">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Item</h4>
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr><th className="text-left py-1">Item</th><th className="text-left">Deskripsi</th><th className="text-right">Harga</th></tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 text-slate-700 dark:text-slate-300">{it.name}</td>
                  <td className="text-slate-500">{it.description || '-'}</td>
                  <td className="text-right font-medium">{formatRupiah(it.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-3">
        <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white">
          <span>Total Penawaran</span><span>{formatRupiah(total)}</span>
        </div>
      </div>
    </Modal>
  );
}
