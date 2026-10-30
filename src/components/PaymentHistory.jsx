import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './Toast';
import { Field, TextInput, Select } from './FormFields';
import { formatRupiah, formatDateShort, toRupiahInput, parseRupiahInput } from '../lib/format';
import { Plus, Trash2 } from 'lucide-react';

const PAYMENT_METHODS = ['Transfer', 'Tunai', 'QRIS', 'E-Wallet', 'Lainnya'];

export default function PaymentHistory({ sourceType, sourceId, customerName, totalAmount, canEdit = false }) {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Transfer');
  const [notes, setNotes] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('business_payments')
      .select('*')
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) toast.error('Gagal memuat riwayat pembayaran: ' + error.message);
    setPayments(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [sourceType, sourceId]);

  const paid = useMemo(() => payments.reduce((sum, p) => sum + Number(p.amount || 0), 0), [payments]);
  const remaining = Math.max(0, Number(totalAmount || 0) - paid);

  const addPayment = async (event) => {
    event.preventDefault();
    const value = Number(amount) || 0;
    if (value <= 0) {
      toast.error('Nominal pembayaran harus lebih dari 0');
      return;
    }
    if (value > remaining) {
      toast.error('Nominal melebihi sisa tagihan ' + formatRupiah(remaining));
      return;
    }
    if (!paymentDate) {
      toast.error('Tanggal pembayaran wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('business_payments').insert({
        source_type: sourceType,
        source_id: sourceId,
        customer_name: customerName,
        amount: value,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
      });
      if (error) throw error;
      toast.success('Pembayaran berhasil dicatat dan masuk ke kas');
      setAmount(0);
      setNotes('');
      await load();
    } catch (err) {
      toast.error('Gagal mencatat pembayaran: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deletePayment = async (payment) => {
    if (!window.confirm('Hapus pembayaran ' + formatRupiah(payment.amount) + '? Transaksi kas terkait juga akan dihapus.')) return;
    try {
      const { error } = await supabase.from('business_payments').delete().eq('id', payment.id);
      if (error) throw error;
      toast.success('Pembayaran dihapus dan kas diperbarui');
      await load();
    } catch (err) {
      toast.error('Gagal menghapus pembayaran: ' + err.message);
    }
  };

  return (
    <section className="mt-5 border-t border-slate-200 dark:border-slate-800 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Riwayat Pembayaran</h4>
        <div className="text-right text-xs">
          <p className="text-slate-500">Sudah dibayar</p>
          <p className="font-semibold text-emerald-600">{formatRupiah(paid)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
          <p className="text-xs text-slate-500">Nilai Pekerjaan</p>
          <p className="font-semibold text-slate-800 dark:text-slate-100">{formatRupiah(totalAmount)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
          <p className="text-xs text-slate-500">Sisa Pembayaran</p>
          <p className="font-semibold text-amber-600">{formatRupiah(remaining)}</p>
        </div>
      </div>

      {canEdit && remaining > 0 && (
        <form onSubmit={addPayment} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 mb-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Catat Pembayaran Baru</p>
          <div className="grid sm:grid-cols-2 gap-x-3">
            <Field label="Nominal Pembayaran" required>
              <TextInput value={toRupiahInput(amount)} onChange={(e) => setAmount(parseRupiahInput(e.target.value))} inputMode="numeric" placeholder="0" />
            </Field>
            <Field label="Tanggal Pembayaran" required>
              <TextInput type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </Field>
            <Field label="Metode Pembayaran">
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
              </Select>
            </Field>
            <Field label="Catatan">
              <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: DP 30%, termin kedua" />
            </Field>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60">
              <Plus size={14} /> {saving ? 'Menyimpan...' : 'Catat Pembayaran'}
            </button>
          </div>
        </form>
      )}

      {loading ? <p className="text-xs text-slate-400 py-2">Memuat pembayaran...</p> : payments.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">Belum ada riwayat pembayaran. Jika pembayaran terjadi sebelum fitur ini tersedia, catat ulang agar kas dan sisa tagihan ikut tercatat.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="text-left py-2">Tanggal</th>
                <th className="text-left">Metode / Catatan</th>
                <th className="text-right">Nominal</th>
                {canEdit && <th className="w-8"></th>}
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDateShort(payment.payment_date)}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-300">
                    <span>{payment.payment_method}</span>
                    {payment.notes && <p className="text-xs text-slate-400">{payment.notes}</p>}
                  </td>
                  <td className="py-2 text-right font-medium text-emerald-600 whitespace-nowrap">{formatRupiah(payment.amount)}</td>
                  {canEdit && <td className="py-2 text-right">
                    <button type="button" onClick={() => deletePayment(payment)} title="Hapus pembayaran" className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-slate-400 mt-2">Setiap pembayaran otomatis tercatat satu kali pada menu Keuangan sebagai kas masuk.</p>
    </section>
  );
}
