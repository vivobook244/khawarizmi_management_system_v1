import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatRupiah, formatDate } from './format';

const BRAND = 'Khawarizmi.project';
const BRAND_SUB = 'Sistem Management Teknisi & Software Developer';

const headerBox = (doc, title, subtitle) => {
  doc.setFillColor(28, 107, 245);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(BRAND, 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(BRAND_SUB, 14, 19);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 40);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 46);
  }
  doc.setTextColor(30, 30, 30);
};

const terbilang = (value) => {
  const n = Math.floor(Math.abs(Number(value) || 0));
  const words = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  const say = (num) => {
    if (num < 12) return words[num];
    if (num < 20) return `${say(num - 10)} belas`;
    if (num < 100) return `${say(Math.floor(num / 10))} puluh ${say(num % 10)}`.trim();
    if (num < 200) return `seratus ${say(num - 100)}`.trim();
    if (num < 1000) return `${say(Math.floor(num / 100))} ratus ${say(num % 100)}`.trim();
    if (num < 2000) return `seribu ${say(num - 1000)}`.trim();
    if (num < 1000000) return `${say(Math.floor(num / 1000))} ribu ${say(num % 1000)}`.trim();
    if (num < 1000000000) return `${say(Math.floor(num / 1000000))} juta ${say(num % 1000000)}`.trim();
    if (num < 1000000000000) return `${say(Math.floor(num / 1000000000))} miliar ${say(num % 1000000000)}`.trim();
    return `${say(Math.floor(num / 1000000000000))} triliun ${say(num % 1000000000000)}`.trim();
  };
  return n === 0 ? 'Nol rupiah' : `${say(n).replace(/\s+/g, ' ').trim()} rupiah`;
};

