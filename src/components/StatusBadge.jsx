export default function StatusBadge({ status, color = 'slate' }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.slate}`}>
      {status}
    </span>
  );
}

export const workStatusColor = (status) => {
  const map = {
    'Menunggu pemeriksaan': 'amber',
    'Sedang diperiksa': 'blue',
    'Menunggu sparepart': 'purple',
    'Sedang dikerjakan': 'blue',
    'Selesai': 'emerald',
    'Diambil customer': 'emerald',
    'Dibatalkan': 'red',
    'Proposal': 'slate',
    'Menunggu persetujuan': 'amber',
    'Planning': 'blue',
    'Development': 'blue',
    'Testing': 'purple',
    'Revisi': 'amber',
  };
  return map[status] || 'slate';
};

export const paymentStatusColor = (status) => {
  const map = {
    'Belum bayar': 'red',
    'DP': 'amber',
    'Cicilan': 'amber',
    'Lunas': 'emerald',
  };
  return map[status] || 'slate';
};
