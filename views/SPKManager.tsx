
import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Input, Select, Badge, ConfirmationModal, BottomSheet } from '../components/UI';
import { formatCurrency, formatDate, generateId, exportSPKToPDF, MutationSchema, SPKItemSchema } from '../utils';
import { Plus, FileText, ChevronRight, ChevronLeft, ChevronDown, X, Trash, Save, Box, History, Edit3, Lock, ArrowUpCircle, Calendar, StickyNote, Settings, ArrowLeft, Printer, ListFilter, CheckCircle, AlertTriangle, Search, Check, Filter } from 'lucide-react';
import { SPK, SPKDetail, ItemStatus, SPKMutation, Product } from '../types';

const getSPKStatusInfo = (spk: SPK): { label: string; color: 'green' | 'blue' | 'yellow' | 'gray'; weight: number } => {
  if (!spk.items || spk.items.length === 0) return { label: 'Draft', color: 'gray', weight: 0 };
  const allCompleted = spk.items.every(i => (i.completedQty || 0) >= i.qty);
  if (allCompleted) return { label: 'Selesai', color: 'green', weight: 3 };
  const inProgress = spk.items.some(i => (i.completedQty || 0) > 0);
  if (inProgress) return { label: 'Diproses', color: 'blue', weight: 2 };
  return { label: 'Menunggu', color: 'yellow', weight: 1 };
};

