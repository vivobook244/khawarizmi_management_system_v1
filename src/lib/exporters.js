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

export const exportInvoiceService = (service, spareparts) => {
  const doc = new jsPDF();
  headerBox(doc, 'INVOICE SERVICE', `No: ${service.invoice_number || '-'}`);

  let y = 56;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Kepada Yth:', 14, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(service.customer_name || '-', 14, y); y += 5;
  if (service.customer_phone) { doc.text(service.customer_phone, 14, y); y += 5; }
  y += 2;
  doc.text(`Tanggal: ${formatDate(service.service_date)}`, 14, y); y += 5;
  doc.text(`Perangkat: ${service.device}`, 14, y); y += 8;

  const rows = [];
  if (spareparts && spareparts.length) {
    spareparts.forEach((s, i) => {
      rows.push([
        i + 1,
        s.sparepart_name,
        s.quantity,
        formatRupiah(s.price),
        formatRupiah(s.subtotal),
      ]);
    });
  }
  rows.push([
    spareparts && spareparts.length ? spareparts.length + 1 : 1,
    'Biaya Jasa Service',
    1,
    formatRupiah(service.service_fee),
    formatRupiah(service.service_fee),
  ]);

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
  const total = (service.service_fee || 0) + (spareparts || []).reduce((a, s) => a + (Number(s.subtotal) || 0), 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Total: ${formatRupiah(total)}`, 130, afterY);
  afterY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Status Pembayaran: ${service.payment_status}`, 130, afterY);
  afterY += 14;

  doc.setFontSize(9);
  doc.text('Terima kasih atas kepercayaan Anda.', 14, afterY);
  doc.text('Khawarizmi.project', 14, afterY + 5);

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

export const downloadServiceInvoice = (service, spareparts) => {
  downloadDoc(exportInvoiceService(service, spareparts), `Invoice-${service.invoice_number || service.id}.pdf`);
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
