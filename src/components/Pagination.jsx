import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, Math.min(page - 1, totalPages - 2));
  const end = Math.min(totalPages, start + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  const base = 'inline-flex h-9 min-w-9 items-center justify-center rounded-xl text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-35';
  return (
    <nav aria-label="Navigasi halaman" className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
      <button type="button" aria-label="Halaman sebelumnya" onClick={() => onChange(page - 1)} disabled={page <= 1} className={base + ' text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}><ChevronLeft size={17} /></button>
      {start > 1 && <>
        <button type="button" onClick={() => onChange(1)} className={base + ' px-3 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}>1</button>
        {start > 2 && <span className="px-1 text-xs text-slate-400">...</span>}
      </>}
      {pages.map((p) => <button type="button" key={p} aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)} className={base + (p === page ? ' bg-brand-600 px-3 text-white shadow-sm shadow-brand-600/20' : ' px-3 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>{p}</button>)}
      {end < totalPages && <>
        {end < totalPages - 1 && <span className="px-1 text-xs text-slate-400">...</span>}
        <button type="button" onClick={() => onChange(totalPages)} className={base + ' px-3 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}>{totalPages}</button>
      </>}
      <button type="button" aria-label="Halaman berikutnya" onClick={() => onChange(page + 1)} disabled={page >= totalPages} className={base + ' text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}><ChevronRight size={17} /></button>
    </nav>
  );
}
