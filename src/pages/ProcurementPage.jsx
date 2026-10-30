import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import SearchInput from '../components/SearchInput';
import { Field, TextInput, TextArea, Select } from '../components/FormFields';
import { formatRupiah, toRupiahInput, parseRupiahInput, formatDateShort } from '../lib/format';
import { Plus, Package, Wallet, CreditCard, RefreshCw } from 'lucide-react';

const today = () => new Date().toISOString().slice(0, 10);

export default function ProcurementPage() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [purchaseRes, partsRes] = await Promise.all([
      supabase.from('supplier_purchase_balances').select('*').order('purchase_date', { ascending: false }),
      supabase.from('spareparts').select('id,name,stock,purchase_price').order('name'),
    ]);
    if (purchaseRes.error) toast.error('Gagal memuat pengadaan: ' + purchaseRes.error.message);
    else setRows(purchaseRes.data || []);
    if (partsRes.error) toast.error('Gagal memuat sparepart: ' + partsRes.error.message);
    else setParts(partsRes.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => !q || r.supplier_name?.toLowerCase().includes(q));
  }, [rows, search]);
  const totalDebt = rows.reduce((sum, r) => sum + Number(r.outstanding_amount || 0), 0);

  const submitPurchase = async (form) => {
    setSaving(true);
    const { data, error } = await supabase.rpc('create_supplier_purchase', {
      p_supplier_name: form.supplier_name.trim(),
      p_purchase_date: form.purchase_date,
      p_payment_terms: form.payment_terms,
      p_notes: form.notes.trim() || null,
      p_items: form.items.map((i) => ({ sparepart_id: i.sparepart_id, quantity: Number(i.quantity), unit_cost: Number(i.unit_cost) })),
    });
    if (error) {
      toast.error('Pengadaan gagal: ' + error.message);
      setSaving(false);
      return;
    }
    if (form.payment_terms === 'cash' && Number(form.initial_payment) > 0) {
      const payment = await supabase.rpc('record_supplier_payment', {
        p_purchase_id: data,
        p_amount: Number(form.initial_payment),
        p_payment_date: form.purchase_date,
        p_payment_method: form.payment_method,
        p_notes: 'Pembayaran awal saat pengadaan',
      });
      if (payment.error) {
        toast.error('Pengadaan tercatat, tetapi pembayaran awal gagal: ' + payment.error.message);
        setSaving(false);
        setCreateOpen(false);
        await load();
        return;
      }
    }
    toast.success('Pengadaan sparepart berhasil dicatat');
    setCreateOpen(false);
    setSaving(false);
    await load();
  };

  const submitPayment = async (form) => {
    setSaving(true);
    const { error } = await supabase.rpc('record_supplier_payment', {
      p_purchase_id: payTarget.id,
      p_amount: Number(form.amount),
      p_payment_date: form.payment_date,
      p_payment_method: form.payment_method,
      p_notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error('Pembayaran gagal: ' + error.message); return; }
    toast.success('Pembayaran hutang berhasil dicatat');
    setPayTarget(null);
    await load();
  };

  return <div>
    <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div><h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">Pengadaan Sparepart</h1>
        <p className="text-sm text-slate-500 mt-1">Penerimaan stok, pengadaan tunai/kredit, dan pembayaran supplier.</p></div>
      <button onClick={() => setCreateOpen(true)} className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"><Plus size={16}/> Catat Pengadaan</button>
    </div>
    <div className="grid sm:grid-cols-3 gap-3 mb-5">
      <Summary label="Total Pengadaan" amount={rows.reduce((s,r)=>s+Number(r.total_amount||0),0)} icon={Package}/>
      <Summary label="Sudah Dibayar" amount={rows.reduce((s,r)=>s+Number(r.paid_amount||0),0)} icon={Wallet}/>
      <Summary label="Hutang Supplier" amount={totalDebt} icon={CreditCard}/>
    </div>
    <div className="app-panel">
      <div className="border-b border-slate-100 dark:border-slate-800 p-4"><SearchInput value={search} onChange={setSearch} placeholder="Cari nama supplier..."/></div>
      {loading ? <div className="p-8 text-center text-sm text-slate-500">Memuat pengadaan...</div> : filtered.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Belum ada pengadaan sparepart.</div> :
      <div className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.map((r)=><div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
        <div><p className="font-semibold text-slate-800 dark:text-slate-100">{r.supplier_name}</p><p className="text-xs text-slate-500 mt-1">{formatDateShort(r.purchase_date)} · {r.payment_terms === 'cash' ? 'Tunai' : 'Kredit'}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"><span>Total: <b>{formatRupiah(r.total_amount)}</b></span><span>Dibayar: <b>{formatRupiah(r.paid_amount)}</b></span><span className={Number(r.outstanding_amount)>0?'text-amber-600':'text-emerald-600'}>Sisa: <b>{formatRupiah(r.outstanding_amount)}</b></span></div></div>
        {Number(r.outstanding_amount)>0 && <button onClick={()=>setPayTarget(r)} className="self-start rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-950/50 dark:text-brand-300">Bayar Hutang</button>}
      </div>)}</div>}
    </div>
    {createOpen && <PurchaseForm parts={parts} onClose={()=>setCreateOpen(false)} onSubmit={submitPurchase} saving={saving}/>}
    {payTarget && <SupplierPaymentForm purchase={payTarget} onClose={()=>setPayTarget(null)} onSubmit={submitPayment} saving={saving}/>}
  </div>;
}

function Summary({label,amount,icon:Icon}) { return <div className="app-panel p-4"><div className="flex items-center gap-2 text-xs text-slate-500"><Icon size={15}/>{label}</div><p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{formatRupiah(amount)}</p></div>; }

