
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Transaction, SPK, SPKDetail } from "./types";
import { z } from 'zod';

// --- ZOD SCHEMAS ---

export const ProductSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi"),
  category: z.string().min(1, "Kategori wajib dipilih"),
  cmtPrice: z.coerce.number().min(1, "Harga CMT harus lebih dari 0"),
});

export const SPKHeaderSchema = z.object({
  spkNumber: z.string().min(1, "Nomor SPK wajib diisi"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Tanggal tidak valid"),
  notes: z.string().optional(),
});

export const SPKItemSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih"),
  qty: z.coerce.number().min(1, "Jumlah minimal 1"),
  cmtPrice: z.coerce.number().min(0, "Harga tidak boleh negatif"),
});

export const MutationSchema = z.object({
  qty: z.coerce.number().min(1, "Jumlah produksi minimal 1"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Tanggal tidak valid"),
  notes: z.string().optional(),
});

export const TransactionSchema = z.object({
  amount: z.coerce.number().min(1, "Jumlah uang harus lebih dari 0"),
  category: z.string().min(1, "Kategori wajib dipilih"),
  description: z.string().min(1, "Keterangan wajib diisi"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Tanggal tidak valid"),
  type: z.enum(['IN', 'OUT']),
});

// --- NATIVE UTILS ---

export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') => {
  if (navigator.vibrate) {
    switch (type) {
      case 'light': navigator.vibrate(5); break;
      case 'medium': navigator.vibrate(10); break;
      case 'heavy': navigator.vibrate(15); break;
      case 'success': navigator.vibrate([10, 30, 10]); break;
      case 'warning': navigator.vibrate([30, 50, 30]); break;
    }
  }
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const exportToCSV = (data: any[], fileName: string) => {
  if (!data || data.length === 0) return;

  const replacer = (key: string, value: any) => value === null ? '' : value; 
  const header = Object.keys(data[0]);
  
  const csv = [
    header.join(','), // header row matches property names
    ...data.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
  ].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportFinanceToPDF = (transactions: Transaction[], startDate: string, endDate: string) => {
  if (!transactions || transactions.length === 0) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // --- 1. BRANDING & HEADER ---
  // Aksen Warna Atas
  doc.setFillColor(6, 182, 212); // Primary Cyan (sesuai tema app)
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Nama Perusahaan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text("PT. REDONE BERKAH MANDIRI UTAMA", 14, 20);

  // Alamat & Kontak
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text("Jl. Raya Cileungsi-Jonggol Km. 10, Cipeucang, Cileungsi, Bogor, Jawa Barat 16820", 14, 26);
  doc.text("Email: redoneberkahmandiri@gmail.com | Phone: +62 812-3456-7890", 14, 31);

  // Garis Pemisah
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.line(14, 36, pageWidth - 14, 36);

  // --- 2. JUDUL & PERIODE ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text("LAPORAN KAS PRODUKSI", 14, 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Periode: ${formatDate(startDate)} s/d ${formatDate(endDate)}`, 14, 52);
  
  const printDate = `Dicetak: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`;
  doc.text(printDate, pageWidth - 14, 52, { align: 'right' });

  // --- 3. EXECUTIVE SUMMARY (Kotak Ringkasan) ---
  const totalIn = transactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIn - totalOut;

  const summaryY = 60;
  const boxWidth = (pageWidth - 28 - 10) / 3; // 3 kotak dengan gap 5
  const boxHeight = 20;

  // Box 1: Pemasukan
  doc.setFillColor(236, 253, 245); // Emerald 50
  doc.setDrawColor(16, 185, 129); // Emerald 500
  doc.roundedRect(14, summaryY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(6, 95, 70); // Emerald 800
  doc.text("TOTAL PEMASUKAN", 18, summaryY + 6);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(totalIn), 18, summaryY + 14);

  // Box 2: Pengeluaran
  doc.setFillColor(254, 242, 242); // Red 50
  doc.setDrawColor(239, 68, 68); // Red 500
  doc.roundedRect(14 + boxWidth + 5, summaryY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27); // Red 800
  doc.text("TOTAL PENGELUARAN", 18 + boxWidth + 5, summaryY + 6);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(totalOut), 18 + boxWidth + 5, summaryY + 14);

  // Box 3: Saldo
  doc.setFillColor(240, 253, 250); // Cyan 50
  doc.setDrawColor(6, 182, 212); // Cyan 500
  doc.roundedRect(14 + (boxWidth * 2) + 10, summaryY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(21, 94, 117); // Cyan 800
  doc.text("SALDO BERSIH", 18 + (boxWidth * 2) + 10, summaryY + 6);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(balance), 18 + (boxWidth * 2) + 10, summaryY + 14);


  // --- 4. TABEL TRANSAKSI ---
  const tableRows = transactions.map(t => [
    formatDate(t.date),
    t.category,
    t.description,
    t.type === 'IN' ? formatCurrency(t.amount) : '-',
    t.type === 'OUT' ? formatCurrency(t.amount) : '-',
  ]);

  autoTable(doc, {
    startY: summaryY + 28,
    head: [['Tanggal', 'Kategori', 'Keterangan', 'Masuk (Debet)', 'Keluar (Kredit)']],
    body: tableRows,
    theme: 'grid',
    headStyles: { 
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: { 
      fontSize: 8,
      cellPadding: 3,
      valign: 'middle',
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 35 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 30, halign: 'right', textColor: [16, 185, 129] }, // Green
      4: { cellWidth: 30, halign: 'right', textColor: [239, 68, 68] }, // Red
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Slate 50
    },
    // Footer Grand Total Row
    foot: [
      ['', 'GRAND TOTAL', '', formatCurrency(totalIn), formatCurrency(totalOut)]
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'right'
    }
  });

  // --- 5. TANDA TANGAN (SIGNATURES) ---
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  
  // Cek jika halaman tidak cukup
  if (finalY > 250) doc.addPage();
  const sigY = finalY > 250 ? 40 : finalY;

  doc.setFontSize(10);
  doc.setTextColor(0);

  // Kiri: Finance/Admin
  const leftX = 20;
  doc.text("Dibuat Oleh,", leftX, sigY);
  doc.text("( Bagian Keuangan )", leftX, sigY + 25);
  doc.line(leftX, sigY + 23, leftX + 40, sigY + 23);

  // Kanan: Direktur/Manajer
  const rightX = pageWidth - 60;
  doc.text("Disetujui Oleh,", rightX, sigY);
  doc.text("( Direktur Utama )", rightX, sigY + 25);
  doc.line(rightX, sigY + 23, rightX + 40, sigY + 23);

  // --- 6. PAGE NUMBERING ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(`Halaman ${i} dari ${pageCount} | SPINER Financial System`, pageWidth / 2, 285, { align: 'center' });
  }

  // Simpan File
  doc.save(`Laporan_Keuangan_${startDate}_${endDate}.pdf`);
};

export const exportSPKToPDF = (spk: SPK) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // --- BRANDING & HEADER ---
  // Accent Line
  doc.setFillColor(6, 182, 212); // Primary Cyan
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Company Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text("PT. REDONE BERKAH MANDIRI UTAMA", 14, 20);

  // Address & Contact
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // Slate 600
  const address = "Jl. Raya Cileungsi-Jonggol Km. 10, Cipeucang, Cileungsi, Bogor, Jawa Barat 16820";
  const email = "redoneberkahmandiri@gmail.com";
  
  // Split address if too long, though typically fits on A4
  doc.text(address, 14, 26);
  doc.text(email, 14, 31);

  // Document Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(6, 182, 212); // Primary Cyan for Title
  doc.text("SURAT PERINTAH KERJA (SPK)", 14, 42);

  // --- INFO GRID ---
  doc.setDrawColor(200);
  doc.line(14, 46, pageWidth - 14, 46);

  const startY = 56;
  doc.setFontSize(10);
  
  // Left Column
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Nomor SPK:", 14, startY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70);
  doc.text(spk.spkNumber, 14, startY + 6);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Tanggal Terbit:", 14, startY + 16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70);
  doc.text(formatDate(spk.date), 14, startY + 22);

  // Right Column
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Total Quantity:", pageWidth - 50, startY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70);
  doc.text(`${spk.totalQty} Pcs`, pageWidth - 50, startY + 6);

  // Notes Box
  if (spk.notes) {
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.roundedRect(14, startY + 30, pageWidth - 28, 16, 2, 2, 'F');
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Catatan: "${spk.notes}"`, 18, startY + 41);
  }

  // --- ITEM TABLE ---
  const tableStartY = spk.notes ? startY + 55 : startY + 35;
  
  const tableRows = spk.items.map((item, index) => [
    index + 1,
    item.productName,
    `${item.qty} Pcs`,
    '', // Kolom Kosong: Cutting
    '', // Kolom Kosong: Jahit
    '', // Kolom Kosong: QC/Finishing
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Nama Produk', 'Qty', 'Cutting', 'Jahit', 'QC / Fin']],
    body: tableRows,
    theme: 'grid',
    headStyles: { 
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center' // RATA TENGAH
    },
    styles: { 
      fontSize: 9, 
      cellPadding: 4,
      textColor: [51, 65, 85],
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' }, // Increased from 10 to 14 to fit double digits
      1: { cellWidth: 'auto', halign: 'left' }, // Nama produk rata kiri agar mudah dibaca
      2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 26 }, // Audit Col - Proporsional
      4: { cellWidth: 26 }, // Audit Col
      5: { cellWidth: 26 }, // Audit Col
    },
    foot: [
        ['', 'TOTAL TARGET', `${spk.totalQty} Pcs`, '', '', '']
    ],
    footStyles: {
        fillColor: [248, 250, 252],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        halign: 'center'
    }
  });

  // --- SIGNATURE AREA ---
  const finalY = (doc as any).lastAutoTable.finalY + 30;

  // Check if we need a new page
  if (finalY > 250) {
      doc.addPage();
  }
  
  const sigY = finalY > 250 ? 40 : finalY;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);

  // Left Sig
  const leftX = 30;
  doc.text("Dibuat Oleh,", leftX, sigY);
  doc.text("( Manajer )", leftX, sigY + 30); // JABATAN BARU
  doc.line(leftX, sigY + 28, leftX + 40, sigY + 28); // Line

  // Right Sig
  const rightX = pageWidth - 70;
  doc.text("Penerima Tugas,", rightX, sigY);
  doc.text("( Kepala Produksi )", rightX, sigY + 30); // JABATAN BARU
  doc.line(rightX, sigY + 28, rightX + 50, sigY + 28); // Line

  // --- FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Dicetak dari SPINER System pada ${new Date().toLocaleString('id-ID')}`, 14, 285);
      doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 30, 285);
  }

  doc.save(`SPK_${spk.spkNumber}.pdf`);
};

