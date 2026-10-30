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
  SOFTWARE_TYPES, WORK_STATUS_PROJECT, PAYMENT_STATUS_PROJECT, generateInvoiceNumber,
} from '../lib/constants';
import { formatRupiah, formatDateShort, toRupiahInput, parseRupiahInput } from '../lib/format';
import { exportProjectsExcel, downloadProjectInvoice, downloadRabPdf } from '../lib/exporters';
import {
  Plus, Eye, Pencil, Trash2, FileText, Download, Code2, Printer, ClipboardList,
} from 'lucide-react';

const PAGE_SIZE = 8;

export default function SoftwarePage() {
  const { isDeveloper, isAdmin } = useAuth();
  const toast = useToast();
  const canEdit = isAdmin || isDeveloper;

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [viewRab, setViewRab] = useState(null);
  const [viewRabItems, setViewRabItems] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [rabModal, setRabModal] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('software_projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let r = projects;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((p) =>
        p.customer_name?.toLowerCase().includes(q) ||
        p.title?.toLowerCase().includes(q) ||
        p.invoice_number?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) r = r.filter((p) => p.work_status === statusFilter);
    return r;
  }, [projects, search, statusFilter]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p) => { setEditing(p); setFormOpen(true); };

  const openView = async (p) => {
    setViewing(p);
    const { data: rab } = await supabase.from('rabs').select('*').eq('project_id', p.id).maybeSingle();
    setViewRab(rab);
    if (rab) {
      const { data: items } = await supabase.from('rab_items').select('*').eq('rab_id', rab.id).order('created_at');
      setViewRabItems(items || []);
    } else {
      setViewRabItems([]);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('software_projects').delete().eq('id', deleting.id);
      if (error) throw error;
      toast.success('Project berhasil dihapus');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error('Gagal menghapus: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInvoice = async (p) => {
    try {
      const { data: rab } = await supabase.from('rabs').select('id').eq('project_id', p.id).maybeSingle();
      let items = [];
      if (rab) {
        const { data } = await supabase.from('rab_items').select('*').eq('rab_id', rab.id);
        items = data || [];
      }
      downloadProjectInvoice(p, items);
      toast.success('Invoice PDF diunduh');
    } catch (err) {
      toast.error('Gagal membuat invoice');
    }
  };

  const openRab = async (p) => {
    const { data: rab } = await supabase.from('rabs').select('*').eq('project_id', p.id).maybeSingle();
    setRabModal({ project: p, rab });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Software Development</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Kelola project pembuatan software</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportProjectsExcel(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Download size={16} /> Export Excel
          </button>
          {canEdit && (
            <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
              <Plus size={16} /> Tambah
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari customer, project, no invoice..." />
          </div>
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="!w-auto">
            <option value="">Semua Status</option>
            {WORK_STATUS_PROJECT.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : paged.length === 0 ? (
          <EmptyState icon={Code2} title="Belum ada project" message={search || statusFilter ? "Tidak ada hasil." : "Klik Tambah untuk membuat project pertama."} />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Invoice</th>
                    <th className="text-left px-4 py-3 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 font-medium">Project</th>
                    <th className="text-left px-4 py-3 font-medium">Jenis</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Bayar</th>
                    <th className="text-right px-4 py-3 font-medium">Total</th>
                    <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                    <th className="text-center px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paged.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-xs text-slate-500">{p.invoice_number || '-'}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{p.customer_name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.title}</td>
                      <td className="px-4 py-3 text-slate-500">{p.software_type}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.work_status} color={workStatusColor(p.work_status)} /></td>
                      <td className="px-4 py-3"><StatusBadge status={p.payment_status} color={paymentStatusColor(p.payment_status)} /></td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">{formatRupiah(p.estimated_total)}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDateShort(p.project_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <IconBtn title="Lihat" onClick={() => openView(p)}><Eye size={16} /></IconBtn>
                          <IconBtn title="RAB" onClick={() => openRab(p)}><ClipboardList size={16} /></IconBtn>
                          <IconBtn title="Invoice" onClick={() => handleInvoice(p)}><FileText size={16} /></IconBtn>
                          {canEdit && <IconBtn title="Edit" onClick={() => openEdit(p)}><Pencil size={16} /></IconBtn>}
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
                      <p className="text-xs text-slate-500">{p.customer_name} · {p.software_type}</p>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm shrink-0">{formatRupiah(p.estimated_total)}</p>
                  </div>
                  <div className="flex gap-1.5 mb-3">
                    <StatusBadge status={p.work_status} color={workStatusColor(p.work_status)} />
                    <StatusBadge status={p.payment_status} color={paymentStatusColor(p.payment_status)} />
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <IconBtn title="Lihat" onClick={() => openView(p)}><Eye size={16} /></IconBtn>
                    <IconBtn title="RAB" onClick={() => openRab(p)}><ClipboardList size={16} /></IconBtn>
                    <IconBtn title="Invoice" onClick={() => handleInvoice(p)}><FileText size={16} /></IconBtn>
                    {canEdit && <IconBtn title="Edit" onClick={() => openEdit(p)}><Pencil size={16} /></IconBtn>}
                    {canEdit && <IconBtn title="Hapus" onClick={() => setDeleting(p)} danger><Trash2 size={16} /></IconBtn>}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 mb-2">Menampilkan {paged.length} dari {filtered.length} project</p>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {formOpen && (
        <ProjectForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} onSaved={() => { setFormOpen(false); load(); }} />
      )}

      {viewing && (
        <ProjectViewModal project={viewing} rab={viewRab} rabItems={viewRabItems} onClose={() => setViewing(null)} onInvoice={() => handleInvoice(viewing)} canEdit={canEdit} />
      )}

      {rabModal && (
        <RabModal project={rabModal.project} rab={rabModal.rab} onClose={() => setRabModal(null)} onSaved={() => { setRabModal(null); load(); }} canEdit={canEdit} />
      )}

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} loading={saving}
        message={`Hapus project "${deleting?.title}"? RAB terkait juga akan dihapus.`} />
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

// ---------- Project Form ----------
function ProjectForm({ open, onClose, editing, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    customer_name: '', title: '', software_type: 'Website', purpose: '',
    work_status: 'Proposal', payment_status: 'Belum bayar', rab_total: 0,
    estimated_duration: '', estimated_total: 0, notes: '',
    project_date: new Date().toISOString().slice(0, 10),
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        customer_name: editing.customer_name || '',
        title: editing.title || '',
        software_type: editing.software_type || 'Website',
        purpose: editing.purpose || '',
        work_status: editing.work_status || 'Proposal',
        payment_status: editing.payment_status || 'Belum bayar',
        rab_total: Number(editing.rab_total) || 0,
        estimated_duration: editing.estimated_duration || '',
        estimated_total: Number(editing.estimated_total) || 0,
        notes: editing.notes || '',
        project_date: editing.project_date || new Date().toISOString().slice(0, 10),
      });
    } else {
      setForm({
        customer_name: '', title: '', software_type: 'Website', purpose: '',
        work_status: 'Proposal', payment_status: 'Belum bayar', rab_total: 0,
        estimated_duration: '', estimated_total: 0, notes: '',
        project_date: new Date().toISOString().slice(0, 10),
      });
    }
    setErrors({});
  }, [editing, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.customer_name.trim()) e.customer_name = 'Nama customer wajib diisi';
    if (!form.title.trim()) e.title = 'Judul project wajib diisi';
    if (!form.project_date) e.project_date = 'Tanggal wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, estimated_total: Number(form.estimated_total) || 0, rab_total: Number(form.rab_total) || 0 };
      if (editing) {
        const { error } = await supabase.from('software_projects').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const invNum = generateInvoiceNumber('PRJ');
        const { error } = await supabase.from('software_projects').insert({ ...payload, invoice_number: invNum });
        if (error) throw error;
      }
      toast.success(editing ? 'Project berhasil diperbarui' : 'Project berhasil disimpan');
      onSaved();
    } catch (err) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Project' : 'Tambah Project'} size="lg"
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
          <Field label="Judul Software" required error={errors.title}>
            <TextInput value={form.title} onChange={(e) => set('title', e.target.value)} error={errors.title} />
          </Field>
          <Field label="Jenis Software">
            <Select value={form.software_type} onChange={(e) => set('software_type', e.target.value)}>
              {SOFTWARE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Status Pengerjaan">
            <Select value={form.work_status} onChange={(e) => set('work_status', e.target.value)}>
              {WORK_STATUS_PROJECT.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Estimasi Durasi">
            <TextInput value={form.estimated_duration} onChange={(e) => set('estimated_duration', e.target.value)} placeholder="Contoh: 30 hari" />
          </Field>
          <Field label="Estimasi Total Biaya">
            <TextInput value={toRupiahInput(form.estimated_total)} onChange={(e) => set('estimated_total', parseRupiahInput(e.target.value))} inputMode="numeric" placeholder="0" />
          </Field>
          <Field label="Tanggal Project" required error={errors.project_date}>
            <TextInput type="date" value={form.project_date} onChange={(e) => set('project_date', e.target.value)} error={errors.project_date} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Tujuan Software">
              <TextArea value={form.purpose} onChange={(e) => set('purpose', e.target.value)} placeholder="Tujuan / deskripsi software" />
            </Field>
          </div>
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

// ---------- Project View ----------
function ProjectViewModal({ project, rab, rabItems, onClose, onInvoice, canEdit }) {
  const Row = ({ label, value }) => (
    <div className="flex gap-2 py-1.5 text-sm">
      <span className="w-32 shrink-0 text-slate-500">{label}</span>
      <span className="text-slate-800 dark:text-slate-200 font-medium">: {value || '-'}</span>
    </div>
  );
  return (
    <Modal open onClose={onClose} title="Detail Project" size="lg"
      footer={
        <div className="flex gap-2 justify-end">
          <button onClick={onInvoice} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
            <Download size={16} /> Download Invoice
          </button>
        </div>
      }>
      <div className="grid sm:grid-cols-2 gap-x-6">
        <Row label="No Invoice" value={project.invoice_number} />
        <Row label="Tanggal" value={formatDateShort(project.project_date)} />
        <Row label="Customer" value={project.customer_name} />
        <Row label="Project" value={project.title} />
        <Row label="Jenis" value={project.software_type} />
        <Row label="Estimasi Durasi" value={project.estimated_duration} />
        <Row label="Tujuan" value={project.purpose} />
        <Row label="Catatan" value={project.notes} />
      </div>
      <div className="flex gap-2 mt-3">
        <StatusBadge status={project.work_status} color={workStatusColor(project.work_status)} />
        <StatusBadge status={project.payment_status} color={paymentStatusColor(project.payment_status)} />
      </div>
      {rab && (
        <div className="mt-5 border-t border-slate-200 dark:border-slate-800 pt-4">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">RAB</h4>
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr><th className="text-left py-1">Item</th><th className="text-center">Qty</th><th className="text-right">Harga</th><th className="text-right">Subtotal</th></tr>
            </thead>
            <tbody>
              {rabItems.map((it) => (
                <tr key={it.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 text-slate-700 dark:text-slate-300">{it.name}</td>
                  <td className="text-center">{it.quantity}</td>
                  <td className="text-right">{formatRupiah(it.price)}</td>
                  <td className="text-right font-medium">{formatRupiah(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-right">
            <p className="text-sm text-slate-500">Biaya Tambahan: {formatRupiah(rab.additional_cost)}</p>
            <p className="text-base font-bold text-slate-900 dark:text-white">Grand Total: {formatRupiah(rab.grand_total)}</p>
          </div>
        </div>
      )}
      <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-3">
        <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white">
          <span>Nilai Project</span><span>{formatRupiah(project.estimated_total)}</span>
        </div>
      </div>
      <PaymentHistory sourceType="software_project" sourceId={project.id} customerName={project.customer_name} totalAmount={project.estimated_total} canEdit={canEdit} />
    </Modal>
  );
}

// ---------- RAB Modal ----------
function RabModal({ project, rab, onClose, onSaved, canEdit }) {
  const toast = useToast();
  const [rabId, setRabId] = useState(null);
  const [items, setItems] = useState([]);
  const [additionalCost, setAdditionalCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let currentRab = rab;
      if (!currentRab) {
        const { data } = await supabase.from('rabs').select('*').eq('project_id', project.id).maybeSingle();
        currentRab = data;
      }
      if (currentRab) {
        setRabId(currentRab.id);
        setAdditionalCost(Number(currentRab.additional_cost) || 0);
        const { data: it } = await supabase.from('rab_items').select('*').eq('rab_id', currentRab.id).order('created_at');
        setItems(it || []);
      } else {
        setItems([{ name: '', category: '', description: '', quantity: 1, price: 0 }]);
      }
      setViewMode(!canEdit);
      setLoading(false);
    })();
  }, [project, rab, canEdit]);

  const itemsTotal = items.reduce((a, it) => a + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
  const grandTotal = itemsTotal + (Number(additionalCost) || 0);

  const addRow = () => setItems((a) => [...a, { name: '', category: '', description: '', quantity: 1, price: 0 }]);
  const updateRow = (idx, field, value) => setItems((a) => a.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  const removeRow = (idx) => setItems((a) => a.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    try {
      const validItems = items.filter((it) => it.name && it.name.trim());
      let id = rabId;
      if (!id) {
        const { data, error } = await supabase.from('rabs').insert({
          project_id: project.id,
          title: `RAB - ${project.title}`,
          additional_cost: Number(additionalCost) || 0,
          grand_total: grandTotal,
        }).select().single();
        if (error) throw error;
        id = data.id;
        setRabId(id);
      } else {
        const { error } = await supabase.from('rabs').update({
          additional_cost: Number(additionalCost) || 0,
          grand_total: grandTotal,
        }).eq('id', id);
        if (error) throw error;
        const { error: eDel } = await supabase.from('rab_items').delete().eq('rab_id', id);
        if (eDel) throw eDel;
      }

      if (validItems.length) {
        const rows = validItems.map((it) => ({
          rab_id: id,
          name: it.name,
          category: it.category || null,
          description: it.description || null,
          quantity: Number(it.quantity) || 1,
          price: Number(it.price) || 0,
        }));
        const { error: eIns } = await supabase.from('rab_items').insert(rows);
        if (eIns) throw eIns;
      }

      await supabase.from('software_projects').update({ rab_total: itemsTotal, estimated_total: grandTotal }).eq('id', project.id);

      toast.success('RAB berhasil disimpan');
      onSaved();
    } catch (err) {
      toast.error('Gagal menyimpan RAB: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      downloadRabPdf(project, { additional_cost: additionalCost, grand_total: grandTotal }, items.filter((i) => i.name));
      toast.success('RAB PDF diunduh');
    } catch (err) {
      toast.error('Gagal export PDF');
    }
  };

  if (loading) return <Modal open onClose={onClose} title="RAB"><LoadingState /></Modal>;

  return (
    <Modal open onClose={onClose} title={`RAB - ${project.title}`} size="xl"
      footer={
        <div className="flex gap-2 justify-end">
          <button onClick={handleExportPdf} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">
            <Download size={16} /> Export PDF
          </button>
          {canEdit && (
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan RAB'}
            </button>
          )}
        </div>
      }>
      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-start">
            <div className="col-span-12 sm:col-span-3">
              <TextInput value={it.name} onChange={(e) => updateRow(idx, 'name', e.target.value)} placeholder="Nama item" disabled={viewMode} />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <TextInput value={it.category} onChange={(e) => updateRow(idx, 'category', e.target.value)} placeholder="Kategori" disabled={viewMode} />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <TextInput type="number" min="1" value={it.quantity} onChange={(e) => updateRow(idx, 'quantity', e.target.value)} placeholder="Qty" disabled={viewMode} />
            </div>
            <div className="col-span-7 sm:col-span-2">
              <TextInput value={toRupiahInput(it.price)} onChange={(e) => updateRow(idx, 'price', parseRupiahInput(e.target.value))} inputMode="numeric" placeholder="Harga" disabled={viewMode} />
            </div>
            <div className="col-span-4 sm:col-span-2 text-right text-sm font-medium pt-2 text-slate-700 dark:text-slate-300">
              {formatRupiah((Number(it.quantity) || 0) * (Number(it.price) || 0))}
            </div>
            <div className="col-span-1 flex justify-end">
              {canEdit && (
                <button type="button" onClick={() => removeRow(idx)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {canEdit && (
        <button onClick={addRow} className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
          <Plus size={14} /> Tambah Item
        </button>
      )}

      <div className="mt-5 border-t border-slate-200 dark:border-slate-800 pt-4">
        <div className="flex items-center justify-end gap-3 mb-2">
          <label className="text-sm text-slate-600 dark:text-slate-400">Biaya Tambahan:</label>
          <TextInput value={toRupiahInput(additionalCost)} onChange={(e) => setAdditionalCost(parseRupiahInput(e.target.value))} inputMode="numeric" className="!w-40" disabled={viewMode} />
        </div>
        <div className="flex justify-between text-sm"><span className="text-slate-500">Total Item</span><span className="font-medium">{formatRupiah(itemsTotal)}</span></div>
        <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white mt-1"><span>Grand Total</span><span>{formatRupiah(grandTotal)}</span></div>
      </div>
    </Modal>
  );
}