// ==========================================
// 1. SPK LIST VIEW
// ==========================================
export const SPKList: React.FC = () => {
  const { spks, navigate, isAuthenticated } = useAppStore();
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sorting Logic:
  // 1. Status: Menunggu (1) -> Diproses (2) -> Selesai (3)
  // 2. Tanggal: Terlama -> Terbaru (Ascending)
  const sortedSpks = [...spks].sort((a, b) => {
    const statusA = getSPKStatusInfo(a);
    const statusB = getSPKStatusInfo(b);

    // Sort by Status Weight Ascending (Menunggu first)
    if (statusA.weight !== statusB.weight) {
      return statusA.weight - statusB.weight;
    }

    // Sort by Date Ascending (Oldest first)
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Pagination Logic
  const totalPages = Math.ceil(sortedSpks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSpks = sortedSpks.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] pt-safe animate-fade-in bg-dark-bg -mx-4 px-4">
      {/* Fixed Header Section */}
      <div className="flex-none z-10 bg-dark-bg pb-2 space-y-4">
        <header className="flex justify-between items-center py-2">
            <div>
            <h1 className="text-2xl font-bold text-white">Daftar SPK</h1>
            </div>
            {isAuthenticated && (
            <button onClick={() => navigate('SPK_FORM')} className="bg-primary text-dark-bg rounded-full p-3 shadow-lg active:scale-90 transition-transform">
                <Plus size={24} />
            </button>
            )}
        </header>

        {/* Controls: Items Per Page & Stats */}
        <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2 bg-dark-card border border-white/5 rounded-xl px-3 py-1.5">
                <ListFilter size={14} className="text-slate-400" />
                <select 
                className="bg-transparent text-xs font-bold text-white outline-none"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                <option value={5} className="bg-dark-card">5 Baris</option>
                <option value={10} className="bg-dark-card">10 Baris</option>
                <option value={25} className="bg-dark-card">25 Baris</option>
                <option value={50} className="bg-dark-card">50 Baris</option>
                </select>
            </div>
            <span className="text-xs text-slate-500">
                Total: {spks.length} Data
            </span>
        </div>
      </div>

      {/* Scrollable List Section */}
      <div className="flex-1 overflow-y-auto pb-28 custom-scrollbar pt-2 space-y-3">
        {paginatedSpks.map(spk => {
          const status = getSPKStatusInfo(spk);
          const total = spk.items.reduce((acc, i) => acc + i.qty, 0);
          const completed = spk.items.reduce((acc, i) => acc + (i.completedQty || 0), 0);
          const percent = total > 0 ? (completed / total) * 100 : 0;

          return (
            <Card key={spk.id} onClick={() => navigate('SPK_DETAIL', { id: spk.id })} className="relative overflow-hidden active:bg-slate-800 transition-colors">
              <div className="flex justify-between items-start mb-3">
                 <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold border border-white/5 ${
                        status.weight === 3 ? 'bg-emerald-500/10 text-emerald-500' : 
                        status.weight === 2 ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-800 text-slate-400'
                    }`}>
                        <FileText size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base">{spk.spkNumber}</h3>
                        <p className="text-xs text-slate-500">{formatDate(spk.date)}</p>
                    </div>
                 </div>
                 <Badge color={status.color}>{status.label}</Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 mb-3 ml-1">
                 <span>{spk.items.length} Model</span>
                 <span>•</span>
                 <span>Total: {spk.totalQty} Pcs</span>
              </div>

              {/* Native-like Progress Bar */}
              <div className="relative h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                 <div className="absolute h-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${percent}%` }} />
              </div>
            </Card>
          );
        })}
        {paginatedSpks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
             <FileText size={64} className="mb-4 text-slate-600" />
             <p className="text-slate-400">Belum ada SPK</p>
          </div>
        )}

        {/* Pagination Controls inside Scroll */}
        {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4 px-2 border-t border-white/5 mb-4">
                <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl bg-dark-card border border-white/5 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 active:scale-95 transition-all"
                >
                    <ChevronLeft size={20} />
                </button>
                
                <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-white">Halaman {currentPage}</span>
                    <span className="text-[10px] text-slate-500">dari {totalPages}</span>
                </div>

                <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl bg-dark-card border border-white/5 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 active:scale-95 transition-all"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 2. SPK DETAIL VIEW
// ==========================================
export const SPKDetailView: React.FC = () => {
  const { spks, navigate, viewParams, deleteSPK, addMutation, updateMutation, deleteMutation, showNotification, isAuthenticated } = useAppStore();
  const spk = spks.find(s => s.id === viewParams?.id);

  // Mutation Logic States
  const [isMutationSheetOpen, setIsMutationSheetOpen] = useState(false);
  const [mutationMode, setMutationMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [selectedItemForMutation, setSelectedItemForMutation] = useState<SPKDetail | null>(null);
  const [editingMutationId, setEditingMutationId] = useState<string | null>(null);
  
  // State Input
  const [mutationQty, setMutationQty] = useState<number | string>('');
  const [mutationDate, setMutationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mutationNotes, setMutationNotes] = useState('');
  
  // Collapsible Items State
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // History Pagination & Filter States
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(5);
  const [historyStart, setHistoryStart] = useState('');
  const [historyEnd, setHistoryEnd] = useState('');

  // Confirmation States
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    type: 'DELETE_SPK' | 'DELETE_MUTATION';
    data?: any;
    title: string;
    message: string;
  }>({ isOpen: false, type: 'DELETE_SPK', title: '', message: '' });

  if (!spk) return <div className="p-10 text-center text-slate-500">Data tidak ditemukan</div>;

  const statusInfo = getSPKStatusInfo(spk);

  // Toggle Collapse Item
  const toggleItem = (itemId: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setExpandedItems(newSet);
  };

  // --- FILTERED & PAGINATED HISTORY ---
  const filteredHistory = useMemo(() => {
    return spk.mutations.filter(m => {
        const mDate = m.date.substring(0, 10);
        if (historyStart && mDate < historyStart) return false;
        if (historyEnd && mDate > historyEnd) return false;
        return true;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [spk.mutations, historyStart, historyEnd]);

  const historyTotalPages = Math.ceil(filteredHistory.length / historyLimit);
  const historyStartIndex = (historyPage - 1) * historyLimit;
  const paginatedHistory = filteredHistory.slice(historyStartIndex, historyStartIndex + historyLimit);

  // Reset page when filters change
  useEffect(() => {
      setHistoryPage(1);
  }, [historyStart, historyEnd, historyLimit]);

  const openMutationSheet = (item: SPKDetail, mutation?: SPKMutation) => {
    setSelectedItemForMutation(item);
    if (mutation) {
      setMutationMode('EDIT');
      setEditingMutationId(mutation.id);
      setMutationQty(mutation.qty);
      setMutationDate(mutation.date.split('T')[0]); // Load existing date
      setMutationNotes(mutation.notes);
    } else {
      setMutationMode('ADD');
      setEditingMutationId(null);
      setMutationQty('');
      setMutationDate(new Date().toISOString().split('T')[0]); // Default to today
      setMutationNotes('');
    }
    setIsMutationSheetOpen(true);
  };

  const handleSubmitMutation = () => {
    // 1. Zod Validation
    const validationResult = MutationSchema.safeParse({
        qty: mutationQty,
        date: mutationDate,
        notes: mutationNotes
    });

    if (!validationResult.success) {
        showNotification(validationResult.error.errors[0].message, 'error');
        return;
    }

    const validData = validationResult.data;
    const finalDate = new Date(validData.date).toISOString();

    if (mutationMode === 'ADD' && selectedItemForMutation) {
         const remaining = selectedItemForMutation.qty - (selectedItemForMutation.completedQty || 0);
         if (validData.qty > remaining) {
             showNotification(`Maksimal input: ${remaining} pcs`, 'warning');
             return;
         }
         addMutation(spk.id, {
            itemId: selectedItemForMutation.id,
            productName: selectedItemForMutation.productName,
            date: finalDate,
            qty: validData.qty,
            notes: validData.notes || ''
         });
    } else if (mutationMode === 'EDIT' && editingMutationId && selectedItemForMutation) {
         updateMutation(spk.id, {
            id: editingMutationId,
            spkId: spk.id,
            itemId: selectedItemForMutation.id,
            productName: selectedItemForMutation.productName,
            date: finalDate,
            qty: validData.qty,
            notes: validData.notes || ''
         });
    }
    setIsMutationSheetOpen(false);
  };

  const handleDeleteSPK = () => {
    if (spk.mutations.length > 0) {
        showNotification('Hapus riwayat produksi dulu.', 'error');
        return;
    }
    setConfirmState({
        isOpen: true, 
        type: 'DELETE_SPK', 
        title: 'Hapus SPK?', 
        message: 'Data akan hilang permanen.'
    });
  };

  const executeDelete = () => {
      if (confirmState.type === 'DELETE_SPK') {
          deleteSPK(spk.id);
          navigate('SPK_LIST');
      } else if (confirmState.type === 'DELETE_MUTATION' && confirmState.data) {
          deleteMutation(spk.id, confirmState.data.id);
      }
      setConfirmState(prev => ({...prev, isOpen: false}));
  };

  const handlePrint = () => {
    exportSPKToPDF(spk);
    showNotification('Dokumen SPK diunduh', 'success');
  };

  return (
    <div className="pb-24 pt-safe animate-slide-in-right">
       {/* Header */}
       <div className="flex items-center justify-between py-2 sticky top-0 bg-dark-bg/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('SPK_LIST')} className="p-2 -ml-2 text-slate-300 hover:text-white">
                <ArrowLeft size={24} />
            </button>
            <h2 className="font-bold text-white text-lg">Detail SPK</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
                onClick={handlePrint}
                className="p-2 bg-slate-800 rounded-full text-slate-300 hover:text-white border border-white/5 active:scale-95 transition-all"
                title="Cetak PDF"
            >
                <Printer size={20} />
            </button>
            {isAuthenticated && (
              <button onClick={() => navigate('SPK_FORM', {id: spk.id})} className="text-primary font-semibold text-sm px-2">
                  Edit
              </button>
            )}
          </div>
       </div>

       <div className="mt-4 space-y-6">
          {/* Main Card */}
          <div className="bg-dark-card border border-white/5 rounded-3xl p-5 shadow-lg relative overflow-hidden">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Nomor SPK</p>
                   <h1 className="text-3xl font-bold text-white tracking-tight">{spk.spkNumber}</h1>
                </div>
                <Badge color={statusInfo.color}>{statusInfo.label}</Badge>
             </div>
             
             <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                    <p className="text-slate-500 text-xs mb-1">Total CMT</p>
                    <p className="text-white font-mono font-bold text-lg">{formatCurrency(spk.totalAmount)}</p>
                </div>
                <div>
                    <p className="text-slate-500 text-xs mb-1">Total Qty</p>
                    <p className="text-white font-bold text-lg">{spk.totalQty} <span className="text-sm font-normal text-slate-500">Pcs</span></p>
                </div>
             </div>
             {spk.notes && (
                 <div className="mt-4 bg-slate-800/50 p-3 rounded-xl">
                    <p className="text-xs text-slate-400 italic">"{spk.notes}"</p>
                 </div>
             )}
          </div>

          {/* Action Button */}
          {isAuthenticated && (
            <div className="grid grid-cols-1">
               <button 
                  onClick={handleDeleteSPK}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/20 text-red-400 bg-red-500/5 text-sm font-bold active:scale-95 transition-transform"
               >
                  <Trash size={16} /> Hapus SPK
               </button>
            </div>
          )}

          {/* Items Section (PROSES PRODUKSI) */}
          <div>
             <div className="flex items-center justify-between mb-3 px-1">
                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Proses Produksi</h3>
                 <span className="text-[10px] text-slate-500">{spk.items.length} Item</span>
             </div>
             
             <div className="space-y-4">
                {spk.items.map(item => {
                    const completed = item.completedQty || 0;
                    const remaining = item.qty - completed;
                    const percentage = Math.min((completed / item.qty) * 100, 100);
                    const isDone = completed >= item.qty;
                    const isExpanded = expandedItems.has(item.id);

                    return (
                        <div key={item.id} className="bg-dark-card border border-white/5 rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
                            {/* Header (Clickable for Collapse/Expand) */}
                            <div 
                                onClick={() => toggleItem(item.id)}
                                className="p-4 flex justify-between items-center cursor-pointer active:bg-white/5"
                            >
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-white text-base leading-tight pr-2">{item.productName}</h4>
                                        {/* Simple Status if Collapsed */}
                                        {!isExpanded && (
                                            <div className="flex items-center gap-2 shrink-0">
                                                {isDone ? (
                                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                                                        Selesai
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-bold">
                                                        {completed}/{item.qty}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{item.qty} Pcs • {formatCurrency(item.cmtPrice)}</p>
                                </div>
                                <div className="pl-3">
                                    <ChevronDown size={20} className={`text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                            </div>

                            {/* Details (Collapsible) */}
                            {isExpanded && (
                                <div className="px-4 pb-4 animate-fade-in pt-0">
                                    <div className="h-px bg-white/5 w-full mb-4"></div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-800/30 p-2 rounded-xl">
                                        <div className="text-center">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">Target</p>
                                            <p className="font-bold text-white text-base">{item.qty}</p>
                                        </div>
                                        <div className="text-center border-l border-white/5 relative">
                                            <p className="text-[10px] text-emerald-500/80 uppercase font-bold">Selesai</p>
                                            <p className="font-bold text-emerald-400 text-base">{completed}</p>
                                        </div>
                                        <div className="text-center border-l border-white/5">
                                            <p className="text-[10px] text-amber-500/80 uppercase font-bold">Sisa</p>
                                            <p className="font-bold text-amber-400 text-base">{remaining > 0 ? remaining : 0}</p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-4">
                                        <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-500 ease-out ${isDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary to-accent'}`} 
                                                style={{ width: `${percentage}%` }} 
                                            />
                                        </div>
                                        <div className="flex justify-end mt-1">
                                            <span className="text-[10px] text-slate-500 font-medium">{percentage.toFixed(0)}% Selesai</span>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    {isAuthenticated && !isDone && (
                                        <button 
                                            onClick={() => openMutationSheet(item)}
                                            className="w-full py-3.5 bg-gradient-to-r from-primary/10 to-primary/20 hover:from-primary/20 hover:to-primary/30 border border-primary/30 rounded-xl text-primary font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                        >
                                            <Box size={18} /> Update Hasil Produksi
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
             </div>
          </div>

          {/* History Section */}
          {spk.mutations.length > 0 && (
              <div>
                  <div className="flex justify-between items-center mb-3 mt-4 px-1">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Riwayat Input</h3>
                      <span className="text-[10px] text-slate-500">Total: {spk.mutations.length}</span>
                  </div>

                  {/* Filter & Pagination Controls */}
                  <div className="bg-dark-card border border-white/5 rounded-2xl p-3 mb-3">
                      {/* Date Filter */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                          <div>
                              <label className="text-[10px] text-slate-500 font-bold mb-1 block">Dari</label>
                              <input 
                                  type="date" 
                                  className="w-full bg-dark-bg border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-primary"
                                  value={historyStart}
                                  onChange={e => setHistoryStart(e.target.value)}
                              />
                          </div>
                          <div>
                              <label className="text-[10px] text-slate-500 font-bold mb-1 block">Sampai</label>
                              <input 
                                  type="date" 
                                  className="w-full bg-dark-bg border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-primary"
                                  value={historyEnd}
                                  onChange={e => setHistoryEnd(e.target.value)}
                              />
                          </div>
                      </div>

                      {/* Items Per Page */}
                      <div className="flex justify-between items-center">
                           <div className="flex items-center gap-2">
                               <ListFilter size={14} className="text-slate-400" />
                               <select 
                                   className="bg-transparent text-xs font-bold text-white outline-none"
                                   value={historyLimit}
                                   onChange={(e) => setHistoryLimit(Number(e.target.value))}
                               >
                                   <option value={5} className="bg-dark-card">5 Baris</option>
                                   <option value={10} className="bg-dark-card">10 Baris</option>
                                   <option value={20} className="bg-dark-card">20 Baris</option>
                               </select>
                           </div>
                           <button 
                               onClick={() => { setHistoryStart(''); setHistoryEnd(''); }}
                               className="text-[10px] text-primary hover:text-primary-glow font-bold"
                           >
                               Reset Filter
                           </button>
                      </div>
                  </div>
                  
                  {/* List History */}
                  <div className="bg-dark-card rounded-2xl border border-white/5 divide-y divide-white/5">
                      {paginatedHistory.map(mut => (
                          <div key={mut.id} className="p-4 flex justify-between items-center">
                              <div>
                                  <p className="font-bold text-white text-sm">{mut.productName}</p>
                                  <p className="text-xs text-slate-500">{formatDate(mut.date)}</p>
                                  {mut.notes && <p className="text-xs text-slate-500 italic mt-0.5">"{mut.notes}"</p>}
                              </div>
                              <div className="flex items-center gap-3">
                                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">+{mut.qty}</span>
                                  {isAuthenticated && (
                                    <button onClick={() => setConfirmState({isOpen: true, type: 'DELETE_MUTATION', data: mut, title:'Hapus?', message:'Stok akan dikembalikan.'})} className="text-slate-600 hover:text-red-400 p-1.5 bg-slate-800 rounded-lg">
                                        <X size={16} />
                                    </button>
                                  )}
                              </div>
                          </div>
                      ))}
                      {paginatedHistory.length === 0 && (
                          <div className="p-8 text-center text-slate-500 text-xs">
                              Tidak ada data yang cocok dengan filter.
                          </div>
                      )}
                  </div>

                  {/* Pagination Controls */}
                  {historyTotalPages > 1 && (
                    <div className="flex justify-between items-center pt-3 px-2">
                        <button 
                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                            disabled={historyPage === 1}
                            className="p-1.5 rounded-lg bg-dark-card border border-white/5 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        
                        <span className="text-xs text-slate-400">
                            Hal {historyPage} / {historyTotalPages}
                        </span>

                        <button 
                            onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                            disabled={historyPage === historyTotalPages}
                            className="p-1.5 rounded-lg bg-dark-card border border-white/5 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                  )}
              </div>
          )}
       </div>

       <BottomSheet
          isOpen={isMutationSheetOpen}
          onClose={() => setIsMutationSheetOpen(false)}
          title={mutationMode === 'ADD' ? 'Input Hasil Produksi' : 'Edit Data'}
          footer={<Button fullWidth onClick={handleSubmitMutation} size="lg">Simpan Progres</Button>}
       >
           <div className="space-y-4">
              <div className="bg-slate-800/50 border border-white/5 p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-400 uppercase mb-1 font-bold">Item Produksi</p>
                  <p className="text-lg font-bold text-white">{selectedItemForMutation?.productName}</p>
                  
                  <div className="flex justify-center gap-4 mt-3">
                     <div className="text-center">
                        <p className="text-[10px] text-slate-500">Target</p>
                        <p className="font-bold text-white">{selectedItemForMutation?.qty}</p>
                     </div>
                     <div className="text-center">
                        <p className="text-[10px] text-slate-500">Sisa</p>
                        <p className="font-bold text-primary">{selectedItemForMutation ? selectedItemForMutation.qty - (selectedItemForMutation.completedQty || 0) : 0}</p>
                     </div>
                  </div>
              </div>
              
              <Input
                 label="Tanggal Produksi"
                 type="date"
                 value={mutationDate}
                 onChange={e => setMutationDate(e.target.value)}
              />
              <Input 
                 label="Jumlah Selesai (Pcs)"
                 type="number"
                 value={mutationQty}
                 onChange={e => setMutationQty(e.target.value)}
                 onWheel={(e) => (e.target as HTMLInputElement).blur()}
                 autoFocus
                 placeholder="Masukkan jumlah..."
              />
              <Input 
                 label="Catatan (Opsional)"
                 value={mutationNotes}
                 onChange={e => setMutationNotes(e.target.value)}
                 placeholder="Produksi Stok, Pesanan Owner..."
              />
           </div>
       </BottomSheet>

       <ConfirmationModal 
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          variant="danger"
          confirmLabel="Hapus"
          onConfirm={executeDelete}
          onCancel={() => setConfirmState(prev => ({...prev, isOpen: false}))}
       />
    </div>
  );
};

// ==========================================
// 3. SPK FORM VIEW
// ==========================================
export const SPKForm: React.FC = () => {
    const { products, addSPK, updateSPK, spks, navigate, viewParams, showNotification, isAuthenticated } = useAppStore();
    const isEditMode = !!viewParams?.id;
    const existingSPK = isEditMode ? spks.find(s => s.id === viewParams.id) : null;
    
    // State
    const [header, setHeader] = useState({ spkNumber: '', date: new Date().toISOString().split('T')[0], notes: '' });
    const [items, setItems] = useState<SPKDetail[]>([]);
    const [isItemSheetOpen, setIsItemSheetOpen] = useState(false);
    
    // Item Form State
    const [selectedProdId, setSelectedProdId] = useState('');
    const [itemQty, setItemQty] = useState<string>('');
    const [itemPrice, setItemPrice] = useState<string>('');
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

    // Product Selection State (Searchable)
    const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');

    useEffect(() => {
        if (!isAuthenticated) {
            showNotification("Akses ditolak. Silahkan login.", "error");
            navigate('SPK_LIST');
            return;
        }

        if (existingSPK) {
            setHeader({ spkNumber: existingSPK.spkNumber, date: existingSPK.date.split('T')[0], notes: existingSPK.notes });
            setItems(existingSPK.items);
        } else if (!isEditMode) {
            const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            setHeader(prev => ({ ...prev, spkNumber: `SPK-${new Date().getFullYear()}-${rand}` }));
        }
    }, [existingSPK, isEditMode, isAuthenticated]);

    const handleOpenItemSheet = (index?: number) => {
        if (index !== undefined) {
            const item = items[index];
            setEditingItemIndex(index);
            setSelectedProdId(item.productId);
            setItemQty(item.qty.toString());
            setItemPrice(item.cmtPrice.toString());
        } else {
            setEditingItemIndex(null);
            setSelectedProdId('');
            setItemQty('');
            setItemPrice('');
        }
        setIsItemSheetOpen(true);
    };

    const handleSelectProduct = (product: Product) => {
        setSelectedProdId(product.id);
        setItemPrice(product.cmtPrice.toString());
        setIsProductSelectorOpen(false);
        setProductSearchTerm(''); // Reset search
    };

    const handleSaveItem = () => {
        // Zod Validation for Item
        const validationResult = SPKItemSchema.safeParse({
            productId: selectedProdId,
            qty: itemQty,
            cmtPrice: itemPrice
        });

        if (!validationResult.success) {
            showNotification(validationResult.error.errors[0].message, 'error');
            return;
        }

        const validData = validationResult.data;
        const prod = products.find(p => p.id === validData.productId);
        if (!prod) return;

        // VALIDASI: Cek completed quantity jika sedang edit
        if (editingItemIndex !== null) {
            const originalItem = items[editingItemIndex];
            const completed = originalItem.completedQty || 0;

            if (validData.qty < completed) {
                showNotification(`Tidak bisa disimpan! Qty baru (${validData.qty}) lebih kecil dari yang sudah diproduksi (${completed}).`, 'error');
                return;
            }
        }

        const newItem: SPKDetail = {
            id: editingItemIndex !== null ? items[editingItemIndex].id : generateId(),
            spkId: existingSPK?.id || '',
            productId: validData.productId,
            productName: prod.name,
            cmtPrice: validData.cmtPrice,
            qty: validData.qty,
            completedQty: editingItemIndex !== null ? items[editingItemIndex].completedQty : 0,
            total: validData.cmtPrice * validData.qty,
            status: ItemStatus.PENDING
        };

        if (editingItemIndex !== null) {
            const newItems = [...items];
            newItems[editingItemIndex] = newItem;
            setItems(newItems);
        } else {
            setItems([...items, newItem]);
        }
        setIsItemSheetOpen(false);
    };

    const removeItem = (index: number) => {
        const item = items[index];
        // VALIDASI: Cek jika item sudah memiliki progress produksi
        if ((item.completedQty || 0) > 0) {
            showNotification(`Gagal Hapus: Item "${item.productName}" sudah memiliki ${item.completedQty} pcs hasil produksi.`, 'error');
            return;
        }

        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleSaveSPK = () => {
        if (items.length === 0) {
            showNotification('Minimal 1 item', 'error');
            return;
        }
        const spkData: SPK = {
            id: isEditMode ? existingSPK!.id : generateId(), // ID will be handled by DB mostly, but for state we need it
            spkNumber: header.spkNumber,
            date: new Date(header.date).toISOString(),
            notes: header.notes,
            items: items,
            mutations: existingSPK?.mutations || [],
            totalQty: items.reduce((a, b) => a + b.qty, 0),
            totalAmount: items.reduce((a, b) => a + b.total, 0)
        };

        if (isEditMode) updateSPK(spkData);
        else addSPK(spkData);
        navigate(isEditMode ? 'SPK_DETAIL' : 'SPK_LIST', { id: spkData.id });
    };

    if (!isAuthenticated) return null;

    const isEditingLocked = editingItemIndex !== null && (items[editingItemIndex].completedQty || 0) > 0;
    const selectedProdName = products.find(p => p.id === selectedProdId)?.name || '';

    // Filter Products for Search
    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
        p.category.toLowerCase().includes(productSearchTerm.toLowerCase())
    );

    return (
        <div className="pb-40 pt-safe animate-slide-in-right">
             <div className="flex items-center justify-between py-2 sticky top-0 bg-dark-bg/90 backdrop-blur-md z-20 px-1">
                <button onClick={() => navigate(isEditMode ? 'SPK_DETAIL' : 'SPK_LIST', {id: existingSPK?.id})} className="p-2 text-slate-300">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="font-bold text-white text-lg">{isEditMode ? 'Edit SPK' : 'Buat SPK'}</h2>
                <div className="w-8"></div>
            </div>

            <div className="space-y-4 mt-2">
                <Card>
                    <Input label="Nomor SPK" value={header.spkNumber} disabled className="opacity-50" />
                    <Input label="Tanggal" type="date" value={header.date} onChange={e => setHeader({...header, date: e.target.value})} />
                    <Input label="Catatan" value={header.notes} onChange={e => setHeader({...header, notes: e.target.value})} />
                </Card>

                <div className="flex justify-between items-center px-1 mt-6 mb-2">
                    <h3 className="font-bold text-slate-400 uppercase text-sm">Daftar Item</h3>
                    <button onClick={() => handleOpenItemSheet()} className="text-primary text-sm font-bold flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg">
                        <Plus size={16} /> Tambah
                    </button>
                </div>

                <div className="space-y-3">
                    {items.map((item, idx) => {
                        const hasProgress = (item.completedQty || 0) > 0;
                        return (
                            <div key={idx} className={`bg-dark-card border rounded-2xl p-4 flex justify-between items-center ${hasProgress ? 'border-amber-500/30' : 'border-white/5'}`}>
                                <div>
                                    <p className="font-bold text-white">{item.productName}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{item.qty} pcs x {formatCurrency(item.cmtPrice)}</p>
                                    {hasProgress && <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 mt-1"><AlertTriangle size={10} /> Sudah Produksi: {item.completedQty}</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="font-mono font-bold text-primary-glow">{formatCurrency(item.total)}</p>
                                    <button onClick={() => handleOpenItemSheet(idx)} className="text-slate-500 p-1"><Edit3 size={18}/></button>
                                    <button 
                                        onClick={() => removeItem(idx)} 
                                        className={`p-1 hover:text-red-400 ${hasProgress ? 'text-slate-600 opacity-50 cursor-not-allowed' : 'text-slate-500'}`}
                                        title={hasProgress ? "Item sudah ada produksi, tidak bisa dihapus" : "Hapus Item"}
                                    >
                                        <Trash size={18}/>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {items.length === 0 && <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-2xl text-slate-500">Kosong</div>}
                </div>
            </div>

            {/* Bottom Sticky Action */}
            <div className="fixed bottom-0 inset-x-0 p-4 bg-dark-bg/80 backdrop-blur-xl border-t border-white/5 pb-safe z-30">
                <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-slate-400 text-sm">Total Estimasi</span>
                    <span className="text-xl font-bold text-white">{formatCurrency(items.reduce((a, b) => a + b.total, 0))}</span>
                </div>
                <Button fullWidth size="lg" onClick={handleSaveSPK}>
                    <Save size={18} className="mr-2" /> Simpan SPK
                </Button>
            </div>

            {/* Item Input Sheet */}
            <BottomSheet
                isOpen={isItemSheetOpen}
                onClose={() => setIsItemSheetOpen(false)}
                title={editingItemIndex !== null ? 'Edit Item' : 'Tambah Item'}
                footer={<Button fullWidth onClick={handleSaveItem} size="lg">{editingItemIndex !== null ? 'Update' : 'Tambah'}</Button>}
            >
                <div className="space-y-4">
                    {isEditingLocked && (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start gap-2 text-xs text-amber-400">
                            <AlertTriangle size={16} className="shrink-0" />
                            <p>Produk ini sudah memiliki <b>{items[editingItemIndex!].completedQty} pcs</b> selesai. Anda tidak bisa mengganti produk atau mengurangi jumlah target di bawah jumlah selesai.</p>
                        </div>
                    )}
                    
                    {/* TRIGGER UNTUK MEMBUKA SHEET PILIH PRODUK */}
                    <div onClick={() => !isEditingLocked && setIsProductSelectorOpen(true)} className="relative">
                        <Input 
                            label="Produk"
                            value={selectedProdName} 
                            placeholder="Pilih Produk..." 
                            readOnly 
                            startIcon={<Search size={18}/>}
                            className={isEditingLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                        />
                        {!isEditingLocked && (
                            <div className="absolute right-4 top-[42px] text-slate-500 pointer-events-none">
                                <ChevronRight size={18} />
                            </div>
                        )}
                        {isEditingLocked && <Lock size={16} className="absolute right-4 top-[42px] text-slate-500" />}
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Input label="Qty" type="number" value={itemQty} onChange={e => setItemQty(e.target.value)} placeholder="0" />
                        </div>
                        <div className="flex-1">
                            <Input label="Harga CMT" type="number" value={itemPrice} onChange={e => setItemPrice(e.target.value)} placeholder="0" />
                        </div>
                    </div>
                </div>
            </BottomSheet>

            {/* PRODUCT SELECTOR SHEET (Nested, z-index higher than ItemSheet) */}
            <BottomSheet
                isOpen={isProductSelectorOpen}
                onClose={() => setIsProductSelectorOpen(false)}
                title="Pilih Produk"
                zIndex={105} // Ensure it appears above the item sheet
            >
                <div className="space-y-4">
                    <Input 
                        placeholder="Cari nama atau kategori..." 
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        startIcon={<Search size={18}/>}
                        autoFocus
                    />
                    
                    <div className="space-y-2 mt-2">
                        {filteredProducts.map(p => {
                             const isSelected = p.id === selectedProdId;
                             return (
                                <div 
                                    key={p.id}
                                    onClick={() => handleSelectProduct(p)}
                                    className={`p-4 rounded-xl border flex justify-between items-center cursor-pointer transition-all active:scale-[0.98] ${isSelected ? 'bg-primary/10 border-primary' : 'bg-dark-card border-white/5 hover:bg-slate-800'}`}
                                >
                                    <div className="flex-1">
                                        <p className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-white'}`}>{p.name}</p>
                                    </div>
                                    {isSelected && <Check size={18} className="text-primary shrink-0" />}
                                </div>
                             )
                        })}
                        {filteredProducts.length === 0 && (
                            <div className="text-center py-10 text-slate-500">Produk tidak ditemukan</div>
                        )}
                    </div>
                </div>
            </BottomSheet>
        </div>
    );
};
