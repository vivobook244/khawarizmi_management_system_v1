import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Konfirmasi Hapus',
  message = 'Apakah Anda yakin? Tindakan ini tidak dapat dibatalkan.',
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 flex items-center gap-2"
            disabled={loading}
          >
            {loading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
          <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 pt-2">{message}</p>
      </div>
    </Modal>
  );
}
