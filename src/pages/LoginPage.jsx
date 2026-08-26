import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Field, TextInput } from '../components/FormFields';
import { Loader2, Wrench, Code2 } from 'lucide-react';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (mode === 'signup' && !fullName.trim()) e.fullName = 'Nama lengkap wajib diisi';
    if (!email.trim()) e.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Format email tidak valid';
    if (!password) e.password = 'Password wajib diisi';
    else if (password.length < 6) e.password = 'Password minimal 6 karakter';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        toast.success('Berhasil masuk');
      } else {
        await signUp(email.trim(), password, fullName.trim());
        toast.success('Akun dibuat. Periksa email jika perlu konfirmasi, lalu masuk.');
        setMode('login');
      }
    } catch (err) {
      const msg = err?.message || 'Terjadi kesalahan';
      if (msg.toLowerCase().includes('invalid login')) toast.error('Email atau password salah');
      else if (msg.toLowerCase().includes('already registered')) toast.error('Email sudah terdaftar');
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 text-white mb-4 shadow-lg shadow-brand-600/30">
            <Wrench size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Khawarizmi.project</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sistem Management Teknisi & Software Developer
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === 'login' ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-white shadow' : 'text-slate-500'
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === 'signup' ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-white shadow' : 'text-slate-500'
              }`}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {mode === 'signup' && (
              <Field label="Nama Lengkap" required error={errors.fullName}>
                <TextInput
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama Anda"
                  error={errors.fullName}
                />
              </Field>
            )}
            <Field label="Email" required error={errors.email}>
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@contoh.com"
                error={errors.email}
              />
            </Field>
            <Field label="Password" required error={errors.password}>
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                error={errors.password}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {mode === 'login' ? 'Masuk' : 'Buat Akun'}
            </button>
          </form>

          {mode === 'signup' && (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
              Akun pertama yang dibuat otomatis menjadi Admin. Akun berikutnya menjadi Technician.
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><Wrench size={14} /> Service</span>
          <span className="flex items-center gap-1.5"><Code2 size={14} /> Software</span>
          <span className="flex items-center gap-1.5">Stok Sparepart</span>
        </div>
      </div>
    </div>
  );
}
