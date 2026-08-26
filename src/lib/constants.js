export const WORK_STATUS_SERVICE = [
  'Menunggu pemeriksaan',
  'Sedang diperiksa',
  'Menunggu sparepart',
  'Sedang dikerjakan',
  'Selesai',
  'Diambil customer',
  'Dibatalkan',
];

export const PAYMENT_STATUS_SERVICE = ['Belum bayar', 'DP', 'Lunas'];

export const SOFTWARE_TYPES = [
  'Website',
  'Web Application',
  'Android Application',
  'Desktop Application',
  'Custom Software',
];

export const WORK_STATUS_PROJECT = [
  'Proposal',
  'Menunggu persetujuan',
  'Planning',
  'Development',
  'Testing',
  'Revisi',
  'Selesai',
  'Dibatalkan',
];

export const PAYMENT_STATUS_PROJECT = ['Belum bayar', 'DP', 'Cicilan', 'Lunas'];

export const PROPOSAL_TYPES = [
  { value: 'service_package', label: 'Paket Service' },
  { value: 'software_development', label: 'Software Development' },
];

export const BUSINESS_SCHEMES = ['Subscription', 'One License One Device', 'Custom Project'];

export const ROLE_LABELS = {
  admin: 'Admin',
  technician: 'Technician',
  developer: 'Developer',
};

export const generateInvoiceNumber = (prefix = 'INV') => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}/${y}${m}${d}/${rand}`;
};
