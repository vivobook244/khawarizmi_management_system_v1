export function Field({ label, required, error, children, hint }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputBase =
  'w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500';

export function TextInput({ error, ...props }) {
  return (
    <input
      {...props}
      className={`${inputBase} ${error ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} ${props.className || ''}`}
    />
  );
}

export function TextArea({ error, ...props }) {
  return (
    <textarea
      {...props}
      className={`${inputBase} resize-y min-h-[80px] ${error ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} ${props.className || ''}`}
    />
  );
}

export function Select({ error, children, ...props }) {
  return (
    <select
      {...props}
      className={`${inputBase} ${error ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} ${props.className || ''}`}
    >
      {children}
    </select>
  );
}
