export const formatRupiah = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
};

export const formatNumber = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('id-ID').format(n);
};

export const formatDate = (value) => {
  if (!value) return '-';
  try {
    const d = new Date(value);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return value;
  }
};

export const formatDateShort = (value) => {
  if (!value) return '-';
  try {
    const d = new Date(value);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return value;
  }
};

export const parseRupiahInput = (str) => {
  if (!str) return 0;
  const cleaned = String(str).replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

export const toRupiahInput = (value) => {
  const n = Number(value) || 0;
  if (n === 0) return '';
  return new Intl.NumberFormat('id-ID').format(n);
};