const drawDocumentHeader = (doc, title, number) => {
  const blue = [15, 61, 122];
  doc.setTextColor(...blue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text('KHAWARIZMI', 14, 18);
  doc.setFontSize(10);
  doc.text('PROJECT', 14, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('IT Service  |  Software Development  |  IoT Development', 14, 32);
  doc.text('Dumai, Riau  |  +62 822 5152 4351', 14, 38);
  doc.setTextColor(...blue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text(title, 196, 18, { align: 'right', maxWidth: 100 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`No. Dokumen: ${number || '-'}`, 196, 30, { align: 'right' });
  doc.setDrawColor(...blue);
  doc.setLineWidth(0.8);
  doc.line(14, 45, 196, 45);
  doc.setLineWidth(0.25);
  doc.line(14, 46.5, 196, 46.5);
};

const drawField = (doc, label, value, y, options = {}) => {
  const blue = [15, 61, 122];
  doc.setTextColor(...blue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(options.fontSize || 10);
  doc.text(label, 16, y);
  const labelWidth = doc.getTextWidth(label) + 4;
  doc.setFont('helvetica', 'normal');
  const x = Math.min(16 + labelWidth, options.maxX || 90);
  const right = options.right || 194;
  if (value) {
    const lines = doc.splitTextToSize(String(value), right - x - 2);
    doc.text(lines, x, y);
    doc.setDrawColor(37, 99, 175);
    doc.line(x, y + 2, right, y + 2);
    return y + Math.max(9, lines.length * 5 + 4);
  }
  doc.setDrawColor(37, 99, 175);
  doc.line(x, y + 2, right, y + 2);
  return y + 14;
};

export const exportInvoiceService = (service, spareparts = [], payments = []) => {
  const doc = new jsPDF();
  const isPaid = String(service.payment_status || '').toLowerCase() === 'lunas';
  const total = Number(service.estimated_total) || (Number(service.service_fee) || 0) + spareparts.reduce((sum, part) =>
    sum + (Number(part.subtotal) || (Number(part.quantity) || 0) * (Number(part.price) || 0)), 0);
  const paid = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const remaining = Math.max(0, total - paid);
  const latestPayment = payments[0] || {};
  const blue = [15, 61, 122];

  drawDocumentHeader(doc, isPaid ? 'KUITANSI PEMBAYARAN' : 'INVOICE SERVICE', service.invoice_number);

  if (isPaid) {
    let y = 66;
    y = drawField(doc, 'Sudah diterima dari:', service.customer_name || '-', y);
    y = drawField(doc, 'Uang sejumlah (angka):', formatRupiah(paid || total), y);
    y = drawField(doc, 'Terbilang:', terbilang(paid || total), y);
    y = drawField(doc, 'Untuk pembayaran:', `Jasa service ${service.device || 'perangkat'} - ${service.invoice_number || ''}`, y + 1);
    y += 2;

    doc.setTextColor(...blue);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Jenis pembayaran:', 16, y);
    const paymentNote = String(latestPayment.notes || '').toLowerCase();
    const kind = paymentNote.includes('dp') ? 'Uang muka (DP)' : paymentNote.includes('termin') ? 'Termin' : 'Pelunasan';
    const kinds = ['Uang muka (DP)', 'Termin', 'Pelunasan', 'Lainnya'];
    const drawCheck = (x, label, checked) => {
      doc.rect(x, y + 5, 4, 4);
      if (checked) {
        doc.setLineWidth(0.7);
        doc.line(x + 0.7, y + 7, x + 1.7, y + 8);
        doc.line(x + 1.7, y + 8, x + 3.4, y + 5.8);
        doc.setLineWidth(0.2);
      }
      doc.setFont('helvetica', 'normal');
      doc.text(label, x + 7, y + 8.5);
    };
    [18, 67, 112, 158].forEach((x, i) => drawCheck(x, kinds[i], kind === kinds[i]));
    y += 22;

    doc.setFont('helvetica', 'bold');
    doc.text('Metode pembayaran:', 16, y);
    const method = String(latestPayment.payment_method || '').toLowerCase();
    const methods = ['Transfer', 'Tunai', 'Lainnya'];
    [18, 70, 119].forEach((x, i) => {
      doc.rect(x, y + 5, 4, 4);
      const selected = i === 0 ? method === 'transfer' : i === 1 ? method === 'tunai' : !['transfer', 'tunai'].includes(method);
      if (selected) {
        doc.line(x + 0.7, y + 7, x + 1.7, y + 8);
        doc.line(x + 1.7, y + 8, x + 3.4, y + 5.8);
      }
      doc.setFont('helvetica', 'normal');
      doc.text(methods[i], x + 7, y + 8.5);
    });
    y += 22;
    y = drawField(doc, 'Tanggal pembayaran:', latestPayment.payment_date ? formatDate(latestPayment.payment_date) : formatDate(service.updated_at || service.service_date), y);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...blue);
    doc.setFontSize(10);
    doc.text('Dumai,', 130, y);
    doc.line(146, y + 1, 194, y + 1);
    doc.text('Penerima,', 130, y + 10);
    doc.line(130, y + 42, 194, y + 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('KHAWARIZMI PROJECT', 105, 285, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Terima kasih atas kepercayaan Anda.', 105, 291, { align: 'center' });
    return doc;
  }

  let y = 58;
  doc.setTextColor(...blue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TAGIHAN KEPADA', 16, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(35, 45, 60);
  doc.setFontSize(10);
  doc.text(service.customer_name || '-', 16, y); y += 6;
  doc.text(`Tanggal service: ${formatDate(service.service_date)}`, 16, y); y += 6;
  doc.text(`Perangkat: ${service.device || '-'}`, 16, y); y += 8;
  if (service.problem) {
    doc.setFont('helvetica', 'bold'); doc.text('Keluhan:', 16, y); y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(String(service.problem), 178);
    doc.text(lines, 16, y); y += lines.length * 5 + 3;
  }
  if (service.actions) {
    doc.setFont('helvetica', 'bold'); doc.text('Tindakan / Riwayat Penggantian:', 16, y); y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(String(service.actions), 178);
    doc.text(lines, 16, y); y += lines.length * 5 + 3;
  }

  const rows = spareparts.map((part, index) => [
    index + 1,
    part.sparepart_name || 'Sparepart',
    Number(part.quantity) || 0,
    formatRupiah(part.price),
    formatRupiah(Number(part.subtotal) || (Number(part.quantity) || 0) * (Number(part.price) || 0)),
  ]);
  rows.push([rows.length + 1, 'Biaya Jasa Service', 1, formatRupiah(service.service_fee), formatRupiah(service.service_fee)]);
  autoTable(doc, {
    startY: y,
    head: [['#', 'Deskripsi / Sparepart Diganti', 'Qty', 'Harga', 'Subtotal']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: blue, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [35, 45, 60] },
    columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 14, halign: 'center' } },
    margin: { left: 16, right: 16 },
  });

  let afterY = doc.lastAutoTable.finalY + 10;
  doc.setTextColor(...blue);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Total tagihan: ${formatRupiah(total)}`, 194, afterY, { align: 'right' });
  afterY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Sudah dibayar: ${formatRupiah(paid)}`, 194, afterY, { align: 'right' });
  afterY += 7;
  doc.setFont('helvetica', 'bold');
  doc.text(`Sisa tagihan: ${formatRupiah(remaining)}`, 194, afterY, { align: 'right' });
  afterY += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Mohon lakukan pembayaran sesuai sisa tagihan. Terima kasih.', 16, afterY);
  return doc;
};
export const exportInvoiceProject = (project, rabItems) => {
  const doc = new jsPDF();
  headerBox(doc, 'INVOICE SOFTWARE PROJECT', `No: ${project.invoice_number || '-'}`);

  let y = 56;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Kepada Yth:', 14, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(project.customer_name || '-', 14, y); y += 5;
  y += 2;
  doc.text(`Tanggal: ${formatDate(project.project_date)}`, 14, y); y += 5;
  doc.text(`Nama Project: ${project.title}`, 14, y); y += 5;
  doc.text(`Jenis: ${project.software_type}`, 14, y); y += 8;

  const rows = [];
  if (rabItems && rabItems.length) {
    rabItems.forEach((it, i) => {
      rows.push([
        i + 1,
        it.name,
        it.quantity,
        formatRupiah(it.price),
        formatRupiah(it.subtotal),
      ]);
    });
  } else {
    rows.push([1, project.title, 1, formatRupiah(project.estimated_total), formatRupiah(project.estimated_total)]);
  }

  autoTable(doc, {
    startY: y,
    head: [['#', 'Deskripsi', 'Qty', 'Harga', 'Subtotal']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [28, 107, 245], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 12 }, 2: { cellWidth: 16, halign: 'center' } },
  });

  let afterY = doc.lastAutoTable.finalY + 8;
  const total = Number(project.estimated_total) || 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Nilai Project: ${formatRupiah(total)}`, 130, afterY); afterY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Status Pembayaran: ${project.payment_status}`, 130, afterY); afterY += 6;
  doc.text(`Sisa Pembayaran: ${formatRupiah(total - (project.amount_paid || 0))}`, 130, afterY);
  afterY += 14;

  doc.setFontSize(9);
  doc.text('Terima kasih atas kepercayaan Anda.', 14, afterY);
  doc.text('Khawarizmi.project', 14, afterY + 5);

  return doc;
};

export const exportRabPdf = (project, rab, rabItems) => {
  const doc = new jsPDF();
  headerBox(doc, 'RAB (Rencana Anggaran Biaya)', project.title);

  let y = 56;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Customer: ${project.customer_name}`, 14, y); y += 5;
  doc.text(`Project: ${project.title}`, 14, y); y += 5;
  doc.text(`Tanggal: ${formatDate(project.project_date)}`, 14, y); y += 8;

  const rows = rabItems.map((it, i) => [
    i + 1, it.name, it.category || '-', it.quantity, formatRupiah(it.price), formatRupiah(it.subtotal),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Nama Item', 'Kategori', 'Qty', 'Harga', 'Subtotal']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [28, 107, 245], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
  });

  let afterY = doc.lastAutoTable.finalY + 8;
  const itemsTotal = rabItems.reduce((a, it) => a + (Number(it.subtotal) || 0), 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total Item: ${formatRupiah(itemsTotal)}`, 120, afterY); afterY += 6;
  doc.text(`Biaya Tambahan: ${formatRupiah(rab.additional_cost || 0)}`, 120, afterY); afterY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Grand Total: ${formatRupiah(rab.grand_total || 0)}`, 120, afterY);

  return doc;
};

export const exportProposalPdf = (proposal, items) => {
  const doc = new jsPDF();
  headerBox(doc, 'PROPOSAL PENAWARAN', proposal.title);

  let y = 56;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Kepada: ${proposal.customer_name}`, 14, y); y += 5;
  doc.text(`Tanggal: ${formatDate(proposal.proposal_date)}`, 14, y); y += 5;
  doc.text(`Jenis: ${proposal.proposal_type === 'service_package' ? 'Paket Service' : 'Software Development'}`, 14, y); y += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Deskripsi', 14, y); y += 5;
  doc.setFont('helvetica', 'normal');
  const desc = doc.splitTextToSize(proposal.description || '-', 180);
  doc.text(desc, 14, y); y += desc.length * 5 + 3;

  if (proposal.features) {
    doc.setFont('helvetica', 'bold');
    doc.text('Fitur', 14, y); y += 5;
    doc.setFont('helvetica', 'normal');
    const f = doc.splitTextToSize(proposal.features, 180);
    doc.text(f, 14, y); y += f.length * 5 + 3;
  }
  if (proposal.technologies) {
    doc.setFont('helvetica', 'bold');
    doc.text('Teknologi', 14, y); y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(proposal.technologies, 14, y); y += 8;
  }

  const rows = items.map((it, i) => [i + 1, it.name, it.description || '-', formatRupiah(it.price)]);
  if (rows.length === 0) {
    rows.push([1, proposal.title, proposal.description || '-', formatRupiah(proposal.price)]);
  }

  autoTable(doc, {
    startY: y,
    head: [['#', 'Item', 'Deskripsi', 'Harga']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [28, 107, 245], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
  });

  let afterY = doc.lastAutoTable.finalY + 8;
  const total = items.length ? items.reduce((a, it) => a + (Number(it.price) || 0), 0) : Number(proposal.price || 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total Penawaran: ${formatRupiah(total)}`, 120, afterY);

  return doc;
};

const downloadDoc = (doc, filename) => {
  doc.save(filename);
};

export const downloadServiceInvoice = (service, spareparts, payments = []) => {
  const isPaid = String(service.payment_status || '').toLowerCase() === 'lunas';
  const prefix = isPaid ? 'Kuitansi' : 'Invoice';
  downloadDoc(exportInvoiceService(service, spareparts, payments), `${prefix}-${service.invoice_number || service.id}.pdf`);
};

export const downloadProjectInvoice = (project, rabItems) => {
  downloadDoc(exportInvoiceProject(project, rabItems), `Invoice-${project.invoice_number || project.id}.pdf`);
};

export const downloadRabPdf = (project, rab, rabItems) => {
  downloadDoc(exportRabPdf(project, rab, rabItems), `RAB-${project.title}.pdf`);
};

export const downloadProposalPdf = (proposal, items) => {
  downloadDoc(exportProposalPdf(proposal, items), `Proposal-${proposal.title}.pdf`);
};

const exportSheet = (data, filename, sheetName = 'Sheet1') => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
};

export const exportServicesExcel = (services) => {
  const data = services.map((s) => ({
    'No Invoice': s.invoice_number || '-',
    Customer: s.customer_name,
    Perangkat: s.device,
    Permasalahan: s.problem || '',
    'Status Pengerjaan': s.work_status,
    'Status Pembayaran': s.payment_status,
    'Biaya Jasa': Number(s.service_fee) || 0,
    'Estimasi Total': Number(s.estimated_total) || 0,
    'Tanggal Service': formatDate(s.service_date),
    Catatan: s.notes || '',
  }));
  exportSheet(data, 'Laporan-Service.xlsx', 'Service');
};

export const exportProjectsExcel = (projects) => {
  const data = projects.map((p) => ({
    Customer: p.customer_name,
    'Nama Project': p.title,
    'Jenis Software': p.software_type,
    'Status Project': p.work_status,
    'Status Pembayaran': p.payment_status,
    'Total Project': Number(p.estimated_total) || 0,
    'Tanggal Project': formatDate(p.project_date),
    Catatan: p.notes || '',
  }));
  exportSheet(data, 'Laporan-Software.xlsx', 'Projects');
};

export const exportProposalsExcel = (proposals) => {
  const data = proposals.map((p) => ({
    Customer: p.customer_name,
    Judul: p.title,
    Jenis: p.proposal_type === 'service_package' ? 'Paket Service' : 'Software Development',
    'Skema Bisnis': p.business_scheme || '',
    Harga: Number(p.price) || 0,
    'Estimasi Durasi': p.estimated_duration || '',
    Tanggal: formatDate(p.proposal_date),
  }));
  exportSheet(data, 'Laporan-Proposal.xlsx', 'Proposal');
};
