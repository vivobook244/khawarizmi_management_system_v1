export function Field({ label, required, error, children, hint }) {
  return (
    <div className="mb-4 min-w-0">
      <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

const inputBase = 'w-full min-w-0 rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-900/[0.02] transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600 dark:disabled:bg-slate-900';

export function TextInput({ error, ...props }) {
  return <input {...props} className={`${inputBase} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 dark:border-slate-700'} ${props.className || ''}`} />;
}

export function TextArea({ error, ...props }) {
  return <textarea {...props} className={`${inputBase} min-h-[96px] resize-y ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 dark:border-slate-700'} ${props.className || ''}`} />;
}

export function Select({ error, children, ...props }) {
  return <select {...props} className={`${inputBase} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 dark:border-slate-700'} ${props.className || ''}`}>{children}</select>;
}