export const exportProductionToPDF = (spks: SPK[], startDate: string, endDate: string): boolean => {
  if (!spks || spks.length === 0) return false;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // --- BRANDING & HEADER ---
  doc.setFillColor(6, 182, 212); // Primary Cyan
  doc.rect(0, 0, pageWidth, 5, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text("PT. REDONE BERKAH MANDIRI UTAMA", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text("Jl. Raya Cileungsi-Jonggol Km. 10, Cipeucang, Cileungsi, Bogor, Jawa Barat 16820", 14, 26);
  doc.text("Email: redoneberkahmandiri@gmail.com | Phone: +62 812-3456-7890", 14, 31);

  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.line(14, 36, pageWidth - 14, 36);

  // --- TITLE ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text("LAPORAN PRODUKSI", 14, 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Periode: ${formatDate(startDate)} s/d ${formatDate(endDate)}`, 14, 52);

  const printDate = `Dicetak: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`;
  doc.text(printDate, pageWidth - 14, 52, { align: 'right' });

  // Sort by date ascending (data already pre-filtered by caller)
  const sortedSPKs = [...spks].sort((a, b) => {
    const dateA = a.date.substring(0, 10);
    const dateB = b.date.substring(0, 10);
    return dateA.localeCompare(dateB);
  });

  // Calculate totals using mutations filtered by date range for accurate period reporting
  let totalProducedQty = 0;
  let totalRealizedValue = 0;

  sortedSPKs.forEach(spk => {
      if (spk.mutations) {
          spk.mutations.forEach(mut => {
              const mutDate = mut.date.substring(0, 10);
              if (mutDate >= startDate && mutDate <= endDate) {
                  const item = spk.items.find(i => i.id === mut.itemId);
                  if (item) {
                      totalProducedQty += mut.qty;
                      totalRealizedValue += (mut.qty * item.cmtPrice);
                  }
              }
          });
      }
  });

  const summaryY = 60;
  const boxWidth = (pageWidth - 28 - 5) / 2;
  const boxHeight = 20;

  // Box 1: Quantity Produced
  doc.setFillColor(240, 253, 250); // Cyan 50
  doc.setDrawColor(6, 182, 212);
  doc.roundedRect(14, summaryY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(21, 94, 117);
  doc.text("TOTAL OUTPUT (PCS)", 18, summaryY + 6);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${totalProducedQty} Pcs`, 18, summaryY + 14);

  // Box 2: Nilai Realisasi
  doc.setFillColor(236, 253, 245); // Emerald 50
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(14 + boxWidth + 5, summaryY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(6, 95, 70);
  doc.text("TOTAL NILAI PRODUKSI", 18 + boxWidth + 5, summaryY + 6);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(totalRealizedValue), 18 + boxWidth + 5, summaryY + 14);

  // --- TABLE --- (per mutation entry, filtered to date range)
  const tableRows: any[] = [];
  sortedSPKs.forEach(spk => {
      if (spk.mutations) {
          spk.mutations.forEach(mut => {
              const mutDate = mut.date.substring(0, 10);
              if (mutDate >= startDate && mutDate <= endDate) {
                  const item = spk.items.find(i => i.id === mut.itemId);
                  const cmtPrice = item ? item.cmtPrice : 0;
                  const realizedValue = mut.qty * cmtPrice;
                  tableRows.push([
                      formatDate(mut.date),
                      spk.spkNumber,
                      mut.productName,
                      '-',
                      mut.qty,
                      formatCurrency(realizedValue)
                  ]);
              }
          });
      }
  });

  if (tableRows.length === 0) return false;

  autoTable(doc, {
      startY: summaryY + 28,
      head: [['Tanggal', 'No SPK', 'Produk', 'SPK Target', 'Qty Produksi', 'Nilai (Rp)']],
      body: tableRows,
      theme: 'grid',
      headStyles: { 
        fillColor: [15, 23, 42], // Slate 900
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { fontSize: 8, cellPadding: 3, valign: 'middle', textColor: [51, 65, 85] },
      columnStyles: {
          0: { cellWidth: 25, halign: 'center' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 30, halign: 'right' }
      },
      foot: [['', '', 'TOTAL PERIODE', '', totalProducedQty, formatCurrency(totalRealizedValue)]],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'right' }
  });

  // --- FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Dicetak dari SPINER System pada ${new Date().toLocaleString('id-ID')}`, 14, 285);
      doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 30, 285);
  }

  doc.save(`Laporan_Produksi_${startDate}_${endDate}.pdf`);
  return true;
};
