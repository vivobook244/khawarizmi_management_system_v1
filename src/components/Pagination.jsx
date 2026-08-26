import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, page - 1);
  const end = Math.min(totalPages, start + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
      >
        <ChevronLeft size={18} />
      </button>
      {start > 1 && (
        <>
          <button onClick={() => onChange(1)} className="px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">1</button>
          {start > 2 && <span className="px-1 text-slate-400">...</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            p === page
              ? 'bg-brand-600 text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-slate-400">...</span>}
          <button onClick={() => onChange(totalPages)} className="px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">{totalPages}</button>
        </>
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
