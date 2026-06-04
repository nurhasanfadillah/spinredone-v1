
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Input, ConfirmationModal, BottomSheet, SwipeableCard } from '../components/UI';
import { formatCurrency, formatDate, generateId, TransactionSchema } from '../utils';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Plus, X, Search, Settings, Check, Edit2, Lock, ListFilter, ChevronLeft, ChevronRight, Calendar, Tag, FileText, ExternalLink } from 'lucide-react';
import { Transaction, TransactionType } from '../types';

export const FinanceManager: React.FC = () => {
  const { 
    transactions, addTransaction, updateTransaction, deleteTransaction, showNotification,
    financeCategories, addFinanceCategory, updateFinanceCategory, deleteFinanceCategory,
    isAuthenticated, spks, navigate
  } = useAppStore();

  // Transaction Detail State
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Category Manager State
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catFormMode, setCatFormMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [editingCatOriginal, setEditingCatOriginal] = useState('');

  // Form State
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txType, setTxType] = useState<TransactionType>('OUT');
  const [amount, setAmount] = useState<number | string>('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Confirmation Delete
  const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});

  const totalIn = transactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIn - totalOut;

  const filteredTransactions = transactions
    .filter(t => filterType === 'ALL' || t.type === filterType)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Pagination Logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filter or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenSheet = (type: TransactionType, transactionToEdit?: Transaction) => {
    if (!isAuthenticated) {
        showNotification('Login untuk kelola keuangan', 'warning');
        return;
    }

    if (transactionToEdit) {
        setEditingTxId(transactionToEdit.id);
        setTxType(transactionToEdit.type);
        setAmount(transactionToEdit.amount);
        setDescription(transactionToEdit.description);
        setCategory(transactionToEdit.category);
        setDate(transactionToEdit.date.split('T')[0]);
    } else {
        setEditingTxId(null);
        setTxType(type);
        setAmount('');
        setDescription('');
        setCategory(financeCategories[0] || '');
        setDate(new Date().toISOString().split('T')[0]);
    }
    setIsSheetOpen(true);
  };

  const handleSubmit = () => {
    // 1. Zod Validation
    const validationResult = TransactionSchema.safeParse({
        amount: Number(amount),
        category,
        description,
        date,
        type: txType
    });

    if (!validationResult.success) {
        const errorMsg = validationResult.error.errors[0].message;
        showNotification(errorMsg, 'error');
        return;
    }

    const validData = validationResult.data;

    if (editingTxId) {
        updateTransaction({
            id: editingTxId,
            date: new Date(validData.date).toISOString(),
            type: validData.type,
            category: validData.category,
            amount: validData.amount,
            description: validData.description,
            // Preserve refId if exists
        });
        showNotification('Transaksi diperbarui', 'success');
    } else {
        addTransaction({
            id: generateId(),
            date: new Date(validData.date).toISOString(),
            type: validData.type,
            category: validData.category,
            amount: validData.amount,
            description: validData.description
        });
        showNotification('Transaksi disimpan', 'success');
    }
    setIsSheetOpen(false);
  };

  const handleDelete = () => {
    if (deleteConfirm.id) {
        const tx = transactions.find(t => t.id === deleteConfirm.id);
        if (tx && tx.refId) {
            showNotification('Transaksi otomatis tidak bisa dihapus.', 'warning');
        } else {
            deleteTransaction(deleteConfirm.id);
            showNotification('Transaksi dihapus', 'info');
        }
        setDeleteConfirm({isOpen: false, id: null});
    }
  };

  // --- Category Logic ---

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    if (catFormMode === 'ADD') {
        addFinanceCategory(newCatName.trim());
    } else {
        updateFinanceCategory(editingCatOriginal, newCatName.trim());
        setCatFormMode('ADD');
        if (category === editingCatOriginal) {
            setCategory(newCatName.trim()); // Update selected category if it was the one edited
        }
    }
    setNewCatName('');
    setEditingCatOriginal('');
  };

  const startEditCategory = (cat: string) => {
    setCatFormMode('EDIT');
    setEditingCatOriginal(cat);
    setNewCatName(cat);
  };

  const cancelEditCategory = () => {
    setCatFormMode('ADD');
    setNewCatName('');
    setEditingCatOriginal('');
  };

  const handleDeleteCategory = (cat: string) => {
    const isUsed = transactions.some(t => t.category === cat);
    if (isUsed) {
        showNotification(`Kategori "${cat}" sedang digunakan dalam transaksi.`, 'error');
        return;
    }
    deleteFinanceCategory(cat);
    if (catFormMode === 'EDIT' && editingCatOriginal === cat) {
        cancelEditCategory();
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] pt-safe animate-fade-in bg-dark-bg -mx-4 px-4">
      {/* Fixed Header Section */}
      <div className="flex-none z-10 bg-dark-bg pb-2 space-y-4">
        <header className="flex justify-between items-center py-2">
            <h1 className="text-2xl font-bold text-white">Keuangan</h1>
        </header>

        {/* Main Balance Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Saldo Kas</p>
                <h2 className={`text-4xl font-bold ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {formatCurrency(balance)}
                </h2>
            </div>
        </div>

        {/* Actions - Only visible if authenticated */}
        {isAuthenticated && (
            <div className="grid grid-cols-2 gap-4 px-1">
                <button 
                    onClick={() => handleOpenSheet('IN')} 
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-dark-card border border-white/5 transition-all shadow-sm active:scale-95"
                >
                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                        <Plus size={24} />
                    </div>
                    <span className="font-bold text-white text-sm">Masuk</span>
                </button>
                <button 
                    onClick={() => handleOpenSheet('OUT')} 
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-dark-card border border-white/5 transition-all shadow-sm active:scale-95"
                >
                    <div className="h-10 w-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-2">
                        <Plus size={24} />
                    </div>
                    <span className="font-bold text-white text-sm">Keluar</span>
                </button>
            </div>
        )}

        {/* Transaction History Header & Filter */}
        <div className="flex justify-between items-center px-1">
            <h3 className="font-bold text-white text-lg">Riwayat</h3>
            <div className="flex bg-dark-card rounded-xl p-1 border border-white/5">
                {(['ALL', 'IN', 'OUT'] as const).map(type => (
                    <button 
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filterType === type ? 'bg-slate-700 text-white shadow' : 'text-slate-500'}`}
                    >
                        {type === 'ALL' ? 'Semua' : type === 'IN' ? 'Masuk' : 'Keluar'}
                    </button>
                ))}
            </div>
        </div>
        
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
                Total: {filteredTransactions.length} Data
            </span>
        </div>
      </div>

      {/* Scrollable Transaction List */}
      <div className="flex-1 overflow-y-auto pb-28 custom-scrollbar pt-2 space-y-3">
            {paginatedTransactions.map(t => (
                <SwipeableCard
                    key={t.id}
                    onDelete={isAuthenticated && !t.refId ? () => setDeleteConfirm({isOpen: true, id: t.id}) : undefined}
                    onEdit={isAuthenticated && !t.refId ? () => handleOpenSheet(t.type, t) : undefined}
                    isLocked={!isAuthenticated || !!t.refId}
                    onClick={() => setSelectedTransaction(t)}
                >
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                t.type === 'IN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                                {t.type === 'IN' ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm line-clamp-1">{t.description}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{formatDate(t.date)} • {t.category}</p>
                            </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                            {t.refId && <Lock size={12} className="text-slate-600" />}
                            <p className={`font-mono font-bold ${t.type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {t.type === 'IN' ? '+' : '-'}{formatCurrency(t.amount)}
                            </p>
                        </div>
                    </div>
                </SwipeableCard>
            ))}
            {paginatedTransactions.length === 0 && <p className="text-center text-slate-500 py-10">Kosong</p>}

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

      {/* Input Bottom Sheet */}
      <BottomSheet
         isOpen={isSheetOpen}
         onClose={() => setIsSheetOpen(false)}
         title={editingTxId ? 'Edit Transaksi' : (txType === 'IN' ? 'Tambah Pemasukan' : 'Catat Pengeluaran')}
         footer={<Button fullWidth onClick={handleSubmit} size="lg" variant={txType === 'IN' ? 'primary' : 'danger'}>{editingTxId ? 'Simpan Perubahan' : 'Simpan'}</Button>}
      >
          <div className="space-y-4">
              <Input label="Jumlah (Rp)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus placeholder="0" />
              
              <div className="relative">
                 <div className="flex justify-between items-end mb-1 ml-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase">Kategori</label>
                    <button onClick={() => setIsCatManagerOpen(true)} className="text-primary text-xs font-bold flex items-center gap-1">
                        <Settings size={12} /> Kelola
                    </button>
                 </div>
                 <button 
                    onClick={() => setIsCatManagerOpen(true)}
                    className="w-full bg-dark-bg/50 border border-white/10 rounded-xl px-4 py-3.5 text-left text-white flex justify-between items-center"
                 >
                    {category || 'Pilih...'} <Settings size={16} className="text-slate-500" />
                 </button>
              </div>

              <Input label="Keterangan" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Catatan transaksi..." />
              <Input label="Tanggal" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
      </BottomSheet>

      {/* Category Manager Sheet */}
      <BottomSheet isOpen={isCatManagerOpen} onClose={() => { setIsCatManagerOpen(false); cancelEditCategory(); }} title="Pilih Kategori">
         <div className="space-y-4">
            <form onSubmit={handleCategorySubmit} className="flex gap-2 items-end">
               <div className="flex-1">
                  {catFormMode === 'EDIT' && <span className="text-[10px] text-primary font-bold uppercase mb-1 block">Edit Mode</span>}
                  <input 
                      className={`w-full bg-dark-bg border ${catFormMode === 'EDIT' ? 'border-primary' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all`}
                      placeholder={catFormMode === 'EDIT' ? "Ubah nama..." : "Kategori baru..."}
                      value={newCatName} 
                      onChange={e => setNewCatName(e.target.value)}
                      autoFocus={catFormMode === 'EDIT'}
                  />
               </div>
               <div className="flex gap-1">
                   {catFormMode === 'EDIT' && (
                        <button 
                           type="button"
                           onClick={cancelEditCategory}
                           className="bg-slate-700 text-slate-300 rounded-xl px-3 font-bold"
                        >
                            <X size={20} />
                        </button>
                    )}
                   <button 
                        type="submit" 
                        disabled={!newCatName.trim()}
                        className="bg-primary text-dark-bg rounded-xl px-4 font-bold disabled:opacity-50 h-[50px] flex items-center justify-center"
                    >
                        {catFormMode === 'EDIT' ? <Check size={24}/> : <Plus size={24}/>}
                    </button>
               </div>
            </form>

            <div className="space-y-2 mt-4 max-h-[40vh] overflow-y-auto">
                {financeCategories.map(cat => {
                    const isUsed = transactions.some(t => t.category === cat);
                    return (
                        <SwipeableCard
                            key={cat} 
                            onEdit={isAuthenticated ? () => startEditCategory(cat) : undefined}
                            onDelete={isAuthenticated && !isUsed ? () => handleDeleteCategory(cat) : undefined}
                            isLocked={!isAuthenticated}
                            onClick={() => { if(catFormMode !== 'EDIT') { setCategory(cat); setIsCatManagerOpen(false); } }} 
                        >
                            <div className="flex justify-between items-center">
                                <span className="text-white font-medium">{cat}</span>
                                {category === cat && catFormMode !== 'EDIT' && <Check size={18} className="text-primary"/>}
                                {isUsed && <Lock size={14} className="text-slate-600" />}
                            </div>
                        </SwipeableCard>
                    );
                })}
            </div>
         </div>
      </BottomSheet>

      {/* Transaction Detail Bottom Sheet */}
      <BottomSheet
        isOpen={selectedTransaction !== null}
        onClose={() => setSelectedTransaction(null)}
        title="Detail Transaksi"
      >
        {selectedTransaction && (() => {
          // Dynamic production relation search
          let linkedSPK: any = null;
          let linkedMutation: any = null;
          if (selectedTransaction.refId) {
            for (const spk of spks) {
              const mut = spk.mutations?.find(m => m.id === selectedTransaction.refId);
              if (mut) {
                linkedSPK = spk;
                linkedMutation = mut;
                break;
              }
            }
          }

          return (
            <div className="space-y-6">
              {/* Type Badge & Amount Centered */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-800/40 rounded-3xl border border-white/5 shadow-inner">
                <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-3 ${
                  selectedTransaction.type === 'IN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {selectedTransaction.type === 'IN' ? <ArrowUpCircle size={32} /> : <ArrowDownCircle size={32} />}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                  selectedTransaction.type === 'IN' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {selectedTransaction.type === 'IN' ? 'Pemasukan / Debet' : 'Pengeluaran / Kredit'}
                </span>
                <h3 className="text-3xl font-extrabold text-white">
                  {formatCurrency(selectedTransaction.amount)}
                </h3>
              </div>

              {/* Standard details */}
              <div className="space-y-4">
                <div className="flex gap-4 border-b border-white/5 pb-3">
                  <Calendar size={18} className="text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tanggal Transaksi</p>
                    <p className="text-sm font-semibold text-white mt-0.5">{formatDate(selectedTransaction.date)}</p>
                  </div>
                </div>

                <div className="flex gap-4 border-b border-white/5 pb-3">
                  <Tag size={18} className="text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kategori</p>
                    <p className="text-sm font-semibold text-white mt-0.5">{selectedTransaction.category}</p>
                  </div>
                </div>

                <div className="flex gap-4 border-b border-white/5 pb-3">
                  <FileText size={18} className="text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Keterangan</p>
                    <p className="text-sm font-medium text-slate-200 mt-0.5 leading-relaxed">{selectedTransaction.description}</p>
                  </div>
                </div>

                <div className="flex gap-4 pb-1">
                  <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[8px] font-bold text-slate-500 shrink-0 mt-0.5">ID</div>
                  <div className="w-full">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Reference ID / ID Transaksi</p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5 select-all break-all">{selectedTransaction.id}</p>
                  </div>
                </div>
              </div>

              {/* Linked Production SPK Details */}
              {linkedSPK && (
                <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Settings size={14} className="animate-spin-slow" /> Transaksi Otomatis Produksi
                    </h4>
                    {selectedTransaction.refId && <Lock size={12} className="text-slate-400" />}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Nomor SPK</p>
                      <p className="font-bold text-white mt-0.5">{linkedSPK.spkNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Produk</p>
                      <p className="font-bold text-white mt-0.5">{linkedMutation.productName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Jumlah Produksi</p>
                      <p className="font-bold text-white mt-0.5">{linkedMutation.qty} Pcs</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Catatan Produksi</p>
                      <p className="font-medium text-slate-300 mt-0.5">{linkedMutation.notes || '-'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTransaction(null);
                      navigate('SPK_DETAIL', { id: linkedSPK.id });
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-dark-bg py-2.5 rounded-xl font-bold text-sm transform active:scale-[0.98] transition-all shadow-md mt-2"
                  >
                    <span>Lihat Log Produksi SPK</span>
                    <ExternalLink size={14} />
                  </button>
                </div>
              )}

              {/* Close Button */}
              <div className="pt-2">
                <Button fullWidth onClick={() => setSelectedTransaction(null)} size="md" variant="secondary">
                  Tutup
                </Button>
              </div>
            </div>
          );
        })()}
      </BottomSheet>

      <ConfirmationModal 
         isOpen={deleteConfirm.isOpen}
         title="Hapus Transaksi?"
         message="Saldo akan disesuaikan kembali."
         variant="danger"
         confirmLabel="Hapus"
         onConfirm={handleDelete}
         onCancel={() => setDeleteConfirm({isOpen: false, id: null})}
      />
    </div>
  );
};
