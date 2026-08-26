import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function LoadingState({ label = 'Memuat data...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
      <Spinner className="w-8 h-8 mb-3 text-brand-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <Icon size={28} className="text-slate-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
      {message && <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Terjadi kesalahan.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center mb-4">
        <span className="text-2xl">!</span>
      </div>
      <h3 className="text-base font-semibold text-red-700 dark:text-red-400 mb-1">Gagal Memuat</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
}
