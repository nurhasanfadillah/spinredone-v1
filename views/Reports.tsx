
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { formatCurrency, formatDate, exportToCSV, exportFinanceToPDF, exportProductionToPDF } from '../utils';
import { Card, Button, Input } from '../components/UI';
import { Download, Calendar, FileText, Wallet, FileDown, TrendingUp, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Reports: React.FC = () => {
  const { spks, products, transactions, showNotification } = useAppStore();

  // Date Filter State (Default: Current Month)
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  // Helper for safe date string extraction (YYYY-MM-DD)
  const getDateString = (dateInput: string) => {
      if (!dateInput) return '';
      // Handle "2023-01-01T00:00:00" -> "2023-01-01"
      // Handle "2023-01-01" -> "2023-01-01"
      return dateInput.substring(0, 10);
  };

  // --- CHART DATA AGGREGATION ---
  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 1. Initialize all dates in range with 0
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        data[dateKey] = 0;
    }

    // 2. Aggregate Mutation Data
    spks.forEach(spk => {
        if (spk.mutations) {
            spk.mutations.forEach(mut => {
                const dateKey = getDateString(mut.date);
                if (data[dateKey] !== undefined) {
                    data[dateKey] += mut.qty;
                }
            });
        }
    });

    return Object.keys(data).sort().map(date => ({
        dateStr: formatDate(date).split(' ').slice(0, 2).join(' '),
        fullDate: formatDate(date),
        qty: data[date]
    }));

  }, [spks, startDate, endDate]);

  const maxQty = Math.max(...chartData.map(d => d.qty), 10);

  // --- REPORT GENERATION LOGIC ---

  const handleExportProduction = () => {
    // String comparison for filtering
    const filteredSPKs = spks.filter(s => {
      const d = getDateString(s.date);
      return d >= startDate && d <= endDate;
    });

    if (filteredSPKs.length === 0) {
      showNotification('Tidak ada data produksi pada periode ini', 'warning');
      return;
    }

    const csvData = filteredSPKs.flatMap(spk => 
      spk.items.map(item => ({
        'No SPK': spk.spkNumber,
        'Tanggal': formatDate(spk.date),
        'Produk': item.productName,
        'Harga CMT': item.cmtPrice,
        'Qty Target': item.qty,
        'Qty Selesai': item.completedQty || 0,
        'Status': item.status,
        'Total Nilai': item.total,
        'Catatan': spk.notes || '-'
      }))
    );

    exportToCSV(csvData, `Laporan_Produksi_${startDate}_${endDate}`);
    showNotification('Laporan Produksi berhasil diunduh', 'success');
  };

  const handleExportProductionPDF = () => {
    const filteredSPKs = spks.filter(s => {
      const d = getDateString(s.date);
      return d >= startDate && d <= endDate;
    });

    if (filteredSPKs.length === 0) {
      showNotification('Tidak ada data produksi pada periode ini', 'warning');
      return;
    }

    exportProductionToPDF(filteredSPKs, startDate, endDate);
    showNotification('Laporan Produksi (PDF) berhasil diunduh', 'success');
  };

  const handleExportFinanceCSV = () => {
    const filteredTx = transactions.filter(t => {
      const txDate = getDateString(t.date);
      return txDate >= startDate && txDate <= endDate;
    });

    if (filteredTx.length === 0) {
      showNotification('Tidak ada data keuangan pada periode ini', 'warning');
      return;
    }

    const csvData = filteredTx.map(t => ({
      'Tanggal': formatDate(t.date),
      'Tipe': t.type === 'IN' ? 'Pemasukan' : 'Pengeluaran',
      'Kategori': t.category,
      'Deskripsi': t.description,
      'Nominal': t.amount,
      'Ref ID': t.refId || 'Manual'
    }));

    exportToCSV(csvData, `Laporan_Keuangan_${startDate}_${endDate}`);
    showNotification('Laporan Keuangan (CSV) berhasil diunduh', 'success');
  };

  const handleExportFinancePDF = () => {
    const filteredTx = transactions.filter(t => {
      const txDate = getDateString(t.date);
      return txDate >= startDate && txDate <= endDate;
    });

    // Sort by date ascending
    filteredTx.sort((a,b) => {
        // Safe sort
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateA.localeCompare(dateB);
    });

    if (filteredTx.length === 0) {
      showNotification('Tidak ada data keuangan pada periode ini', 'warning');
      return;
    }

    exportFinanceToPDF(filteredTx, startDate, endDate);
    showNotification('Laporan Keuangan (PDF) berhasil diunduh', 'success');
  }


  // --- SUMMARY CALCULATION ---
  const totalProducedRange = chartData.reduce((acc, curr) => acc + curr.qty, 0);
  
  const totalProductionValue = useMemo(() => {
    let total = 0;
    spks.forEach(spk => {
        if (spk.mutations) {
            spk.mutations.forEach(mut => {
                const mutDate = getDateString(mut.date);
                if (mutDate >= startDate && mutDate <= endDate) {
                    const item = spk.items.find(i => i.id === mut.itemId);
                    if (item) {
                        total += (mut.qty * item.cmtPrice);
                    }
                }
            });
        }
    });
    return total;
  }, [spks, startDate, endDate]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-card border border-white/10 p-3 rounded-xl shadow-xl">
          <p className="text-slate-400 text-xs mb-1">{payload[0].payload.fullDate}</p>
          <p className="text-primary font-bold text-lg">
            {payload[0].value} <span className="text-sm text-slate-500 font-normal">Pcs</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in pt-safe">
      <header className="px-1 sticky top-0 bg-dark-bg/90 backdrop-blur-md z-10 py-2">
        <h1 className="text-2xl font-bold text-white">Laporan & Analisa</h1>
        <p className="text-slate-400 text-sm">Monitoring kinerja & Ekspor data</p>
      </header>

      {/* Global Filter */}
      <div className="bg-dark-card border border-white/5 rounded-2xl p-3 mx-1 flex gap-3">
           <div className="flex-1">
             <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Dari</label>
             <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none"
             />
           </div>
           <div className="flex-1">
             <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Sampai</label>
             <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none"
             />
           </div>
      </div>

      {/* CHART SECTION */}
      <Card className="mx-1 border-primary/20 bg-gradient-to-b from-dark-card to-dark-bg overflow-hidden relative">
          <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                  <h3 className="text-white font-bold flex items-center gap-2">
                      <Activity size={18} className="text-primary" /> Output Produksi
                  </h3>
                  <p className="text-xs text-slate-400">Total item selesai per hari</p>
              </div>
              <div className="text-right">
                  <p className="text-2xl font-bold text-white">{totalProducedRange}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Total Pcs</p>
              </div>
          </div>

          <div className="h-[220px] w-full -ml-2">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                    <XAxis 
                        dataKey="dateStr" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={30}
                    />
                    <YAxis 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5' }} />
                    <Area 
                        type="monotone" 
                        dataKey="qty" 
                        stroke="#06b6d4" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorQty)" 
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
          </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 px-1">
        <div className="bg-dark-card p-4 rounded-2xl border-l-4 border-emerald-500 shadow-lg">
           <p className="text-slate-400 text-xs uppercase font-semibold">Nilai Hasil Produksi</p>
           <p className="text-white font-bold text-lg mt-1">{formatCurrency(totalProductionValue)}</p>
           <p className="text-[10px] text-slate-500 italic mt-1">*Total nilai CMT selesai</p>
        </div>
        <div className="bg-dark-card p-4 rounded-2xl border-l-4 border-blue-500 shadow-lg">
           <p className="text-slate-400 text-xs uppercase font-semibold">Produktivitas</p>
           <div className="flex items-baseline gap-1 mt-1">
             <p className="text-white font-bold text-lg">
                {chartData.length > 0 ? (totalProducedRange / chartData.length).toFixed(1) : 0}
             </p>
             <p className="text-slate-500 text-xs">Pcs / Hari</p>
           </div>
           <p className="text-[10px] text-slate-500 italic mt-1">*Rata-rata harian</p>
        </div>
      </div>

      {/* Export Section */}
      <div className="px-1">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Pusat Unduhan</h3>
        <Card className="bg-dark-card border-white/5">
            <div className="space-y-3">
            {/* Production Export */}
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={handleExportProduction}
                    className="flex flex-col items-center justify-center gap-1.5 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl p-3 transition-colors group active:scale-95"
                >
                    <FileText className="text-primary group-hover:scale-110 transition-transform" size={20} />
                    <span className="text-xs font-bold text-white">Produksi (CSV)</span>
                </button>
                <button 
                    onClick={handleExportProductionPDF}
                    className="flex flex-col items-center justify-center gap-1.5 bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 transition-colors group active:scale-95"
                >
                    <FileDown className="text-sky-400 group-hover:scale-110 transition-transform" size={20} />
                    <span className="text-xs font-bold text-white">Produksi (PDF)</span>
                </button>
            </div>

            {/* Finance Exports */}
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={handleExportFinanceCSV}
                    className="flex flex-col items-center justify-center gap-1.5 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 transition-colors group active:scale-95"
                >
                    <Wallet className="text-emerald-400 group-hover:scale-110 transition-transform" size={20} />
                    <span className="text-xs font-bold text-white">Keuangan (CSV)</span>
                </button>
                <button 
                    onClick={handleExportFinancePDF}
                    className="flex flex-col items-center justify-center gap-1.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl p-3 transition-colors group active:scale-95"
                >
                    <FileDown className="text-red-400 group-hover:scale-110 transition-transform" size={20} />
                    <span className="text-xs font-bold text-white">Keuangan (PDF)</span>
                </button>
            </div>
            </div>
        </Card>
      </div>
    </div>
  );
};