function PurchaseForm({parts,onClose,onSubmit,saving}) {
  const [supplier_name,setSupplier]=useState('');
  const [purchase_date,setDate]=useState(today());
  const [payment_terms,setTerms]=useState('cash');
  const [payment_method,setMethod]=useState('Transfer');
  const [initial_payment,setInitial]=useState(0);
  const [notes,setNotes]=useState('');
  const [items,setItems]=useState([{sparepart_id:'',quantity:1,unit_cost:0}]);
  const total=items.reduce((s,i)=>s+(Number(i.quantity)||0)*(Number(i.unit_cost)||0),0);
  const update=(idx,key,value)=>setItems(a=>a.map((it,i)=>i===idx?{...it,[key]:value}:it));
  const submit=(e)=>{e.preventDefault();if(!supplier_name.trim()||items.some(i=>!i.sparepart_id||Number(i.quantity)<=0||Number(i.unit_cost)<0)){return;}onSubmit({supplier_name,purchase_date,payment_terms,payment_method,initial_payment:payment_terms==='cash'?total:0,notes,items});};
  return <Modal open onClose={onClose} title="Catat Pengadaan Sparepart" size="xl" footer={<div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 text-sm dark:bg-slate-800">Batal</button><button onClick={submit} disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-60">{saving?'Menyimpan...':'Simpan Pengadaan'}</button></div>}>
    <form onSubmit={submit} className="grid sm:grid-cols-2 gap-x-4">
      <Field label="Supplier" required><TextInput value={supplier_name} onChange={e=>setSupplier(e.target.value)} placeholder="Nama supplier"/></Field>
      <Field label="Tanggal Pengadaan" required><TextInput type="date" value={purchase_date} onChange={e=>setDate(e.target.value)}/></Field>
      <Field label="Sumber Pembayaran" required><Select value={payment_terms} onChange={e=>setTerms(e.target.value)}><option value="cash">Tunai (langsung dibayar)</option><option value="credit">Kredit (hutang supplier)</option></Select></Field>
      {payment_terms==='cash' && <Field label="Metode Pembayaran"><Select value={payment_method} onChange={e=>setMethod(e.target.value)}><option>Transfer</option><option>Tunai</option><option>Debit</option></Select></Field>}
      <div className="sm:col-span-2 mt-2"><p className="mb-2 text-sm font-semibold">Item Pengadaan</p>{items.map((it,idx)=><div key={idx} className="grid grid-cols-12 gap-2 mb-2">
        <div className="col-span-12 sm:col-span-6"><Select value={it.sparepart_id} onChange={e=>{const p=parts.find(x=>x.id===e.target.value);update(idx,'sparepart_id',e.target.value);if(p)update(idx,'unit_cost',p.purchase_price||0);}}><option value="">Pilih sparepart</option>{parts.map(p=><option key={p.id} value={p.id}>{p.name} · stok {p.stock}</option>)}</Select></div>
        <div className="col-span-4 sm:col-span-2"><TextInput type="number" min="1" value={it.quantity} onChange={e=>update(idx,'quantity',e.target.value)} placeholder="Qty"/></div>
        <div className="col-span-6 sm:col-span-3"><TextInput value={toRupiahInput(it.unit_cost)} onChange={e=>update(idx,'unit_cost',parseRupiahInput(e.target.value))} placeholder="Harga pokok"/></div>
        <div className="col-span-2 sm:col-span-1 flex items-center text-xs">{formatRupiah((Number(it.quantity)||0)*(Number(it.unit_cost)||0))}</div>
      </div>)}<button type="button" onClick={()=>setItems(a=>[...a,{sparepart_id:'',quantity:1,unit_cost:0}])} className="text-xs font-semibold text-brand-600">+ Tambah item</button></div>
      <Field label="Catatan"><TextArea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Nomor nota atau catatan"/></Field>
      <div className="flex items-end justify-end pb-4"><div className="text-right"><p className="text-xs text-slate-500">Total Pengadaan</p><p className="text-lg font-bold">{formatRupiah(total)}</p></div></div>
    </form>
  </Modal>;
}

function SupplierPaymentForm({purchase,onClose,onSubmit,saving}) {
  const [amount,setAmount]=useState(Number(purchase.outstanding_amount));
  const [payment_date,setDate]=useState(today());
  const [payment_method,setMethod]=useState('Transfer');
  const [notes,setNotes]=useState('');
  return <Modal open onClose={onClose} title="Pembayaran Hutang Supplier" size="md" footer={<div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-2 text-sm dark:bg-slate-800">Batal</button><button disabled={saving} onClick={()=>onSubmit({amount,payment_date,payment_method,notes})} className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-60">{saving?'Menyimpan...':'Catat Pembayaran'}</button></div>}>
    <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800"><p className="font-semibold">{purchase.supplier_name}</p><p className="mt-1 text-xs text-slate-500">Sisa hutang {formatRupiah(purchase.outstanding_amount)}</p></div>
    <Field label="Jumlah Pembayaran (Rp)" required><TextInput value={toRupiahInput(amount)} onChange={e=>setAmount(parseRupiahInput(e.target.value))}/></Field>
    <Field label="Tanggal Pembayaran" required><TextInput type="date" value={payment_date} onChange={e=>setDate(e.target.value)}/></Field>
    <Field label="Metode Pembayaran"><Select value={payment_method} onChange={e=>setMethod(e.target.value)}><option>Transfer</option><option>Tunai</option><option>Debit</option></Select></Field>
    <Field label="Catatan"><TextArea value={notes} onChange={e=>setNotes(e.target.value)}/></Field>
  </Modal>;
}
