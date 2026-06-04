
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Input, Select, ConfirmationModal, Badge, BottomSheet, SwipeableCard } from '../components/UI';
import { formatCurrency, generateId, formatDate, ProductSchema } from '../utils';
import { Plus, Search, ShoppingBag, AlertCircle, ClipboardList, Settings, Check, Lock, X, ChevronLeft, ChevronRight, ListFilter, ExternalLink } from 'lucide-react';
import { Product, SPKMutation } from '../types';

export const ProductMaster: React.FC = () => {
  const { 
    products, addProduct, updateProduct, deleteProduct, 
    categories, addCategory, updateCategory, deleteCategory, 
    spks, showNotification, isAuthenticated, navigate 
  } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Category Management State
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryMode, setCategoryMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [editingCategoryOriginal, setEditingCategoryOriginal] = useState('');

  // Detail Sheet State
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [detailTab, setDetailTab] = useState<'SPK' | 'MUTATION'>('SPK');

  // Confirmation State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    type: 'SAVE' | 'DELETE';
    data?: any;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'SAVE',
    title: '',
    message: ''
  });

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    cmtPrice: number | string;
  }>({
    name: '',
    category: categories[0] || 'Atasan',
    cmtPrice: ''
  });

  const [errors, setErrors] = useState<{name?: string; cmtPrice?: string}>({});

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filter or limit changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenSheet = (product?: Product) => {
    setErrors({});
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category: categories[0] || '',
        cmtPrice: ''
      });
    }
    setIsSheetOpen(true);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    if (categoryMode === 'ADD') {
        addCategory(newCategoryName.trim());
    } else {
        updateCategory(editingCategoryOriginal, newCategoryName.trim());
        setCategoryMode('ADD');
    }
    setNewCategoryName('');
  };

  const startEditCategory = (cat: string) => {
    setCategoryMode('EDIT');
    setEditingCategoryOriginal(cat);
    setNewCategoryName(cat);
  };

  const cancelEditCategory = () => {
    setCategoryMode('ADD');
    setNewCategoryName('');
    setEditingCategoryOriginal('');
  };

  const handleDeleteCategoryCheck = (catName: string) => {
    const isUsed = products.some(p => p.category === catName);
    
    if (isUsed) {
        showNotification(`Gagal: Kategori "${catName}" sedang digunakan oleh produk.`, 'error');
        return;
    }

    deleteCategory(catName);
    if (categoryMode === 'EDIT' && editingCategoryOriginal === catName) {
        cancelEditCategory();
    }
  };

  const handleSaveClick = () => {
    // 1. Zod Validation
    const validationResult = ProductSchema.safeParse(formData);

    if (!validationResult.success) {
      const formattedErrors = validationResult.error.format();
      setErrors({
        name: formattedErrors.name?._errors[0],
        cmtPrice: formattedErrors.cmtPrice?._errors[0],
      });
      return;
    }

    const validData = validationResult.data;
    const trimmedName = validData.name.trim();

    // 2. Duplicate Check (Logic Validation)
    const isDuplicate = products.some(p => {
        if (editingProduct && p.id === editingProduct.id) return false;
        return p.name.trim().toLowerCase() === trimmedName.toLowerCase();
    });

    if (isDuplicate) {
        setErrors(prev => ({ ...prev, name: "Nama produk sudah terdaftar" }));
        return;
    }

    const finalProduct: Product = {
        id: editingProduct ? editingProduct.id : generateId(),
        name: trimmedName,
        category: validData.category,
        cmtPrice: validData.cmtPrice
    };

    if (editingProduct) {
        updateProduct(finalProduct);
    } else {
        addProduct(finalProduct);
    }
    setIsSheetOpen(false);
  };

  const handleDeleteClick = (id: string, name: string) => {
    const isUsedInSPK = spks.some(spk => spk.items.some(item => item.productId === id));
    if (isUsedInSPK) {
      showNotification(`Produk "${name}" tidak bisa dihapus karena ada di riwayat SPK.`, 'error');
      return;
    }
    setConfirmState({
      isOpen: true,
      type: 'DELETE',
      data: id,
      title: 'Hapus Produk?',
      message: `Hapus "${name}" permanen?`
    });
  };

  const executeAction = () => {
    if (confirmState.type === 'DELETE' && confirmState.data) {
      deleteProduct(confirmState.data);
    }
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  const categoryOptions = categories.map(c => ({ label: c, value: c }));

  const getProductStats = (productId: string) => {
    const relatedSpks = spks.filter(s => s.items.some(i => i.productId === productId));
    let totalQtyOrdered = 0;
    let totalQtyCompleted = 0;
    let totalPending = 0;
    let allMutations: (SPKMutation & { spkNumber: string, spkDate: string })[] = [];

    relatedSpks.forEach(spk => {
         const items = spk.items.filter(i => i.productId === productId);
         items.forEach(i => {
             totalQtyOrdered += i.qty;
             totalQtyCompleted += (i.completedQty || 0);
             if ((i.completedQty || 0) < i.qty) totalPending += (i.qty - (i.completedQty || 0));

             if (spk.mutations) {
                 const relevantMutations = spk.mutations.filter(m => m.itemId === i.id);
                 relevantMutations.forEach(m => {
                     allMutations.push({ ...m, spkNumber: spk.spkNumber, spkDate: spk.date });
                 });
             }
         });
    });

    allMutations.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { totalQtyOrdered, totalQtyCompleted, totalPending, relatedSpks, allMutations };
  };

  return (
    <div className="flex flex-col h-[100dvh] pt-safe animate-fade-in bg-dark-bg -mx-4 px-4">
      {/* Fixed Header Section */}
      <div className="flex-none z-10 bg-dark-bg pb-2 space-y-4">
        <header className="flex justify-between items-center py-2">
            <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Produk</h1>
            </div>
            {isAuthenticated && (
            <button onClick={() => handleOpenSheet()} className="bg-primary text-dark-bg rounded-full p-3 shadow-lg active:scale-90 transition-transform">
                <Plus size={24} />
            </button>
            )}
        </header>

        {/* Search */}
        <div className="relative">
            <Input 
            placeholder="Cari nama atau kategori..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startIcon={<Search size={20} />}
            className="mb-0" 
            />
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
                Total: {filteredProducts.length} Produk
            </span>
        </div>
      </div>

      {/* Scrollable List Section */}
      <div className="flex-1 overflow-y-auto pb-28 custom-scrollbar space-y-3 pt-2">
        {paginatedProducts.map(product => {
          const isUsed = spks.some(spk => spk.items.some(item => item.productId === product.id));
          return (
            <SwipeableCard
                key={product.id}
                onEdit={isAuthenticated ? () => handleOpenSheet(product) : undefined}
                onDelete={isAuthenticated && !isUsed ? () => handleDeleteClick(product.id, product.name) : undefined}
                isLocked={!isAuthenticated}
                onClick={() => {
                  setViewingProduct(product);
                  setDetailTab('SPK');
                }}
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-400 shrink-0 shadow-inner">
                    <ShoppingBag size={24} />
                </div>
                <div className="flex-1 min-w-0 py-1">
                    <h3 className="font-bold text-white text-sm leading-snug line-clamp-2">{product.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">{product.category}</span>
                    {isUsed && <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-1"><AlertCircle size={10} /> Dipakai</span>}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-primary-glow font-bold">{formatCurrency(product.cmtPrice)}</p>
                </div>
              </div>
            </SwipeableCard>
          );
        })}
        {paginatedProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <ShoppingBag size={64} className="mb-4 text-slate-600" />
            <p className="text-slate-400">Data produk kosong</p>
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

      {/* Add/Edit Product Bottom Sheet */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={editingProduct ? 'Edit Produk' : 'Produk Baru'}
        footer={
          <Button fullWidth onClick={handleSaveClick} size="lg">
            {editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
          </Button>
        }
      >
          <div className="space-y-4">
            <Input 
              label="Nama Produk" 
              value={formData.name} 
              onChange={e => {
                setFormData({...formData, name: e.target.value});
                if (errors.name) setErrors({...errors, name: undefined});
              }}
              error={errors.name}
              placeholder="Contoh: Kemeja Linen"
            />
            
            <div className="relative">
              <div className="flex justify-between items-end mb-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Kategori</label>
                  <button 
                  type="button"
                  onClick={() => setIsCatManagerOpen(true)}
                  className="text-xs text-primary font-bold flex items-center gap-1 py-1 px-2 rounded hover:bg-primary/10"
                  >
                    <Settings size={12} /> Kelola
                  </button>
              </div>
              <Select 
                options={categoryOptions}
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              />
            </div>

            <Input 
              label="Harga CMT (Rp)" 
              type="number"
              value={formData.cmtPrice} 
              onChange={e => {
                const val = e.target.value;
                setFormData({...formData, cmtPrice: val}); // Pass string to state, check number in validate
                if (errors.cmtPrice) setErrors({...errors, cmtPrice: undefined});
              }}
              error={errors.cmtPrice}
              placeholder="0"
            />
          </div>
      </BottomSheet>

      {/* Category Manager Sheet */}
      <BottomSheet
         isOpen={isCatManagerOpen}
         onClose={() => { setIsCatManagerOpen(false); cancelEditCategory(); }}
         title="Kategori Produk"
      >
          <div className="space-y-4">
              <form onSubmit={handleCategorySubmit} className="flex gap-2 items-end">
                  <div className="flex-1">
                      {categoryMode === 'EDIT' && <span className="text-[10px] text-primary font-bold uppercase mb-1 block">Edit Mode</span>}
                      <input 
                        className={`w-full bg-dark-bg border ${categoryMode === 'EDIT' ? 'border-primary' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all`}
                        placeholder={categoryMode === 'EDIT' ? "Ubah nama kategori..." : "Kategori baru..."}
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        autoFocus={categoryMode === 'EDIT'}
                      />
                  </div>
                  <div className="flex gap-1">
                    {categoryMode === 'EDIT' && (
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
                        className="bg-primary text-dark-bg rounded-xl px-4 font-bold disabled:opacity-50 h-[50px] flex items-center justify-center"
                        disabled={!newCategoryName.trim()}
                    >
                        {categoryMode === 'EDIT' ? <Check size={24} /> : <Plus size={24} />}
                    </button>
                  </div>
              </form>

              <div className="space-y-2 mt-4 max-h-[40vh] overflow-y-auto">
                  {categories.map(cat => {
                    const isUsed = products.some(p => p.category === cat);
                    return (
                      <SwipeableCard 
                        key={cat} 
                        onEdit={isAuthenticated ? () => startEditCategory(cat) : undefined}
                        onDelete={isAuthenticated && !isUsed ? () => handleDeleteCategoryCheck(cat) : undefined}
                        isLocked={!isAuthenticated}
                        onClick={() => {}} // No action on click, just for swipe
                      >
                         <div className="flex justify-between items-center">
                            <span className="font-medium text-white">{cat}</span>
                            {isUsed && <Lock size={14} className="text-slate-600" />}
                         </div>
                      </SwipeableCard>
                    );
                  })}
              </div>
          </div>
      </BottomSheet>

      {/* Product Detail Sheet */}
      <BottomSheet
        isOpen={!!viewingProduct}
        onClose={() => setViewingProduct(null)}
        title={viewingProduct?.name || 'Detail Produk'}
      >
        {viewingProduct && (() => {
           const stats = getProductStats(viewingProduct.id);
           return (
              <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col items-center text-center">
                        <ClipboardList className="text-primary mb-2" size={24} />
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Harga CMT</p>
                        <p className="text-xl font-bold text-white mt-1">{formatCurrency(viewingProduct.cmtPrice)}</p>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col items-center text-center">
                        <AlertCircle className="text-amber-500 mb-2" size={24} />
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Pending</p>
                        <p className="text-xl font-bold text-white mt-1">{stats.totalPending} <span className="text-sm font-normal text-slate-500">pcs</span></p>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="bg-dark-bg/50 p-1 rounded-xl flex">
                    <button 
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${detailTab === 'SPK' ? 'bg-dark-card text-white shadow' : 'text-slate-500'}`}
                      onClick={() => setDetailTab('SPK')}
                    >
                      Riwayat SPK
                    </button>
                    <button 
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${detailTab === 'MUTATION' ? 'bg-dark-card text-white shadow' : 'text-slate-500'}`}
                      onClick={() => setDetailTab('MUTATION')}
                    >
                      Mutasi Produksi
                    </button>
                  </div>

                  {/* Content List */}
                  <div className="min-h-[200px]">
                    {detailTab === 'SPK' ? (
                      <div className="space-y-3">
                        {stats.relatedSpks.length === 0 && <p className="text-center text-slate-500 py-8">Belum ada order.</p>}
                        {stats.relatedSpks.map(spk => {
                            const item = spk.items.find(i => i.productId === viewingProduct.id);
                            return (
                              <div 
                                key={spk.id} 
                                onClick={() => {
                                    setViewingProduct(null); // Close modal
                                    navigate('SPK_DETAIL', { id: spk.id }); // Navigate
                                }}
                                className="p-4 bg-dark-bg/30 rounded-2xl border border-white/5 flex justify-between items-center cursor-pointer active:bg-white/5 transition-colors group"
                              >
                                  <div>
                                      <p className="text-sm font-bold text-white mb-0.5 flex items-center gap-1 group-hover:text-primary transition-colors">
                                          {spk.spkNumber} 
                                          <ExternalLink size={12} className="opacity-50" />
                                      </p>
                                      <p className="text-xs text-slate-500">{formatDate(spk.date)}</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="font-bold text-white">{item?.qty} pcs</p>
                                      <p className="text-xs text-emerald-400">Selesai: {item?.completedQty || 0}</p>
                                  </div>
                              </div>
                            )
                        })}
                      </div>
                    ) : (
                      <div className="space-y-4 pl-4 border-l-2 border-slate-700 ml-2">
                         {stats.allMutations.length === 0 && <p className="text-center text-slate-500 py-8 -ml-6">Belum ada produksi.</p>}
                         {stats.allMutations.map((mut, idx) => (
                            <div key={idx} className="relative">
                               <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-dark-bg border-2 border-emerald-500"></div>
                               <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm font-bold text-white">{formatDate(mut.date)}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Ref: {mut.spkNumber}</p>
                                  </div>
                                  <Badge color="green">+{mut.qty}</Badge>
                               </div>
                               {mut.notes && <p className="text-xs text-slate-500 italic mt-1 bg-white/5 p-2 rounded-lg">"{mut.notes}"</p>}
                            </div>
                         ))}
                      </div>
                    )}
                  </div>
              </div>
           );
        })()}
      </BottomSheet>

      <ConfirmationModal 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant="danger"
        confirmLabel="Hapus"
        onConfirm={executeAction}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
